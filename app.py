import io, random, uuid, re
from flask import Flask, render_template, request, jsonify, send_file
from npc_agents import agent_list
from scenarios import scenarios
from llm_utils import run_script
from room import Agent, Room 

app = Flask(__name__)

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
