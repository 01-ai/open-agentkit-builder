from openai import AsyncOpenAI
from types import SimpleNamespace
from pydantic import BaseModel
from agents import TResponseInputItem

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  state = {
    "string_var_name": "tom",
    "num_var": 0
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
  if state["string_var_name"]:
    filesearch_result = { "results": [
      {
        "id": result.file_id,
        "filename": result.filename,
        "score": result.score,
      } for result in client.vector_stores.search(vector_store_id="", query="", max_num_results=10)
    ]}
    return filesearch_result
  else:
    return workflow
