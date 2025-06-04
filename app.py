import io, random, uuid, re
from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS

from storage import upsert_profile, get_profile, list_profiles
from memory_manager import add_memory, relevant
from npc_agents import agent_list
from scenarios import scenarios
from gm_profiles import gm_list
from llm_utils import run_script
from room import Agent, Room
from icebreaker_room import IcebreakerRoom, Participant
from user_db import (
    create_or_update_user, get_user, update_user_stats, 
    set_user_ready_status, get_room_ready_status, 
    join_user_to_room, leave_user_from_room, get_user_stats, init_user_db
)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize the user database
init_user_db()

# Storage for both legacy game sessions and new icebreaker rooms
game_sessions: dict[str, Room] = {}
icebreaker_rooms: dict[str, IcebreakerRoom] = {}

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

# get room list
@app.get("/rooms")
def list_rooms():
    room_list = []
    for session_id, room in game_sessions.items():
        room_info = {
            "session_id": session_id,
            "scenario_title": room.scenario["title"],
            "gm_name": room.gm["name"],
            "phase": room.phase,
            "agents": [{"name": a.name, "persona": a.persona} for a in room.agents],
            "game_over": room.game_over,
        }
        if room.game_over:
            room_info["outcome"] = room.outcome
        room_list.append(room_info)
    return jsonify(room_list)

# join room
@app.post("/join_room")
def join_room():
    data = request.json
    session_id = data.get("session_id")
    user_name = data.get("name")
    user_persona = data.get("persona")

    if not all([session_id, user_name, user_persona]):
        return jsonify({"error": "missing session_id, name, or persona"}), 400

    room = game_sessions.get(session_id)
    if not room:
        return jsonify({"error": "invalid session id"}), 404

    user_agent = Agent(user_name, user_persona)
    room.agents.append(user_agent)

    return jsonify({"ok": True})

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

# writing assistant
@app.post("/writing_assistant")
def writing_assistant():
    data = request.json
    session_id = data.get("session_id")
    display_name = data.get("display_name")
    draft_message = data.get("draft_message")
    assistance_type = data.get("assistance_type", "general")  # general, translation, tone
    
    if not all([session_id, display_name, draft_message]):
        return jsonify({"error": "missing session_id, display_name, or draft_message"}), 400

    # Check both legacy rooms and icebreaker rooms
    room = game_sessions.get(session_id) or icebreaker_rooms.get(session_id)
    if not room:
        return jsonify({"error": "invalid session id"}), 404
    
    # Different prompts based on assistance type
    if assistance_type == "translation":
        system_prompt = "You are a translation assistant. Help translate or clarify the meaning of text. Be concise and helpful."
        user_prompt = f'Please help with: "{draft_message}"'
    elif assistance_type == "tone":
        system_prompt = "You are a tone advisor. Suggest how to adjust the tone of messages to be more friendly, clear, or appropriate for college students in a social setting. Be brief and specific."
        user_prompt = f'How can I improve the tone of: "{draft_message}"'
    else:
        # General conversation help for icebreakers
        system_prompt = """You are a helpful conversation assistant for college icebreaker activities. Give brief, practical suggestions to help students engage better in group conversations. Focus on:
- Making shy students more comfortable participating
- Encouraging genuine, interesting responses
- Building on what others have shared
- Being inclusive and friendly

Be concise and natural in your advice. Don't be overly formal or instructional."""
        
        # Get recent context from the room
        recent_context = "Just starting to chat."
        if hasattr(room, '_icebreaker_room'):
            recent_messages = room._icebreaker_room.chat_history[-3:]
            if recent_messages:
                recent_context = "; ".join([f"{msg['sender_name']}: {msg['content'][:50]}" for msg in recent_messages])
        elif hasattr(room, 'chat_history'):
            recent_messages = room.chat_history[-3:]
            if recent_messages:
                recent_context = "; ".join([f"{msg['sender_name']}: {msg['content'][:50]}" for msg in recent_messages])
        
        user_prompt = f"""Recent conversation: {recent_context}

Your draft: "{draft_message}"

Quick suggestion:"""
    
    try:
        assistant_response = run_script(system_prompt, user_prompt, temperature=0.7, max_tokens=150)
        
        # Clean up any bold formatting and excessive formality
        cleaned_response = re.sub(r'\*\*(.*?)\*\*', r'\1', assistant_response.strip())
        cleaned_response = re.sub(r'\*(.*?)\*', r'\1', cleaned_response)
        
        return jsonify({
            "response": cleaned_response
        })
    except Exception as e:
        return jsonify({
            "response": "I'm having trouble right now. Your message looks good - just be yourself!"
        })

# ===== NEW ICEBREAKER ENDPOINTS =====

# User authentication/creation
@app.post("/auth/google")
def google_auth():
    try:
        data = request.json
        google_session_id = data.get("google_session_id")
        display_name = data.get("display_name")
        profile_picture_url = data.get("profile_picture_url")
        
        if not all([google_session_id, display_name]):
            return jsonify({"error": "missing google_session_id or display_name"}), 400
        
        success = create_or_update_user(google_session_id, display_name, profile_picture_url)
        if not success:
            return jsonify({"error": "Failed to create/update user"}), 500
            
        user = get_user(google_session_id)
        if not user:
            return jsonify({"error": "Failed to retrieve user data"}), 500
        
        return jsonify({"user": user})
    except Exception as e:
        print(f"Error in google_auth: {e}")
        return jsonify({"error": "Internal server error"}), 500

# Get user profile
@app.get("/user/<google_session_id>")
def get_user_profile(google_session_id):
    user = get_user(google_session_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    return jsonify({"user": user})

# Create new icebreaker room
@app.post("/create_icebreaker_room")
def create_icebreaker_room():
    data = request.json
    room_title = data.get("room_title", "Icebreaker Chat")
    display_name = data.get("display_name", "Anonymous")
    google_session_id = data.get("google_session_id")
    max_participants = data.get("max_participants", 12)
    
    if not display_name:
        return jsonify({"error": "display_name required"}), 400
    
    if not google_session_id:
        return jsonify({"error": "google_session_id required"}), 400
    
    # Create the room
    room = IcebreakerRoom(
        room_title=room_title,
        facilitator_name="Icebreaker Bot",
        max_participants=max_participants
    )
    
    # Add creator as first participant
    creator = Participant(
        google_session_id=google_session_id,
        display_name=display_name,
        profile_picture=data.get("profile_picture_url")
    )
    
    if not room.add_participant(creator):
        return jsonify({"error": "Failed to add creator to room"}), 500
    
    # Generate initial icebreaker
    try:
        initial_icebreaker = room.generate_icebreaker()
        room.add_icebreaker_message(initial_icebreaker)
    except Exception as e:
        print(f"Failed to generate initial icebreaker: {e}")
        # Continue without initial icebreaker
    
    # Store the room
    icebreaker_rooms[room.session_id] = room
    
    # Update user stats if authenticated
    try:
        stats_updated = update_user_stats(google_session_id, room_joined=True)
        room_joined = join_user_to_room(google_session_id, room.session_id)
        
        if not stats_updated or not room_joined:
            print(f"Warning: Failed to update user stats for {google_session_id}")
    except Exception as e:
        print(f"Error updating user stats: {e}")
        # Continue anyway - room creation shouldn't fail due to stats issues
    
    return jsonify({
        "session_id": room.session_id,
        "room_title": room.room_title,
        "participants": [p.to_dict() for p in room.participants],
        "current_icebreaker": room.current_icebreaker,
        "room_state": room.get_room_state()
    })

# Join icebreaker room
@app.post("/join_icebreaker_room")
def join_icebreaker_room():
    data = request.json
    session_id = data.get("session_id")
    display_name = data.get("display_name")
    google_session_id = data.get("google_session_id")
    profile_picture_url = data.get("profile_picture_url")
    
    if not all([session_id, display_name, google_session_id]):
        return jsonify({"error": "missing session_id, display_name, or google_session_id"}), 400
    
    room = icebreaker_rooms.get(session_id)
    if not room:
        return jsonify({"error": "room not found"}), 404
    
    if not room.is_active:
        return jsonify({"error": "room is no longer active"}), 400
    
    # Check if user is already in the room
    existing_participant = room.get_participant(google_session_id)
    if existing_participant:
        # User is already in room, just return the current state
        return jsonify({
            "success": True,
            "message": "Already in room",
            "room_state": room.get_room_state()
        })
    
    # Create participant
    participant = Participant(
        google_session_id=google_session_id,
        display_name=display_name,
        profile_picture=profile_picture_url
    )
    
    # Try to add participant
    if not room.add_participant(participant):
        if len(room.participants) >= room.max_participants:
            return jsonify({"error": "room is full"}), 400
        else:
            return jsonify({"error": "failed to add participant"}), 400
    
    # Update user stats
    update_user_stats(google_session_id, room_joined=True)
    join_user_to_room(google_session_id, session_id)
    
    return jsonify({
        "success": True,
        "room_state": room.get_room_state()
    })

# Send message to icebreaker room
@app.post("/send_icebreaker_message")
def send_icebreaker_message():
    data = request.json
    session_id = data.get("session_id")
    google_session_id = data.get("google_session_id")
    message_content = data.get("message")
    
    if not all([session_id, google_session_id, message_content]):
        return jsonify({"error": "missing required fields"}), 400
    
    room = icebreaker_rooms.get(session_id)
    if not room:
        return jsonify({"error": "room not found"}), 404
    
    # Add the message
    message = room.add_message(google_session_id, message_content)
    if "error" in message:
        return jsonify(message), 400
    
    # Update user stats
    update_user_stats(google_session_id, message_sent=True)
    
    # Check if we should generate a new icebreaker (timer expired)
    try:
        new_icebreaker = room.safe_generate_new_icebreaker()
        if new_icebreaker:
            room.add_system_message("🎉 New icebreaker generated! Time for a fresh topic.")
    except Exception as e:
        print(f"Failed to auto-generate icebreaker: {e}")
    
    return jsonify({
        "message": message,
        "room_state": room.get_room_state()
    })

# Set ready status
@app.post("/set_ready_status")
def set_ready_status():
    data = request.json
    session_id = data.get("session_id")
    google_session_id = data.get("google_session_id")
    is_ready = data.get("is_ready", False)
    
    if not all([session_id, google_session_id]):
        return jsonify({"error": "missing session_id or google_session_id"}), 400
    
    room = icebreaker_rooms.get(session_id)
    if not room:
        return jsonify({"error": "room not found"}), 404
    
    result = room.set_participant_ready(google_session_id, is_ready)
    if "error" in result:
        return jsonify(result), 400
    
    # Store in database for persistence
    set_user_ready_status(session_id, google_session_id, is_ready)
    
    # If not everyone was ready and a new icebreaker was generated, include room state
    if result.get("new_icebreaker_generated"):
        result["room_state"] = room.get_room_state()
    
    return jsonify(result)

# Get icebreaker rooms list
@app.get("/icebreaker_rooms")
def list_icebreaker_rooms():
    rooms_list = []
    for room in icebreaker_rooms.values():
        if room.is_active:
            rooms_list.append({
                "session_id": room.session_id,
                "room_title": room.room_title,
                "participant_count": len(room.participants),
                "max_participants": room.max_participants,
                "activity_type": room.activity_type,
                "created_at": room.created_at.isoformat(),
                "has_space": len(room.participants) < room.max_participants
            })
    
    # Sort by creation time (newest first)
    rooms_list.sort(key=lambda x: x["created_at"], reverse=True)
    return jsonify(rooms_list)

# Get room state
@app.get("/icebreaker_room/<session_id>")
def get_icebreaker_room(session_id):
    room = icebreaker_rooms.get(session_id)
    if not room:
        return jsonify({"error": "room not found"}), 404
    
    # Check if we should auto-generate a new icebreaker (safe method prevents duplicates)
    try:
        new_icebreaker = room.safe_generate_new_icebreaker()
        if new_icebreaker:
            room.add_system_message("🎉 New icebreaker generated! Everyone's ready status has been reset.")
    except Exception as e:
        print(f"Failed to auto-generate icebreaker: {e}")
    
    return jsonify(room.get_room_state())

# Force generate new icebreaker (for testing or manual control)
@app.post("/generate_icebreaker")
def generate_icebreaker():
    data = request.json
    session_id = data.get("session_id")
    
    # Check both legacy and new rooms
    room = icebreaker_rooms.get(session_id)
    if not room:
        # Legacy support
        legacy_room = game_sessions.get(session_id)
        if legacy_room and hasattr(legacy_room, '_icebreaker_room'):
            room = legacy_room._icebreaker_room
    
    if not room:
        return jsonify({"error": "room not found"}), 404
    
    try:
        new_icebreaker = room.generate_icebreaker()
        room.add_icebreaker_message(new_icebreaker)
        
        return jsonify({
            "icebreaker": new_icebreaker,
            "room_state": room.get_room_state()
        })
    except Exception as e:
        return jsonify({"error": f"Failed to generate icebreaker: {str(e)}"}), 500

# Votekick endpoints
@app.post("/start_votekick")
def start_votekick():
    try:
        data = request.json
        session_id = data.get("session_id")
        initiator_id = data.get("initiator_id") 
        target_id = data.get("target_id")
        reason = data.get("reason", "")
        
        if not all([session_id, initiator_id, target_id]):
            return jsonify({"error": "missing required fields"}), 400
        
        room = icebreaker_rooms.get(session_id)
        if not room:
            return jsonify({"error": "room not found"}), 404
        
        result = room.start_votekick(initiator_id, target_id, reason)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result)
    except Exception as e:
        print(f"Error starting votekick: {e}")
        return jsonify({"error": "Internal server error"}), 500

@app.post("/vote_on_kick")
def vote_on_kick():
    try:
        data = request.json
        session_id = data.get("session_id")
        voter_id = data.get("voter_id")
        target_id = data.get("target_id") 
        vote = data.get("vote")  # True for yes, False for no
        
        if not all([session_id, voter_id, target_id]) or vote is None:
            return jsonify({"error": "missing required fields"}), 400
        
        room = icebreaker_rooms.get(session_id)
        if not room:
            return jsonify({"error": "room not found"}), 404
        
        result = room.vote_on_kick(voter_id, target_id, vote)
        
        if "error" in result:
            return jsonify(result), 400
        
        return jsonify(result)
    except Exception as e:
        print(f"Error voting on kick: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True)
