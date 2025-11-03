from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from agents import Agent, ModelSettings, TResponseInputItem, Runner, RunConfig
from openai.types.shared.reasoning import Reasoning
from pydantic import BaseModel

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
# Guardrails definitions
guardrails_config = {
  "guardrails": [

  ]
}
# Guardrails utils

def guardrails_has_tripwire(results):
    return any(getattr(r, "tripwire_triggered", False) is True for r in (results or []))

def get_guardrail_checked_text(results, fallback_text):
    for r in (results or []):
        info = getattr(r, "info", None) or {}
        if isinstance(info, dict) and ("checked_text" in info):
            return info.get("checked_text") or fallback_text
    return fallback_text

def build_guardrail_fail_output(results):
    failures = []
    for r in (results or []):
        if getattr(r, "tripwire_triggered", False):
            info = getattr(r, "info", None) or {}
            failure = {
                "guardrail_name": info.get("guardrail_name"),
            }
            for key in ("flagged", "confidence", "threshold", "hallucination_type", "hallucinated_statements", "verified_statements"):
                if key in (info or {}):
                    failure[key] = info.get(key)
            failures.append(failure)
    return {"failed": len(failures) > 0, "failures": failures}
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
    guardrails_inputtext = workflow["input_as_text"]
    guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", instantiate_guardrails(load_config_bundle(guardrails_config)), suppress_tripwire=True)
    guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
    guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
    guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
    if guardrails_hastripwire:
      return guardrails_output
    else:
      return guardrails_output
  return workflow
