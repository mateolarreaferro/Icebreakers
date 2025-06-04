'use client';

import { useState, useRef, useEffect } from 'react';
import { SERVER_ADDRESS } from '../api/server';

interface AssistantMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'general' | 'translation' | 'tone';
}

interface AIAssistantProps {
  sessionId?: string;
  userName?: string;
  isVisible: boolean;
  onToggle: () => void;
}

export default function AIAssistant({ sessionId, userName, isVisible, onToggle }: AIAssistantProps) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [assistanceType, setAssistanceType] = useState<'general' | 'translation' | 'tone'>('general');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const addWelcomeMessage = () => {
    const welcomeMessage: AssistantMessage = {
      id: '1',
      content: "Hi! I'm here to help with your conversations. I can:\n\n• Help translate phrases or clarify meanings\n• Suggest better ways to phrase things\n• Give tips for engaging conversations\n\nJust type what you need help with!",
      isUser: false,
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  useEffect(() => {
    if (isVisible && messages.length === 0) {
      addWelcomeMessage();
    }
  }, [isVisible]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: AssistantMessage = {
      id: Date.now().toString(),
      content: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      type: assistanceType
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://${SERVER_ADDRESS}/writing_assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId || 'general',
          display_name: userName || 'User',
          draft_message: userMessage.content,
          assistance_type: assistanceType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get assistance');
      }

      const data = await response.json();
      
      const assistantMessage: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Sorry, I had trouble helping with that. Try again?');
      console.error('Error getting assistance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'translation': return '🌐';
      case 'tone': return '🎭';
      default: return '💬';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'translation': return 'Translation';
      case 'tone': return 'Tone Help';
      default: return 'General';
    }
  };

  const quickHelp = [
    { text: "How do I sound more friendly?", type: 'tone' as const },
    { text: "What does this phrase mean?", type: 'translation' as const },
    { text: "How can I join this conversation?", type: 'general' as const },
    { text: "I'm feeling shy, any tips?", type: 'general' as const }
  ];

  const handleQuickHelp = (helpText: string, type: 'general' | 'translation' | 'tone') => {
    setInputText(helpText);
    setAssistanceType(type);
    inputRef.current?.focus();
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggle}
        className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-blue-700 z-40 transition-colors"
        title="Open AI Assistant"
      >
        <span className="text-sm">🤖</span>
      </button>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-gray-50 border-l border-gray-300 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300 bg-blue-800">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-medium text-white">AI Assistant</h3>
        </div>
        <button
          onClick={onToggle}
          className="text-blue-200 hover:text-white p-1 transition-colors"
          title="Close Assistant"
        >
          ✕
        </button>
      </div>

      {/* Assistance Type Selector */}
      <div className="p-3 border-b border-gray-300 bg-gray-100">
        <div className="grid grid-cols-3 gap-1">
          {(['general', 'translation', 'tone'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setAssistanceType(type)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                assistanceType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-1">
                <span>{getTypeIcon(type)}</span>
                <span>{getTypeLabel(type)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                message.isUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {message.type && message.isUser && (
                <div className="text-xs opacity-75 mb-1">
                  {getTypeIcon(message.type)} {getTypeLabel(message.type)}
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div
                className={`text-xs mt-1 opacity-75 ${
                  message.isUser ? 'text-blue-100' : 'text-gray-600'
                }`}
              >
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <div className="animate-spin">⚪</div>
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Help */}
      {messages.length <= 1 && (
        <div className="p-3 border-t border-gray-300 bg-gray-100">
          <div className="text-xs font-medium text-gray-800 mb-2">Quick Help:</div>
          <div className="space-y-1">
            {quickHelp.map((help, index) => (
              <button
                key={index}
                onClick={() => handleQuickHelp(help.text, help.type)}
                className="w-full text-left text-xs bg-white hover:bg-gray-200 text-gray-800 px-2 py-1 rounded border border-gray-300 transition-colors"
              >
                {getTypeIcon(help.type)} {help.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-100 border-t border-red-300">
          <p className="text-xs text-red-900">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-300 bg-gray-100">
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              assistanceType === 'translation'
                ? 'What phrase needs help?'
                : assistanceType === 'tone'
                ? 'What message needs better tone?'
                : 'How can I help you?'
            }
            className="w-full text-sm border border-gray-400 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none bg-white text-gray-900"
            rows={3}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="w-full py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Helping...' : 'Ask'}
          </button>
        </form>
      </div>
    </div>
  );
}
