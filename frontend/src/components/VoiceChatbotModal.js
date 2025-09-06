import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Mic, MessageSquare, UserPlus, LogIn, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';

const VoiceChatbotModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // Focus trap and keyboard handling
  useEffect(() => {
    if (isOpen) {
      // Focus the first focusable element when modal opens
      setTimeout(() => {
        if (firstFocusableRef.current) {
          firstFocusableRef.current.focus();
        }
      }, 100);

      // Handle Escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      // Handle Tab key for focus trap
      const handleTab = (e) => {
        if (e.key === 'Tab') {
          const modal = modalRef.current;
          if (!modal) return;

          const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTab);

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, [isOpen, onClose]);

  const handleNavigation = (path) => {
    onClose();
    navigate(path);
  };

  const conversationSteps = [
    {
      icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
      title: "Welcome to Echo!",
      content: "Hi there! I'm your campus safety guide. Let me help you get started with Echo's safety features.",
      type: "intro"
    },
    {
      icon: <UserPlus className="w-5 h-5 text-green-400" />,
      title: "Step 1: Create Your Account",
      content: "First, you'll need to sign up with your SRM roll number and add two trusted emergency contacts. This ensures help can reach you quickly.",
      type: "step"
    },
    {
      icon: <LogIn className="w-5 h-5 text-purple-400" />,
      title: "Step 2: Sign In & Explore",
      content: "Once registered, sign in to access the crime map, view safety alerts, and report incidents. Your account keeps you connected to campus safety.",
      type: "step"
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
      title: "Step 3: Report Incidents",
      content: "If you witness or experience a safety concern, use the Report Incident feature. Your reports help keep the entire campus safer.",
      type: "step"
    },
    {
      icon: <Mic className="w-5 h-5 text-orange-400" />,
      title: "Serious Actions",
      content: "In emergencies, use the SOS button to instantly alert your trusted contacts and campus security with your location via WhatsApp.",
      type: "warning"
    },
    {
      icon: <MessageSquare className="w-5 h-5 text-blue-400" />,
      title: "You're All Set!",
      content: "Echo is here to help you stay safe on campus. Remember, your safety and the community's safety go hand in hand. Stay vigilant, stay connected!",
      type: "closing"
    }
  ];

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className="bg-gray-900 border-gray-700 text-white max-w-md w-full mx-4 max-h-[95vh] overflow-hidden flex flex-col sm:max-w-lg"
        aria-labelledby="voice-chatbot-title"
        aria-describedby="voice-chatbot-description"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="voice-chatbot-title" className="text-lg font-bold text-white">Voice — Beginner Guide</h2>
              <p className="text-xs text-gray-400">Your campus safety assistant</p>
            </div>
          </div>
          <Button
            ref={firstFocusableRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-full w-8 h-8 p-0"
            aria-label="Close chatbot guide"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body - Conversation Flow */}
        <div 
          id="voice-chatbot-description"
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          {conversationSteps.map((step, index) => (
            <div 
              key={index}
              className={`flex space-x-3 p-4 rounded-lg ${
                step.type === 'intro' ? 'bg-blue-900/20 border border-blue-500/30' :
                step.type === 'step' ? 'bg-gray-800/50 border border-gray-600/30' :
                step.type === 'warning' ? 'bg-red-900/20 border border-red-500/30' :
                'bg-green-900/20 border border-green-500/30'
              }`}
            >
              <div className="flex-shrink-0 mt-1">
                {step.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{step.content}</p>
                {step.type === 'step' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Step {index} of {conversationSteps.filter(s => s.type === 'step').length}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Additional Tips */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg">
            <h4 className="font-semibold text-purple-300 mb-2">💡 Pro Tips</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Keep your emergency contacts updated</li>
              <li>• Enable location services for accurate alerts</li>
              <li>• Report incidents promptly to help others</li>
              <li>• Check the crime map before going to new areas</li>
            </ul>
          </div>
        </div>

        {/* Footer - Quick Actions */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <div className="space-y-3">
            <p className="text-sm text-gray-400 text-center mb-4">Quick actions to get started:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <Button
                onClick={() => handleNavigation('/signup')}
                className="bg-green-600 hover:bg-green-700 text-white w-full text-sm py-2"
                aria-label="Open Sign Up page"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
              <Button
                onClick={() => handleNavigation('/signin')}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full text-sm py-2"
                aria-label="Open Sign In page"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button
                onClick={() => handleNavigation('/dashboard')}
                className="bg-red-600 hover:bg-red-700 text-white w-full text-sm py-2"
                aria-label="Open Report page"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Report
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceChatbotModal;