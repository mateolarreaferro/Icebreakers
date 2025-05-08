
export default function GameCard() {

  // "bg-white shadow rounded-lg p-6 mt-6 hidden flex flex-col space-y-4"
    return (
        <div id="game-card" className="bg-white shadow rounded-lg p-6 mt-6 flex flex-col pace-y-4">
        <div id="phase-indicator" className="text-sm font-semibold text-amber-700 mb-2">
          Phase: Introduction
        </div>
  
        <div className="flex justify-end space-x-2">
          <button id="download-btn" className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1 rounded hidden">
            Download
          </button>
          <button id="new-game-btn" className="bg-slate-200 hover:bg-slate-300 px-3 py-1 rounded">
            New Game
          </button>
        </div>
  
        <div>
          <h2 id="scenario-title" className="text-xl font-semibold"></h2>
          <p id="gm-name" className="text-sm italic text-slate-500"></p>
          <p id="initial-setup" className="mt-1"></p>
        </div>
  
        <div id="dialogue" className="flex flex-col space-y-4 max-h-[60vh] overflow-y-auto pr-2"></div>
  
        <div id="game-over-area" className="text-center hidden">
          <p className="font-semibold text-lg">Game Over!</p>
          <p className="outcome mt-1"></p>
          <p className="error-message text-red-500 mt-1 hidden"></p>
        </div>
  
        <div id="instruction-area" className="sticky bottom-0 bg-white pt-4 flex space-x-2">
          <textarea id="user-instruction"
                    className="flex-grow border rounded p-2 h-12 resize-none"
                    placeholder="Tell your agent what to do…"></textarea>
          <button id="submit-turn-btn" className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded">
            Submit
          </button>
        </div>
      </div>
    );
}