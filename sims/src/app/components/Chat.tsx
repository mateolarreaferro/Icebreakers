
export default function Chat({ Name, players }) {
    return (
        <div>
            { /* Corner animation */ }
            <header className="relative flex justify-end">
                <span className="absolute top-3 right-10 flex size-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75"></span>
                    <span className="relative inline-flex size-4 rounded-full bg-violet-400"></span>
                </span>
            </header>


        <div id="chat-card" className="bg-white flex flex-col justify-center w-150 h-30 shadow rounded-lg p-4 m-4 space-y-2">
        <h2 className="text-lg font-semibold text-violet-500">Room: {Name} </h2>

        <div className="flex justify-start">
        <div id="multi-player_icon" className="pr-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
        </div>
        <p> Active players: {players} </p>
        </div>

        <button id="start-game-btn" className="w-full bg-violet-400 hover:bg-violet-400 text-white py-2 rounded">
          Join Game
        </button>
      </div>
      </div>
    );
}