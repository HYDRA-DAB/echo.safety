import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { 
  Shield, 
  MapPin, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  Clock,
  Brain,
  LogOut,
  Phone,
  Calendar,
  Activity,
  Navigation,
  Search,
  Map,
  FileText,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import CrimeStatisticsChart from './CrimeStatisticsChart';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [crimes, setCrimes] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState({
    predictions: [],
    trend_analysis: null,
    safety_tips: [],
    news_articles_analyzed: 0,
    last_updated: null
  });
  const [loading, setLoading] = useState(true);
  const [highlightSection, setHighlightSection] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    crime_type: '',
    location: null,
    severity: '',
    is_anonymous: false
  });
  const [locationMethod, setLocationMethod] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [addressSearch, setAddressSearch] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Handle highlighting from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlight = searchParams.get('highlight');
    
    if (highlight) {
      setHighlightSection(highlight);
      
      // Auto-scroll to highlighted section
      setTimeout(() => {
        if (highlight === 'report' || highlight === 'report-incident') {
          const reportElement = document.getElementById('report-incident-section');
          reportElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (highlight === 'sos' || highlight === 'helplines') {
          const sosElement = document.getElementById('sos-section') || document.getElementById('helplines-section');
          sosElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Remove highlight after 3 seconds
      const timer = setTimeout(() => {
        setHighlightSection(null);
        // Clean URL without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [location.search]);

  // Use recent crimes API instead of all crimes
  const fetchRecentCrimes = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/crimes/recent?limit=5`, { headers });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching recent crimes:', error);
      return [];
    }
  };

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [recentCrimesData, allCrimesResponse, predictionsResponse] = await Promise.all([
        fetchRecentCrimes(),
        axios.get(`${API}/crimes`, { headers }),
        axios.get(`${API}/ai/predictions`)
      ]);
      
      const allCrimes = allCrimesResponse.data || [];
      setCrimes({ recent: recentCrimesData, all: allCrimes });
      
      // Handle enhanced AI analysis response
      const aiAnalysisData = predictionsResponse.data || {};
      setAiAnalysis({
        predictions: aiAnalysisData.predictions || [],
        trend_analysis: aiAnalysisData.trend_analysis || null,
        safety_tips: aiAnalysisData.safety_tips || [],
        news_articles_analyzed: aiAnalysisData.news_articles_analyzed || 0,
        last_updated: aiAnalysisData.last_updated || null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Location selection methods
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address
          const address = await reverseGeocode(latitude, longitude);
          setReportForm(prev => ({
            ...prev,
            location: {
              lat: latitude,
              lng: longitude,
              address: address,
              source: 'current'
            }
          }));
          setLocationMethod('current');
          toast.success('Current location captured');
        } catch (error) {
          setReportForm(prev => ({
            ...prev,
            location: {
              lat: latitude,
              lng: longitude,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              source: 'current'
            }
          }));
          setLocationMethod('current');
          toast.success('Current location captured (address lookup failed)');
        }
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        toast.error('Unable to get current location. Please check permissions.');
      }
    );
  };

  const reverseGeocode = async (lat, lng) => {
    const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFubWF5eXl5eSIsImEiOiJjbWY0NHdkODgwMW10MmlzaDljNThmbjkzIn0.htjxLePu6Z7UXOKU3ltpIg';
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,poi`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        return data.features[0].place_name;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  };

  const searchAddress = async () => {
    if (!addressSearch.trim()) {
      toast.error('Please enter an address to search');
      return;
    }

    setLocationLoading(true);
    const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFubWF5eXl5eSIsImEiOiJjbWY0NHdkODgwMW10MmlzaDljNThmbjkzIn0.htjxLePu6Z7UXOKU3ltpIg';
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressSearch)}.json?access_token=${MAPBOX_TOKEN}&proximity=80.0452,12.8236&types=address,poi`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;
        
        setReportForm(prev => ({
          ...prev,
          location: {
            lat: lat,
            lng: lng,
            address: feature.place_name,
            source: 'search'
          }
        }));
        setLocationMethod('search');
        toast.success('Location found and set');
      } else {
        toast.error('Location not found. Please try a different address.');
      }
    } catch (error) {
      toast.error('Failed to search location');
    }
    setLocationLoading(false);
  };

  const selectOnMap = () => {
    toast.info('Map selection feature will be implemented in the next update');
    // For now, set a default campus location
    setReportForm(prev => ({
      ...prev,
      location: {
        lat: 12.8236,
        lng: 80.0452,
        address: 'SRM KTR Campus (Selected on Map)',
        source: 'map'
      }
    }));
    setLocationMethod('map');
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportForm.title || !reportForm.description || !reportForm.crime_type || !reportForm.severity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!reportForm.location) {
      toast.error('Please set a crime location using one of the available methods');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/crimes/report`, reportForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Crime report submitted successfully');
      setShowReportModal(false);
      setReportForm({
        title: '',
        description: '',
        crime_type: '',
        location: null,
        severity: '',
        is_anonymous: false
      });
      setLocationMethod('');
      setAddressSearch('');
      fetchDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    }
  };

  const handleSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const token = localStorage.getItem('token');
            
            // Create SOS alert with location
            const locationData = {
              lat: latitude,
              lng: longitude,
              address: 'Current Location',
              source: 'current'
            };

            await axios.post(`${API}/sos/alert`, {
              location: locationData,
              emergency_type: 'general'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // Get user's trusted contacts
            const contactsResponse = await axios.get(`${API}/user/trusted-contacts`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            const trustedContacts = contactsResponse.data.trusted_contacts || [];
            
            // WhatsApp SOS Integration with trusted contacts
            const sosMessage = `🚨 EMERGENCY ALERT - ECHO 🚨\n\nUser: ${user?.name}\nSRM Roll: ${user?.srm_roll_number}\nTime: ${new Date().toLocaleString()}\nLocation: https://maps.google.com/maps?q=${latitude},${longitude}\n\nImmediate assistance required at SRM KTR Campus!\n\nThis is an automated emergency alert from Echo Safety System.`;
            
            if (trustedContacts.length > 0) {
              // Send to each trusted contact
              trustedContacts.forEach((contact, index) => {
                setTimeout(() => {
                  const contactMessage = `${sosMessage}\n\nSent to: ${contact.name}`;
                  const whatsappUrl = `https://wa.me/${contact.phone}?text=${encodeURIComponent(contactMessage)}`;
                  window.open(whatsappUrl, '_blank');
                }, index * 1000); // Delay each message by 1 second
              });
              toast.success(`SOS Alert sent to ${trustedContacts.length} trusted contact(s)!`);
            } else {
              // Fallback to general WhatsApp sharing
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(sosMessage)}`;
              window.open(whatsappUrl, '_blank');
              toast.success(`SOS Alert ready to send via WhatsApp!`);
            }
          } catch (error) {
            toast.error('Failed to send SOS alert');
          }
        },
        (error) => {
          toast.error('Unable to get location for SOS. Please check location permissions.');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getCrimeColor = (type) => {
    switch (type) {
      case 'theft': return 'bg-red-600';
      case 'women_safety': return 'bg-pink-600';
      case 'drugs': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const recentCrimes = crimes.recent || [];
  const allCrimes = crimes.all || [];
  const crimeStats = {
    total: allCrimes.length,
    theft: allCrimes.filter(c => c.crime_type === 'theft').length,
    women_safety: allCrimes.filter(c => c.crime_type === 'women_safety').length,
    drugs: allCrimes.filter(c => c.crime_type === 'drugs').length
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <div className="flex items-center space-x-2">
                  <Shield className="w-8 h-8 text-red-500" />
                  <span className="text-xl font-bold text-white">Echo</span>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Welcome, {user?.name}</span>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-700">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/map">
            <Card className="feature-card p-6 cursor-pointer hover:neon-glow-red">
              <div className="flex items-center">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">View Map</h3>
                  <p className="text-gray-400 text-sm">Interactive crime map</p>
                </div>
                <MapPin className="w-8 h-8 text-red-500" />
              </div>
            </Card>
          </Link>

          <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
            <DialogTrigger asChild>
              <Card 
                id="report-incident-section"
                className={`feature-card p-6 cursor-pointer hover:neon-glow-pink ${
                  highlightSection === 'report' || highlightSection === 'report-incident' 
                    ? 'highlight-report' 
                    : ''
                }`}
              >
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Report Incident</h3>
                    <p className="text-gray-400 text-sm">Submit new report</p>
                  </div>
                  <Plus className="w-8 h-8 text-pink-500" />
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-white">Report Crime Incident</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleReportSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title" className="text-white">Title *</Label>
                    <Input
                      id="title"
                      value={reportForm.title}
                      onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
                      className="input-field"
                      placeholder="Brief description of incident"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="crime_type" className="text-white font-medium">Crime Type *</Label>
                    <Select value={reportForm.crime_type} onValueChange={(value) => setReportForm({...reportForm, crime_type: value})}>
                      <SelectTrigger className="input-field">
                        <SelectValue placeholder="Select crime type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="theft" className="text-yellow-400">Theft</SelectItem>
                        <SelectItem value="women_safety" className="text-yellow-400">Women Safety</SelectItem>
                        <SelectItem value="drugs" className="text-yellow-400">Drug Related</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="severity" className="text-white font-medium">Priority Level *</Label>
                  <Select value={reportForm.severity} onValueChange={(value) => setReportForm({...reportForm, severity: value})}>
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="low" className="text-yellow-400">Low Priority</SelectItem>
                      <SelectItem value="medium" className="text-yellow-400">Medium Priority</SelectItem>
                      <SelectItem value="high" className="text-yellow-400">High Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Crime Location Section */}
                <div className="border-t border-gray-700 pt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <h3 className="text-lg font-semibold text-white">Crime Location *</h3>
                  </div>
                  
                  {/* Location Method Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <Button
                      type="button"
                      onClick={useCurrentLocation}
                      disabled={locationLoading}
                      className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                        locationMethod === 'current' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Navigation className="w-6 h-6" />
                      <span className="text-sm font-medium">Use Current Location</span>
                    </Button>
                    
                    <div className="flex flex-col space-y-2">
                      <Button
                        type="button"
                        onClick={searchAddress}
                        disabled={locationLoading}
                        className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                          locationMethod === 'search' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <Search className="w-6 h-6" />
                        <span className="text-sm font-medium">Search Address</span>
                      </Button>
                      <Input
                        type="text"
                        placeholder="Enter address..."
                        value={addressSearch}
                        onChange={(e) => setAddressSearch(e.target.value)}
                        className="input-field text-xs"
                        onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                      />
                    </div>
                    
                    <Button
                      type="button"
                      onClick={selectOnMap}
                      disabled={locationLoading}
                      className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                        locationMethod === 'map' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Map className="w-6 h-6" />
                      <span className="text-sm font-medium">Pick on Map</span>
                    </Button>
                  </div>

                  {/* Selected Location Display */}
                  {reportForm.location && (
                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-medium">Location Set</span>
                      </div>
                      <p className="text-green-200 text-sm">
                        {reportForm.location.address}
                      </p>
                      <p className="text-green-300 text-xs mt-1">
                        Coordinates: {reportForm.location.lat.toFixed(4)}, {reportForm.location.lng.toFixed(4)}
                      </p>
                    </div>
                  )}

                  {locationLoading && (
                    <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span className="text-blue-400 text-sm">Getting location...</span>
                      </div>
                    </div>
                  )}

                  {!reportForm.location && !locationLoading && (
                    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                      <p className="text-red-200 text-sm">
                        ⚠️ Please select a location using one of the methods above
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-white">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    value={reportForm.description}
                    onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                    className="input-field"
                    placeholder="Provide detailed information about the incident, including time, people involved, and any other relevant details"
                    rows={4}
                    required
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={reportForm.is_anonymous}
                    onChange={(e) => setReportForm({...reportForm, is_anonymous: e.target.checked})}
                    className="rounded border-gray-600"
                  />
                  <Label htmlFor="anonymous" className="text-white text-sm">
                    Submit anonymously (your identity will not be disclosed)
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full btn-primary"
                  disabled={!reportForm.location || locationLoading}
                >
                  Submit Crime Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card 
            id="sos-section"
            className={`feature-card p-6 cursor-pointer hover:neon-glow-blue ${
              highlightSection === 'sos' || highlightSection === 'helplines' 
                ? 'highlight-sos' 
                : ''
            }`} 
            onClick={handleSOS}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">SOS Emergency</h3>
                <p className="text-gray-400 text-sm">Send emergency alert</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-blue-500" />
            </div>
          </Card>


        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Reports</p>
                <p className="text-2xl font-bold text-white">{crimeStats.total}</p>
              </div>
              <Activity className="w-8 h-8 text-gray-500" />
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Theft Cases</p>
                <p className="text-2xl font-bold text-red-400">{crimeStats.theft}</p>
              </div>
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center">
                🔒
              </div>
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Women Safety</p>
                <p className="text-2xl font-bold text-pink-400">{crimeStats.women_safety}</p>
              </div>
              <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                👩
              </div>
            </div>
          </Card>
          
          <Card className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Drug Cases</p>
                <p className="text-2xl font-bold text-blue-400">{crimeStats.drugs}</p>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                💊
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Enhanced AI Analysis Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Predictions */}
            <div className="lg:col-span-2">
              <Card className="feature-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <Brain className="w-6 h-6 text-purple-500 mr-2" />
                    <h2 className="text-xl font-bold text-white">AI Crime Predictions</h2>
                  </div>
                  <div className="text-xs text-gray-400">
                    {aiAnalysis.news_articles_analyzed > 0 && (
                      <span>{aiAnalysis.news_articles_analyzed} articles analyzed</span>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {aiAnalysis.predictions.map((prediction, index) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-start justify-between mb-3">
                        <Badge 
                          className={`text-xs ${
                            prediction.confidence_level === 'high' ? 'bg-red-600' :
                            prediction.confidence_level === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                          }`}
                        >
                          {prediction.confidence_level.toUpperCase()} RISK
                        </Badge>
                        <span className="text-xs text-gray-400">{prediction.location_area}</span>
                      </div>
                      
                      <p className="text-white text-sm font-medium mb-3">{prediction.prediction_text}</p>
                      
                      {/* Risk Factors */}
                      {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-1">Risk Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {prediction.risk_factors.map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs text-red-300 border-red-600">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Preventive Measures */}
                      {prediction.preventive_measures && prediction.preventive_measures.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-1">Preventive Measures:</p>
                          <div className="flex flex-wrap gap-1">
                            {prediction.preventive_measures.map((measure, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs text-green-300 border-green-600">
                                {measure}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          Valid until: {new Date(prediction.valid_until).toLocaleDateString()}
                        </div>
                        {prediction.data_sources && prediction.data_sources.length > 0 && (
                          <div className="flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            {prediction.data_sources.length} source(s)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {aiAnalysis.predictions.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400">
                      <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No predictions available at the moment</p>
                      <p className="text-sm">AI analysis will be updated soon</p>
                    </div>
                  )}
                </div>
                
                {aiAnalysis.last_updated && (
                  <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    Last updated: {new Date(aiAnalysis.last_updated).toLocaleString()}
                  </div>
                )}
              </Card>
            </div>
            
            {/* Trend Analysis & Safety Tips */}
            <div className="space-y-6">
              {/* Trend Analysis */}
              {aiAnalysis.trend_analysis && (
                <Card className="feature-card p-4">
                  <div className="flex items-center mb-3">
                    <TrendingUp className="w-5 h-5 text-blue-500 mr-2" />
                    <h3 className="text-lg font-bold text-white">Crime Trends</h3>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Badge 
                        className={`text-xs ${
                          aiAnalysis.trend_analysis.trend_type === 'increasing' ? 'bg-red-600' :
                          aiAnalysis.trend_analysis.trend_type === 'decreasing' ? 'bg-green-600' : 'bg-yellow-600'
                        }`}
                      >
                        {aiAnalysis.trend_analysis.trend_type.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Categories:</p>
                      <div className="flex flex-wrap gap-1">
                        {aiAnalysis.trend_analysis.crime_categories.map((category, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Key Insights:</p>
                      <ul className="text-xs text-white space-y-1">
                        {aiAnalysis.trend_analysis.key_insights.slice(0, 3).map((insight, idx) => (
                          <li key={idx} className="flex items-start">
                            <span className="text-blue-400 mr-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              )}
              
              {/* Safety Tips */}
              {aiAnalysis.safety_tips.length > 0 && (
                <Card className="feature-card p-4">
                  <div className="flex items-center mb-3">
                    <Shield className="w-5 h-5 text-green-500 mr-2" />
                    <h3 className="text-lg font-bold text-white">Safety Tips</h3>
                  </div>
                  
                  <ul className="text-xs text-white space-y-2">
                    {aiAnalysis.safety_tips.slice(0, 5).map((tip, idx) => (
                      <li key={idx} className="flex items-start">
                        <span className="text-green-400 mr-2">✓</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {aiAnalysis.safety_tips.length > 5 && (
                    <p className="text-xs text-gray-400 mt-2">
                      +{aiAnalysis.safety_tips.length - 5} more tips available
                    </p>
                  )}
                </Card>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Reports */}
          <Card className="feature-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Reports</h2>
              <Link to="/reports">
                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/20">
                  <FileText className="w-4 h-4 mr-2" />
                  View All Reports
                </Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentCrimes.length > 0 ? recentCrimes.map((crime, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <Badge className={getCrimeColor(crime.crime_type)}>
                      {crime.crime_type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {crime.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <h4 className="text-white font-medium mb-2 line-clamp-2">{crime.title}</h4>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{crime.description}</p>
                  
                  {crime.crime_type === 'women_safety' && (
                    <div className="flex items-center text-xs text-pink-400 mb-2">
                      <span className="mr-1">👩</span>
                      Safety alert - Stay vigilant
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-700">
                    <div className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(crime.created_at)}
                    </div>
                    {crime.location && crime.location.address && (
                      <div className="flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate max-w-32">{crime.location.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center text-gray-400 py-8">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent reports</p>
                </div>
              )}
            </div>
          </Card>

          {/* Crime Statistics Chart */}
          <div className="lg:col-span-2">
            <CrimeStatisticsChart crimes={crimes.all || []} />
          </div>
        </div>

        {/* Emergency Helplines */}
        <Card 
          id="helplines-section"
          className={`feature-card p-6 mt-8 ${
            highlightSection === 'helplines' || highlightSection === 'sos' 
              ? 'highlight-sos' 
              : ''
          }`}
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <Phone className="w-6 h-6 text-red-500 mr-2" />
            Emergency Helplines
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { name: "Campus Security", number: "044-2741-9999" },
              { name: "Police", number: "100" },
              { name: "Ambulance", number: "108" },
              { name: "Women's Helpline", number: "1091" },
              { name: "Anti-Drug Cell", number: "044-2741-8888" }
            ].map((helpline, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-3 text-center">
                <p className="text-white text-sm font-medium mb-1">{helpline.name}</p>
                <a 
                  href={`tel:${helpline.number}`} 
                  className="text-red-400 font-bold hover:text-red-300"
                >
                  {helpline.number}
                </a>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;