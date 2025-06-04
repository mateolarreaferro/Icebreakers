# room.py - Icebreaker Chat Room System
from __future__ import annotations
import time
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Optional

from llm_utils import run_script


# Represents a participant in the icebreaker chat
class Participant:
    def __init__(self, google_session_id: str, display_name: str = None, profile_picture: str = None, **meta):
        self.google_session_id = google_session_id
        self.display_name = display_name or f"User_{google_session_id[:8]}"
        self.profile_picture = profile_picture
        self.meta = meta
        self.last_active = datetime.now()
        self.message_count = 0
        self.is_ready = False
        self.joined_at = datetime.now()

    def to_dict(self):
        return {
            "google_session_id": self.google_session_id,
            "display_name": self.display_name,
            "profile_picture": self.profile_picture,
            "message_count": self.message_count,
            "is_ready": self.is_ready,
            "joined_at": self.joined_at.isoformat()
        }
    
    @property
    def name(self):
        """Backward compatibility property"""
        return self.display_name


class IcebreakerRoom:
    ACTIVITY_TYPES = ["introductions", "getting_to_know", "creative", "hypothetical", "reflection"]
    
    def __init__(self, room_title: str, facilitator_name: str = "Icebreaker Bot", max_participants: int = 12):
        self.session_id = str(uuid.uuid4())
        self.room_title = room_title
        self.facilitator_name = facilitator_name
        self.participants: List[Participant] = []
        self.max_participants = max_participants
        self.created_at = datetime.now()
        self.is_active = True
        self.current_icebreaker = None
        self.icebreaker_history: List[str] = []
        self.chat_history: List[Dict] = []
        self.ready_timer_start = None
        self.ready_timer_duration = 60  # seconds
        self.activity_type = "introductions"
        self.context_tags = []  # For LLM context (e.g., "engineering_students", "international_group")
        self._generating_icebreaker = False  # Flag to prevent multiple simultaneous generations
        
        # Votekick system
        self.active_votekicks: Dict[str, Dict] = {}  # target_user_id -> votekick_data
        self.votekick_duration = 60  # seconds to complete a vote
        self.votekick_threshold = 0.6  # 60% of participants must vote to kick
        
    def add_participant(self, participant: Participant) -> bool:
        """Add a participant to the room if there's space and they're not already in"""
        if len(self.participants) >= self.max_participants:
            print(f"Room {self.session_id}: Cannot add participant - room is full ({len(self.participants)}/{self.max_participants})")
            return False
        
        # Check if participant already exists by google_session_id
        for p in self.participants:
            if p.google_session_id == participant.google_session_id:
                print(f"Room {self.session_id}: Participant {participant.google_session_id} already in room")
                return False
        
        self.participants.append(participant)
        self.add_system_message(f"{participant.display_name} joined the chat")
        print(f"Room {self.session_id}: Added participant {participant.display_name} ({participant.google_session_id}). Room now has {len(self.participants)} participants.")
        return True
    
    def remove_participant(self, google_session_id: str) -> bool:
        """Remove a participant from the room"""
        for i, participant in enumerate(self.participants):
            if participant.google_session_id == google_session_id:
                self.add_system_message(f"{participant.display_name} left the chat")
                self.participants.pop(i)
                
                # Clean up any active votekicks involving this participant
                self.cleanup_votekicks_for_participant(google_session_id)
                return True
        return False
    
    def add_message(self, sender_id: str, content: str) -> Dict:
        """Add a message to the chat history"""
        participant = self.get_participant(sender_id)
        if not participant:
            return {"error": "Participant not found"}
        
        message = {
            "id": str(uuid.uuid4()),
            "sender_id": sender_id,
            "sender_name": participant.display_name,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "type": "user_message"
        }
        
        self.chat_history.append(message)
        participant.message_count += 1
        participant.last_active = datetime.now()
        
        return message
    
    def add_system_message(self, content: str) -> Dict:
        """Add a system message to the chat"""
        message = {
            "id": str(uuid.uuid4()),
            "sender_id": "system",
            "sender_name": "System",
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "type": "system_message"
        }
        
        self.chat_history.append(message)
        return message
    
    def add_icebreaker_message(self, icebreaker: str) -> Dict:
        """Add an icebreaker prompt to the chat"""
        self.current_icebreaker = icebreaker
        self.icebreaker_history.append(icebreaker)
        
        message = {
            "id": str(uuid.uuid4()),
            "sender_id": "icebreaker_bot",
            "sender_name": self.facilitator_name,
            "content": icebreaker,
            "timestamp": datetime.now().isoformat(),
            "type": "icebreaker"
        }
        
        self.chat_history.append(message)
        
        # Reset all ready states when new icebreaker is introduced
        for participant in self.participants:
            participant.is_ready = False
        self.ready_timer_start = None
        self._generating_icebreaker = False  # Reset the flag
        
        return message
    
    def set_participant_ready(self, google_session_id: str, is_ready: bool) -> Dict:
        """Set a participant's ready status"""
        participant = self.get_participant(google_session_id)
        if not participant:
            return {"error": "Participant not found"}
        
        participant.is_ready = is_ready
        ready_count = sum(1 for p in self.participants if p.is_ready)
        total_participants = len(self.participants)
        
        # Check if 100% are ready - generate immediately
        if ready_count == total_participants and total_participants > 1:
            try:
                new_icebreaker = self.safe_generate_new_icebreaker()
                if new_icebreaker:
                    self.add_system_message("🎉 Everyone's ready! Here's a new icebreaker topic.")
                    return {
                        "ready_count": 0,  # Reset after generating
                        "total_participants": total_participants,
                        "timer_active": False,
                        "seconds_remaining": None,
                        "new_icebreaker_generated": True
                    }
            except Exception as e:
                print(f"Failed to generate icebreaker when everyone ready: {e}")
        
        # Check if 50%+ are ready and start timer (but not if 100% ready)
        elif ready_count >= max(1, total_participants // 2) and not self.ready_timer_start:
            self.ready_timer_start = datetime.now()
            self.add_system_message(f"⏰ {ready_count}/{total_participants} participants are ready. New topic in 60 seconds!")
        
        return {
            "ready_count": ready_count,
            "total_participants": total_participants,
            "timer_active": self.ready_timer_start is not None,
            "seconds_remaining": self.get_timer_remaining()
        }
    
    def get_timer_remaining(self) -> Optional[int]:
        """Get remaining seconds on the ready timer"""
        if not self.ready_timer_start:
            return None
        
        elapsed = (datetime.now() - self.ready_timer_start).total_seconds()
        remaining = max(0, self.ready_timer_duration - elapsed)
        
        if remaining <= 0:
            return 0
        
        return int(remaining)
    
    def should_generate_new_icebreaker(self) -> bool:
        """Check if it's time to generate a new icebreaker"""
        if not self.ready_timer_start or self._generating_icebreaker:
            return False
        
        return self.get_timer_remaining() == 0
    
    def get_participant(self, google_session_id: str) -> Optional[Participant]:
        """Get a participant by their session ID"""
        for participant in self.participants:
            if participant.google_session_id == google_session_id:
                return participant
        return None
    
    def generate_icebreaker(self) -> str:
        """Generate a new icebreaker question using LLM"""
        
        # Determine activity type based on conversation flow
        if len(self.icebreaker_history) == 0:
            self.activity_type = "introductions"
        elif len(self.icebreaker_history) <= 2:
            self.activity_type = "getting_to_know"
        elif len(self.icebreaker_history) <= 4:
            self.activity_type = "creative"
        else:
            self.activity_type = "reflection"
        
        # Get recent chat context for better prompts
        recent_messages = self.chat_history[-10:] if self.chat_history else []
        topics_mentioned = []
        
        for msg in recent_messages:
            if msg["type"] == "user_message" and len(msg["content"]) > 10:
                topics_mentioned.append(msg["content"][:50])
        
        context_info = f"Group size: {len(self.participants)} college students"
        if topics_mentioned:
            context_info += f". Recent topics: {', '.join(topics_mentioned[-3:])}"
        
        if self.context_tags:
            context_info += f". Group context: {', '.join(self.context_tags)}"
        
        # Previous icebreakers for avoiding repetition
        previous_context = ""
        if self.icebreaker_history:
            previous_context = f"Previous questions asked: {'; '.join(self.icebreaker_history[-3:])}"
        
        system_prompt = f"""You are an expert icebreaker facilitator for college students. Create engaging questions that:

1. Are appropriate for the current activity type: {self.activity_type}
2. Encourage participation from shy students
3. Are inclusive and culturally sensitive
4. Lead to interesting discussions
5. Are not too personal or invasive

Activity type guidelines:
- introductions: Help people share basic info about themselves
- getting_to_know: Deeper personal interests and experiences  
- creative: Hypothetical scenarios, imagination, fun "what if" questions
- reflection: Thoughtful questions about experiences, values, growth

Generate ONE engaging icebreaker question. No explanations, just the question."""
        
        user_prompt = f"""Context: {context_info}

{previous_context}

Generate a {self.activity_type} icebreaker question:"""
        
        try:
            icebreaker = run_script(system_prompt, user_prompt, temperature=0.9, max_tokens=100)
            # Clean up the response
            icebreaker = icebreaker.strip().strip('"').strip("'")
            
            # Ensure it ends with a question mark
            if not icebreaker.endswith('?'):
                icebreaker += '?'
                
            return icebreaker
        except Exception as e:
            # Fallback icebreakers if LLM fails
            fallback_questions = {
                "introductions": "What's your name and what's something you're excited about this semester?",
                "getting_to_know": "If you could have dinner with anyone, alive or dead, who would it be and why?",
                "creative": "If you could have any superpower for just one day, what would you do with it?",
                "reflection": "What's one piece of advice you'd give to your freshman year self?"
            }
            return fallback_questions.get(self.activity_type, "What's the most interesting thing that happened to you this week?")
    
    def safe_generate_new_icebreaker(self) -> Optional[str]:
        """Safely generate a new icebreaker with proper locking to prevent duplicates"""
        # Check if we should and can generate a new icebreaker
        if not self.should_generate_new_icebreaker():
            return None
        
        # Set the flag to prevent concurrent generation
        if self._generating_icebreaker:
            return None
        
        self._generating_icebreaker = True
        
        try:
            new_icebreaker = self.generate_icebreaker()
            self.add_icebreaker_message(new_icebreaker)
            return new_icebreaker
        except Exception as e:
            # Reset flag on error
            self._generating_icebreaker = False
            raise e
    
    def get_room_state(self) -> Dict:
        """Get the current state of the room"""
        ready_count = sum(1 for p in self.participants if p.is_ready)
        
        return {
            "session_id": self.session_id,
            "room_title": self.room_title,
            "facilitator_name": self.facilitator_name,
            "participants": [p.to_dict() for p in self.participants],
            "participant_count": len(self.participants),
            "max_participants": self.max_participants,
            "is_active": self.is_active,
            "current_icebreaker": self.current_icebreaker,
            "activity_type": self.activity_type,
            "chat_history": self.chat_history,
            "ready_status": {
                "ready_count": ready_count,
                "total_participants": len(self.participants),
                "ready_percentage": (ready_count / len(self.participants) * 100) if self.participants else 0,
                "timer_active": self.ready_timer_start is not None,
                "timer_remaining": self.get_timer_remaining()
            },
            "active_votekicks": self.get_active_votekicks(),
            "created_at": self.created_at.isoformat()
        }

    def to_dict(self) -> Dict:
        """Convert room to dictionary for API responses"""
        return self.get_room_state()

    def start_votekick(self, initiator_id: str, target_id: str, reason: str = "") -> Dict:
        """Start a votekick against a participant"""
        # Validation checks
        initiator = self.get_participant(initiator_id)
        target = self.get_participant(target_id)
        
        if not initiator:
            return {"error": "Initiator not found"}
        if not target:
            return {"error": "Target participant not found"}
        if initiator_id == target_id:
            return {"error": "Cannot vote to kick yourself"}
        if len(self.participants) < 3:
            return {"error": "Need at least 3 participants to start a votekick"}
        
        # Check if there's already an active votekick for this target
        if target_id in self.active_votekicks:
            return {"error": "Votekick already in progress for this participant"}
        
        # Create votekick
        votekick_data = {
            "target_id": target_id,
            "target_name": target.display_name,
            "initiator_id": initiator_id,
            "initiator_name": initiator.display_name,
            "reason": reason.strip()[:100] if reason else "No reason provided",
            "votes": {initiator_id: True},  # Initiator automatically votes yes
            "start_time": datetime.now(),
            "expires_at": datetime.now() + timedelta(seconds=self.votekick_duration)
        }
        
        self.active_votekicks[target_id] = votekick_data
        
        # Add system message
        reason_text = f" (Reason: {votekick_data['reason']})" if votekick_data['reason'] != "No reason provided" else ""
        self.add_system_message(f"⚠️ {initiator.display_name} started a vote to remove {target.display_name}{reason_text}. Vote within 60 seconds.")
        
        return {
            "success": True,
            "votekick_id": target_id,
            "votes_needed": self.get_votes_needed(),
            "current_votes": 1,
            "time_remaining": self.votekick_duration
        }
    
    def vote_on_kick(self, voter_id: str, target_id: str, vote: bool) -> Dict:
        """Vote on an active votekick"""
        # Validation
        voter = self.get_participant(voter_id)
        if not voter:
            return {"error": "Voter not found"}
        
        if target_id not in self.active_votekicks:
            return {"error": "No active votekick for this participant"}
        
        votekick = self.active_votekicks[target_id]
        
        # Check if vote has expired
        if datetime.now() > votekick["expires_at"]:
            self.cleanup_expired_votekick(target_id)
            return {"error": "Votekick has expired"}
        
        # Record vote
        votekick["votes"][voter_id] = vote
        
        # Count votes
        yes_votes = sum(1 for v in votekick["votes"].values() if v)
        total_votes = len(votekick["votes"])
        votes_needed = self.get_votes_needed()
        
        # Check if we have enough votes to kick
        if yes_votes >= votes_needed:
            target = self.get_participant(target_id)
            if target:
                self.remove_participant(target_id)
                self.add_system_message(f"🚫 {target.display_name} has been removed from the room by vote ({yes_votes}/{len(self.participants)+1} voted yes)")
            
            del self.active_votekicks[target_id]
            return {
                "success": True,
                "result": "kicked",
                "votes": yes_votes,
                "votes_needed": votes_needed
            }
        
        # Check if impossible to reach threshold (too many no votes)
        max_possible_yes = yes_votes + (len(self.participants) - total_votes)
        if max_possible_yes < votes_needed:
            target_name = self.get_participant(target_id).display_name if self.get_participant(target_id) else "participant"
            self.add_system_message(f"✅ Vote to remove {target_name} failed - not enough support")
            del self.active_votekicks[target_id]
            return {
                "success": True,
                "result": "failed",
                "votes": yes_votes,
                "votes_needed": votes_needed
            }
        
        return {
            "success": True,
            "result": "ongoing",
            "votes": yes_votes,
            "votes_needed": votes_needed,
            "total_votes": total_votes,
            "eligible_voters": len(self.participants)
        }
    
    def get_votes_needed(self) -> int:
        """Calculate votes needed based on current participant count"""
        # Exclude the target from the count since they can't vote on their own kick
        eligible_voters = len(self.participants) - 1
        return max(2, int(eligible_voters * self.votekick_threshold))
    
    def cleanup_expired_votekicks(self):
        """Clean up expired votekicks"""
        now = datetime.now()
        expired_targets = []
        
        for target_id, votekick in self.active_votekicks.items():
            if now > votekick["expires_at"]:
                expired_targets.append(target_id)
                target = self.get_participant(target_id)
                if target:
                    self.add_system_message(f"⏰ Vote to remove {target.display_name} expired without reaching threshold")
        
        for target_id in expired_targets:
            del self.active_votekicks[target_id]
    
    def cleanup_votekicks_for_participant(self, google_session_id: str):
        """Clean up votekicks when a participant leaves"""
        # Remove any votekicks targeting this participant
        if google_session_id in self.active_votekicks:
            del self.active_votekicks[google_session_id]
        
        # Remove their votes from ongoing votekicks
        for votekick in self.active_votekicks.values():
            if google_session_id in votekick["votes"]:
                del votekick["votes"][google_session_id]
    
    def get_active_votekicks(self) -> List[Dict]:
        """Get all active votekicks with time remaining"""
        self.cleanup_expired_votekicks()
        active = []
        
        for target_id, votekick in self.active_votekicks.items():
            time_remaining = max(0, int((votekick["expires_at"] - datetime.now()).total_seconds()))
            
            # Separate votes into for/against arrays
            votes_for = [voter_id for voter_id, vote in votekick["votes"].items() if vote]
            votes_against = [voter_id for voter_id, vote in votekick["votes"].items() if not vote]
            eligible_voters = [p.google_session_id for p in self.participants if p.google_session_id != target_id]
            
            active.append({
                "target_id": target_id,
                "target_name": votekick["target_name"],
                "initiator_name": votekick["initiator_name"],
                "reason": votekick["reason"],
                "votes_for": votes_for,
                "votes_against": votes_against,
                "eligible_voters": eligible_voters,
                "votes_needed": self.get_votes_needed(),
                "expiry_time": votekick["expires_at"].isoformat()
            })
        
        return active


# Legacy compatibility - keep Agent and Room classes for existing code
class Agent:
    def __init__(self, name: str, persona: str = "", **meta):
        self.name = name.strip()
        self.persona = persona.strip() if persona else f"A participant named {name}"
        self.meta = meta


class Room:
    """Legacy room class for backward compatibility"""
    def __init__(self, scenario_id: str, agents: List[Agent], gm: dict):
        # Convert to icebreaker room format
        self.session_id = str(uuid.uuid4())
        self.scenario = {"id": scenario_id, "title": f"Chat Room {scenario_id[:8]}"}
        self.gm = gm
        self.agents = agents
        self.dialogue_history = []
        self.phase = "active"
        self.game_over = False
        self.outcome = []
        
        # Create icebreaker room internally
        self._icebreaker_room = IcebreakerRoom(
            room_title=self.scenario["title"],
            facilitator_name=gm.get("name", "Chat Facilitator")
        )
        
        # Add agents as participants
        for agent in agents:
            participant = Participant(
                name=agent.name,
                google_session_id=str(uuid.uuid4())
            )
            self._icebreaker_room.add_participant(participant)
    
    def process_turn(self, user_agent_name: str, user_instruction: str):
        """Process a user message in the chat"""
        # Find the participant
        participant = None
        for p in self._icebreaker_room.participants:
            if p.name == user_agent_name:
                participant = p
                break
        
        if not participant:
            return {"error": "Participant not found"}
        
        # Add the message
        message = self._icebreaker_room.add_message(participant.google_session_id, user_instruction)
        
        # Check if we should generate a new icebreaker
        if self._icebreaker_room.should_generate_new_icebreaker():
            new_icebreaker = self._icebreaker_room.generate_icebreaker()
            self._icebreaker_room.add_icebreaker_message(new_icebreaker)
        
        return {
            "dialogue_segment": f"{user_agent_name}: {user_instruction}",
            "phase_label": "Active Chat",
            "summary": f"Ongoing conversation with {len(self._icebreaker_room.participants)} participants",
            "game_over": False
        }
    
    def full_story(self):
        """Return chat history as a story"""
        messages = []
        for msg in self._icebreaker_room.chat_history:
            if msg["type"] in ["user_message", "icebreaker"]:
                messages.append(f"{msg['sender_name']}: {msg['content']}")
        return messages
