'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SERVER_ADDRESS } from '../../api/server';

interface GameState {
  session_id: string;
  scenario_title: string;
  gm_name: string;
  phase: string;
  agents: Array<{name: string, persona: string}>;
  game_over: boolean;
  outcome?: string[];
  dialogue_history?: string[];
}

interface Message {
  sender: string;
  content: string;
  isAgent?: boolean;
  timestamp: Date;
}

interface AssistantMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
}

interface User {
  google_session_id: string;
  display_name: string;
  profile_picture_url?: string;
  total_messages: number;
  rooms_joined: number;
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupInput, setGroupInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogueHistory, setDialogueHistory] = useState<string[]>([]);
  const [playerName, setPlayerName] = useState<string>('Guest Player');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Group chat messages
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  
  // Writing assistant
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantSubmitting, setAssistantSubmitting] = useState(false);

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setCurrentUser(userData);
        setPlayerName(userData.display_name);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('currentUser');
      }
    }
  }, []);

  // Fetch initial game state
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        setLoading(true);
        // Get the list of all rooms
        const response = await fetch(`http://${SERVER_ADDRESS}/rooms`);
        if (!response.ok) {
          throw new Error('Failed to fetch game data');
        }
        
        const rooms = await response.json();
        const currentRoom = rooms.find((room: any) => room.session_id === sessionId);
        
        if (!currentRoom) {
          throw new Error('Game session not found');
        }
        
        setGameState(currentRoom);
        
        // Initialize group chat with any story data
        try {
          const storyResponse = await fetch(`http://${SERVER_ADDRESS}/make_story`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId }),
          });
          
          if (storyResponse.ok) {
            const storyData = await storyResponse.json();
            if (storyData.story) {
              setDialogueHistory(Array.isArray(storyData.story) ? storyData.story : [storyData.story]);
              
              // Convert story data to group messages
              const storyContent = Array.isArray(storyData.story) ? storyData.story : [storyData.story];
              const parsedMessages: Message[] = storyContent.map((text: string) => {
                // Try to extract speaker from dialogue format "Speaker: text"
                const match = text.match(/^(.+?):\s(.+)$/);
                return {
                  sender: match ? match[1] : "GM",
                  content: match ? match[2] : text,
                  timestamp: new Date(),
                  isAgent: true
                };
              });
              
              setGroupMessages(parsedMessages);
            }
          }
        } catch (storyErr) {
          console.error("Error fetching dialogue history:", storyErr);
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        console.error('Error fetching game state:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchGameState();
    }
  }, [sessionId]);

  // Handle sending message to group chat
  const handleSubmitGroupMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupInput.trim() || !gameState) return;

    try {
      setSubmitting(true);
      
      // Add player's message to group chat immediately for better UX
      const playerMessage: Message = {
        sender: playerName,
        content: groupInput,
        timestamp: new Date(),
        isAgent: false
      };
      
      setGroupMessages(prevMessages => [...prevMessages, playerMessage]);
      
      // Send message to backend
      const response = await fetch(`http://${SERVER_ADDRESS}/submit_turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          instruction: groupInput,
          agent_name: playerName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit message');
      }

      // Parse response from backend
      const result = await response.json();
      console.log("Turn result:", result);
      
      // Add response to chat
      if (result.dialogue_segment) {
        // Try to parse dialogue segments into separate messages
        const dialogueLines = result.dialogue_segment.split('\n').filter(Boolean);
        const newMessages: Message[] = dialogueLines.map((line: string) => {
          const match = line.match(/^(.+?):\s(.+)$/);
          if (match) {
            return {
              sender: match[1],
              content: match[2],
              timestamp: new Date(),
              isAgent: true
            };
          }
          return {
            sender: 'GM',
            content: line,
            timestamp: new Date(),
            isAgent: true
          };
        });
        
        setGroupMessages(prevMessages => [...prevMessages, ...newMessages]);
      }
      
      // Reset input field
      setGroupInput('');
      setDraftMessage('');
      
      // Refresh the game state
      const updatedRoomsResponse = await fetch(`http://${SERVER_ADDRESS}/rooms`);
      const rooms = await updatedRoomsResponse.json();
      const updatedRoom = rooms.find((room: any) => room.session_id === sessionId);
      if (updatedRoom) {
        setGameState(updatedRoom);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Error submitting message:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle asking the writing assistant for help
  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;

    try {
      setAssistantSubmitting(true);
      
      // Add user's question to assistant chat
      const userMessage: AssistantMessage = {
        content: assistantInput,
        isUser: true,
        timestamp: new Date()
      };
      
      setAssistantMessages(prevMessages => [...prevMessages, userMessage]);
      
      // Store the input in draft message area for the user to edit
      setDraftMessage(assistantInput);
      
      // Call the actual writing assistant API
      const response = await fetch(`http://${SERVER_ADDRESS}/writing_assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          display_name: playerName,
          draft_message: assistantInput
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get assistant response');
      }

      const result = await response.json();
      
      const assistantResponse: AssistantMessage = {
        content: result.response,
        isUser: false,
        timestamp: new Date()
      };
      
      setAssistantMessages(prevMessages => [...prevMessages, assistantResponse]);
      
    } catch (err) {
      console.error('Error communicating with assistant:', err);
      // Show error message to user
      const errorMessage: AssistantMessage = {
        content: `Sorry, I encountered an error. Please try again later.`,
        isUser: false,
        timestamp: new Date()
      };
      
      setAssistantMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setAssistantSubmitting(false);
      setAssistantInput('');
    }
  };

  // Use draft in main chat
  const useDraftInMainChat = () => {
    // Add a success message in the assistant chat
    const successMessage: AssistantMessage = {
      content: `✓ Draft message transferred to the main chat input. You can now edit it further or send it.`,
      isUser: false,
      timestamp: new Date()
    };
    
    setAssistantMessages(prevMessages => [...prevMessages, successMessage]);
    
    // Copy the draft to the main input
    setGroupInput(draftMessage);
    
    // After a short delay, focus on the main chat input and close the assistant
    setTimeout(() => {
      setShowAssistant(false);
      // Focus the input (would require a ref in a real implementation)
    }, 1500);
  };

  // Toggle writing assistant panel
  const toggleAssistant = () => {
    setShowAssistant(!showAssistant);
    if (!showAssistant) {
      // Copy the current group input to draft when opening
      setDraftMessage(groupInput);
      
      // If there are no assistant messages yet, show a welcome message
      if (assistantMessages.length === 0) {
        const welcomeMessage: AssistantMessage = {
          content: `Welcome to your writing assistant! I'm here to help you craft messages that enhance the narrative experience. What would you like help with today?`,
          isUser: false,
          timestamp: new Date()
        };
        setAssistantMessages([welcomeMessage]);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 min-h-screen flex items-center justify-center p-4">
        <div className="text-xl font-medium text-white">Loading game...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 min-h-screen p-6">
        <div className="max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <p className="text-gray-800">{error}</p>
          </div>
          <Link href="/home">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 min-h-screen p-6">
        <div className="max-w-4xl mx-auto bg-gray-50 rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Game Not Found</h1>
          <p className="mb-4 text-gray-800">This game session doesn't exist or has been removed.</p>
          <Link href="/home">
            <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 min-h-screen p-6">
      <div className="max-w-6xl mx-auto bg-gray-50 rounded-lg shadow-lg">
        <header className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{gameState.scenario_title}</h1>
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Game Master: {gameState.gm_name} | Phase: {gameState.phase}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                  </svg>
                </div>
                <div className="text-sm font-medium">{gameState.agents.length} Players</div>
              </div>
              <button
                onClick={() => router.push('/home')}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Back to Home
              </button>
            </div>
          </div>
        </header>
        
        {gameState.game_over ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 m-4">
            <h3 className="font-bold text-gray-900">Game Over</h3>
            {gameState.outcome && (
              <div className="text-gray-800">Outcome: {gameState.outcome.join(", ")}</div>
            )}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {/* Left sidebar - Character list */}
          <div className="col-span-1 bg-white p-3 rounded-lg h-[70vh] overflow-auto">
            <h2 className="text-lg font-semibold mb-3 text-gray-900">Characters</h2>
            <div className="space-y-2">
              {gameState.agents.map((agent) => (
                <div 
                  key={agent.name}
                  className="p-3 rounded-lg bg-gray-50 shadow-sm"
                >
                  <div className="font-medium text-gray-900">{agent.name}</div>
                  <div className="text-sm text-gray-600 truncate">{agent.persona.substring(0, 60)}...</div>
                </div>
              ))}
            </div>
          </div>

          {/* Main area - Split between chat and assistant */}
          <div className="col-span-2 flex flex-col h-[70vh]">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Main chat area */}
              <div className={`${showAssistant ? 'md:col-span-1' : 'md:col-span-2'} flex flex-col`}>
                <h2 className="text-lg font-semibold mb-2 text-gray-900">Group Chat</h2>
                <div className="flex-grow bg-white p-4 rounded-lg overflow-y-auto mb-3">
                  {groupMessages.length > 0 ? (
                    <div className="space-y-3">
                      {groupMessages.map((message, index) => (
                        <div key={index} className={`${message.isAgent ? 'text-gray-700' : 'text-blue-700'}`}>
                          <span className="font-semibold">{message.sender}:</span> {message.content}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-gray-500 text-center mt-10">
                      No messages yet. Start the conversation!
                    </p>
                  )}
                </div>
              </div>
              
              {/* Writing assistant panel */}
              {showAssistant && (
                <div className="md:col-span-1 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-semibold text-green-600">Writing Assistant</h2>
                    <button 
                      className="text-sm text-gray-500 hover:text-gray-700"
                      onClick={() => setShowAssistant(false)}
                    >
                      Close
                    </button>
                  </div>
                  
                  <div className="flex-grow bg-green-50 p-4 rounded-lg overflow-y-auto mb-3">
                    <div className="space-y-4">
                      {assistantMessages.map((message, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-lg ${message.isUser 
                            ? 'bg-green-100 text-green-800 ml-8' 
                            : 'bg-white text-gray-800 mr-8 shadow-sm'}`}
                        >
                          {message.isUser ? (
                            <>
                              <div className="font-medium mb-1 text-xs text-green-700">Your draft:</div>
                              {message.content}
                            </>
                          ) : (
                            <>
                              <div className="font-medium mb-1 text-xs text-gray-500">Writing Assistant:</div>
                              <div className="prose prose-sm max-w-none">
                                {message.content.split('\n').map((line, i) => (
                                  <p key={i} className={line.startsWith('-') ? 'pl-2' : ''}>{line}</p>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      
                      {assistantMessages.length === 0 && (
                        <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                          <p className="text-gray-600 mb-2 font-medium">Welcome to your writing assistant!</p>
                          <p className="text-sm text-gray-500">
                            I can help you craft better messages as your character. Try one of these:
                          </p>
                          <div className="mt-4 space-y-2">
                            <button 
                              onClick={() => setAssistantInput("Help me write an introductory message as my character.")}
                              className="w-full text-left p-2 text-sm border border-green-200 hover:bg-green-50 rounded"
                            >
                              Help me introduce my character
                            </button>
                            <button 
                              onClick={() => setAssistantInput("How should I respond to the recent events in the story?")}
                              className="w-full text-left p-2 text-sm border border-green-200 hover:bg-green-50 rounded"
                            >
                              Help me respond to recent events
                            </button>
                            <button 
                              onClick={() => setAssistantInput("Give me ideas for advancing the plot")}
                              className="w-full text-left p-2 text-sm border border-green-200 hover:bg-green-50 rounded"
                            >
                              Give me ideas for advancing the plot
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <form onSubmit={handleAskAssistant} className="mt-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={assistantInput}
                        onChange={(e) => setAssistantInput(e.target.value)}
                        className="flex-1 p-2 border rounded text-gray-900"
                        placeholder="Draft your message or ask for help..."
                        disabled={assistantSubmitting}
                      />
                      <button
                        type="submit"
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                        disabled={assistantSubmitting || !assistantInput.trim()}
                      >
                        {assistantSubmitting ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Working
                          </span>
                        ) : 'Get Feedback'}
                      </button>
                    </div>
                  </form>
                  
                  {assistantMessages.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-col">
                        <div className="mb-1 text-xs text-gray-600">Edit your message:</div>
                        <textarea
                          value={draftMessage}
                          onChange={(e) => setDraftMessage(e.target.value)}
                          className="w-full p-2 border rounded mb-2 text-gray-900"
                          placeholder="Draft your message here..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={useDraftInMainChat}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded"
                          >
                            Use in Main Chat
                          </button>
                          <button
                            onClick={() => {
                              setAssistantInput(draftMessage);
                              setDraftMessage('');
                            }}
                            className="px-4 py-2 border border-green-500 text-green-600 rounded hover:bg-green-50"
                            title="Get more feedback on your revised message"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Input area */}
            {!gameState.game_over && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    {!showAssistant && (
                      <button
                        className="text-green-600 hover:text-green-700 text-sm flex items-center"
                        onClick={toggleAssistant}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                        </svg>
                        Get Writing Help
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">
                    Playing as: {playerName}
                  </div>
                </div>
                
                <form onSubmit={handleSubmitGroupMessage}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={groupInput}
                      onChange={(e) => setGroupInput(e.target.value)}
                      className="flex-1 p-2 border rounded text-gray-900"
                      placeholder="Type your message..."
                      disabled={submitting}
                    />
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                      disabled={submitting || !groupInput.trim()}
                    >
                      {submitting ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {gameState.game_over && (
          <div className="p-4 flex justify-center">
            <Link href="/home">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded">
                Back to Home
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
