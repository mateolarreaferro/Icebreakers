# room.py
from __future__ import annotations
import random, re
from scenarios import scenarios
from llm_utils import run_script

# ────────────────────────────────────────────────────────────────────────────
# Agent
# ────────────────────────────────────────────────────────────────────────────
class Agent:
    """Simple data holder for name / persona."""
    def __init__(self, name: str, persona: str):
        self.name  = name.strip()
        self.persona = persona.strip()

# ────────────────────────────────────────────────────────────────────────────
# Room
# ────────────────────────────────────────────────────────────────────────────
class Room:
    """
    Four‑phase simulation:
        0  Introduction   (GM intro → everyone speaks → DEAD)
        1  First decision (twist injected) → everyone speaks → DEAD
        2  Second decision (twist injected) → everyone speaks → DEAD
        3  Resolution     (GM summary → RESOLUTION line)

    The client passes user‑agent name + director instruction for each turn.
    """

    PHASE_NAMES = ["Introduction", "First decision", "Second decision", "Resolution"]

    def __init__(self, scenario_id: str, agents: list[Agent]):
        self.agents     = agents  # alive list
        self.scenario   = next((s for s in scenarios if s["id"] == scenario_id), None)
        if not self.scenario:
            raise ValueError(f"Scenario with id {scenario_id} not found.")

        self.dialogue_history: list[str] = []
        self.twists_remaining            = self.scenario.get("twists", []).copy()
        random.shuffle(self.twists_remaining)

        self.phase      = 0           # 0‑3
        self.game_over  = False
        self.outcome: list[str] | None = None  # final survivors

        self._rule_prefix = self.scenario["survival_rule"].split(":")[0].split()[-1]

    # ──────────────────────────────────────────────────────────────────────
    # prompt builder
    # ──────────────────────────────────────────────────────────────────────
    def _build_turn_prompt(
        self, user_agent: Agent, user_instruction: str
    ) -> tuple[str, str]:
        phase_name = self.PHASE_NAMES[self.phase]

        # ---------- SYSTEM ----------
        common_rules = (
            f"You control **GM** and **all NPCs** (everyone except {user_agent.name}).\n"
            "Produce **one turn only** in this exact structure:\n"
            f"1. GM: narration for the current phase.\n"
            f"2. {user_agent.name}: obeys the director.\n"
            "3. One line for *each* other living agent (order up to you).\n\n"
        )
        format_rule = (
            "➤ **FORMAT STRICTLY**: each dialogue line must be `Speaker: dialogue` —"
            " no markdown headings, bullets, asterisks, or extra prefixes.\n"
            "   Example:\n"
            "   GM: The storm intensifies.\n"
            "   Mandela: We must stay calm.\n\n"
        )
        kill_rule = (
            "End this turn with one line:\n"
            "DEAD: <Name>\n\n"
        )
        resolution_rule = (
            "First the GM summarises (≤3 lines). Then end with one line:\n"
            f"RESOLUTION: {self._rule_prefix}: <comma‑separated survivor names>"
        )
        system_prompt = (
            f"Current phase: **{phase_name}**.\n"
            + common_rules
            + format_rule
            + (kill_rule if self.phase < 3 else resolution_rule)
        )

        # ---------- USER ----------
        cast_md = "\n".join(f"- {a.name}: {a.persona}" for a in self.agents)
        history = "\n".join(self.dialogue_history) or "*none yet*"
        user_prompt = (
            f"### Scenario\n{self.scenario['title']}\n"
            f"### Setup\n{self.scenario['setup']}\n\n"
            f"### Cast (alive)\n{cast_md}\n\n"
            f"### Dialogue so far\n{history}\n\n"
            f"### Director’s order to {user_agent.name}\n{user_instruction}\n\n"
            "### Produce the next turn now."
        )
        return system_prompt, user_prompt

    # ──────────────────────────────────────────────────────────────────────
    # helpers
    # ──────────────────────────────────────────────────────────────────────
    def _apply_deaths(self, text: str) -> None:
        """Remove any agents listed after a DEAD line."""
        m = re.search(r"^DEAD\s*:?\s*(.+)$", text, re.I | re.M)
        if not m:
            return
        dead_names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        self.agents = [a for a in self.agents if a.name not in dead_names]

    # ──────────────────────────────────────────────────────────────────────
    # single turn
    # ──────────────────────────────────────────────────────────────────────
    def process_turn(
        self, user_agent_name: str, user_instruction: str
    ) -> dict[str, object]:
        """Return dict consumed by Flask route and front‑end JS."""
        if self.game_over:
            return {"dialogue_segment": "", "game_over": True, "outcome": self.outcome}

        user_agent = next(a for a in self.agents if a.name == user_agent_name)

        sys_p, usr_p = self._build_turn_prompt(user_agent, user_instruction)
        raw = run_script(sys_p, usr_p).strip()

        # ensure user‑agent speaks; retry once if missing
        if not re.search(rf"^{re.escape(user_agent_name)}:", raw, re.I | re.M):
            raw = run_script(
                sys_p,
                usr_p + f"\n(Previous reply lacked a line for {user_agent_name}.)",
            ).strip()

        # store and apply side‑effects
        self.dialogue_history.append(raw)
        self._apply_deaths(raw)

        # ---------- RESOLUTION ----------
        m = re.search(
            rf"^RESOLUTION:\s*(?:{self._rule_prefix}\s*:\s*)?(.+)$",
            raw,
            re.I | re.M,
        )
        if m:
            self.game_over = True
            self.outcome = [n.strip() for n in m.group(1).split(",") if n.strip()]

        # ---------- twist injection ----------
        if not self.game_over and self.phase < 2 and self.twists_remaining:
            twist = self.twists_remaining.pop()
            twist_line = f"GM: {twist}"
            self.dialogue_history.append(twist_line)
            raw += "\n" + twist_line

        # advance phase counter (max 3)
        if not self.game_over and self.phase < 3:
            self.phase += 1

        return {
            "dialogue_segment": raw,
            "phase_label": self.PHASE_NAMES[min(self.phase, 3)],
            "game_over": self.game_over,
            "outcome": self.outcome,
        }
