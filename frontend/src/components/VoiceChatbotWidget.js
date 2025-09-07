import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import VoiceChatbotModal from './VoiceChatbotModal';

const VoiceChatbotWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  // Show widget only on Home Page and Dashboard
  const shouldShowWidget = location.pathname === '/' || 
                          location.pathname === '/dashboard' ||
                          location.pathname === '/signin' ||
                          location.pathname === '/signup' ||
                          location.pathname === '/forgot-password' ||
                          location.pathname === '/reset-password';

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Don't render widget on restricted pages (Map, Reports, Profile)
  if (!shouldShowWidget) {
    return null;
  }

  return (
    <>
      {/* Voice Chatbot Widget */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={handleOpenModal}
          className="group relative w-16 h-16 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-600 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-4 focus:ring-purple-500/50"
          aria-label="Open Voice - Adaptive Campus Safety Assistant"
          title="Voice - Your AI Safety Assistant"
        >
          {/* Pulsing Ring Animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 animate-ping opacity-20"></div>
          
          {/* Speaker Emoji Icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <span className="text-2xl animate-pulse">🔊</span>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-50 border border-purple-500/30">
            <div className="relative">
              <div className="font-semibold text-purple-300">Voice Assistant</div>
              <div className="text-xs text-gray-300">Bilingual • Adaptive • Safe</div>
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-purple-500/30"></div>
            </div>
          </div>

          {/* Smart Badge */}
          <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
            <span className="text-xs font-bold text-white">AI</span>
          </div>
        </button>
      </div>

      {/* Voice Chatbot Modal */}
      <VoiceChatbotModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
      />
    </>
  );
};

export default VoiceChatbotWidget;