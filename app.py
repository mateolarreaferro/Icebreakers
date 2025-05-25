import io, random, uuid, re
from flask import Flask, render_template, request, jsonify, send_file

from storage import upsert_profile, get_profile
from memory_manager import add_memory, relevant
from npc_agents import agent_list
from scenarios import scenarios
from gm_profiles import gm_list  
from llm_utils import run_script
from room import Agent, Room

app = Flask(__name__)


#  Routes
game_sessions: dict[str, Room] = {}

# Displays index.html
@app.route("/")
def index():
    return render_template("index.html")

# Resturns JSON list of scenarios - used to populate the scenario dropdown in the frontend
@app.route("/scenarios")
def list_scenarios():
    return jsonify([{k: s[k] for k in ("id", "title")} for s in scenarios])

# Returns JSON list of game masters (with difficulty level) - for frontend too
@app.route("/gms")
def list_gms():
    return jsonify([{k: g[k] for k in ("id", "name", "difficulty")} for g in gm_list])

# Initialized game session. Receives scenario ID, GameMaster ID, player name + persona from frontend
# Validates Inputs, Finds Selected Scenario and GM, builds the 'cast', creates room object, stores room in memory (with unique sesion id)
@app.route("/start_game", methods=["POST"])
def start_game():
    data          = request.json
    scenario_id   = data.get("scenario_id")
    gm_id         = data.get("gm_id")  
    user_name     = data.get("name")
    user_persona  = data.get("persona")

    if not all([scenario_id, gm_id, user_name, user_persona]):
        return jsonify({"error": "Missing scenario, GM, name, or persona"}), 400

    scenario = next((s for s in scenarios if s["id"] == scenario_id), None)
    gm       = next((g for g in gm_list   if g["id"] == gm_id), None)
    if not scenario or not gm:
        return jsonify({"error": "Invalid scenario_id or gm_id"}), 404

    # build cast
    user_agent    = Agent(user_name, user_persona)
    npcs          = [a for a in agent_list if a["name"].lower() != user_name.lower()]
    random.shuffle(npcs)
    npc_count     = scenario.get("max_agents", 8) - 1
    npcs_for_room = [Agent(a["name"], a["persona"]) for a in npcs[:npc_count]]
    all_agents    = [user_agent] + npcs_for_room

    room = Room(scenario_id, all_agents, gm)       # pass GM
    session_id = str(uuid.uuid4())
    game_sessions[session_id] = room

    return jsonify({
        "session_id":     session_id,
        "scenario_title": room.scenario["title"],
        "initial_setup":  room.scenario["setup"],
        "gm_name":        gm["name"],
        "gm_difficulty":  gm["difficulty"],
        "agents":         [{"name": a.name, "persona": a.persona} for a in all_agents],
    })


# processes a single turn of the game (main loop of interaction)
# receives session iD, agent name, and user interaction from frontend + retrieves matching room from game_sessions
# builds a prompt, sends to gpt, parses response, advances the phase, add outcome (if game ends)
# returns full turn result as json
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


# Profiles
@app.post("/profile")
def create_profile():
    data = request.json
    required = ("name", "persona")
    if not all(data.get(k, "").strip() for k in required):
        return jsonify({"error": "name and persona required"}), 400
    profile = {
        "name" : data["name"].strip(),
        "persona": data["persona"].strip(),
        "home": data.get("home", "").strip(),
        "hobbies": data.get("hobbies", "").strip(),
        "fun_fact" : data.get("fun_fact", "").strip(),
        "personality": data.get("personality", "").strip(),
    }
    upsert_profile(profile)
    return jsonify({"ok": True})

@app.get("/profile/<name>")
def read_profile(name):
    p = get_profile(name)
    if not p: return jsonify({"error": "not found"}), 404
    return jsonify(p)

# Memories
@app.post("/memory")
def add_mem():
    data = request.json
    if not all(data.get(k) for k in ("name", "text")):
        return jsonify({"error": "name & text required"}), 400
    add_memory(data["name"], data["text"])
    return jsonify({"ok": True})



# creates downloadable markdown of the dialogue/sim
@app.route("/download", methods=["POST"])
def download():
    room = game_sessions.get(request.json.get("session_id"))
    if not room:
        return jsonify({"error": "Invalid session ID"}), 404

    md = (
        f"# {room.scenario['title']}\n\n"
        f"## GM: {room.gm['name']} ({room.gm['difficulty']})\n\n"
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
