/**
 * Node Handle Definitions
 * Centralized source of truth for all node handle IDs
 * This ensures consistency across import, export, and UI rendering
 */

export const NODE_HANDLES = {
  // Basic nodes - single output
  agent: {
    in: 'in',
    out: 'on_result',
  },
  start: {
    out: 'out',
  },
  end: {
    in: 'in',
  },
  transform: {
    in: 'in',
    out: 'out',
  },
  'set-state': {
    in: 'in',
    out: 'out',
  },
  mcp: {
    in: 'in',
    out: 'out',
  },
  'file-search': {
    in: 'in',
    out: 'on_result',
  },

  // Branching nodes - multiple outputs
  'if-else': {
    in: 'in',
    // Case outputs are dynamic, stored in config.cases[].output_port_id
    // Fallback output is stored in config.fallback.output_port_id
  },
  'user-approval': {
    in: 'in',
    // Fixed outputs:
    approval: 'approval',
    reject: 'reject',
  },
  guardrails: {
    in: 'in',
    // Dynamic outputs based on config:
    pass: 'pass',
    error: 'error', // if continue_on_error is true
    fail: 'fail', // if guardrails exist
  },

  // Container nodes
  while: {
    in: 'in',
    out: 'out',
    'dummy-in': 'dummy-in',
  },

  // UI-only nodes
  note: {},
} as const

/**
 * Get all source handles for a node based on its type and config
 * Used when determining which handles should auto-connect to While.out
 */
export function getSourceHandles(nodeType: string, config?: any): string[] {
  switch (nodeType) {
    case 'agent':
      return [NODE_HANDLES.agent.out]

    case 'file-search':
      return [NODE_HANDLES['file-search'].out]

    case 'transform':
      return [NODE_HANDLES.transform.out]

    case 'set-state':
      return [NODE_HANDLES['set-state'].out]

    case 'mcp':
      return [NODE_HANDLES.mcp.out]

    case 'if-else': {
      const handles: string[] = []
      if (config?.cases) {
        config.cases.forEach((caseItem: any) => {
          if (caseItem.output_port_id) {
            handles.push(caseItem.output_port_id)
          }
        })
      }
      if (config?.fallback?.output_port_id) {
        handles.push(config.fallback.output_port_id)
      }
      return handles
    }

    case 'user-approval': {
      // User approval has fixed outputs: approval and reject
      return [NODE_HANDLES['user-approval'].approval, NODE_HANDLES['user-approval'].reject]
    }

    case 'guardrails': {
      const handles = [NODE_HANDLES.guardrails.pass]
      if (config?.continue_on_error) {
        handles.push(NODE_HANDLES.guardrails.error)
      }
      if (config?.guardrails && config.guardrails.length > 0) {
        handles.push(NODE_HANDLES.guardrails.fail)
      }
      return handles
    }

    case 'start':
      return [NODE_HANDLES.start.out]

    case 'end':
      return []

    case 'while':
      return []

    case 'note':
      return []

    default:
      return ['out']
  }
}

/**
 * Get the target handle for a node
 */
export function getTargetHandle(nodeType: string): string | null {
  switch (nodeType) {
    case 'agent':
      return NODE_HANDLES.agent.in
    case 'transform':
      return NODE_HANDLES.transform.in
    case 'set-state':
      return NODE_HANDLES['set-state'].in
    case 'mcp':
      return NODE_HANDLES.mcp.in
    case 'file-search':
      return NODE_HANDLES['file-search'].in
    case 'if-else':
      return NODE_HANDLES['if-else'].in
    case 'user-approval':
      return NODE_HANDLES['user-approval'].in
    case 'guardrails':
      return NODE_HANDLES.guardrails.in
    case 'end':
      return NODE_HANDLES.end.in
    case 'while':
      return NODE_HANDLES.while.in

    case 'start':
    case 'note':
      return null

    default:
      return 'in'
  }
}
