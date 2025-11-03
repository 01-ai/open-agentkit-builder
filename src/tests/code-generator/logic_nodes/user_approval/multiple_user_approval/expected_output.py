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


def approval_request(message: str):
  # TODO: Implement
  return True

def approval_request1(message: str):
  # TODO: Implement
  return True

def approval_request2(message: str):
  # TODO: Implement
  return True

def approval_request3(message: str):
  # TODO: Implement
  return True

def approval_request4(message: str):
  # TODO: Implement
  return True

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
  approval_message = ""

  if approval_request(approval_message):
      approval_message1 = ""

      if approval_request1(approval_message1):
          approval_message2 = ""

          if approval_request2(approval_message2):
              approval_message3 = ""

              if approval_request3(approval_message3):
                  approval_message4 = ""

                  if approval_request4(approval_message4):
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
                      return agent_result
                  else:
                      return workflow
              else:
                  return workflow
          else:
              return workflow
      else:
          return workflow
  else:
      return workflow
