'use client'

import scenarios from "../data/scenarios.json";
import gm_profiles from "../data/gm_profiles.json";
import React, { useEffect, useState } from "react";

export default function StartCard() {
  const [selectedScenario, setSelectedScenario] = useState("");
  const [selectedGM, setSelectedGM] = useState("");


  /* Sets the scenerio for the simulation */
  const handleScenarioChange = ({ selectedId }) => {
    setSelectedScenario(selectedId); 
  };

  /* Sets the GM for the simulation */
  const handleGameMasterChange = ( {selectedId}) => {
    setSelectedGM(selectedId);
  };

    return (
        <div id="start-card" className="bg-white w-200 h-150 shadow rounded-lg p-6 m-4 space-y-4">
          <h2 className="text-xl font-semibold text-blue-700">Start a New Game</h2>
          
          { /* Scenerio selection */ }
          <label className="block">
            <span className="font-medium">Scenario</span>
            <select
              id="scenario-select"
              value={selectedScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="w-full p-2 rounded-md border"
            >
              <option value="">Select a scenario...</option>
                {scenarios.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
              </option> ))}
            </select>

          <p id="scenario-load-error" className="text-red-500 mt-1 hidden">Could not load scenarios.</p>
        </label>

        { /* Game Master selection */ }
        <label className="block">
          <span className="font-medium">Game Master</span>
          <select
              id="scenario-select"
              value={selectedGM}
              onChange={(e) => handleGameMasterChange(e.target.value)}
              className="w-full p-2 rounded-md border"
            >
              <option value="">Select a Game Master...</option>
                {gm_profiles.map((gm_profile) => (
                    <option key={gm_profile.id} value={gm_profile.id}>
                    {gm_profile.name}
              </option> ))}
            </select>

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

// <select id="scenario" className="mt-1 w-full border p-2 rounded"></select>

// <select id="gm" className="mt-1 w-full border p-2 rounded"></select>