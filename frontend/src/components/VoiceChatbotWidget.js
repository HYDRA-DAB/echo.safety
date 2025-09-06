import React, { useState, useEffect } from 'react';
import { Mic, MessageSquare } from 'lucide-react';
import VoiceChatbotModal from './VoiceChatbotModal';

const VoiceChatbotWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wasClosedThisSession, setWasClosedThisSession] = useState(false);

  // Check session storage on component mount
  useEffect(() => {
    const closedInSession = sessionStorage.getItem('voice-chatbot-closed');
    if (closedInSession === 'true') {
      setWasClosedThisSession(true);
    }
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setWasClosedThisSession(true);
    // Remember that user closed it in this session
    sessionStorage.setItem('voice-chatbot-closed', 'true');
  };

  // Don't show widget if user already closed it this session
  if (wasClosedThisSession) {
    return null;
  }

  return (
    <>
      {/* Voice Chatbot Widget */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          onClick={handleOpenModal}
          className="group relative w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 focus:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
          aria-label="Open Voice Chatbot - Beginner Guide"
          title="Voice Chatbot - Get started with Echo!"
        >
          {/* Pulsing Ring Animation */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 animate-ping opacity-20"></div>
          
          {/* Icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <Mic className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" />
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none">
            <div className="relative">
              Voice Guide
              {/* Tooltip Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
            </div>
          </div>

          {/* Badge for "New" or notification */}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
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