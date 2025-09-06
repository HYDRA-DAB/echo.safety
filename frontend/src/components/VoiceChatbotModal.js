import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mic, MessageSquare, UserPlus, LogIn, AlertTriangle, Send, Phone, Shield } from 'lucide-react';
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
  const firstFocusableRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStage, setConversationStage] = useState('initial');
  const [sessionId, setSessionId] = useState(null);
  const [currentQuickReplies, setCurrentQuickReplies] = useState([]);
  const [currentButtons, setCurrentButtons] = useState([]);
  const [showSeriousActions, setShowSeriousActions] = useState(false);

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

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        }
      }, 100);

      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeConversation = async () => {
    const welcomeMessage = {
      type: 'bot',
      content: "Hi! I'm Voice, your campus safety guide. I'm here to help you with Echo's safety features. What can I help you with today?",
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    setCurrentQuickReplies(['Report an Incident', 'Need Help Signing In', 'Emergency Guidance', 'Other']);
    setConversationStage('initial');
  };

  const sendMessage = async (message, incidentType = null, priorityLevel = null) => {
    if (!message.trim() && !incidentType) return;

    const userMessage = {
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setCurrentQuickReplies([]);
    setCurrentButtons([]);

    try {
      const requestData = {
        message: message,
        incident_type: incidentType,
        priority_level: priorityLevel,
        conversation_stage: conversationStage,
        session_id: sessionId
      };

      const response = await axios.post(`${API}/voice`, requestData);
      const data = response.data;

      // Update session ID
      if (data.session_id) {
        setSessionId(data.session_id);
      }

      const botMessage = {
        type: 'bot',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setCurrentQuickReplies(data.quick_replies || []);
      setCurrentButtons(data.buttons || []);
      setConversationStage(data.conversation_stage);
      setShowSeriousActions(data.show_serious_actions);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        type: 'bot',
        content: "I'm having trouble right now. For immediate help, please contact campus security. If this is an emergency, call police immediately.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Unable to connect to chatbot service');
    } finally {
      setIsLoading(false);
      setInputMessage('');
    }
  };

  const handleQuickReply = (reply) => {
    // Handle quick replies based on conversation stage
    if (conversationStage === 'initial') {
      const incidentTypeMap = {
        'Report an Incident': 'other',
        'Theft': 'theft',
        'Harassment': 'harassment', 
        'Drug Abuse': 'drug_abuse',
        'Other': 'other'
      };
      sendMessage(reply, incidentTypeMap[reply] || 'other');
    } else if (conversationStage === 'incident_type') {
      const priorityMap = {
        'Low': 'low',
        'Medium': 'medium',
        'High': 'high'
      };
      sendMessage(reply, null, priorityMap[reply]);
    } else {
      sendMessage(reply);
    }
  };

  const handleButtonAction = (action) => {
    switch (action) {
      case 'open_report':
        onClose();
        navigate('/dashboard');
        break;
      case 'open_signin':
        onClose();
        navigate('/signin');
        break;
      case 'open_signup':
        onClose();
        navigate('/signup');
        break;
      case 'call_help':
        window.open('tel:100', '_self');
        break;
      case 'restart':
        setMessages([]);
        setConversationStage('initial');
        setSessionId(null);
        initializeConversation();
        break;
      case 'help':
        sendMessage('I need more help');
        break;
      default:
        break;
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
        className="bg-gray-900 border-gray-700 text-white w-full max-w-md mx-4 h-[90vh] max-h-[600px] overflow-hidden flex flex-col sm:max-w-lg"
        aria-labelledby="voice-chatbot-title"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="voice-chatbot-title" className="text-lg font-bold text-white">Voice</h2>
              <p className="text-xs text-gray-400">Campus Safety Assistant</p>
            </div>
          </div>
          <Button
            ref={firstFocusableRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-8 h-8 p-0"
            aria-label="Close Voice chatbot"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Serious Actions Alert */}
        {showSeriousActions && (
          <div className="p-4 bg-red-900/20 border-b border-red-500/30 flex-shrink-0">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-semibold text-sm">Serious Actions Needed</h3>
                <ul className="text-red-200 text-xs mt-1 space-y-1">
                  <li>• Get to a safe place immediately</li>
                  <li>• Call Police: 100 (Emergency)</li>
                  <li>• Use our SOS feature to alert contacts</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-lg text-sm ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white ml-4'
                    : 'bg-gray-800 text-gray-200 mr-4'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-200 max-w-[80%] p-3 rounded-lg mr-4">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm">Voice is thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Replies */}
        {currentQuickReplies.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-400 mb-2">Quick replies:</p>
            <div className="flex flex-wrap gap-2">
              {currentQuickReplies.map((reply, index) => (
                <Button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  variant="outline"
                  size="sm"
                  className="text-xs border-gray-600 text-gray-300 hover:bg-gray-700"
                  disabled={isLoading}
                >
                  {reply}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {currentButtons.length > 0 && (
          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <p className="text-xs text-gray-400 mb-2">Actions:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {currentButtons.map((button, index) => (
                <Button
                  key={index}
                  onClick={() => handleButtonAction(button.action)}
                  className={`text-sm py-2 ${
                    button.action === 'call_help' ? 'bg-red-600 hover:bg-red-700' :
                    button.action === 'open_signin' ? 'bg-blue-600 hover:bg-blue-700' :
                    button.action === 'open_report' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-gray-600 hover:bg-gray-700'
                  }`}
                  disabled={isLoading}
                >
                  {button.action === 'call_help' && <Phone className="w-4 h-4 mr-2" />}
                  {button.action === 'open_signin' && <LogIn className="w-4 h-4 mr-2" />}
                  {button.action === 'open_report' && <AlertTriangle className="w-4 h-4 mr-2" />}
                  {button.action === 'open_signup' && <UserPlus className="w-4 h-4 mr-2" />}
                  {button.text}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 px-3"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatbotModal;