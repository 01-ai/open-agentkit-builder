from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel

agent1 = Agent(
  name="Agent1",
  instructions="""this is

an

instruction""",
  model="gpt-5",
  model_settings=ModelSettings(
    store=True,
    reasoning=Reasoning(
      effort="low",
      summary="auto"
    )
  )
)


agent2 = Agent(
  name="Agent2",
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


agent3 = Agent(
  name="Agent3",
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


agent4 = Agent(
  name="Agent4",
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
  agent1_result_temp = await Runner.run(
    agent1,
    input=[
      *conversation_history
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent1_result_temp.new_items])

  agent1_result = {
    "output_text": agent1_result_temp.final_output_as(str)
  }
  agent2_result_temp = await Runner.run(
    agent2,
    input=[
      *conversation_history
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent2_result_temp.new_items])

  agent2_result = {
    "output_text": agent2_result_temp.final_output_as(str)
  }
  agent3_result_temp = await Runner.run(
    agent3,
    input=[
      *conversation_history
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent3_result_temp.new_items])

  agent3_result = {
    "output_text": agent3_result_temp.final_output_as(str)
  }
  agent4_result_temp = await Runner.run(
    agent4,
    input=[
      *conversation_history
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent4_result_temp.new_items])

  agent4_result = {
    "output_text": agent4_result_temp.final_output_as(str)
  }
  return agent4_result
