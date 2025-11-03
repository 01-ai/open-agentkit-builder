'use client'

import { useCanvas } from '@/app/(without-sidebar)/edit/canvas/canvas-provider'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { GuardrailsNodeConfig } from '@/lib/nodes/definitions/guardrails-node'
import { StartConfig, StateVariable } from '@/lib/nodes/definitions/start-node'
import { ConfigComponentProps } from '@/lib/nodes/types'
import { setNestedValue } from '@/lib/utils/path-utils'
import { AlertTriangle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { FormInput } from './components/form-input'
import {
  FormSelect,
  FormSelectContent,
  FormSelectItem,
  FormSelectTrigger,
  FormSelectValue,
} from './components/form-select'
import { IconTooltip } from './components/icon-tooltip'
import { VariableItem } from './components/variable-item'

interface GuardrailItem {
  type: 'pii' | 'moderation' | 'jailbreak'
  config: Record<string, string[] | boolean | number | string> // 可根据实际进一步细化 config 结构
}

// Extended variable interface for displaying in dropdown
interface SelectableVariable extends StateVariable {
  fullPath: string // e.g., "workflow.input_as_text" or "input.output_text"
  displayName: string // e.g., "input_as_text" or "output_text"
  group:
    | 'WORKFLOW INPUT'
    | 'STATE'
    | 'AGENT'
    | 'FILE SEARCH'
    | 'TRANSFORM'
    | 'IF / ELSE'
    | 'USER APPROVAL' // Group label
  disabled?: boolean // Whether the option is disabled
  disabledReason?: string // Reason for being disabled
  parentName?: string // Parent variable name for nested properties (e.g., "output_parsed" or "results")
  grandparentName?: string // Grandparent for deeply nested properties (e.g., "content")
}

/**
 * Helper function to extract output variables from a node
 */
function extractNodeOutputs(
  node: { type: string; data?: { config?: Record<string, unknown> } },
  targetGroup:
    | 'AGENT'
    | 'FILE SEARCH'
    | 'TRANSFORM'
    | 'IF / ELSE'
    | 'USER APPROVAL'
): SelectableVariable[] {
  const outputs: SelectableVariable[] = []

  // Extract Agent node outputs
  if (node.type === 'agent') {
    const agentConfig = node.data?.config as
      | {
          text?: {
            format?: {
              type?: string
              schema?: Record<string, unknown>
            }
          }
        }
      | undefined

    // Always add output_text (string type)
    outputs.push({
      id: 'output_text',
      name: 'output_text',
      type: 'string',
      fullPath: 'input.output_text',
      displayName: 'output_text',
      group: targetGroup,
    })

    // If output format is JSON, add output_parsed and its properties
    if (agentConfig?.text?.format?.type === 'json_schema') {
      const schema = agentConfig.text.format.schema as
        | {
            properties?: Record<string, Record<string, unknown>>
          }
        | undefined

      // Add output_parsed (object type)
      outputs.push({
        id: 'output_parsed',
        name: 'output_parsed',
        type: 'object',
        fullPath: 'input.output_parsed',
        displayName: 'output_parsed',
        group: targetGroup,
        disabled: true,
        disabledReason:
          'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
      })

      // Add properties from schema as nested options
      if (schema?.properties) {
        Object.entries(schema.properties).forEach(([propName, propSchema]) => {
          const propType = (propSchema as Record<string, unknown>)
            .type as string
          const isStringProp = propType === 'string'

          outputs.push({
            id: `output_parsed.${propName}`,
            name: propName,
            type: propType as StateVariable['type'],
            fullPath: `"{{input.output_parsed.${propName}}}"`,
            displayName: propName,
            group: targetGroup,
            disabled: !isStringProp,
            disabledReason: isStringProp
              ? undefined
              : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
            parentName: 'output_parsed',
          })
        })
      }
    }
  }

  // Extract File Search node outputs
  if (node.type === 'file-search') {
    // Add results (array type - disabled)
    outputs.push({
      id: 'results',
      name: 'results',
      type: 'array',
      fullPath: 'input.results',
      displayName: 'results',
      group: targetGroup,
      disabled: true,
      disabledReason:
        'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
    })

    // Add results array item properties
    const resultsProperties = [
      {
        name: 'file_id',
        type: 'string',
        path: '"{{input.results[0].file_id}}"',
      },
      {
        name: 'filename',
        type: 'string',
        path: '"{{input.results[0].filename}}"',
      },
      { name: 'score', type: 'number', path: '"{{input.results[0].score}}"' },
    ]

    resultsProperties.forEach((prop) => {
      const isString = prop.type === 'string'
      outputs.push({
        id: `results.${prop.name}`,
        name: prop.name,
        type: prop.type as StateVariable['type'],
        fullPath: prop.path,
        displayName: prop.name,
        group: targetGroup,
        disabled: !isString,
        disabledReason: isString
          ? undefined
          : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
        parentName: 'results',
      })
    })

    // Add content array (nested in results)
    outputs.push({
      id: 'results.content',
      name: 'content',
      type: 'array',
      fullPath: 'input.results[0].content',
      displayName: 'content',
      group: targetGroup,
      disabled: true,
      disabledReason:
        'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
      parentName: 'results',
    })

    // Add content array item properties (deeply nested)
    const contentProperties = [
      {
        name: 'text',
        type: 'string',
        path: '"{{input.results[0].content[0].text}}"',
      },
      {
        name: 'type',
        type: 'string',
        path: '"{{input.results[0].content[0].type}}"',
      },
    ]

    contentProperties.forEach((prop) => {
      const isString = prop.type === 'string'
      outputs.push({
        id: `results.content.${prop.name}`,
        name: prop.name,
        type: prop.type as StateVariable['type'],
        fullPath: prop.path,
        displayName: prop.name,
        group: targetGroup,
        disabled: !isString,
        disabledReason: isString
          ? undefined
          : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
        parentName: 'content',
        grandparentName: 'results',
      })
    })

    // Add attributes object
    outputs.push({
      id: 'results.attributes',
      name: 'attributes',
      type: 'object',
      fullPath: 'input.results[0].attributes',
      displayName: 'attributes',
      group: targetGroup,
      disabled: true,
      disabledReason:
        'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
      parentName: 'results',
    })
  }

  // Extract Transform node outputs
  if (node.type === 'transform') {
    const nodeData = node.data?.config as
      | {
          expressions?: Array<{
            key: string
            expression: string
          }>
          objectSchema?: {
            schema?: {
              properties?: Record<string, Record<string, unknown>>
            }
          }
          outputKind?: string
        }
      | undefined

    // Process Expressions mode
    if (
      nodeData?.outputKind === 'expressions' &&
      nodeData?.expressions &&
      Array.isArray(nodeData.expressions)
    ) {
      nodeData.expressions.forEach((expr) => {
        if (expr.key) {
          outputs.push({
            id: `transform_expr_${expr.key}`,
            name: expr.key,
            type: 'unknown' as StateVariable['type'],
            fullPath: `input.${expr.key}`,
            displayName: expr.key,
            group: targetGroup,
            disabled: true,
            disabledReason:
              'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
          })
        }
      })
    }

    // Process Object mode
    if (
      nodeData?.outputKind === 'object' &&
      nodeData?.objectSchema?.schema?.properties
    ) {
      const properties = nodeData.objectSchema.schema.properties

      Object.entries(properties).forEach(([propName, propSchema]) => {
        const propType = (propSchema as Record<string, unknown>).type as string
        const isString = propType === 'string'

        outputs.push({
          id: `transform_obj_${propName}`,
          name: propName,
          type: propType as StateVariable['type'],
          fullPath: `input.${propName}`,
          displayName: propName,
          group: targetGroup,
          disabled: !isString,
          disabledReason: isString
            ? undefined
            : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
        })
      })
    }
  }

  return outputs
}

/**
 * Get all selectable variables for Guardrails Input dropdown
 */
function getSelectableVariables(
  stateVars: StateVariable[],
  predecessorNodes: Array<{
    type: string
    id: string
    data?: { config?: Record<string, unknown> }
  }> = [],
  allNodes: Array<{
    id: string
    type: string
    data?: { config?: Record<string, unknown> }
  }> = [],
  allEdges: Array<{ source: string; target: string }> = []
): SelectableVariable[] {
  const variables: SelectableVariable[] = []

  // Add WORKFLOW INPUT - input_as_text (always string type)
  variables.push({
    id: 'input_as_text',
    name: 'input_as_text',
    type: 'string',
    fullPath: 'workflow.input_as_text',
    displayName: 'input_as_text',
    group: 'WORKFLOW INPUT',
  })

  // Process predecessor nodes
  predecessorNodes.forEach((node) => {
    // Handle If/else and User approval nodes - they pass through their predecessor's outputs
    // ONLY if they actually use those outputs in their configuration
    if (node.type === 'if-else' || node.type === 'user-approval') {
      const groupName = node.type === 'if-else' ? 'IF / ELSE' : 'USER APPROVAL'

      // Check if the if-else/user-approval node uses input from its predecessors
      let usesInputFromPredecessor = false

      if (node.type === 'if-else') {
        // Check if any case predicate uses input.* (predecessor output)
        const ifElseConfig = node.data?.config as
          | {
              cases?: Array<{
                predicate?: {
                  expression?: string
                }
              }>
            }
          | undefined

        if (ifElseConfig?.cases && Array.isArray(ifElseConfig.cases)) {
          usesInputFromPredecessor = ifElseConfig.cases.some((caseItem) => {
            const expression = caseItem.predicate?.expression || ''
            return expression.includes('input.')
          })
        }
      } else if (node.type === 'user-approval') {
        // Check if user-approval uses input from predecessors in message or variable_mapping
        const userApprovalConfig = node.data?.config as
          | {
              message?: string
              variable_mapping?: Array<{
                expression?: {
                  expression?: string
                }
              }>
            }
          | undefined

        // Check message field for {{input.*}}
        const messageUsesInput =
          userApprovalConfig?.message?.includes('{{input.') ||
          userApprovalConfig?.message?.includes('{{ input.') ||
          false

        // Check variable_mapping for input.*
        const mappingUsesInput =
          (userApprovalConfig?.variable_mapping &&
            Array.isArray(userApprovalConfig.variable_mapping) &&
            userApprovalConfig.variable_mapping.some((mapping) => {
              const expression = mapping.expression?.expression || ''
              return expression.includes('input.')
            })) ||
          false

        usesInputFromPredecessor = messageUsesInput || mappingUsesInput
      }

      // Only include predecessor outputs if they are actually used
      if (usesInputFromPredecessor) {
        // Find predecessors of the if-else or user-approval node
        const incomingEdges = allEdges.filter((edge) => edge.target === node.id)
        const sourcePredecessors = incomingEdges
          .map((edge) => allNodes.find((n) => n.id === edge.source))
          .filter((n): n is (typeof allNodes)[0] => n !== undefined)

        // Extract outputs from these predecessors and assign to IF / ELSE or USER APPROVAL group
        sourcePredecessors.forEach((pred) => {
          const outputs = extractNodeOutputs(pred, groupName)
          variables.push(...outputs)
        })
      }
    }
    // Handle direct data source nodes (Agent, File Search, Transform)
    else if (node.type === 'agent') {
      const outputs = extractNodeOutputs(node, 'AGENT')
      variables.push(...outputs)
    } else if (node.type === 'file-search') {
      const outputs = extractNodeOutputs(node, 'FILE SEARCH')
      variables.push(...outputs)
    } else if (node.type === 'transform') {
      const outputs = extractNodeOutputs(node, 'TRANSFORM')
      variables.push(...outputs)
    }
  })

  // Add STATE variables
  stateVars.forEach((variable) => {
    const isString = variable.type === 'string'
    variables.push({
      ...variable,
      fullPath: `state.${variable.name}`,
      displayName: variable.name,
      group: 'STATE',
      disabled: !isString,
      disabledReason: isString
        ? undefined
        : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
    })

    // If it's an object type, expand its properties
    if (variable.type === 'object' && variable.default) {
      const defaultObj = variable.default as Record<string, unknown>

      // Check if default is a JSON Schema with properties
      if (
        defaultObj &&
        typeof defaultObj === 'object' &&
        'properties' in defaultObj
      ) {
        const properties = defaultObj.properties as Record<
          string,
          Record<string, unknown>
        >

        // Add each property as a selectable option
        Object.entries(properties).forEach(([propName, propSchema]) => {
          const propType = propSchema.type as string
          const isStringProp = propType === 'string'

          variables.push({
            id: `${variable.id}.${propName}`,
            name: propName,
            type: propType as StateVariable['type'],
            default: propSchema.default as StateVariable['default'],
            fullPath: `state.${variable.name}.${propName}`,
            displayName: propName,
            group: 'STATE',
            disabled: !isStringProp,
            disabledReason: isStringProp
              ? undefined
              : 'Guardrails require text—select a string field, or add a Transform node to output an object that includes a string field before this node.',
            parentName: variable.name, // Mark as nested property
          })
        })
      }
    }
  })

  return variables
}

// Guardrails Node Configuration Component
export const GuardrailsConfig: React.FC<ConfigComponentProps> = ({
  nodeId,
  config: rawConfig,
  onChange,
}) => {
  // Cast config to the correct type
  const config = rawConfig as GuardrailsNodeConfig
  const { getNode, updateNodeLabel, nodes, edges } = useCanvas()

  // Helper function to update nested config fields
  const updateField = (
    path: string,
    value:
      | string
      | boolean
      | number
      | string[]
      | Record<string, unknown>
      | GuardrailItem[]
  ) => {
    const newConfig = JSON.parse(JSON.stringify(config)) // Deep clone
    setNestedValue(newConfig, path, value)
    onChange(newConfig)
  }

  // node label
  const nodeLabel = useMemo(() => {
    return getNode(nodeId)?.data?.label || ''
  }, [getNode, nodeId])

  // Get Start node
  const startNode = useMemo(() => {
    return nodes.find((n) => n.type === 'start')
  }, [nodes])

  // Get state variables from Start node
  const stateVariables = useMemo(() => {
    if (!startNode) return []

    const startConfig = startNode.data?.config as StartConfig
    return startConfig?.state_vars || []
  }, [startNode])

  // Get predecessor nodes (nodes that connect to this node)
  const predecessorNodes = useMemo(() => {
    // Find edges that target this node
    const incomingEdges = edges.filter((edge) => edge.target === nodeId)

    // Get the source nodes from those edges
    const sourceNodes = incomingEdges
      .map((edge) => nodes.find((node) => node.id === edge.source))
      .filter((node) => node !== undefined)

    // Convert to simple objects with type, id, and data
    return sourceNodes.map((node) => ({
      id: node.id,
      type: node.type || '',
      data: node.data,
    }))
  }, [edges, nodes, nodeId])

  // Get all selectable variables (WORKFLOW INPUT + AGENT + FILE SEARCH + TRANSFORM + IF / ELSE + USER APPROVAL + STATE)
  const selectableVariables = useMemo(() => {
    const allNodes = nodes.map((node) => ({
      id: node.id,
      type: node.type || '',
      data: node.data,
    }))
    const allEdges = edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
    }))
    return getSelectableVariables(
      stateVariables,
      predecessorNodes,
      allNodes,
      allEdges
    )
  }, [stateVariables, predecessorNodes, nodes, edges])

  // Group variables by their group
  const groupedVariables = useMemo(() => {
    const groups: Record<string, SelectableVariable[]> = {
      'IF / ELSE': [],
      'USER APPROVAL': [],
      AGENT: [],
      'FILE SEARCH': [],
      TRANSFORM: [],
      'WORKFLOW INPUT': [],
      STATE: [],
    }

    selectableVariables.forEach((variable) => {
      groups[variable.group].push(variable)
    })

    return groups
  }, [selectableVariables])

  // pii, moderation, Jailbreak
  const typePriority = { pii: 0, moderation: 1, jailbreak: 2 }
  const configPriority: Record<
    'pii' | 'moderation' | 'jailbreak',
    GuardrailItem
  > = {
    pii: {
      type: 'pii' as const,
      config: {
        block: true,
        entities: ['CREDIT_CARD', 'US_BANK_NUMBER', 'US_PASSPORT', 'US_SSN'],
      },
    },
    moderation: {
      type: 'moderation' as const,
      config: {
        categories: [
          'sexual/minors',
          'hate/threatening',
          'harassment/threatening',
          'self-harm/instructions',
          'violence/graphic',
          'illicit/violent',
        ],
      },
    },
    jailbreak: {
      type: 'jailbreak' as const,
      config: {
        confidence_threshold: 0.7,
        model: 'gpt-4.1-mini',
      },
    },
  }
  const [piiEnabled, setPiiEnabled] = useState(false)
  const [moderationEnabled, setModerationEnabled] = useState(false)
  const [jailbreakEnabled, setJailbreakEnabled] = useState(false)

  const changeEnabled = (
    enabled: boolean,
    type: 'pii' | 'moderation' | 'jailbreak'
  ) => {
    const guardrails = config.guardrails as GuardrailItem[]
    let newGuardrails = [...guardrails]
    if (enabled) {
      newGuardrails.push(configPriority[type])
    } else {
      newGuardrails = newGuardrails.filter((g) => g.type !== type)
    }
    newGuardrails.sort((a, b) => {
      return (
        (typePriority[a.type as keyof typeof typePriority] ?? 999) -
        (typePriority[b.type as keyof typeof typePriority] ?? 999)
      )
    })
    updateField('guardrails', newGuardrails)
  }

  useEffect(() => {
    const guardrails = config.guardrails as GuardrailItem[]
    setPiiEnabled(!!guardrails.find((item) => item.type === 'pii'))
    setModerationEnabled(
      !!guardrails.find((item) => item.type === 'moderation')
    )
    setJailbreakEnabled(!!guardrails.find((item) => item.type === 'jailbreak'))
  }, [config.guardrails])

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-2">
        {/* Name */}
        <FormInput
          label="Name"
          value={nodeLabel as string}
          onValueChange={(value: string) => updateNodeLabel?.(nodeId, value)}
          placeholder="Guardrails"
        />

        {/* Input */}
        <FormSelect
          label="Input"
          value={config.expr?.expression || ''}
          onValueChange={(value) => {
            // Update both expression and format in one go
            const newConfig = JSON.parse(JSON.stringify(config))
            newConfig.expr = {
              expression: value,
              format: 'cel',
            }
            onChange(newConfig)
          }}
        >
          <FormSelectTrigger>
            {config.expr?.expression ? (
              (() => {
                const selectedVar = selectableVariables.find(
                  (v) => v.fullPath === config.expr?.expression
                )
                if (!selectedVar) return <FormSelectValue />
                return <VariableItem variable={selectedVar} />
              })()
            ) : (
              <FormSelectValue placeholder="Select input..." />
            )}
          </FormSelectTrigger>
          <FormSelectContent>
            {Object.entries(groupedVariables).map(([groupName, variables]) => {
              if (variables.length === 0) return null

              return (
                <div key={groupName}>
                  {/* Group Label */}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    {groupName}
                  </div>

                  {/* Group Items */}
                  {variables.map((variable) => {
                    // Calculate indentation based on nesting level
                    let indentClass = ''
                    if (variable.grandparentName) {
                      indentClass = 'pl-8' // Two levels deep (e.g., results -> content -> text)
                    } else if (variable.parentName) {
                      indentClass = 'pl-4' // One level deep (e.g., results -> file_id)
                    }

                    return (
                      <FormSelectItem
                        key={variable.id}
                        value={variable.fullPath}
                        disabled={variable.disabled}
                      >
                        <div
                          className={`flex items-center gap-2 w-full ${indentClass}`}
                        >
                          <div className="flex-1">
                            <VariableItem variable={variable} />
                          </div>
                          {variable.disabled && variable.disabledReason && (
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <div className="flex-shrink-0 cursor-help">
                                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="text-sm">
                                  {variable.disabledReason}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </FormSelectItem>
                    )
                  })}
                </div>
              )
            })}
          </FormSelectContent>
        </FormSelect>

        <div className="flex items-center justify-between gap-2">
          <Label className="leading-8">
            Personally identifiable information
            <IconTooltip content="Detects and redacts personally identifiable information(PII)." />
          </Label>
          <Switch
            id="pii-switch"
            checked={piiEnabled || false}
            onCheckedChange={(checked) => changeEnabled(checked, 'pii')}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label className="leading-8">
            Moderation
            <IconTooltip content="Classifies and blocks harmful content(e.g., hate/harassment or sexual content)." />
          </Label>
          <Switch
            id="moderation-switch"
            checked={moderationEnabled || false}
            onCheckedChange={(checked) => changeEnabled(checked, 'moderation')}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label className="leading-8">
            Jailbreak
            <IconTooltip content="Detects prompt injection and jailbreak attempts to keep the model on-task." />
          </Label>
          <Switch
            id="jailbreak-switch"
            checked={jailbreakEnabled || false}
            onCheckedChange={(checked) => changeEnabled(checked, 'jailbreak')}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Label className="leading-8">
            Continue on error
            <IconTooltip content="When enabled, allows you to define an error path if guardrails runs into any runtime issues." />
          </Label>
          <Switch
            id="jailbreak-switch"
            checked={config.continue_on_error || false}
            onCheckedChange={(checked) =>
              updateField('continue_on_error', checked)
            }
          />
        </div>
      </div>
    </TooltipProvider>
  )
}
