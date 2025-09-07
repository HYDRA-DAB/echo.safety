import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Phone, AlertTriangle, Shield, Map, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VoiceChatbotModal = ({ isOpen, onClose, widgetPosition = { x: 24, y: 24 } }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [conversationContext, setConversationContext] = useState({});
  const [languagePreference, setLanguagePreference] = useState(null);
  const [currentQuickButtons, setCurrentQuickButtons] = useState([]);
  const [showSafetyTip, setShowSafetyTip] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Calculate modal position relative to widget
  const getModalPosition = () => {
    const modalWidth = 384; // max-w-md = 24rem = 384px
    const modalHeight = 600;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    let modalX = widgetPosition.x + 80; // 80px to the right of widget
    let modalY = screenHeight - widgetPosition.y - modalHeight; // Convert from bottom to top
    
    // Ensure modal stays within screen bounds
    if (modalX + modalWidth > screenWidth - 20) {
      modalX = widgetPosition.x - modalWidth - 20; // Place to the left instead
    }
    if (modalY < 20) {
      modalY = 20; // Minimum top margin
    }
    if (modalY + modalHeight > screenHeight - 20) {
      modalY = screenHeight - modalHeight - 20; // Maximum bottom margin
    }
    
    return {
      left: Math.max(20, modalX),
      top: Math.max(20, modalY)
    };
  };

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initializeConversation();
    }
  }, [isOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 200);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    await sendMessage("start", null, {});
  };

  const sendMessage = async (message, languagePref = null, context = null) => {
    if (!message.trim() && message !== "start") return;

    // Add user message (except for initial "start")
    if (message !== "start") {
      const userMessage = {
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
    }

    setIsLoading(true);
    setCurrentQuickButtons([]);

    try {
      const requestData = {
        message: message === "start" ? "Hi" : message,
        language_preference: languagePref || languagePreference,
        conversation_context: context || conversationContext,
        session_id: sessionId
      };

      const response = await axios.post(`${API}/voice`, requestData);
      const data = response.data;

      // Update session state
      if (data.session_id) setSessionId(data.session_id);
      if (data.language_used) setLanguagePreference(data.language_used);
      if (data.conversation_context) setConversationContext(data.conversation_context);

      // Add bot message
      const botMessage = {
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        intent: data.intent_detected
      };

      setMessages(prev => [...prev, botMessage]);
      setCurrentQuickButtons(data.quick_buttons || []);
      
      // Show safety tip if provided
      if (data.safety_tip) {
        setShowSafetyTip(data.safety_tip);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'bot',
        content: languagePreference === 'tamil_english' 
          ? "Sorry bro, problem irukku. Emergency na 100 call pannunga!"
          : "I'm having trouble connecting. For emergencies, call 100!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Unable to connect to Voice assistant');
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const handleQuickButton = async (button) => {
    if (button.action === "select_language") {
      setLanguagePreference(button.value);
      const welcomeText = button.value === 'tamil_english' 
        ? "I prefer Tamil-English mix"
        : "I prefer English";
      await sendMessage(welcomeText, button.value, conversationContext);
      
    } else if (button.action === "confirm_navigate") {
      // Show confirmation dialog
      setPendingAction(button);
      setShowConfirmation(true);
      
    } else if (button.action === "navigate") {
      // Direct navigation without confirmation
      onClose();
      navigate(button.value);
      
    } else if (button.action === "call") {
      const confirmMessage = languagePreference === 'tamil_english'
        ? "Call pannalama?"
        : "Make this call?";
      
      if (window.confirm(confirmMessage)) {
        if (button.value === "emergency") {
          window.open('tel:100', '_self');
        } else {
          window.open('tel:+911234567890', '_self');
        }
      }
    } else {
      // For other button types, send as regular message
      await sendMessage(button.text);
    }
  };

  const handleConfirmAction = async (confirmed) => {
    setShowConfirmation(false);
    
    if (confirmed && pendingAction) {
      // Add confirmation message to chat
      const confirmText = languagePreference === 'tamil_english' 
        ? "Seri, pogalam!"
        : "Okay, let's go!";
      
      const userMessage = {
        type: 'user',
        content: confirmText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);

      // Add closing message with safety tip
      const closingMessage = languagePreference === 'tamil_english'
        ? "Seri da, anga poi careful ah irukka. Stay safe! 🔒"
        : "Alright, stay safe there! 🔒";
      
      const botMessage = {
        type: 'bot',
        content: closingMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);

      // Close modal and navigate after a brief delay
      setTimeout(() => {
        onClose();
        
        // Add highlight parameter based on button text and action
        let navigationUrl = pendingAction.value;
        
        if (navigationUrl === '/dashboard') {
          // Add highlighting based on the button text
          const buttonText = pendingAction.text.toLowerCase();
          
          if (buttonText.includes('report') || buttonText.includes('incident')) {
            navigationUrl = '/dashboard?highlight=report';
          } else if (buttonText.includes('sos') || buttonText.includes('helpline') || buttonText.includes('emergency')) {
            navigationUrl = '/dashboard?highlight=sos';
          }
        }
        
        navigate(navigationUrl);
      }, 1000);
      
    } else {
      // User declined - send encouraging message
      const declineMessage = languagePreference === 'tamil_english'
        ? "Okay da, vera help venum na sollu!"
        : "No problem! Let me know if you need other help.";
      
      const botMessage = {
        type: 'bot',
        content: declineMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }
    
    setPendingAction(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
    }
  };

  if (!isOpen) return null;

  const modalPosition = getModalPosition();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="bg-gray-900 border border-purple-500/30 text-white w-full max-w-md mx-4 h-[85vh] max-h-[600px] overflow-hidden flex flex-col rounded-2xl shadow-2xl"
        style={{
          position: 'fixed',
          left: `${modalPosition.left}px`,
          top: `${modalPosition.top}px`,
          margin: 0,
          transform: 'none'
        }}
        aria-labelledby="voice-chatbot-title"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        {/* Confirmation Dialog Overlay */}
        {showConfirmation && pendingAction && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-2xl">
            <div className="bg-gray-800 border border-purple-500/30 rounded-xl p-6 max-w-sm mx-4">
              <div className="text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Confirm Action</h3>
                <p className="text-gray-300 mb-6">
                  {pendingAction.confirm_message || "Proceed with this action?"}
                </p>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleConfirmAction(false)}
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    No
                  </Button>
                  <Button
                    onClick={() => handleConfirmAction(true)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Yes
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-lg">🔊</span>
            </div>
            <div>
              <h2 id="voice-chatbot-title" className="text-lg font-bold text-white">Voice</h2>
              <p className="text-xs text-purple-300">App-Aware Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-8 h-8 p-0 transition-colors"
            aria-label="Close Voice assistant"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-900 to-gray-800">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-end space-x-2 max-w-[85%]">
                {message.type === 'bot' && (
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm">🔊</span>
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl text-sm shadow-lg ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-br-md'
                      : 'bg-gray-700/80 text-gray-100 rounded-bl-md border border-gray-600/50'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-end space-x-2 max-w-[85%]">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-sm">🔊</span>
                </div>
                <div className="bg-gray-700/80 text-gray-200 p-3 rounded-2xl rounded-bl-md border border-gray-600/50">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                    <span className="text-sm text-gray-300">Voice thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Safety Tip */}
          {showSafetyTip && (
            <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/30 rounded-lg p-3 mt-4">
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-green-300 text-sm font-medium">Safety Tip</p>
                  <p className="text-green-200 text-sm mt-1">{showSafetyTip}</p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Buttons */}
        {currentQuickButtons.length > 0 && (
          <div className="p-4 border-t border-gray-700/50 flex-shrink-0 bg-gray-900/50">
            <div className="flex flex-wrap gap-2">
              {currentQuickButtons.map((button, index) => (
                <Button
                  key={index}
                  onClick={() => handleQuickButton(button)}
                  variant="outline"
                  size="sm"
                  className={`text-xs rounded-full border transition-all duration-200 ${
                    button.action === 'call' ? 'border-red-500/50 text-red-300 hover:bg-red-500/20' :
                    button.action.includes('navigate') ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/20' :
                    button.action === 'select_language' ? 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20' :
                    'border-gray-500/50 text-gray-300 hover:bg-gray-500/20'
                  }`}
                  disabled={isLoading}
                >
                  {button.action === 'call' && <Phone className="w-3 h-3 mr-1" />}
                  {button.action.includes('navigate') && button.value && button.value.includes('map') && <Map className="w-3 h-3 mr-1" />}
                  {button.action.includes('navigate') && button.value && button.value.includes('dashboard') && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {button.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-700/50 flex-shrink-0 bg-gray-900/80">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={languagePreference === 'tamil_english' ? "Type pannunga..." : "Type your message..."}
              className="flex-1 bg-gray-800/50 border-gray-600/50 text-white placeholder-gray-400 rounded-full px-4 focus:border-purple-500/50 focus:ring-purple-500/20"
              disabled={isLoading}
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-full px-4 shadow-lg transition-all duration-200"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <div className="text-xs text-gray-500 mt-2 text-center">
            Voice • {languagePreference === 'tamil_english' ? 'Tanglish mode' : 'English mode'} • Draggable
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatbotModal;