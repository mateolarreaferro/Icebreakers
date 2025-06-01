'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import SettingsIcon from '../components/SettingsIcon';
import StartCard from '../components/StartCard';
import GameCard from '../components/GameCard';

import Chat from '../components/Chat';
import { SERVER_ADDRESS } from '../api/server';

interface Room {
  session_id: string;
  scenario_title: string;
  gm_name: string;
  phase: string;
  agents: Array<{name: string, persona: string}>;
  game_over: boolean;
  outcome?: string[];
}



export default function HomePage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://${SERVER_ADDRESS}/rooms`);
                if (!response.ok) {
                    throw new Error('Failed to fetch rooms');
                }
                const data = await response.json();
                setRooms(data);
                setError(null);
            } catch (err) {
                setError('Failed to load active rooms');
                console.error('Error fetching rooms:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
        // Optionally set up polling to refresh rooms periodically
        const intervalId = setInterval(fetchRooms, 10000); // Every 10 seconds
        
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="bg-violet-100 min-h-screen">
            <header className='flex justify-end p-4'>
                <SettingsIcon/>
            </header>
            <div className="flex justify-between">

                {/* Active Rooms */}
                <div className="bg-violet-200 overflow-y-auto w-1/2 h-130 shadow-md rounded-lg ml-20 p-4 space-y-4">
                    <h1 className="font-serif text-xl font-bold text-violet-500">
                        {loading ? 'Loading rooms...' : 'Active Rooms'}
                    </h1>
                    
                    {error && (
                        <div className="text-red-500 p-2 bg-red-100 rounded">
                            {error}
                        </div>
                    )}
                    
                    {!loading && rooms.length === 0 && !error && (
                        <div className="p-2">
                            No active rooms available. Start a new game!
                        </div>
                    )}
                    
                    {rooms.map((room) => (
                        <Chat 
                            key={room.session_id} 
                            Name={room.scenario_title} 
                            players={room.agents.length} 
                            sessionId={room.session_id}
                            gameOver={room.game_over}
                        />
                    ))}
                </div>                {/* Button to Start New Game */}
                <div className="mr-20 flex flex-col items-center justify-center">
                    <Link href="/gamePage">
                        <div className="bg-violet-500 hover:bg-violet-600 text-white py-4 px-8 rounded-lg shadow-lg transition-all hover:shadow-xl transform hover:-translate-y-1 flex flex-col items-center space-y-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z" />
                            </svg>
                            <span className="text-lg font-medium">Enter Game Lobby</span>
                            <span className="text-sm text-white/80">Create or join a game</span>
                        </div>
                    </Link>
                </div>


            </div>

        </div>

    ); 
}