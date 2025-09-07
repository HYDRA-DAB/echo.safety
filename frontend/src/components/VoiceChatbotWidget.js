import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import VoiceChatbotModal from './VoiceChatbotModal';

const VoiceChatbotWidget = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default bottom-left (24px from edges)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [widgetSize] = useState({ width: 64, height: 64 }); // 16 * 4 = 64px
  const [dragThreshold] = useState(5); // pixels to move before considering it a drag
  const [mouseDownPos, setMouseDownPos] = useState(null);
  
  const location = useLocation();
  const widgetRef = useRef(null);
  const isDraggingRef = useRef(false);

  // Load saved position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('voice-widget-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        // Validate position is within screen bounds
        const validPosition = validatePosition(parsed);
        setPosition(validPosition);
      } catch (e) {
        console.warn('Invalid saved position, using default');
      }
    }
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('voice-widget-position', JSON.stringify(position));
  }, [position]);

  // Show widget only on Home Page and Dashboard
  const shouldShowWidget = location.pathname === '/' || 
                          location.pathname === '/dashboard' ||
                          location.pathname === '/signin' ||
                          location.pathname === '/signup' ||
                          location.pathname === '/forgot-password' ||
                          location.pathname === '/reset-password';

  const validatePosition = (pos) => {
    const maxX = window.innerWidth - widgetSize.width;
    const maxY = window.innerHeight - widgetSize.height;
    
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY))
    };
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    setMouseDownPos({ x: e.clientX, y: e.clientY });
    // Don't prevent default or start drag immediately
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const startDrag = (clientX, clientY) => {
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: clientX - rect.left,
      y: clientY - rect.top
    });
    setIsDragging(true);
    isDraggingRef.current = true;
  };

  const handleMouseMove = (e) => {
    if (!mouseDownPos) return;
    
    const distance = Math.sqrt(
      Math.pow(e.clientX - mouseDownPos.x, 2) + 
      Math.pow(e.clientY - mouseDownPos.y, 2)
    );
    
    // Only start dragging if moved beyond threshold
    if (distance > dragThreshold && !isDragging) {
      // Calculate the offset when starting to drag
      const rect = widgetRef.current.getBoundingClientRect();
      setDragOffset({
        x: mouseDownPos.x - rect.left,
        y: mouseDownPos.y - rect.top
      });
      setIsDragging(true);
      isDraggingRef.current = true;
      console.log('Started dragging with offset:', {x: mouseDownPos.x - rect.left, y: mouseDownPos.y - rect.top});
    }
    
    if (isDragging) {
      e.preventDefault();
      updatePosition(e.clientX, e.clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  };

  const updatePosition = (clientX, clientY) => {
    const newPosition = {
      x: clientX - dragOffset.x,
      y: window.innerHeight - (clientY - dragOffset.y) - widgetSize.height // Convert to bottom-left coordinates
    };
    console.log('Updating position to:', newPosition);
    setPosition(validatePosition(newPosition));
  };

  const handleMouseUp = () => {
    setMouseDownPos(null);
    if (isDragging) {
      setIsDragging(false);
      // Delay to prevent click event from firing after drag
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Delay to prevent click event from firing
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  };

  const handleClick = () => {
    // Don't open modal if we just finished dragging
    if (isDraggingRef.current) return;
    setIsModalOpen(true);
  };

  // Add global event listeners for drag
  useEffect(() => {
    if (mouseDownPos) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [mouseDownPos, isDragging, dragOffset]);

  // Update position on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => validatePosition(prev));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Don't render widget on restricted pages
  if (!shouldShowWidget) {
    return null;
  }

  // Convert position to CSS style (from bottom-left to top-left)
  const widgetStyle = {
    position: 'fixed',
    left: `${position.x}px`,
    bottom: `${position.y}px`,
    zIndex: 50,
    cursor: isDragging ? 'grabbing' : 'grab',
    userSelect: 'none',
    touchAction: 'none'
  };

  return (
    <>
      {/* Draggable Voice Chatbot Widget */}
      <div style={widgetStyle}>
        <button
          ref={widgetRef}
          onClick={handleClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`group relative w-16 h-16 bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-500 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-600 rounded-full shadow-2xl transition-all duration-300 ${
            isDragging ? 'scale-110' : 'hover:scale-110 focus:scale-110'
          } focus:outline-none focus:ring-4 focus:ring-purple-500/50`}
          aria-label="Voice - Drag to move, click to chat"
          title="Voice Assistant - Drag to reposition"
          disabled={isDragging}
        >
          {/* Pulsing Ring Animation */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 ${
            isDragging ? 'animate-pulse' : 'animate-ping'
          } opacity-20`}></div>
          
          {/* Speaker Emoji Icon */}
          <div className="relative z-10 flex items-center justify-center w-full h-full">
            <span className={`text-2xl transition-transform duration-300 ${
              isDragging ? 'scale-90' : 'group-hover:scale-110'
            } ${isDragging ? '' : 'animate-pulse'}`}>
              🔊
            </span>
          </div>

          {/* Tooltip - only show when not dragging */}
          {!isDragging && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none z-50 border border-purple-500/30">
              <div className="relative">
                <div className="font-semibold text-purple-300">Voice Assistant</div>
                <div className="text-xs text-gray-300">Hold & drag to move • Click to chat</div>
                {/* Tooltip Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45 border-r border-b border-purple-500/30"></div>
              </div>
            </div>
          )}

          {/* Smart Badge */}
          <div className={`absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 ${
            isDragging ? 'scale-75' : ''
          }`}>
            <span className="text-xs font-bold text-white">AI</span>
          </div>

          {/* Drag indicator */}
          {isDragging && (
            <div className="absolute inset-0 rounded-full border-2 border-white/50 border-dashed animate-spin"></div>
          )}
        </button>
      </div>

      {/* Voice Chatbot Modal - positioned relative to widget */}
      <VoiceChatbotModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal}
        widgetPosition={position}
      />
    </>
  );
};

export default VoiceChatbotWidget;