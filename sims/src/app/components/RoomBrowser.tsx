'use client';

import { useEffect, useState } from 'react';
import { SERVER_ADDRESS } from '../api/server';

interface IcebreakerRoomInfo {
  session_id: string;
  room_title: string;
  participant_count: number;
  max_participants: number;
  activity_type: string;
  created_at: string;
  has_space: boolean;
}

interface RoomBrowserProps {
  onJoinRoom: (sessionId: string) => void;
  onCreateRoom: () => void;
  currentUser?: {
    name: string;
    googleSessionId: string;
  };
}

export default function RoomBrowser({ onJoinRoom, onCreateRoom, currentUser }: RoomBrowserProps) {
  const [rooms, setRooms] = useState<IcebreakerRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRooms = async () => {
    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/icebreaker_rooms`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }
      const data = await response.json();
      setRooms(data);
      setError(null);
    } catch (err) {
      setError('Failed to load rooms');
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRooms();
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      introductions: '👋',
      getting_to_know: '💬', 
      creative: '🎨',
      hypothetical: '🤔',
      reflection: '💭'
    };
    return icons[type] || '🧊';
  };

  const getActivityName = (type: string) => {
    const names: Record<string, string> = {
      introductions: 'Introductions',
      getting_to_know: 'Getting to Know', 
      creative: 'Creative',
      hypothetical: 'Hypothetical',
      reflection: 'Reflection'
    };
    return names[type] || type;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const created = new Date(timestamp);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  useEffect(() => {
    fetchRooms();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading rooms...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Icebreaker Rooms</h1>
          <p className="text-blue-200">Join a conversation or start your own!</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center space-x-2 transition-colors"
          >
            <span>{refreshing ? '🔄' : '↻'}</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={onCreateRoom}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
          >
            <span>➕</span>
            <span>Create Room</span>
          </button>
        </div>
      </div>

      {/* User Status */}
      {currentUser && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white font-medium">
                {currentUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-green-900">Welcome, {currentUser.name}!</p>
              <p className="text-sm text-green-700">Ready to break the ice?</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      {/* Empty State */}
      {rooms.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧊</div>
          <h3 className="text-lg font-medium text-white mb-2">No active rooms</h3>
          <p className="text-blue-200 mb-6">
            Be the first to start an icebreaker conversation!
          </p>
          <button
            onClick={onCreateRoom}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Create the First Room
          </button>
        </div>
      )}

      {/* Rooms Grid */}
      {rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div
              key={room.session_id}
              className="bg-gray-50 rounded-lg border border-gray-300 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                {/* Room Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                      {room.room_title}
                    </h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-700">
                      <span>{getActivityIcon(room.activity_type)}</span>
                      <span>{getActivityName(room.activity_type)}</span>
                    </div>
                  </div>
                  {!room.has_space && (
                    <span className="bg-red-200 text-red-900 text-xs px-2 py-1 rounded-full">
                      Full
                    </span>
                  )}
                </div>

                {/* Room Stats */}
                <div className="flex items-center justify-between mb-4 text-sm text-gray-700">
                  <div className="flex items-center space-x-1">
                    <span>👥</span>
                    <span>{room.participant_count}/{room.max_participants}</span>
                  </div>
                  <span>{formatTimeAgo(room.created_at)}</span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        room.participant_count >= room.max_participants
                          ? 'bg-red-500'
                          : room.participant_count > room.max_participants * 0.7
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (room.participant_count / room.max_participants) * 100)}%`
                      }}
                    />
                  </div>
                </div>

                {/* Join Button */}
                <button
                  onClick={() => onJoinRoom(room.session_id)}
                  disabled={!room.has_space || !currentUser}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    !room.has_space || !currentUser
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {!currentUser
                    ? 'Sign in to Join'
                    : !room.has_space
                    ? 'Room Full'
                    : 'Join Conversation'
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips Section */}
      <div className="mt-12 bg-blue-100 rounded-lg p-6 border border-blue-300">
        <h3 className="font-medium text-blue-900 mb-3">💡 Icebreaker Tips</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Be genuine and share something interesting about yourself</li>
          <li>• Ask follow-up questions to keep conversations flowing</li>
          <li>• Use the ready button when you're excited to move to the next topic</li>
          <li>• Remember that everyone is here to meet new people - be welcoming!</li>
        </ul>
      </div>
    </div>
  );
}
