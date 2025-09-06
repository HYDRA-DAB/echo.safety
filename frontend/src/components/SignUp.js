import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { Shield, User, Mail, Phone, GraduationCap, Lock, Eye, EyeOff, ArrowLeft, Users } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SignUp = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    srm_roll_number: '',
    password: '',
    confirmPassword: '',
    trusted_contact_1_name: '',
    trusted_contact_1_phone: '',
    trusted_contact_2_name: '',
    trusted_contact_2_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Allow empty for trusted contacts
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return false;
    }
    
    if (!formData.email.trim()) {
      toast.error('Please enter your email address');
      return false;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return false;
    }
    
    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    
    if (!validatePhone(formData.phone)) {
      toast.error('Please enter a valid 10-digit Indian mobile number (starting with 6-9)');
      return false;
    }
    
    if (!formData.srm_roll_number.trim()) {
      toast.error('Please enter your SRM roll number');
      return false;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return false;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    // Validate trusted contacts if provided
    if (formData.trusted_contact_1_phone && !validatePhone(formData.trusted_contact_1_phone)) {
      toast.error('Trusted Contact 1: Please enter a valid 10-digit Indian mobile number');
      return false;
    }

    if (formData.trusted_contact_2_phone && !validatePhone(formData.trusted_contact_2_phone)) {
      toast.error('Trusted Contact 2: Please enter a valid 10-digit Indian mobile number');
      return false;
    }

    // Check if trusted contact phone is provided but name is missing
    if (formData.trusted_contact_1_phone && !formData.trusted_contact_1_name.trim()) {
      toast.error('Please enter the name for Trusted Contact 1');
      return false;
    }

    if (formData.trusted_contact_2_phone && !formData.trusted_contact_2_name.trim()) {
      toast.error('Please enter the name for Trusted Contact 2');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.replace(/\D/g, ''),
        srm_roll_number: formData.srm_roll_number.trim(),
        password: formData.password,
        trusted_contact_1_name: formData.trusted_contact_1_name.trim(),
        trusted_contact_1_phone: formData.trusted_contact_1_phone.replace(/\D/g, ''),
        trusted_contact_2_name: formData.trusted_contact_2_name.trim(),
        trusted_contact_2_phone: formData.trusted_contact_2_phone.replace(/\D/g, '')
      };
      
      const response = await axios.post(`${API}/auth/signup`, signupData);
      const { access_token, user } = response.data;
      
      login(access_token, user);
      toast.success(`Welcome to Echo, ${user.name}!`);
      navigate('/dashboard');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 via-transparent to-blue-900/10"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNkYzI2MjYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
      
      <div className="max-w-2xl w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center fade-in">
          <Link to="/" className="inline-flex items-center text-red-400 hover:text-red-300 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex justify-center">
            <div className="flex items-center space-x-2 mb-6">
              <Shield className="w-10 h-10 text-red-500 neon-glow-red" />
              <span className="text-2xl font-bold text-white">Echo</span>
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
          <p className="text-gray-400">Join the SRM KTR campus safety community</p>
        </div>

        {/* Sign Up Form */}
        <Card className="feature-card p-8 slide-up">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name" className="text-white font-medium">
                  Full Name *
                </Label>
                <div className="mt-2 relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email" className="text-white font-medium">
                  Email Address *
                </Label>
                <div className="mt-2 relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="phone" className="text-white font-medium">
                  Phone Number *
                </Label>
                <div className="mt-2 relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="10-digit mobile number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="srm_roll_number" className="text-white font-medium">
                  SRM Roll Number *
                </Label>
                <div className="mt-2 relative">
                  <GraduationCap className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="srm_roll_number"
                    name="srm_roll_number"
                    type="text"
                    required
                    value={formData.srm_roll_number}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="Enter your SRM roll number"
                  />
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="password" className="text-white font-medium">
                  Password *
                </Label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="input-field pl-10 pr-10"
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-white font-medium">
                  Confirm Password *
                </Label>
                <div className="mt-2 relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="input-field pl-10 pr-10"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Trusted Contacts Section */}
            <div className="border-t border-gray-700 pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Users className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-semibold text-white">Emergency Trusted Contacts</h3>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Add up to 2 trusted contacts who will receive SOS emergency alerts via WhatsApp
              </p>

              {/* Trusted Contact 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <Label htmlFor="trusted_contact_1_name" className="text-white font-medium">
                    Trusted Contact 1 - Name
                  </Label>
                  <div className="mt-2 relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="trusted_contact_1_name"
                      name="trusted_contact_1_name"
                      type="text"
                      value={formData.trusted_contact_1_name}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Parent/Guardian name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="trusted_contact_1_phone" className="text-white font-medium">
                    Trusted Contact 1 - Phone
                  </Label>
                  <div className="mt-2 relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="trusted_contact_1_phone"
                      name="trusted_contact_1_phone"
                      type="tel"
                      value={formData.trusted_contact_1_phone}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
              </div>

              {/* Trusted Contact 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="trusted_contact_2_name" className="text-white font-medium">
                    Trusted Contact 2 - Name
                  </Label>
                  <div className="mt-2 relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="trusted_contact_2_name"
                      name="trusted_contact_2_name"
                      type="text"
                      value={formData.trusted_contact_2_name}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Friend/Family name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="trusted_contact_2_phone" className="text-white font-medium">
                    Trusted Contact 2 - Phone
                  </Label>
                  <div className="mt-2 relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="trusted_contact_2_phone"
                      name="trusted_contact_2_phone"
                      type="tel"
                      value={formData.trusted_contact_2_phone}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-200 text-sm">
                  📱 These contacts will receive emergency WhatsApp messages with your location during SOS alerts
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-lg font-semibold"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/signin" className="text-red-400 font-medium hover:text-red-300">
                Sign in here
              </Link>
            </p>
          </div>
        </Card>

        {/* Terms Notice */}
        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
          <p className="text-xs text-gray-400">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-red-400 hover:text-red-300">Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-red-400 hover:text-red-300">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;