from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel

agent = Agent(
  name="Agent",
  instructions="",
  model="gpt-5",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low",
      summary="auto"
    )
  )
)


class WorkflowInput(BaseModel):
  input_as_text: str


# Main code entrypoint
async def run_workflow(workflow_input: WorkflowInput):
  state = {
    "string_var_name": "tom"
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
  while state["string_var_name"]:
    while workflow["input_as_text"] == "":
      agent_result_temp = await Runner.run(
        agent,
        input=[
          *conversation_history
        ]
      )

      conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])

      agent_result = {
        "output_text": agent_result_temp.final_output_as(str)
      }
  return workflow
