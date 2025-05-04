import io, random, uuid, re
from flask import Flask, render_template, request, jsonify, send_file
from npc_agents import agent_list
from scenarios import scenarios
from llm_utils import run_script

app = Flask(__name__)

# ──────────────────────────────────────────────────────────────────────────
#  Models
# ──────────────────────────────────────────────────────────────────────────
class Agent:
    def __init__(self, name: str, persona: str):
        self.name    = name.strip()
        self.persona = persona.strip()

class Room:
    """Four‑phase simulation: intro → decision1 → decision2 → resolution."""
    PHASE_NAMES = ["Introduction", "First decision", "Second decision", "Resolution"]

    def __init__(self, scenario_id: str, agents: list["Agent"]):
        self.agents   = agents                      # alive only
        self.scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
        if not self.scenario:
            raise ValueError(f"Scenario with id {scenario_id} not found.")

        self.dialogue_history: list[str] = []
        self.twists_remaining           = self.scenario.get("twists", []).copy()
        random.shuffle(self.twists_remaining)

        self.phase        = 0            # 0 → 1 → 2 → 3
        self.game_over    = False
        self.outcome: list[str] | None = None

        self._rule_prefix = self.scenario["survival_rule"].split(":")[0].split()[-1]

    # ──────────────────────────────────────────────────────────────────────
    # prompt builder
    def _build_turn_prompt(self, user_agent: Agent, user_instruction: str) -> tuple[str, str]:
        phase_name  = self.PHASE_NAMES[self.phase]
        alive_names = [a.name for a in self.agents]

        # ---------- SYSTEM ----------
        common = (
            f"You control **GM** and **all NPCs** (everyone except {user_agent.name}).\n"
            "Produce **one turn only** in this exact structure:\n"
            "1. **GM:** narration for the current phase.\n"
            f"2. **{user_agent.name}:** obeys the director.\n"
            "3. One line for *each* other living agent (order is up to you).\n\n"
        )
        kill_rule = (
            "At the very end add **one** line:\n"
            "DEAD: <Name>\n"
            "The named NPC must be removed from play and never speak again.\n\n"
        )
        resolution_rule = (
            "First let the GM summarise what happened (≤3 lines). "
            "Then end with **one** line:\n"
            f"RESOLUTION: {self._rule_prefix}: <comma‑separated survivor names>"
        )
        system_prompt = (
            f"Current phase: **{phase_name}**.\n"
            + common
            + (kill_rule if self.phase < 3 else resolution_rule)
        )

        # ---------- USER ----------
        cast_md   = "\n".join(f"- {a.name}: {a.persona}" for a in self.agents)
        history   = "\n".join(self.dialogue_history) or "*none yet*"
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
    def _apply_deaths(self, text: str) -> None:
        m = re.search(r"^DEAD\s*:?\s*(.+)$", text, re.I | re.M)
        if not m:
            return
        dead_names = [n.strip() for n in m.group(1).split(",") if n.strip()]
        self.agents = [a for a in self.agents if a.name not in dead_names]

    # ──────────────────────────────────────────────────────────────────────
    # single turn
    def process_turn(self, user_agent_name: str, user_instruction: str) -> dict:
        if self.game_over:
            return {"dialogue_segment": "", "game_over": True, "outcome": self.outcome}

        user_agent = next(a for a in self.agents if a.name == user_agent_name)
        sys_p, usr_p = self._build_turn_prompt(user_agent, user_instruction)
        raw = run_script(sys_p, usr_p).strip()

        # ensure user‑agent line appears
        if not re.search(rf"^{re.escape(user_agent_name)}:", raw, re.I | re.M):
            raw = run_script(
                sys_p, usr_p + f"\n(Previous reply lacked a line for {user_agent_name}.)"
            ).strip()

        self.dialogue_history.append(raw)
        self._apply_deaths(raw)

        # —— RESOLUTION check (prefix OPTIONAL) ——
        m = re.search(
            rf"^RESOLUTION:\s*(?:{self._rule_prefix}\s*:\s*)?(.+)$",
            raw, re.I | re.M
        )
        if m:
            self.game_over = True
            self.outcome   = [n.strip() for n in m.group(1).split(",") if n.strip()]

        # —— twist injection ——
        if not self.game_over and self.phase < 2 and self.twists_remaining:
            twist = self.twists_remaining.pop()
            twist_line = f"GM: {twist}"
            self.dialogue_history.append(twist_line)
            raw += "\n" + twist_line

        # —— phase advance (never beyond index 3) ——
        if not self.game_over and self.phase < 3:
            self.phase += 1

        return {
            "dialogue_segment": raw,
            "phase_label": self.PHASE_NAMES[min(self.phase, 3)],
            "game_over": self.game_over,
            "outcome": self.outcome,
        }


# ──────────────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────────────
game_sessions: dict[str, Room] = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/scenarios")
def list_scenarios():
    return jsonify([{k: s[k] for k in ("id", "title")} for s in scenarios])

@app.route("/start_game", methods=["POST"])
def start_game():
    data          = request.json
    scenario_id   = data.get("scenario_id")
    user_name     = data.get("name")
    user_persona  = data.get("persona")

    if not all([scenario_id, user_name, user_persona]):
        return jsonify({"error": "Missing scenario, name, or persona"}), 400

    scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
    if not scenario:
        return jsonify({"error": f"Scenario '{scenario_id}' not found"}), 404

    # build cast
    user_agent    = Agent(user_name, user_persona)
    npcs          = [a for a in agent_list if a["name"].lower() != user_name.lower()]
    random.shuffle(npcs)
    max_total     = scenario.get("max_agents", 8)
    npc_count     = max_total - 1
    npcs_for_room = [Agent(a["name"], a["persona"]) for a in npcs[:npc_count]]
    all_agents    = [user_agent] + npcs_for_room

    room = Room(scenario_id, all_agents)
    session_id = str(uuid.uuid4())
    game_sessions[session_id] = room

    return jsonify(
        {
            "session_id": session_id,
            "scenario_title": room.scenario["title"],
            "initial_setup": room.scenario["setup"],
            "agents": [{"name": a.name, "persona": a.persona} for a in all_agents],
        }
    )

@app.route("/submit_turn", methods=["POST"])
def submit_turn():
    data            = request.json
    session_id      = data.get("session_id")
    user_instruction= data.get("instruction")
    agent_name      = data.get("agent_name")

    if not all([session_id, user_instruction, agent_name]):
        return jsonify({"error": "Missing parameters"}), 400

    room = game_sessions.get(session_id)
    if not room:
        return jsonify({"error": "Invalid session ID"}), 404

    result = room.process_turn(agent_name, user_instruction)
    if result["game_over"]:
        lbl = {
            "lifeboat": "Survivors", "bank_heist": "Released",
            "mars_outpost": "Oxygen Recipients", "submarine_leak": "Dive Team",
            "expedition_blizzard": "Sheltered", "time_paradox": "Stabilized",
        }.get(room.scenario["id"], "Outcome")
        result["outcome_label"] = lbl
    return jsonify(result)

@app.route("/download", methods=["POST"])
def download():
    room = game_sessions.get(request.json.get("session_id"))
    if not room:
        return jsonify({"error": "Invalid session ID"}), 404

    md = (
        f"# {room.scenario['title']}\n\n"
        f"## Setup\n{room.scenario['setup']}\n\n"
        "## Dialogue\n" + "\n\n".join(room.dialogue_history)
    )
    if room.game_over and room.outcome:
        lbl = {
            "lifeboat": "Survivors", "bank_heist": "Released",
            "mars_outpost": "Oxygen Recipients", "submarine_leak": "Dive Team",
            "expedition_blizzard": "Sheltered", "time_paradox": "Stabilized",
        }.get(room.scenario["id"], "Outcome")
        md += f"\n\n## {lbl}\n{', '.join(room.outcome)}"

    buf = io.BytesIO(md.encode())
    buf.seek(0)
    return send_file(
        buf,
        as_attachment=True,
        download_name=f"{room.scenario['id']}_simulation.md",
        mimetype="text/markdown",
    )

if __name__ == "__main__":
    app.run(debug=True)
