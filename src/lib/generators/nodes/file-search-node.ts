import { WorkflowNode } from '../../types/workflow'

export function generateFileSearchNodeCode(
  node: WorkflowNode,
  fileSearchIndex: number = 0
): string {
  const config = node.config || {}
  const vectorStoreId = config.vector_store_id
    ? `"${config.vector_store_id}"`
    : '""'
  const query = config.query?.expression
    ? `"${config.query.expression.replace(/"/g, '\\"')}"`
    : '""'
  const maxResults = config.max_results || 10

  // Generate unique variable name based on index
  const varName =
    fileSearchIndex === 0
      ? 'filesearch_result'
      : `filesearch_result${fileSearchIndex}`

  return `
  ${varName} = { "results": [
    {
      "id": result.file_id,
      "filename": result.filename,
      "score": result.score,
    } for result in client.vector_stores.search(vector_store_id=${vectorStoreId}, query=${query}, max_num_results=${maxResults})
  ]}`
}
