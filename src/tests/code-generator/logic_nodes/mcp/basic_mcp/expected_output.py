from mcp.client import Client, StdioClientTransport, SSEClientTransport
from pydantic import BaseModel
from agents import TResponseInputItem

class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  state = {

  }
  workflow = workflow_input.model_dump()
  conversation_history: list[TResponseInputItem] = [
    {
      "role": "user",
      "content": [
        {
          "type": "input_text",
          "text": workflow["input_as_text"]
        }
      ]
    }
  ]
  # MCP Client initialization (HTTP/SSE)
  mcp_transport = SSEClientTransport(
    url="https://api.example.com/mcp",
    headers={
      "Authorization": "Bearer sk-test-token-123"
    }
  )
  mcp_client = Client(transport=mcp_transport)
  await mcp_client.initialize()

  # Call MCP tool
  mcp_result = await mcp_client.call_tool(
    name="database_query",
    arguments={
      "table": "users",
      "limit": 10
    }
  )

  # Close connection
  await mcp_client.close()
  return workflow
