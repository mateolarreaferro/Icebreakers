import io, random
from flask import Flask, render_template, request, jsonify, send_file
from agents import agent_list               # existing NPCs
from scenarios import scenarios             # new
from llm_utils import run_script            # new helper

app = Flask(__name__)

# ---------- Models ---------- #

class Agent:
    def __init__(self, name: str, persona: str):
        self.name = name.strip()
        self.role = persona.strip()

class Room:
    """Single-run simulation (no memory)."""
    def __init__(self, scenario_id: str, agents: list[Agent]):
        self.agents   = agents
        self.scenario = next(s for s in scenarios if s["id"] == scenario_id)

    # ---- Prompt builders ---- #
    def _system_prompt(self) -> str:
        return (
            "You are a narrative engine that writes ONLY dialogue. "
            "Write a tense, realistic conversation script. "
            "Each turn starts with the speaker’s name, then a colon, then the line. "
            "Keep messages short (1-2 sentences). "
            f"{self.scenario['survival_rule']}"
        )

    def _user_prompt(self) -> str:
        # shuffle for a bit of freshness
        random.shuffle(self.agents)
        intro_lines = "\n".join(
            f"{ag.name}: {ag.role}" for ag in self.agents
        )
        return (
            f"{self.scenario['setup']}\n\n"
            "Crew manifest:\n"
            f"{intro_lines}\n\n"
            "Begin the conversation now."
        )

    # ---- Run ---- #
    def simulate(self) -> dict:
        raw = run_script(self._system_prompt(), self._user_prompt())

        # crude parse: split off survivors line if present
        survivors = []
        if "\nSURVIVORS:" in raw.upper():
            *dialog, last = raw.rsplit("\n", 1)
            survivors_line = last.strip()
            survivors = [
                name.strip() for name in survivors_line.split(":", 1)[-1].split(",")
            ]
            dialogue = "\n".join(dialog).strip()
        else:
            dialogue = raw.strip()   # fallback

        return {"dialogue": dialogue, "survivors": survivors}

# ---------- Routes ---------- #

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/scenarios")
def list_scenarios():
    return jsonify([{k: s[k] for k in ("id", "title")} for s in scenarios])

@app.route("/simulate", methods=["POST"])
def simulate():
    data = request.json
    scenario_id = data["scenario_id"]
    # Player-created agent goes first; NPCs fill the rest
    user_agent = Agent(data["name"], data["persona"])
    npcs       = [Agent(a["name"], a["persona"]) for a in agent_list]
    room       = Room(scenario_id, [user_agent] + npcs[:9])   # 10 total
    result     = room.simulate()
    return jsonify(result)

@app.route("/download", methods=["POST"])
def download():
    content = request.json["markdown"]
    buf = io.BytesIO(content.encode())
    buf.seek(0)
    return send_file(
        buf, as_attachment=True,
        download_name="simulation.md",
        mimetype="text/markdown"
    )

if __name__ == "__main__":
    app.run(debug=True)
