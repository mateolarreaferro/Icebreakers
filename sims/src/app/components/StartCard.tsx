

export default function StartCard() {
    return (
        <div id="start-card" className="bg-white w-200 h-150 shadow rounded-lg p-6 m-4 space-y-4">
        <h2 className="text-xl font-semibold text-blue-700">Start a New Game</h2>
  
        <label className="block">
          <span className="font-medium">Scenario</span>
          <select id="scenario" className="mt-1 w-full border p-2 rounded"></select>
          <p id="scenario-load-error" className="text-red-500 mt-1 hidden">Could not load scenarios.</p>
        </label>
  
        <label className="block">
          <span className="font-medium">Game Master</span>
          <select id="gm" className="mt-1 w-full border p-2 rounded"></select>
          <p id="gm-load-error" className="text-red-500 mt-1 hidden">Could not load GMs.</p>
        </label>
  
        <label className="block">
          <span className="font-medium">Your agent’s name</span>
          <input id="agent-name" type="text" className="mt-1 w-full border p-2 rounded"/>
        </label>
  
        <label className="block">
          <span className="font-medium">Your agent’s persona</span>
          <textarea id="agent-persona" className="mt-1 w-full border p-2 rounded h-24"
                    placeholder="a Master's student at Stanford University who…"></textarea>
        </label>
  
        <button id="start-game-btn" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
          Start Game
        </button>
      </div>
    );
}