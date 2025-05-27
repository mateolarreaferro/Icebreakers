import io, random, uuid, re
from flask import Flask, render_template, request, jsonify, send_file

from storage import upsert_profile, get_profile, list_profiles
from memory_manager import add_memory, relevant
from npc_agents import agent_list
from scenarios import scenarios
from gm_profiles import gm_list
from llm_utils import run_script
from room import Agent, Room

app = Flask(__name__)


# routes
game_sessions: dict[str, Room] = {}

# index.html
@app.route("/")
def index():
    return render_template("index.html")

# scenarios list for dropdown
@app.route("/scenarios")
def list_scenarios():
    return jsonify([{k: s[k] for k in ("id", "title")} for s in scenarios])

# game-masters list
@app.route("/gms")
def list_gms():
    return jsonify([{k: g[k] for k in ("id", "name")} for g in gm_list])

# profiles list for dropdown
@app.get("/profiles")
def profiles():
    return jsonify(list_profiles())


# start a game
@app.post("/start_game")
def start_game():
    data = request.json
    scenario_id = data.get("scenario_id")
    gm_id = data.get("gm_id")
    profile_name = data.get("profile_name")
    user_name = data.get("name")
    user_persona = data.get("persona")

    # choose source of agent data
    if profile_name:
        prof = get_profile(profile_name)
        if not prof:
            return jsonify({"error": "profile not found"}), 404
        user_name, user_persona = prof["name"], prof["persona"]

    if not all([scenario_id, gm_id, user_name, user_persona]):
        return jsonify({"error": "missing scenario, gm, name, or persona"}), 400

    if scenario_id == "custom":
        setup = (data.get("custom_setup") or "").strip()
        if not setup:
            return jsonify({"error": "custom_setup required"}), 400
        scenario = {
            "id": f"custom_{uuid.uuid4().hex[:6]}",
            "title": (data.get("custom_title") or "Custom Scenario").strip(),
            "setup": setup,
            "survival_rule": "Survivors:",
            "twists": [],
        }
        scenarios.append(scenario)
        scenario_id = scenario["id"]
    else:
        scenario = next((s for s in scenarios if s["id"] == scenario_id), None)

    gm = next((g for g in gm_list if g["id"] == gm_id), None)
    if not scenario or not gm:
        return jsonify({"error": "invalid scenario_id or gm_id"}), 404

    # build cast
    user_agent = Agent(user_name, user_persona)
    npcs = [a for a in agent_list if a["name"].lower() != user_name.lower()]
    random.shuffle(npcs)
    npc_count = scenario.get("max_agents", 8) - 1
    npcs_for_room = [Agent(a["name"], a["persona"]) for a in npcs[:npc_count]]
    all_agents = [user_agent] + npcs_for_room

    room = Room(scenario_id, all_agents, gm)
    session_id = str(uuid.uuid4())
    game_sessions[session_id] = room

    return jsonify({
        "session_id": session_id,
        "scenario_title": room.scenario["title"],
        "initial_setup": room.scenario["setup"],
        "gm_name": gm["name"],
        "agents": [{"name": a.name, "persona": a.persona} for a in all_agents],
    })


# submit a turn
@app.post("/submit_turn")
def submit_turn():
    data = request.json
    session_id = data.get("session_id")
    user_instruction = data.get("instruction")
    agent_name = data.get("agent_name")

    if not all([session_id, user_instruction, agent_name]):
        return jsonify({"error": "missing parameters"}), 400

    room = game_sessions.get(session_id)
    if not room:
        return jsonify({"error": "invalid session id"}), 404

    result = room.process_turn(agent_name, user_instruction)
    return jsonify(result)


# full story
@app.post("/make_story")
def make_story():
    room = game_sessions.get(request.json.get("session_id"))
    if not room:
        return jsonify({"error":"invalid session id"}), 404
    story = room.full_story()
    return jsonify({"story": story})


# profile create/update
@app.post("/profile")
def create_profile():
    data = request.json
    if not data.get("name") or not data.get("persona"):
        return jsonify({"error": "name and persona required"}), 400
    profile = {
        "name": data["name"].strip(),
        "persona": data["persona"].strip(),
        "home": data.get("home","").strip(),
        "hobbies": data.get("hobbies","").strip(),
        "fun_fact": data.get("fun_fact","").strip(),
        "personality": data.get("personality","").strip(),
    }
    upsert_profile(profile)
    return jsonify({"ok": True})

# profile read
@app.get("/profile/<name>")
def read_profile(name):
    p = get_profile(name)
    if not p: return jsonify({"error":"not found"}), 404
    return jsonify(p)

# memory add
@app.post("/memory")
def add_mem():
    data = request.json
    if not data.get("name") or not data.get("text"):
        return jsonify({"error":"name & text required"}), 400
    add_memory(data["name"], data["text"])
    return jsonify({"ok": True})


# markdown download
@app.post("/download")
def download():
    room = game_sessions.get(request.json.get("session_id"))
    if not room:
        return jsonify({"error":"invalid session id"}), 404

    md = (
        f"# {room.scenario['title']}\n\n"
        f"## GM: {room.gm['name']} ({room.gm['difficulty']})\n\n"
        f"## Setup\n{room.scenario['setup']}\n\n"
        "## Dialogue\n" + "\n\n".join(room.dialogue_history)
    )
    if room.game_over and room.outcome:
        lbl = {
            "lifeboat":"Survivors","bank_heist":"Released",
            "mars_outpost":"Oxygen Recipients","submarine_leak":"Dive Team",
            "expedition_blizzard":"Sheltered","time_paradox":"Stabilized",
        }.get(room.scenario["id"],"Outcome")
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
