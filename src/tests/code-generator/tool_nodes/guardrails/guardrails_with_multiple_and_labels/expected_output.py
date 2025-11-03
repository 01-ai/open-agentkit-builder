from openai import AsyncOpenAI
from types import SimpleNamespace
from guardrails.runtime import load_config_bundle, instantiate_guardrails, run_guardrails
from pydantic import BaseModel
from agents import TResponseInputItem

# Shared client for guardrails and file search
client = AsyncOpenAI()
ctx = SimpleNamespace(guardrail_llm=client)
# Guardrails definitions
guardrails1_config = {
  "guardrails": [

  ]
}
guardrails2_config = {
  "guardrails": [

  ]
}
guardrails3_config = {
  "guardrails": [

  ]
}
guardrails4_config = {
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
  guardrails_inputtext = workflow["input_as_text"]
  guardrails_result = await run_guardrails(ctx, guardrails_inputtext, "text/plain", instantiate_guardrails(load_config_bundle(guardrails1_config)), suppress_tripwire=True)
  guardrails_hastripwire = guardrails_has_tripwire(guardrails_result)
  guardrails_anonymizedtext = get_guardrail_checked_text(guardrails_result, guardrails_inputtext)
  guardrails_output = (guardrails_hastripwire and build_guardrail_fail_output(guardrails_result or [])) or (guardrails_anonymizedtext or guardrails_inputtext)
  if guardrails_hastripwire:
    return guardrails_output
  else:
    guardrails_inputtext1 = guardrails_result["safe_text"]
    guardrails_result1 = await run_guardrails(ctx, guardrails_inputtext1, "text/plain", instantiate_guardrails(load_config_bundle(guardrails2_config)), suppress_tripwire=True)
    guardrails_hastripwire1 = guardrails_has_tripwire(guardrails_result1)
    guardrails_anonymizedtext1 = get_guardrail_checked_text(guardrails_result1, guardrails_inputtext1)
    guardrails_output1 = (guardrails_hastripwire1 and build_guardrail_fail_output(guardrails_result1 or [])) or (guardrails_anonymizedtext1 or guardrails_inputtext1)
    if guardrails_hastripwire1:
      return guardrails_output1
    else:
      guardrails_inputtext2 = guardrails_result1["safe_text"]
      guardrails_result2 = await run_guardrails(ctx, guardrails_inputtext2, "text/plain", instantiate_guardrails(load_config_bundle(guardrails3_config)), suppress_tripwire=True)
      guardrails_hastripwire2 = guardrails_has_tripwire(guardrails_result2)
      guardrails_anonymizedtext2 = get_guardrail_checked_text(guardrails_result2, guardrails_inputtext2)
      guardrails_output2 = (guardrails_hastripwire2 and build_guardrail_fail_output(guardrails_result2 or [])) or (guardrails_anonymizedtext2 or guardrails_inputtext2)
      if guardrails_hastripwire2:
        return guardrails_output2
      else:
        guardrails_inputtext3 = guardrails_result2["safe_text"]
        guardrails_result3 = await run_guardrails(ctx, guardrails_inputtext3, "text/plain", instantiate_guardrails(load_config_bundle(guardrails4_config)), suppress_tripwire=True)
        guardrails_hastripwire3 = guardrails_has_tripwire(guardrails_result3)
        guardrails_anonymizedtext3 = get_guardrail_checked_text(guardrails_result3, guardrails_inputtext3)
        guardrails_output3 = (guardrails_hastripwire3 and build_guardrail_fail_output(guardrails_result3 or [])) or (guardrails_anonymizedtext3 or guardrails_inputtext3)
        if guardrails_hastripwire3:
          return guardrails_output3
        else:
          return guardrails_output3
