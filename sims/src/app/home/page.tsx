'use client';
import React, { useState, useEffect } from 'react';
import AuthComponent from '../components/AuthComponent';
import RoomBrowser from '../components/RoomBrowser';
import CreateRoom from '../components/CreateRoom';
import IcebreakerRoom from '../components/IcebreakerRoom';
import AIAssistant from '../components/AIAssistant';
import { SERVER_ADDRESS } from '../api/server';

interface User {
  google_session_id: string;
  display_name: string;
  profile_picture_url?: string;
  total_messages: number;
  rooms_joined: number;
}

type ViewState = 'auth' | 'browse' | 'create' | 'room';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('auth');
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  // Check for existing user data on page load
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setCurrentView('browse');
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentView('browse');
  };

  const handleJoinRoom = async (sessionId: string) => {
    if (!currentUser) return;

    try {
      // Join the room via API
      const response = await fetch(`http://${SERVER_ADDRESS}/join_icebreaker_room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          display_name: currentUser.display_name,
          google_session_id: currentUser.google_session_id,
          profile_picture_url: currentUser.profile_picture_url
        })
      });

      if (response.ok) {
        setCurrentRoomId(sessionId);
        setCurrentView('room');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to join room');
      }
    } catch (err) {
      console.error('Error joining room:', err);
      alert('Failed to join room');
    }
  };

  const handleCreateRoom = () => {
    setCurrentView('create');
  };

  const handleRoomCreated = (sessionId: string) => {
    setCurrentRoomId(sessionId);
    setCurrentView('room');
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setCurrentView('browse');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentView('auth');
    setCurrentRoomId(null);
    setShowAssistant(false);
    localStorage.removeItem('currentUser');
  };

  // Authentication screen
  if (currentView === 'auth') {
    return <AuthComponent onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      {/* Top Navigation */}
      <nav className="bg-blue-800 border-b border-blue-600 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">🧊 Icebreaker Chat</h1>
            {currentView !== 'browse' && (
              <button
                onClick={() => setCurrentView('browse')}
                className="text-blue-200 hover:text-white text-sm"
              >
                ← Back to Rooms
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {currentUser.display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-blue-100">{currentUser.display_name}</span>
                </div>
                
                <button
                  onClick={() => setShowAssistant(!showAssistant)}
                  className={`p-2 rounded-lg transition-colors ${
                    showAssistant
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-700 text-blue-200 hover:bg-blue-600 hover:text-white'
                  }`}
                  title="Toggle AI Assistant"
                >
                  🤖
                </button>
                
                <button
                  onClick={handleSignOut}
                  className="text-sm text-blue-200 hover:text-white"
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className={`${showAssistant ? 'mr-80' : ''} transition-all duration-300`}>
        {currentView === 'browse' && (
          <RoomBrowser
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
            currentUser={currentUser ? {
              name: currentUser.display_name,
              googleSessionId: currentUser.google_session_id
            } : undefined}
          />
        )}

        {currentView === 'create' && currentUser && (
          <div className="py-8">
            <CreateRoom
              onRoomCreated={handleRoomCreated}
              onCancel={() => setCurrentView('browse')}
              currentUser={{
                name: currentUser.display_name,
                googleSessionId: currentUser.google_session_id
              }}
            />
          </div>
        )}

        {currentView === 'room' && currentRoomId && currentUser && (
          <IcebreakerRoom
            sessionId={currentRoomId}
            userName={currentUser.display_name}
            googleSessionId={currentUser.google_session_id}
            onLeave={handleLeaveRoom}
          />
        )}
      </main>

      {/* AI Assistant */}
      <AIAssistant
        sessionId={currentRoomId || undefined}
        userName={currentUser?.display_name}
        isVisible={showAssistant}
        onToggle={() => setShowAssistant(!showAssistant)}
      />
    </div>
  );
}