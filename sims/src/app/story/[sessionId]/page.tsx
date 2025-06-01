'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SERVER_ADDRESS } from '../../api/server';

interface StoryData {
  story: string | string[];
}

export default function StoryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  
  const [storyContent, setStoryContent] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameInfo, setGameInfo] = useState<{
    title: string;
    gm: string;
    outcome?: string[];
  } | null>(null);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        
        // First get the room info
        const roomsResponse = await fetch(`http://${SERVER_ADDRESS}/rooms`);
        if (!roomsResponse.ok) {
          throw new Error('Failed to fetch game data');
        }
        
        const rooms = await roomsResponse.json();
        const currentRoom = rooms.find((room: any) => room.session_id === sessionId);
        
        if (!currentRoom) {
          throw new Error('Game session not found');
        }
        
        setGameInfo({
          title: currentRoom.scenario_title,
          gm: currentRoom.gm_name,
          outcome: currentRoom.outcome
        });
        
        // Then get the story content
        const storyResponse = await fetch(`http://${SERVER_ADDRESS}/make_story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ session_id: sessionId }),
        });

        if (!storyResponse.ok) {
          const errorData = await storyResponse.json();
          throw new Error(errorData.error || 'Failed to fetch story');
        }

        const storyData: StoryData = await storyResponse.json();
        if (storyData.story) {
          if (Array.isArray(storyData.story)) {
            setStoryContent(storyData.story);
          } else {
            setStoryContent([storyData.story]);
          }
        } else {
          throw new Error('No story content available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        console.error('Error fetching story:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchStory();
    }
  }, [sessionId]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/download`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to download story');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${gameInfo?.title || 'story'}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading story:', err);
      alert('Failed to download story');
    }
  };

  if (loading) {
    return (
      <div className="bg-violet-100 min-h-screen flex items-center justify-center">
        <div className="text-xl font-medium text-violet-700">Loading story...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-violet-100 min-h-screen p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Error</h1>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            {error}
          </div>
          <Link href="/home">
            <button className="bg-violet-400 hover:bg-violet-500 text-white py-2 px-4 rounded">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-violet-100 min-h-screen p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-violet-700">{gameInfo?.title || 'Story'}</h1>
            <p className="text-gray-600">Game Master: {gameInfo?.gm || 'Unknown'}</p>
          </div>
          <button 
            onClick={handleDownload}
            className="bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Download
          </button>
        </div>
        
        {gameInfo?.outcome && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <h3 className="font-bold text-green-800">Outcome</h3>
            <p>{gameInfo.outcome.join(", ")}</p>
          </div>
        )}
        
        <div className="bg-gray-50 p-6 rounded-lg prose max-w-none">
          {storyContent.length > 0 ? (
            storyContent.map((paragraph, index) => (
              <p key={index} className="mb-4 whitespace-pre-line">{paragraph}</p>
            ))
          ) : (
            <p className="italic text-gray-500 text-center">No story content available.</p>
          )}
        </div>
        
        <div className="mt-6 flex justify-center">
          <Link href="/home">
            <button className="bg-violet-400 hover:bg-violet-500 text-white py-2 px-6 rounded">
              Back to Home
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
