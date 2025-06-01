'use client'

import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { SERVER_ADDRESS } from "../api/server";

interface Scenario {
  id: string;
  title: string;
}

interface GameMaster {
  id: string;
  name: string;
}

export default function StartCard() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [gmProfiles, setGmProfiles] = useState<GameMaster[]>([]);
  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedGM, setSelectedGM] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPersona, setAgentPersona] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // Fetch scenarios and GM profiles from the server when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      setDataError(null);
      try {
        // Fetch scenarios
        const scenariosResponse = await fetch(`http://${SERVER_ADDRESS}/scenarios`);
        if (!scenariosResponse.ok) {
          throw new Error("Failed to load scenarios");
        }
        const scenariosData = await scenariosResponse.json();
        setScenarios(scenariosData);
        
        // Fetch GM profiles
        const gmsResponse = await fetch(`http://${SERVER_ADDRESS}/gms`);
        if (!gmsResponse.ok) {
          throw new Error("Failed to load game masters");
        }
        const gmsData = await gmsResponse.json();
        setGmProfiles(gmsData);
      } catch (err) {
        setDataError(err instanceof Error ? err.message : "Failed to load data");
        console.error("Error loading game data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, []);

  /* Sets the scenario for the simulation */
  const handleScenarioChange = (selectedId: string) => {
    setSelectedScenario(selectedId); 
  };

  /* Sets the GM for the simulation */
  const handleGameMasterChange = (selectedId: string) => {
    setSelectedGM(selectedId);
  };

  // Handle form submission to start a new game
  const handleStartGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedScenario || !selectedGM || !agentName.trim() || !agentPersona.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/start_game`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_id: selectedScenario,
          gm_id: selectedGM,
          name: agentName.trim(),
          persona: agentPersona.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game');
      }

      const gameData = await response.json();
      
      // Redirect to the game page with the session ID
      router.push(`/game/${gameData.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      console.error('Error starting game:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="start-card" className="bg-white shadow rounded-lg p-6 m-4 space-y-4 max-w-md mx-auto">
      <h2 className="text-xl font-semibold text-violet-700">Start a New Game</h2>
      
      {dataError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <p className="text-red-700">{dataError}</p>
        </div>
      )}
      
      {isLoadingData ? (
        <div className="text-center py-4">
          <p>Loading game data...</p>
        </div>
      ) : (
        <form onSubmit={handleStartGame} className="space-y-4">
          {/* Scenario selection */}
          <label className="block">
            <span className="font-medium">Scenario</span>
            <select
              id="scenario-select"
              value={selectedScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="w-full p-2 rounded-md border mt-1"
              disabled={isLoading}
            >
              <option value="">Select a scenario...</option>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
          </label>

          {/* Game Master selection */}
          <label className="block">
            <span className="font-medium">Game Master</span>
            <select
              id="gm-select"
              value={selectedGM}
              onChange={(e) => handleGameMasterChange(e.target.value)}
              className="w-full p-2 rounded-md border mt-1"
              disabled={isLoading}
            >
              <option value="">Select a Game Master...</option>
              {gmProfiles.map((gm) => (
                <option key={gm.id} value={gm.id}>
                  {gm.name}
                </option>
              ))}
            </select>
          </label>
          
          <label className="block">
            <span className="font-medium">Your agent's name</span>
            <input 
              id="agent-name" 
              type="text" 
              className="mt-1 w-full border p-2 rounded"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              disabled={isLoading}
            />
          </label>
          
          <label className="block">
            <span className="font-medium">Your agent's persona</span>
            <textarea 
              id="agent-persona" 
              className="mt-1 w-full border p-2 rounded h-24"
              placeholder="a Master's student at Stanford University who…"
              value={agentPersona}
              onChange={(e) => setAgentPersona(e.target.value)}
              disabled={isLoading}
            />
          </label>
          
          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-violet-500 hover:bg-violet-600 text-white py-2 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Game...' : 'Start Game'}
          </button>
        </form>
      )}
    </div>
  );
}

// <select id="scenario" className="mt-1 w-full border p-2 rounded"></select>

// <select id="gm" className="mt-1 w-full border p-2 rounded"></select>