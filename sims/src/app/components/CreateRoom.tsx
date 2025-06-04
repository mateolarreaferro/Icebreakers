'use client';

import { useState } from 'react';
import { SERVER_ADDRESS } from '../api/server';

interface CreateRoomProps {
  onRoomCreated: (sessionId: string) => void;
  onCancel: () => void;
  currentUser: {
    name: string;
    googleSessionId: string;
  };
}

export default function CreateRoom({ onRoomCreated, onCancel, currentUser }: CreateRoomProps) {
  const [roomTitle, setRoomTitle] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomTitle.trim()) {
      setError('Room title is required');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const response = await fetch(`http://${SERVER_ADDRESS}/create_icebreaker_room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_title: roomTitle.trim(),
          display_name: currentUser.name,
          google_session_id: currentUser.googleSessionId,
          max_participants: maxParticipants
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }

      const data = await response.json();
      onRoomCreated(data.session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
      console.error('Error creating room:', err);
    } finally {
      setCreating(false);
    }
  };

  const roomTitleSuggestions = [
    "Coffee Chat & Introductions",
    "New Student Meetup",
    "Study Group Icebreakers", 
    "Dorm Floor Get-Together",
    "International Student Chat",
    "Engineering Students Unite",
    "Creative Minds Connect",
    "Sports Fans Hangout",
    "Book Lovers Circle",
    "Music & Arts Chat"
  ];

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-gray-50 rounded-lg border border-gray-300 shadow-sm p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Room</h2>
          <p className="text-gray-700">Set up a space for icebreaker conversations</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Title */}
          <div>
            <label htmlFor="roomTitle" className="block text-sm font-medium text-gray-800 mb-2">
              Room Title
            </label>
            <input
              type="text"
              id="roomTitle"
              value={roomTitle}
              onChange={(e) => setRoomTitle(e.target.value)}
              placeholder="What's this chat about?"
              className="w-full border border-gray-400 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
              maxLength={50}
            />
            <p className="text-xs text-gray-600 mt-1">{roomTitle.length}/50 characters</p>
          </div>

          {/* Quick Suggestions */}
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              Quick Suggestions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {roomTitleSuggestions.slice(0, 6).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setRoomTitle(suggestion)}
                  className="text-left text-xs bg-gray-100 hover:bg-gray-200 text-gray-800 px-2 py-1 rounded border border-gray-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          {/* Max Participants */}
          <div>
            <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-800 mb-2">
              Maximum Participants
            </label>
            <select
              id="maxParticipants"
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
              className="w-full border border-gray-400 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            >
              <option value={4}>4 people (Intimate)</option>
              <option value={6}>6 people (Small group)</option>
              <option value={8}>8 people (Medium group)</option>
              <option value={12}>12 people (Large group)</option>
              <option value={16}>16 people (Big conversation)</option>
            </select>
            <p className="text-xs text-gray-600 mt-1">
              Smaller groups tend to have deeper conversations
            </p>
          </div>

          {/* Creator Info */}
          <div className="bg-blue-100 rounded-lg p-3 border border-blue-300">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {currentUser.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Creating as {currentUser.name}
                </p>
                <p className="text-xs text-blue-700">
                  You'll be the first participant
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-400 text-gray-800 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !roomTitle.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>

        {/* Tips */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-2">💡 Room Tips</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Choose a descriptive title to attract the right people</li>
            <li>• Smaller groups (4-8 people) tend to have better conversations</li>
            <li>• The AI will suggest icebreaker questions based on your group</li>
            <li>• Use the ready system to pace the conversation naturally</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
