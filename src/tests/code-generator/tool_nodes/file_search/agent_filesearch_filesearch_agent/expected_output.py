from openai import AsyncOpenAI
from types import SimpleNamespace
from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
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


agent1 = Agent(
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
  filesearch_result = { "results": [
    {
      "id": result.file_id,
      "filename": result.filename,
      "score": result.score,
    } for result in client.vector_stores.search(vector_store_id="", query="", max_num_results=10)
  ]}
  filesearch_result1 = { "results": [
    {
      "id": result.file_id,
      "filename": result.filename,
      "score": result.score,
    } for result in client.vector_stores.search(vector_store_id="", query="", max_num_results=10)
  ]}
  agent_result_temp1 = await Runner.run(
    agent1,
    input=[
      *conversation_history
    ]
  )

  conversation_history.extend([item.to_input_item() for item in agent_result_temp1.new_items])

  agent_result1 = {
    "output_text": agent_result_temp1.final_output_as(str)
  }
  return agent_result1
