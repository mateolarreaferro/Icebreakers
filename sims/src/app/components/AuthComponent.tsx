'use client';

import React, { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { SERVER_ADDRESS } from '../api/server';

interface User {
  google_session_id: string;
  display_name: string;
  profile_picture_url?: string;
  total_messages: number;
  rooms_joined: number;
}

interface AuthComponentProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthComponent({ onAuthSuccess }: AuthComponentProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestName, setGuestName] = useState('');

  // Handle real Google authentication
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('google', { 
        redirect: false,
        callbackUrl: '/'
      });

      if (result?.error) {
        throw new Error('Google authentication failed');
      }

      // The session will be available after successful sign-in
      // We'll handle the backend user creation in the useEffect below
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      console.error('Error during Google authentication:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google session and create/update backend user
  useEffect(() => {
    const handleGoogleSession = async () => {
      if (session?.user) {
        try {
          setIsLoading(true);
          
          // Create user data from Google session
          const googleUserData = {
            google_session_id: session.user.email || `google_${Date.now()}`, // Use email as unique ID
            display_name: session.user.name || 'Google User',
            profile_picture_url: session.user.image || undefined
          };

          // Send to backend to create/update user
          const response = await fetch(`http://${SERVER_ADDRESS}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleUserData)
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to sync with backend');
          }

          const data = await response.json();
          
          // Store user data in localStorage for cross-page access
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          onAuthSuccess(data.user);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to sync user data');
          console.error('Error syncing Google user:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (status === 'authenticated' && session) {
      handleGoogleSession();
    }
  }, [session, status, onAuthSuccess]);

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const guestData = {
        google_session_id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        display_name: guestName.trim(),
        profile_picture_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName.trim())}&background=6366f1&color=fff`
      };

      const response = await fetch(`http://${SERVER_ADDRESS}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create guest account');
      }

      const data = await response.json();
      // Store user data in localStorage for cross-page access
      localStorage.setItem('currentUser', JSON.stringify(data.user));
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guest account');
      console.error('Error creating guest account:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Welcome Card */}
        <div className="bg-gray-50 rounded-lg shadow-lg p-8 text-center border border-gray-300">
          {/* Header */}
          <div className="mb-8">
            <div className="text-6xl mb-4">🧊</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Icebreaker Chat</h1>
            <p className="text-gray-700">
              Connect with college students through fun icebreaker conversations
            </p>
          </div>

          {/* Authentication Options */}
          {!showGuestForm ? (
            <div className="space-y-4">
              {/* Google Sign-in Button */}
              <button
                onClick={handleGoogleAuth}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-400 rounded-lg px-6 py-3 text-gray-800 hover:bg-gray-100 disabled:bg-gray-200 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>

              {/* Guest Option */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-400" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-600">or</span>
                </div>
              </div>

              <button
                onClick={() => setShowGuestForm(true)}
                className="w-full bg-blue-600 text-white rounded-lg px-6 py-3 hover:bg-blue-700 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
          ) : (
            /* Guest Form */
            <form onSubmit={handleGuestLogin} className="space-y-4">
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-800 mb-2">
                  What should we call you?
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full border border-gray-400 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                  maxLength={30}
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setShowGuestForm(false)}
                  className="flex-1 bg-gray-400 text-white rounded-lg px-4 py-2 hover:bg-gray-500 transition-colors"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !guestName.trim()}
                  className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Creating...' : 'Join as Guest'}
                </button>
              </div>
            </form>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 bg-red-100 border border-red-300 rounded-lg p-3">
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-400">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">💬</div>
                <p className="text-xs text-gray-700">Group Chat</p>
              </div>
              <div>
                <div className="text-2xl mb-1">🤖</div>
                <p className="text-xs text-gray-700">AI Help</p>
              </div>
              <div>
                <div className="text-2xl mb-1">🎯</div>
                <p className="text-xs text-gray-700">Icebreakers</p>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-xs text-gray-600 mt-6">
            By continuing, you agree to participate in respectful conversations.
            Your data is used only for the chat experience.
          </p>
        </div>
      </div>
    </div>
  );
}
