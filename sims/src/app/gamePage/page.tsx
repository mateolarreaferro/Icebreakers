'use client';

import { useEffect, useState } from 'react';
import StartCard from "../components/StartCard";
import Link from 'next/link';
import { SERVER_ADDRESS } from "../api/server";

interface Room {
  session_id: string;
  scenario_title: string;
  gm_name: string;
  phase: string;
  agents: Array<{name: string, persona: string}>;
  game_over: boolean;
}

export default function GameLobbyPage() {
    const [activeRooms, setActiveRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://${SERVER_ADDRESS}/rooms`);
                if (!response.ok) {
                    console.error('Failed to fetch rooms');
                    return;
                }
                const data = await response.json();
                // Filter to show only active (not game over) rooms
                const active = data.filter((room: Room) => !room.game_over);
                setActiveRooms(active);
            } catch (err) {
                console.error('Error fetching rooms:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
        // Poll for updates
        const intervalId = setInterval(fetchRooms, 5000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="bg-violet-100 min-h-screen">
            <header className="p-4 flex justify-between items-center border-b border-violet-200"> 
                <Link href="/home" className="text-violet-600 hover:text-violet-800 transition-colors">
                    ← Back to Home
                </Link>
                <h1 className="text-2xl font-bold text-violet-700">Game Lobby</h1>
                <div className="w-20"></div> {/* Empty div for flex spacing */}
            </header>

            <div className="container mx-auto p-4 md:p-6">
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Create new game card */}
                    <div className="col-span-1">
                        <h2 className="text-xl font-bold text-violet-700 mb-4">Create New Game</h2>
                        <StartCard />
                    </div>
                    
                    {/* Active games list */}
                    <div className="col-span-1">
                        <h2 className="text-xl font-bold text-violet-700 mb-4">Active Games</h2>
                        
                        {loading ? (
                            <div className="bg-white shadow rounded-lg p-4">
                                <p className="text-gray-600">Loading active games...</p>
                            </div>
                        ) : activeRooms.length === 0 ? (
                            <div className="bg-white shadow rounded-lg p-4">
                                <p className="text-gray-600">No active games available. Start a new one!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeRooms.map(room => (
                                    <div 
                                        key={room.session_id} 
                                        className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
                                    >
                                        <h3 className="text-lg font-semibold text-violet-600">{room.scenario_title}</h3>
                                        <p className="text-sm text-gray-600">GM: {room.gm_name}</p>
                                        <p className="text-sm text-gray-600">Players: {room.agents.length}</p>
                                        <div className="mt-3">
                                            <Link 
                                                href={`/game/${room.session_id}`}
                                                className="inline-block bg-violet-500 text-white px-4 py-2 rounded hover:bg-violet-600 transition-colors"
                                            >
                                                Join Game
                                            </Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}