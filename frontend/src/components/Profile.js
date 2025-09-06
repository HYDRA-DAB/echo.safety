import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { 
  Shield, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  GraduationCap,
  Users,
  Edit3,
  Save,
  X,
  LogOut,
  Calendar
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditContacts, setShowEditContacts] = useState(false);
  const [editingContacts, setEditingContacts] = useState({
    contact1_name: '',
    contact1_phone: '',
    contact2_name: '',
    contact2_phone: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setProfile(response.data);
      
      // Initialize editing form with current contacts
      const contacts = response.data.trusted_contacts || [];
      setEditingContacts({
        contact1_name: contacts[0]?.name || '',
        contact1_phone: contacts[0]?.phone || '',
        contact2_name: contacts[1]?.name || '',
        contact2_phone: contacts[1]?.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditContacts = () => {
    setShowEditContacts(true);
  };

  const handleSaveContacts = async () => {
    setSaving(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API}/user/trusted-contacts`, editingContacts, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update profile state with new contacts
      setProfile(prev => ({
        ...prev,
        trusted_contacts: response.data.trusted_contacts
      }));
      
      setShowEditContacts(false);
      toast.success('Trusted contacts updated successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update trusted contacts';
      toast.error(errorMessage);
      console.error('Error updating contacts:', error);
    } finally {
      setSaving(false);
    }
  };

  const validatePhone = (phone) => {
    if (!phone) return true; // Allow empty
    const cleaned = phone.replace(/\D/g, '');
    return /^[6-9]\d{9}$/.test(cleaned);
  };

  const handleContactChange = (field, value) => {
    setEditingContacts(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getCurrentDateTimeIST = () => {
    const now = new Date();
    const date = now.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const time = now.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return { date, time };
  };

  const { date: currentDate, time: currentTime } = getCurrentDateTimeIST();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/dashboard">
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <User className="w-8 h-8 text-red-500" />
                <span className="text-xl font-bold text-white">Profile</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Welcome, {profile?.name}</span>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Information */}
        <Card className="feature-card p-8 mb-8">
          <div className="flex items-center space-x-4 mb-8">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{profile?.name}</h1>
              <p className="text-gray-400">SRM KTR Student</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">Personal Information</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Full Name</p>
                    <p className="text-white font-medium">{profile?.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Email Address</p>
                    <p className="text-white font-medium">{profile?.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Mobile Number</p>
                    <p className="text-white font-medium">+91 {profile?.phone}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">SRM Roll Number</p>
                    <p className="text-white font-medium">{profile?.srm_roll_number}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-400 text-sm">Member Since</p>
                    <p className="text-white font-medium">{formatDate(profile?.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Emergency Contacts</h2>
                <Button 
                  onClick={handleEditContacts}
                  size="sm" 
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Contacts
                </Button>
              </div>

              {profile?.trusted_contacts && profile.trusted_contacts.length > 0 ? (
                <div className="space-y-4">
                  {profile.trusted_contacts.map((contact, index) => (
                    <div key={index} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{contact.name}</p>
                          <p className="text-gray-400 text-sm">+91 {contact.phone}</p>
                          <p className="text-blue-400 text-xs">Emergency Contact {index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-700">
                  <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">No Emergency Contacts</h3>
                  <p className="text-gray-400 text-sm mb-4">
                    Add trusted contacts to receive SOS alerts via WhatsApp
                  </p>
                  <Button 
                    onClick={handleEditContacts}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Emergency Contacts
                  </Button>
                </div>
              )}

              <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                <h4 className="text-red-400 font-medium mb-2">📱 SOS WhatsApp Integration</h4>
                <p className="text-red-200 text-sm">
                  These contacts will receive emergency WhatsApp messages with your location during SOS alerts.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Edit Contacts Dialog */}
        <Dialog open={showEditContacts} onOpenChange={setShowEditContacts}>
          <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center">
                <Users className="w-5 h-5 mr-2 text-red-500" />
                Edit Emergency Contacts
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <p className="text-gray-400 text-sm">
                Add up to 2 trusted contacts who will receive SOS emergency alerts via WhatsApp
              </p>

              {/* Contact 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact1_name" className="text-white font-medium">
                    Emergency Contact 1 - Name
                  </Label>
                  <div className="mt-2 relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="contact1_name"
                      type="text"
                      value={editingContacts.contact1_name}
                      onChange={(e) => handleContactChange('contact1_name', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Parent/Guardian name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact1_phone" className="text-white font-medium">
                    Emergency Contact 1 - Phone
                  </Label>
                  <div className="mt-2 relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="contact1_phone"
                      type="tel"
                      value={editingContacts.contact1_phone}
                      onChange={(e) => handleContactChange('contact1_phone', e.target.value)}
                      className="input-field pl-10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  {editingContacts.contact1_phone && !validatePhone(editingContacts.contact1_phone) && (
                    <p className="text-red-400 text-xs mt-1">Invalid phone number format</p>
                  )}
                </div>
              </div>

              {/* Contact 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact2_name" className="text-white font-medium">
                    Emergency Contact 2 - Name
                  </Label>
                  <div className="mt-2 relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="contact2_name"
                      type="text"
                      value={editingContacts.contact2_name}
                      onChange={(e) => handleContactChange('contact2_name', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Friend/Family name"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact2_phone" className="text-white font-medium">
                    Emergency Contact 2 - Phone
                  </Label>
                  <div className="mt-2 relative">
                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <Input
                      id="contact2_phone"
                      type="tel"
                      value={editingContacts.contact2_phone}
                      onChange={(e) => handleContactChange('contact2_phone', e.target.value)}
                      className="input-field pl-10"
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  {editingContacts.contact2_phone && !validatePhone(editingContacts.contact2_phone) && (
                    <p className="text-red-400 text-xs mt-1">Invalid phone number format</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-700">
                <Button 
                  onClick={() => setShowEditContacts(false)}
                  variant="ghost" 
                  className="text-gray-400 hover:bg-gray-700"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveContacts}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {saving ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Profile;