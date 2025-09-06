import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Shield, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);
  const [validatingToken, setValidatingToken] = useState(true);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    // Validate token when component mounts
    validateToken();
  }, [token]);

  const validateToken = async () => {
    if (!token) {
      setTokenValid(false);
      setValidatingToken(false);
      return;
    }

    try {
      await axios.post(`${API}/auth/validate-reset-token`, { token });
      setTokenValid(true);
    } catch (error) {
      console.error('Token validation error:', error);
      setTokenValid(false);
      
      if (error.response?.status === 400) {
        toast.error('This reset link has expired or is invalid');
      } else {
        toast.error('Unable to validate reset link');
      }
    } finally {
      setValidatingToken(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        password: formData.password
      });
      
      setResetSuccess(true);
      toast.success('Password reset successfully!');
    } catch (error) {
      console.error('Password reset error:', error);
      
      if (error.response?.status === 400) {
        toast.error('Reset link has expired or is invalid');
      } else if (error.response?.status === 422) {
        toast.error('Password does not meet security requirements');
      } else {
        toast.error('Failed to reset password. Please try again');
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state while validating token
  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Echo</h1>
            <p className="text-gray-400">Campus Crime Alert & Prevention – SRM KTR</p>
          </div>

          {/* Invalid Token Card */}
          <Card className="feature-card p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Invalid Reset Link</h2>
            <p className="text-gray-300 mb-6">
              This password reset link has expired or is invalid. 
              Reset links are only valid for 30 minutes.
            </p>

            <div className="space-y-3">
              <Link to="/forgot-password" className="block">
                <Button className="w-full btn-primary">
                  Request New Reset Link
                </Button>
              </Link>
              <Link to="/signin" className="block">
                <Button variant="ghost" className="w-full text-gray-300 hover:bg-gray-800">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <Link to="/" className="text-gray-400 hover:text-white text-sm flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Echo</h1>
            <p className="text-gray-400">Campus Crime Alert & Prevention – SRM KTR</p>
          </div>

          {/* Success Card */}
          <Card className="feature-card p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">Password Reset Successfully!</h2>
            <p className="text-gray-300 mb-6">
              Your password has been updated. You can now sign in with your new password.
            </p>

            <Button 
              onClick={() => navigate('/signin')}
              className="w-full btn-primary"
            >
              Continue to Sign In
            </Button>
          </Card>

          {/* Footer */}
          <div className="text-center mt-6">
            <Link to="/" className="text-gray-400 hover:text-white text-sm flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Echo</h1>
          <p className="text-gray-400">Campus Crime Alert & Prevention – SRM KTR</p>
        </div>

        {/* Reset Form */}
        <Card className="feature-card p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
            <p className="text-gray-300">
              {email && <span className="text-red-400">{email}</span>}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Enter your new password below. Make sure it's strong and secure.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="password" className="text-white">New Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter new password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-white">Confirm New Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm new password"
                  className="input-field pl-10 pr-10"
                  disabled={loading}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-blue-200 text-sm font-medium mb-2">Password Requirements:</p>
              <ul className="text-blue-300 text-xs space-y-1">
                <li className={`flex items-center ${formData.password.length >= 8 ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{formData.password.length >= 8 ? '✓' : '•'}</span>
                  At least 8 characters long
                </li>
                <li className={`flex items-center ${/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{/(?=.*[a-z])(?=.*[A-Z])/.test(formData.password) ? '✓' : '•'}</span>
                  Contains uppercase and lowercase letters
                </li>
                <li className={`flex items-center ${/(?=.*\d)/.test(formData.password) ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{/(?=.*\d)/.test(formData.password) ? '✓' : '•'}</span>
                  Contains at least one number
                </li>
                <li className={`flex items-center ${formData.password === formData.confirmPassword && formData.confirmPassword ? 'text-green-400' : ''}`}>
                  <span className="mr-2">{formData.password === formData.confirmPassword && formData.confirmPassword ? '✓' : '•'}</span>
                  Passwords match
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full btn-primary"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating Password...</span>
                </div>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/signin">
              <Button variant="ghost" className="text-gray-400 hover:bg-gray-800">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link to="/" className="text-gray-400 hover:text-white text-sm flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;