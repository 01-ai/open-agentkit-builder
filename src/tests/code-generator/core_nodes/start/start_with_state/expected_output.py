from pydantic import BaseModel
from agents import TResponseInputItem

class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  state = {
    "string_state_variable": "default-string",
    "number_state_variable": None,
    "bool_state_variable": None,
    "list_state_variable": [

    ]
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
