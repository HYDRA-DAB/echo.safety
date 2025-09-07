import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Phone, AlertTriangle, Shield, Map } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent } from './ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VoiceChatbotModal = ({ isOpen, onClose }) => {
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
    // Start with initial message
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
        content: "I'm having trouble connecting right now. For emergencies, call 100 immediately. Campus security is also available!",
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
      await sendMessage(`I prefer ${button.value}`, button.value, conversationContext);
    } else if (button.action === "navigate") {
      const confirmMessage = languagePreference === 'tamil_english' 
        ? `${button.text} page ku pogalama?`
        : `Should I take you to ${button.text}?`;
      
      const confirmResult = confirm(confirmMessage);
      if (confirmResult) {
        onClose();
        navigate(button.value);
      }
    } else if (button.action === "call") {
      const confirmMessage = languagePreference === 'tamil_english'
        ? "Emergency call pannalama?"
        : "Should I help you make an emergency call?";
      
      const confirmResult = confirm(confirmMessage);
      if (confirmResult) {
        if (button.value === "emergency") {
          window.open('tel:100', '_self');
        } else {
          window.open('tel:+911234567890', '_self'); // Campus security number
        }
      }
    } else if (button.action === "sos") {
      const confirmMessage = languagePreference === 'tamil_english'
        ? "SOS alert send pannalama?"
        : "Should I trigger SOS alert?";
      
      const confirmResult = confirm(confirmMessage);
      if (confirmResult) {
        // Navigate to dashboard where SOS functionality is available
        onClose();
        navigate('/dashboard');
        toast.success(languagePreference === 'tamil_english' 
          ? "Dashboard la SOS button use pannunga!" 
          : "Use the SOS button on Dashboard!");
      }
    } else {
      // For other button types, send as regular message
      await sendMessage(button.text);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim()) {
      sendMessage(inputMessage.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="bg-gray-900 border border-purple-500/30 text-white w-full max-w-md mx-4 h-[85vh] max-h-[600px] overflow-hidden flex flex-col sm:max-w-lg rounded-2xl shadow-2xl"
        aria-labelledby="voice-chatbot-title"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700/50 flex-shrink-0 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-lg">🔊</span>
            </div>
            <div>
              <h2 id="voice-chatbot-title" className="text-lg font-bold text-white">Voice</h2>
              <p className="text-xs text-purple-300">Adaptive AI Assistant</p>
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
                    <span className="text-sm text-gray-300">Voice is thinking...</span>
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
                    button.action === 'navigate' ? 'border-blue-500/50 text-blue-300 hover:bg-blue-500/20' :
                    button.action === 'select_language' ? 'border-purple-500/50 text-purple-300 hover:bg-purple-500/20' :
                    'border-gray-500/50 text-gray-300 hover:bg-gray-500/20'
                  }`}
                  disabled={isLoading}
                >
                  {button.action === 'call' && <Phone className="w-3 h-3 mr-1" />}
                  {button.action === 'navigate' && button.value.includes('map') && <Map className="w-3 h-3 mr-1" />}
                  {button.action === 'sos' && <AlertTriangle className="w-3 h-3 mr-1" />}
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
            Voice is powered by AI • {languagePreference === 'tamil_english' ? 'Tanglish mode' : 'English mode'}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatbotModal;