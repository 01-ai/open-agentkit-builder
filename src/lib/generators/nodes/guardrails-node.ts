import { WorkflowNode } from '../../types/workflow'

export function generateGuardrailsNodeCode(
  node: WorkflowNode,
  configVarName: string = 'guardrails_config',
  guardrailsIndex: number = 0,
  previousGuardrailsResultVar?: string
): string {
  const config = node.config || {}
  let expr = config.expr?.expression || 'workflow["input_as_text"]'

  // If this is not the first guardrails node and we have a previous result,
  // extract the safe_text from the previous result
  if (guardrailsIndex > 0 && previousGuardrailsResultVar) {
    expr = `${previousGuardrailsResultVar}["safe_text"]`
  } else {
    // Convert workflow.field to workflow["field"]
    if (expr.includes('workflow.')) {
      expr = expr.replace(
        /workflow\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
        'workflow["$1"]'
      )
    }

    // Convert state.field to state["field"]
    if (expr.includes('state.')) {
      expr = expr.replace(/state\.([a-zA-Z_][a-zA-Z0-9_]*)/g, 'state["$1"]')
    }
  }

  // Generate variable name suffix for indexed guardrails
  const varSuffix = guardrailsIndex > 0 ? guardrailsIndex.toString() : ''
  const inputVar = `guardrails_inputtext${varSuffix}`
  const resultVar = `guardrails_result${varSuffix}`
  const tripwireVar = `guardrails_hastripwire${varSuffix}`
  const textVar = `guardrails_anonymizedtext${varSuffix}`
  const outputVar = `guardrails_output${varSuffix}`

  const continueOnError = config.continue_on_error === true

  // Calculate indentation based on index
  // guardrailsIndex 0: 2 spaces
  // guardrailsIndex 1: 4 spaces (nested in first else)
  // guardrailsIndex 2: 6 spaces (nested in second else)
  // guardrailsIndex 3: 8 spaces (nested in third else)
  const indent = ' '.repeat(2 + guardrailsIndex * 2)

  if (continueOnError) {
    return `
${indent}try:
${indent}  ${inputVar} = ${expr}
${indent}  ${resultVar} = await run_guardrails(ctx, ${inputVar}, "text/plain", instantiate_guardrails(load_config_bundle(${configVarName})), suppress_tripwire=True)
${indent}  ${tripwireVar} = guardrails_has_tripwire(${resultVar})
${indent}  ${textVar} = get_guardrail_checked_text(${resultVar}, ${inputVar})
${indent}  ${outputVar} = (${tripwireVar} and build_guardrail_fail_output(${resultVar} or [])) or (${textVar} or ${inputVar})
${indent}  if ${tripwireVar}:
${indent}    return ${outputVar}
${indent}  else:
${indent}    return ${outputVar}
${indent}except Exception as guardrails_error:
${indent}  guardrails_errorresult = {
${indent}    "message": getattr(guardrails_error, "message", "Unknown error"),
${indent}  }`
  } else {
    return `
${indent}${inputVar} = ${expr}
${indent}${resultVar} = await run_guardrails(ctx, ${inputVar}, "text/plain", instantiate_guardrails(load_config_bundle(${configVarName})), suppress_tripwire=True)
${indent}${tripwireVar} = guardrails_has_tripwire(${resultVar})
${indent}${textVar} = get_guardrail_checked_text(${resultVar}, ${inputVar})
${indent}${outputVar} = (${tripwireVar} and build_guardrail_fail_output(${resultVar} or [])) or (${textVar} or ${inputVar})
${indent}if ${tripwireVar}:
${indent}  return ${outputVar}
${indent}else:
${indent}  return ${outputVar}`
  }
}
