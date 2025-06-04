'use client';

import { useEffect, useState, useRef } from 'react';
import { SERVER_ADDRESS } from '../api/server';
import AIAssistant from './AIAssistant';

interface Participant {
  display_name: string;
  google_session_id: string;
  profile_picture?: string;
  message_count: number;
  is_ready: boolean;
  joined_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  type: 'user_message' | 'system_message' | 'icebreaker';
}

interface Votekick {
  target_id: string;
  target_name: string;
  initiator_name: string;
  reason: string;
  votes_for: string[];
  votes_against: string[];
  eligible_voters: string[];
  votes_needed: number;
  expiry_time: string;
}

interface RoomState {
  session_id: string;
  room_title: string;
  participants: Participant[];
  current_icebreaker: string;
  chat_history: Message[];
  activity_type: string;
  active_votekicks: Votekick[];
  ready_status: {
    ready_count: number;
    total_participants: number;
    ready_percentage: number;
    timer_active: boolean;
    timer_remaining?: number;
  };
}

interface IcebreakerRoomProps {
  sessionId: string;
  userName: string;
  googleSessionId: string;
  onLeave: () => void;
}

export default function IcebreakerRoom({ sessionId, userName, googleSessionId, onLeave }: IcebreakerRoomProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [showReadyOverlay, setShowReadyOverlay] = useState(false);
  const [showVotekickModal, setShowVotekickModal] = useState(false);
  const [votekickTarget, setVotekickTarget] = useState<string>('');
  const [votekickReason, setVotekickReason] = useState('');
  const [votekickSubmitting, setVotekickSubmitting] = useState(false);
  const [showAssistant, setShowAssistant] = useState(true); // Always show assistant
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [roomState?.chat_history]);

  // Start a votekick
  const startVotekick = async () => {
    if (!votekickTarget || !votekickReason.trim() || votekickSubmitting) return;

    try {
      setVotekickSubmitting(true);
      const response = await fetch(`http://${SERVER_ADDRESS}/start_votekick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          initiator_id: googleSessionId,
          target_id: votekickTarget,
          reason: votekickReason.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start votekick');
      }

      const data = await response.json();
      setRoomState(data.room_state);
      setShowVotekickModal(false);
      setVotekickTarget('');
      setVotekickReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start votekick');
      console.error('Error starting votekick:', err);
    } finally {
      setVotekickSubmitting(false);
    }
  };

  // Vote on a votekick
  const voteOnKick = async (targetId: string, support: boolean) => {
    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/vote_on_kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          voter_id: googleSessionId,
          target_id: targetId,
          vote: support
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to vote');
      }

      const data = await response.json();
      setRoomState(data.room_state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to vote');
      console.error('Error voting:', err);
    }
  };

  // Fetch room state
  const fetchRoomState = async () => {
    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/icebreaker_room/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch room state');
      }
      const data = await response.json();
      setRoomState(data);
      
      // Update local ready status
      const currentUser = data.participants.find((p: Participant) => p.google_session_id === googleSessionId);
      if (currentUser) {
        setIsReady(currentUser.is_ready);
      }
      
      // Show ready overlay only when timer is active and has less than 10 seconds remaining
      const shouldShowOverlay = data.ready_status?.timer_active && 
                                data.ready_status?.timer_remaining !== undefined && 
                                data.ready_status.timer_remaining <= 10;
      setShowReadyOverlay(shouldShowOverlay);
      
      setError(null);
    } catch (err) {
      setError('Failed to load room state');
      console.error('Error fetching room state:', err);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`http://${SERVER_ADDRESS}/send_icebreaker_message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          google_session_id: googleSessionId,
          message: newMessage.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send message');
      }

      const data = await response.json();
      setRoomState(data.room_state);
      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Toggle ready status
  const toggleReady = async () => {
    try {
      const newReadyStatus = !isReady;
      const response = await fetch(`http://${SERVER_ADDRESS}/set_ready_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          google_session_id: googleSessionId,
          is_ready: newReadyStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update ready status');
      }

      const data = await response.json();
      setIsReady(newReadyStatus);
      setRoomState(prev => prev ? { ...prev, ready_status: data.ready_status } : null);
    } catch (err) {
      setError('Failed to update ready status');
      console.error('Error updating ready status:', err);
    }
  };

  // Initial load and polling
  useEffect(() => {
    fetchRoomState();
    
    // Poll for updates every 2 seconds
    pollInterval.current = setInterval(fetchRoomState, 2000);
    
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [sessionId]);

  // Handle enter key in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading room...</div>
      </div>
    );
  }

  if (error || !roomState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="text-red-500 mb-4">{error || 'Room not found'}</div>
        <button
          onClick={onLeave}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Rooms
        </button>
      </div>
    );
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getActivityTypeDisplay = (type: string) => {
    const types: Record<string, string> = {
      introductions: '👋 Introductions',
      getting_to_know: '💬 Getting to Know Each Other', 
      creative: '🎨 Creative Questions',
      hypothetical: '🤔 Hypothetical Scenarios',
      reflection: '💭 Reflection'
    };
    return types[type] || type;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Participants Sidebar - Left */}
      <div className="w-80 bg-blue-100 border-r border-gray-300 flex flex-col">
        <div className="p-4 border-b border-gray-300 bg-blue-200">
          <h3 className="font-medium text-gray-900">Participants</h3>
        </div>
        
        {/* Active Votekicks */}
        {roomState.active_votekicks && roomState.active_votekicks.length > 0 && (
          <div className="border-b border-gray-300">
            <div className="p-4 bg-red-50">
              <h4 className="font-medium text-red-800 mb-3">🗳️ Active Vote</h4>
              {roomState.active_votekicks.map((votekick) => {
                const hasVoted = votekick.votes_for.includes(googleSessionId) || votekick.votes_against.includes(googleSessionId);
                const canVote = votekick.eligible_voters.includes(googleSessionId) && !hasVoted;
                const timeLeft = Math.max(0, Math.ceil((new Date(votekick.expiry_time).getTime() - Date.now()) / 1000));
                
                return (
                  <div key={votekick.target_id} className="bg-white rounded-lg p-3 border border-red-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Remove {votekick.target_name}?
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          By {votekick.initiator_name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {timeLeft}s left
                      </span>
                    </div>
                    
                    <p className="text-xs text-gray-700 mb-3 italic">
                      "{votekick.reason}"
                    </p>
                    
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>For: {votekick.votes_for.length}</span>
                        <span>Against: {votekick.votes_against.length}</span>
                        <span>Need: {votekick.votes_needed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-500 h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (votekick.votes_for.length / votekick.votes_needed) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    
                    {canVote && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => voteOnKick(votekick.target_id, true)}
                          className="flex-1 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                        >
                          Remove
                        </button>
                        <button
                          onClick={() => voteOnKick(votekick.target_id, false)}
                          className="flex-1 px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                        >
                          Keep
                        </button>
                      </div>
                    )}
                    
                    {hasVoted && (
                      <div className="text-center">
                        <span className="text-xs text-green-600">
                          ✓ You voted {votekick.votes_for.includes(googleSessionId) ? 'to remove' : 'to keep'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Participants List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-3">
            {roomState.participants.map((participant) => (
              <div key={participant.google_session_id} className="flex items-center space-x-3 group">
                <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-800">
                    {participant.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{participant.display_name}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600">
                      {participant.message_count} messages
                    </span>
                    {participant.is_ready && (
                      <span className="text-xs text-green-700">✓ Ready</span>
                    )}
                  </div>
                </div>
                {/* Votekick button - only show for other participants */}
                {participant.google_session_id !== googleSessionId && 
                 roomState.participants.length >= 3 && 
                 !roomState.active_votekicks?.some(v => v.target_id === participant.google_session_id) && (
                  <button
                    onClick={() => {
                      setVotekickTarget(participant.google_session_id);
                      setShowVotekickModal(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-all"
                    title="Vote to remove participant"
                  >
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Votekick Info */}
        <div className="p-4 border-t border-gray-300 bg-blue-200">
          <p className="text-xs text-gray-600 text-center">
            {roomState.participants.length >= 3 
              ? "Hover over participants to vote for removal"
              : "Need 3+ participants for voting"}
          </p>
        </div>
      </div>

      {/* Main Chat Area - Center */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-blue-800 border-b border-blue-600 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-white">{roomState.room_title}</h1>
              <p className="text-sm text-blue-200">
                {getActivityTypeDisplay(roomState.activity_type)} • {roomState.participants.length} participants
              </p>
            </div>
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Current Icebreaker */}
        {roomState.current_icebreaker && (
          <div className="bg-blue-100 border-b border-blue-300 p-4">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium">
                🧊
              </div>
              <div className="flex-1">
                <p className="text-blue-900 font-medium">{roomState.current_icebreaker}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <button
                    onClick={toggleReady}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                      isReady 
                        ? 'bg-green-500 text-white border-green-500 hover:bg-green-600' 
                        : 'bg-yellow-400 text-yellow-900 border-yellow-400 hover:bg-yellow-500'
                    }`}
                  >
                    {isReady ? '✅ Ready for next topic!' : '⏳ Ready for next topic?'}
                  </button>
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <span>
                      {roomState.ready_status?.ready_count || 0}/{roomState.ready_status?.total_participants || 0} ready
                    </span>
                    {roomState.ready_status?.timer_active && roomState.ready_status?.timer_remaining !== undefined && (
                      <span className="text-orange-700 font-medium">
                        • New topic in {Math.ceil(roomState.ready_status.timer_remaining)}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {roomState.chat_history.map((message) => (
            <div key={message.id} className="flex space-x-3">
              {message.type === 'system_message' ? (
                <div className="w-full text-center">
                  <span className="bg-gray-300 text-gray-800 px-3 py-1 rounded-full text-sm">
                    {message.content}
                  </span>
                </div>
              ) : message.type === 'icebreaker' ? (
                <div className="w-full">
                  <div className="bg-blue-200 border border-blue-300 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-800 font-medium">🧊 New Icebreaker</span>
                      <span className="text-xs text-gray-600">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-blue-900">{message.content}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-800">
                        {message.sender_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900">{message.sender_name}</span>
                      <span className="text-xs text-gray-600">{formatTime(message.timestamp)}</span>
                    </div>
                    <p className="text-gray-800">{message.content}</p>
                  </div>
                </>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="bg-gray-50 border-t border-gray-300 p-4">
          <div className="flex space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 border border-gray-400 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* AI Assistant - Right */}
      <AIAssistant
        sessionId={sessionId}
        userName={userName}
        isVisible={showAssistant}
        onToggle={() => setShowAssistant(!showAssistant)}
      />

      {/* Votekick Modal */}
      {showVotekickModal && votekickTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🗳️</div>
              <h3 className="text-lg font-semibold text-red-600">Vote to Remove Participant</h3>
            </div>
            
            {(() => {
              const targetParticipant = roomState?.participants.find(p => p.google_session_id === votekickTarget);
              return (
                <div className="mb-4">
                  <p className="text-gray-700 mb-3">
                    Do you want to start a vote to remove <strong>{targetParticipant?.display_name}</strong> from this room?
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    This requires 60% of participants to agree. Please provide a reason:
                  </p>
                  <textarea
                    value={votekickReason}
                    onChange={(e) => setVotekickReason(e.target.value)}
                    placeholder="Reason for removal (e.g., inappropriate behavior, spam, etc.)"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none"
                    rows={3}
                    maxLength={200}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {votekickReason.length}/200 characters
                  </div>
                </div>
              );
            })()}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowVotekickModal(false);
                  setVotekickTarget('');
                  setVotekickReason('');
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                disabled={votekickSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={startVotekick}
                disabled={!votekickReason.trim() || votekickSubmitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {votekickSubmitting ? 'Starting...' : 'Start Vote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ready Status Overlay - Only shows in final 10 seconds */}
      {showReadyOverlay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 border-2 border-orange-400">
            <div className="text-center">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-lg font-semibold mb-2 text-orange-600">New Topic Coming Soon!</h3>
              <p className="text-gray-600 mb-4">
                {roomState.ready_status?.ready_count || 0} out of {roomState.ready_status?.total_participants || 0} participants are ready.
              </p>
              {roomState.ready_status?.timer_remaining !== undefined && (
                <p className="text-lg font-bold text-orange-600 mb-4">
                  New icebreaker in {Math.ceil(roomState.ready_status.timer_remaining)} seconds!
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReadyOverlay(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Got it
                </button>
                <button
                  onClick={toggleReady}
                  className={`flex-1 px-4 py-2 rounded ${
                    isReady 
                      ? 'bg-green-500 text-white hover:bg-green-600' 
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                  }`}
                >
                  {isReady ? 'Ready ✓' : 'Mark Ready'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
