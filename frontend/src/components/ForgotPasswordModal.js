import React, { useState } from 'react';
import axios from 'axios';
import { Mail, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setEmailSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      console.error('Forgot password error:', error);
      
      if (error.response?.status === 404) {
        toast.error('No account found with this email address');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please try again later');
      } else {
        toast.error('Failed to send reset email. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setEmailSent(false);
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        {!emailSent ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-white text-xl">Forgot Password?</DialogTitle>
              <DialogDescription className="text-gray-300">
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label htmlFor="modal-email" className="text-white">Email Address</Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="modal-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="input-field pl-10"
                    disabled={loading}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  className="flex-1 text-gray-300 hover:bg-gray-700"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </div>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-white text-xl flex items-center">
                <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                Check Your Email
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="text-center">
                <p className="text-gray-300 mb-2">
                  We've sent a password reset link to:
                </p>
                <p className="text-red-400 font-medium mb-4">{email}</p>
                <p className="text-gray-400 text-sm">
                  Click the link in the email to reset your password. The link will expire in 30 minutes.
                </p>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-blue-200 text-sm font-medium mb-1">Didn't receive the email?</p>
                    <ul className="text-blue-300 text-xs space-y-1">
                      <li>• Check your spam/junk folder</li>
                      <li>• Make sure you entered the correct email</li>
                      <li>• Wait a few minutes for email delivery</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  variant="ghost"
                  className="flex-1 text-gray-300 hover:bg-gray-700"
                >
                  Try Another Email
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1 btn-primary"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;