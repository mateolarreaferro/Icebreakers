import Link from 'next/link';
import SettingsIcon from '../components/SettingsIcon';
import StartCard from '../components/StartCard';
import GameCard from '../components/GameCard';

import Chat from '../components/Chat';

export default function HomePage() {
    return (
        <div className="bg-violet-100 min-h-screen">
            <header className='flex justify-end p-4'>
                <SettingsIcon/>
            </header>
            <div className="flex justify-between">

                {/* Active Rooms */}
                <div className="bg-violet-200 overflow-y-auto w-1/2 h-130 shadow-md rounded-lg ml-20 p-4 space-y-4">
                    <h1 className="font-serif text-xl font-bold text-violet-500"> Waiting for players... </h1>
                    <Chat Name={"Expedition_blizzard"} players={3} />
                    <Chat Name={"Mars Outpost"} players={4} />
                    <Chat Name={"Spaceship Crisis"} players={6} />
                    <Chat Name={"Bank Heist"} players={3} />
                    <Chat Name={"The Shibuya Incident"} players={5} />
                    <Chat Name={"Prison Realm"} players={4} />
                </div>

                { /* Button to Start New Game */ }
            <Link href="/gamePage">
                <button className="bg-violet-400 animate-pulse hover:bg-blue-700 text-white py-2 rounded mt-20 mr-60 p-6">
                    Start New Game
                </button>
            </Link>


            </div>

        </div>

    ); 
}