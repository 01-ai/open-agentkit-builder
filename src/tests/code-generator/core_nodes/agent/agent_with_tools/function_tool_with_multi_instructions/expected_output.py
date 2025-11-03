from agents import function_tool, Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel

# Tool definitions
@function_tool
def get_weather(location: str, unit: str):
  pass

agent = Agent(
  name="Agent",
  instructions="this is default instruction",
  model="gpt-5",
  tools=[
    get_weather
  ],
  model_settings=ModelSettings(
    parallel_tool_calls=True,
    store=True,
    reasoning=Reasoning(
      effort="low"
    )
  )
)


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
  agent_result_temp = await Runner.run(
    agent,
    input=[
      *conversation_history,
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "this is an user instruction"
          }
        ]
      },
      {
        "id": None,
        "role": "assistant",
        "content": [
          {
            "type": "output_text",
            "text": "this is an assistant instruction"
          }
        ]
      },
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "this is another user instrcution"
          }
        ]
      }
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent_result_temp.new_items])

  agent_result = {
    "output_text": agent_result_temp.final_output_as(str)
  }
