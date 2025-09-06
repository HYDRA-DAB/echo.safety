import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  FileText
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

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [crimes, setCrimes] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setPredictions(predictionsResponse.data.predictions || []);
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
            await axios.post(`${API}/sos/alert`, {
              location: { lat: latitude, lng: longitude, address: 'Current Location' },
              emergency_type: 'general'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            // WhatsApp SOS Integration
            const sosMessage = `🚨 EMERGENCY ALERT - ECHO 🚨\n\nUser: ${user?.name}\nSRM Roll: ${user?.srm_roll_number}\nTime: ${new Date().toLocaleString()}\nLocation: https://maps.google.com/maps?q=${latitude},${longitude}\n\nImmediate assistance required at SRM KTR Campus!\n\nThis is an automated emergency alert from Echo Safety System.`;
            
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(sosMessage)}`;
            window.open(whatsappUrl, '_blank');
            
            toast.success(`SOS Alert sent! WhatsApp emergency message ready to send.`);
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
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
              <Card className="feature-card p-6 cursor-pointer hover:neon-glow-pink">
                <div className="flex items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Report Incident</h3>
                    <p className="text-gray-400 text-sm">Submit new report</p>
                  </div>
                  <Plus className="w-8 h-8 text-pink-500" />
                </div>
              </Card>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-white">Report Crime Incident</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Title</Label>
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
                  <Label htmlFor="crime_type" className="text-white">Crime Type</Label>
                  <Select value={reportForm.crime_type} onValueChange={(value) => setReportForm({...reportForm, crime_type: value})}>
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select crime type" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="theft">Theft</SelectItem>
                      <SelectItem value="women_safety">Women Safety</SelectItem>
                      <SelectItem value="drugs">Drug Related</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="severity" className="text-white">Severity</Label>
                  <Select value={reportForm.severity} onValueChange={(value) => setReportForm({...reportForm, severity: value})}>
                    <SelectTrigger className="input-field">
                      <SelectValue placeholder="Select severity" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={reportForm.description}
                    onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                    className="input-field"
                    placeholder="Detailed description of the incident"
                    rows={3}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full btn-primary">
                  Submit Report
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Card className="feature-card p-6 cursor-pointer hover:neon-glow-blue" onClick={handleSOS}>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Predictions */}
          <Card className="feature-card p-6">
            <div className="flex items-center mb-4">
              <Brain className="w-6 h-6 text-purple-500 mr-2" />
              <h2 className="text-xl font-bold text-white">AI Crime Predictions</h2>
            </div>
            
            <div className="space-y-4">
              {predictions.map((prediction, index) => (
                <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-2">
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
                  
                  <p className="text-white text-sm font-medium mb-2">{prediction.prediction_text}</p>
                  
                  <div className="flex items-center text-xs text-gray-400">
                    <Calendar className="w-3 h-3 mr-1" />
                    Valid until: {new Date(prediction.valid_until).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Reports */}
          <Card className="feature-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Recent Reports</h2>
              <Link to="/map">
                <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/20">
                  View All
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
                    <Badge variant="outline" className="text-xs border-gray-500 text-gray-300">
                      {crime.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <h4 className="text-white text-base font-semibold mb-2">{crime.title}</h4>
                  
                  {crime.description && (
                    <div className="mb-3">
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {crime.description}
                      </p>
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
        </div>

        {/* Emergency Helplines */}
        <Card className="feature-card p-6 mt-8">
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