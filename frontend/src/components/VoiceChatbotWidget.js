import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, MessageSquare } from 'lucide-react';
import VoiceChatbotModal from './VoiceChatbotModal';

const VoiceChatbotWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const location = useLocation();

  // Check if current page is Dashboard or other restricted pages
  const isRestrictedPage = location.pathname === '/dashboard' || 
                          location.pathname === '/crime-map' || 
                          location.pathname === '/reports' || 
                          location.pathname === '/profile';

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Don't render widget on restricted pages
  if (isRestrictedPage) {
    return null;
  }

  return (
    <>
      {/* Voice Chatbot Widget */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={handleOpenModal}
          className="group relative w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
          aria-label="Open Voice Chatbot - Interactive Guide"
          title="Voice - Interactive Campus Safety Assistant"
        >
          {/* Pulsing Ring Animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-ping opacity-20"></div>
          
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <Mic className="w-7 h-7 text-white transition-transform duration-300 group-hover:scale-110" />
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-50">
            <div className="relative">
              <div className="font-semibold">Voice Assistant</div>
              <div className="text-xs text-gray-300">Get help with campus safety</div>
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>

          {/* Badge for "Interactive" */}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
            <MessageSquare className="w-3 h-3 text-white" />
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