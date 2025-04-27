import os, re, json
from typing import Dict, List
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic

# load_dotenv()
from settings import *  # OPENAI_API_KEY must be defined here

oai = OpenAI(api_key=OPENAI_API_KEY)

ant = Anthropic()
ant.api_key = os.getenv("ANTHROPIC_API_KEY")

# --------------------------------------------------------------------------- #
# core wrappers
# --------------------------------------------------------------------------- #

def gen_oai(messages, model: str = "gpt-4o", temperature: float = 1):
    try:
        r = oai.chat.completions.create(
            model=model,
            temperature=temperature,
            messages=messages,
            max_tokens=1000,
        )
        return r.choices[0].message.content
    except Exception as e:
        print("OpenAI error:", e)
        raise


def simple_gen_oai(prompt, model="gpt-4o", temperature=1):
    return gen_oai([{"role": "user", "content": prompt}], model, temperature)


def gen_ant(messages, model="claude-3-5-sonnet-20240620", temperature=1, max_tokens=1000):
    try:
        r = ant.messages.create(
            model=model, max_tokens=max_tokens, temperature=temperature, messages=messages
        )
        return r.content[0].text
    except Exception as e:
        print("Anthropic error:", e)
        raise


def simple_gen_ant(prompt, model="claude-3-5-sonnet-20240620"):
    return gen_ant([{"role": "user", "content": prompt}], model)


# --------------------------------------------------------------------------- #
# new helper: single-shot script generator
# --------------------------------------------------------------------------- #

def run_script(system_prompt: str, user_prompt: str, *, model="gpt-4o", temperature=1):
    """
    Convenience wrapper: given full system + user prompt strings, return raw text.
    """
    msgs = [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}]
    return gen_oai(msgs, model=model, temperature=temperature)


# --------------------------------------------------------------------------- #
# prompt-assembly helpers (unchanged)
# --------------------------------------------------------------------------- #

def fill_prompt(prompt, placeholders):
    for tag, val in placeholders.items():
        prompt = prompt.replace(f"!<{tag.upper()}>!", str(val))
    return prompt


def make_output_format(modules):
    out = "Output Format:\n{\n"
    for m in modules:
        if m.get("name"):
            out += f'    "{m["name"].lower()}": "<your response>",\n'
    return out.rstrip(",\n") + "\n}"


def modular_instructions(modules):
    prompt, step = "", 0
    for m in modules:
        step += 1
        name = m.get("name")
        instr = m["instruction"]
        prompt += f"Step {step}{' ('+name+')' if name else ''}: {instr}\n"
    return prompt + "\n" + make_output_format(modules)


# --------------------------------------------------------------------------- #
# parsing helpers (unchanged)
# --------------------------------------------------------------------------- #

def parse_json(response, target_keys=None):
    start, end = response.find("{"), response.rfind("}") + 1
    blob = response[start:end].replace('\\"', '"')
    try:
        parsed = json.loads(blob)
        return {k: parsed.get(k, "") for k in target_keys} if target_keys else parsed
    except json.JSONDecodeError:
        print("JSON parse failed, using regex fallback")
        parsed = {}
        for m in re.finditer(r'"(\w+)":', blob):
            k = m.group(1)
            if target_keys and k not in target_keys:
                continue
            val_match = re.search(r':\s*"(.*?)"(?:,|\s*})', blob[m.end() - 1 :])
            if val_match:
                parsed[k] = val_match.group(1)
        return {k: parsed.get(k, "") for k in target_keys} if target_keys else parsed


def mod_gen(modules: List[Dict], placeholders: Dict, target_keys=None) -> Dict:
    prompt = modular_instructions(modules)
    filled = fill_prompt(prompt, placeholders)
    resp = simple_gen_oai(filled)
    if not target_keys:
        target_keys = [m["name"].lower() for m in modules if m.get("name")]
    return parse_json(resp, target_keys)
