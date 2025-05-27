# room.py
from __future__ import annotations
import random, re

from scenarios        import scenarios
from llm_utils        import run_script
from storage          import get_profile
from memory_manager   import relevant


class Agent:
    def __init__(self, name: str, persona: str, **meta):
        self.name    = name.strip()
        self.persona = persona.strip()
        self.meta    = meta


class Room:
    PHASE_NAMES = ["Act I", "Act II", "Act III", "Epilogue"]

    def __init__(self, scenario_id: str, agents: list[Agent], gm: dict):
        self.agents     = agents
        self.gm         = gm
        self.scenario   = next((s for s in scenarios if s["id"] == scenario_id), None)
        if not self.scenario:
            raise ValueError(f"Scenario with id {scenario_id} not found.")
        self.dialogue_history: list[str] = []
        self.phase = 0

    # prompt builder
    def _build_turn_prompt(self, user_agent: Agent, user_instruction: str):
        phase_name = self.PHASE_NAMES[self.phase]
        gm_header = f"### GM persona\n{self.gm['persona']}\n\n"
        common_rules = (
            f"You control **GM** and **all NPCs** (everyone except {user_agent.name}).\n"
            "Produce **one turn** in this exact structure:\n"
            f"1. GM: narration for the current phase.\n"
            f"2. {user_agent.name}: responds.\n"
            "3. One line for *each* other agent (order up to you).\n\n"
        )
        format_rule = (
            "➤ **FORMAT STRICTLY**: each dialogue line must be `Speaker: dialogue` — "
            "no markdown, bullets, or extra prefixes.\n\n"
        )
        direction_rule = (
            "End the turn with **one** consolidation line:\n"
            "GM_DIRECTION: <concise suggestion for where the story should go next>\n"
        )
        system_prompt = gm_header + f"Current phase: **{phase_name}**.\n" + common_rules + format_rule + direction_rule

        bio  = get_profile(user_agent.name) or {}
        bio_lines = [
            f"- Home: {bio.get('home')}" if bio.get("home") else "",
            f"- Hobbies: {bio.get('hobbies')}" if bio.get("hobbies") else "",
            f"- Fun fact: {bio.get('fun_fact')}" if bio.get("fun_fact") else "",
            f"- Personality: {bio.get('personality')}" if bio.get("personality") else "",
        ]
        bio_block = "\n".join(l for l in bio_lines if l) or "*none*"

        mems = relevant(user_agent.name, user_instruction)
        mem_block = "\n".join(f"- {m}" for m in mems) or "*none*"

        cast_md = "\n".join(f"- {a.name}: {a.persona}" for a in self.agents)
        history = "\n".join(self.dialogue_history) or "*none yet*"

        user_prompt = (
            f"### Scenario\n{self.scenario['title']}\n"
            f"### Setup\n{self.scenario['setup']}\n\n"
            f"### Cast\n{cast_md}\n\n"
            f"### {user_agent.name} bio\n{bio_block}\n\n"
            f"### {user_agent.name} memories (top-of-mind)\n{mem_block}\n\n"
            f"### Dialogue so far\n{history}\n\n"
            f"### Director’s order to {user_agent.name}\n{user_instruction}\n\n"
            "### Produce the next turn now."
        )
        return system_prompt, user_prompt

    def _summarise(self):
        prompt = "Briefly summarise in 3-4 sentences what is happening right now:\n\n" + "\n".join(self.dialogue_history)
        return run_script("You are a concise narrator.", prompt, temperature=0.3, max_tokens=150)

    def full_story(self):
        prompt = "Turn the following dialogue into a coherent short story:\n\n" + "\n".join(self.dialogue_history)
        return run_script("You are a creative writer.", prompt, temperature=0.7, max_tokens=1000)

    def process_turn(self, user_agent_name: str, user_instruction: str):
        user_agent = next(a for a in self.agents if a.name == user_agent_name)
        sys_p, usr_p = self._build_turn_prompt(user_agent, user_instruction)
        raw = run_script(sys_p, usr_p, temperature=0.7).strip()
        if not re.search(rf"^{re.escape(user_agent.name)}:", raw, re.I | re.M):
            raw = run_script(
                sys_p,
                usr_p + f"\n(Previous reply lacked a line for {user_agent.name}.)",
                temperature=0.7,
            ).strip()
        self.dialogue_history.append(raw)
        if self.phase < 3:
            self.phase += 1
        summary = self._summarise()
        return {
            "dialogue_segment": raw,
            "phase_label": self.PHASE_NAMES[self.phase] if self.phase < 4 else "Epilogue",
            "summary": summary,
        }
