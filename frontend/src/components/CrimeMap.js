import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import { Map, Marker, Popup, Source, Layer } from 'react-map-gl';
import axios from 'axios';
import { 
  Shield, 
  ArrowLeft, 
  Plus, 
  Filter, 
  AlertTriangle, 
  MapPin, 
  Calendar,
  User,
  Clock,
  LogOut
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Placeholder Mapbox token - replace with actual token when provided
const MAPBOX_TOKEN = 'pk.eyJ1IjoicGxhY2Vob2xkZXIiLCJhIjoiY2xydjJkZGRkMDAwMjNlcDFybzNqdWxscCJ9.PlaceholderTokenForDevelopment';

// SRM KTR Campus coordinates
const SRM_CAMPUS = {
  latitude: 12.8233,
  longitude: 80.0418
};

const CrimeMap = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [viewState, setViewState] = useState({
    longitude: SRM_CAMPUS.longitude,
    latitude: SRM_CAMPUS.latitude,
    zoom: 16
  });
  
  const [crimes, setCrimes] = useState([]);
  const [selectedCrime, setSelectedCrime] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'theft', 'women_safety', 'drugs'

  useEffect(() => {
    fetchCrimes();
  }, []);

  const fetchCrimes = async () => {
    try {
      const response = await axios.get(`${API}/crimes/map-data`);
      setCrimes(response.data.crimes || []);
    } catch (error) {
      console.error('Error fetching crimes:', error);
      toast.error('Failed to load crime data');
    } finally {
      setLoading(false);
    }
  };

  const filteredCrimes = useMemo(() => {
    if (filter === 'all') return crimes;
    return crimes.filter(crime => crime.type === filter);
  }, [crimes, filter]);

  const getCrimeColor = (type) => {
    switch (type) {
      case 'theft': return '#dc2626'; // Red
      case 'women_safety': return '#ec4899'; // Pink
      case 'drugs': return '#3b82f6'; // Blue
      default: return '#6b7280'; // Gray
    }
  };

  const getCrimeIcon = (type) => {
    switch (type) {
      case 'theft': return '🔒';
      case 'women_safety': return '👩';
      case 'drugs': return '💊';
      default: return '⚠️';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Mock SOS functionality for demo
  const handleSOS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          toast.success(`SOS Alert sent! Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          // In production, this would send to emergency services
        },
        (error) => {
          toast.error('Unable to get location for SOS');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading crime map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Shield className="w-6 h-6 text-red-500" />
              <span className="text-lg font-bold">Crime Map</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">Welcome, {user?.name}</span>
            <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-full pt-16">
        {/* Mapbox will show error with placeholder token - this is expected */}
        <Map
          {...viewState}
          onMove={evt => setViewState(evt.viewState)}
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          attributionControl={false}
        >
          {/* Crime Markers */}
          {filteredCrimes.map((crime) => (
            <Marker
              key={crime.id}
              longitude={crime.location.lng}
              latitude={crime.location.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedCrime(crime);
              }}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold cursor-pointer ripple-animation shadow-lg"
                style={{
                  backgroundColor: getCrimeColor(crime.type),
                  boxShadow: `0 0 20px ${getCrimeColor(crime.type)}40`
                }}
              >
                {getCrimeIcon(crime.type)}
              </div>
            </Marker>
          ))}

          {/* Crime Details Popup */}
          {selectedCrime && (
            <Popup
              longitude={selectedCrime.location.lng}
              latitude={selectedCrime.location.lat}
              anchor="top"
              onClose={() => setSelectedCrime(null)}
              className="mapboxgl-popup"
            >
              <div className="p-3 min-w-64">
                <div className="flex items-center justify-between mb-2">
                  <Badge 
                    className="text-xs"
                    style={{ 
                      backgroundColor: getCrimeColor(selectedCrime.type),
                      color: 'white'
                    }}
                  >
                    {selectedCrime.type.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {selectedCrime.severity.toUpperCase()}
                  </Badge>
                </div>
                
                <h3 className="text-white font-semibold text-sm mb-2">
                  {selectedCrime.title}
                </h3>
                
                <div className="flex items-center text-gray-400 text-xs mb-1">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(selectedCrime.created_at)}
                </div>
                
                <div className="flex items-center text-gray-400 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {selectedCrime.location.address || 
                   `${selectedCrime.location.lat.toFixed(4)}, ${selectedCrime.location.lng.toFixed(4)}`}
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Controls Overlay */}
        <div className="absolute top-20 left-4 space-y-4 z-40">
          {/* Filter Controls */}
          <Card className="feature-card p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center">
              <Filter className="w-4 h-4 mr-2" />
              Filter Crimes
            </h3>
            <div className="space-y-2">
              <Button
                size="sm"
                variant={filter === 'all' ? 'default' : 'ghost'}
                onClick={() => setFilter('all')}
                className="w-full justify-start text-left"
              >
                All Crimes ({crimes.length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'theft' ? 'default' : 'ghost'}
                onClick={() => setFilter('theft')}
                className="w-full justify-start text-left"
                style={{ color: filter === 'theft' ? 'white' : '#dc2626' }}
              >
                🔒 Theft ({crimes.filter(c => c.type === 'theft').length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'women_safety' ? 'default' : 'ghost'}
                onClick={() => setFilter('women_safety')}
                className="w-full justify-start text-left"
                style={{ color: filter === 'women_safety' ? 'white' : '#ec4899' }}
              >
                👩 Women Safety ({crimes.filter(c => c.type === 'women_safety').length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'drugs' ? 'default' : 'ghost'}
                onClick={() => setFilter('drugs')}
                className="w-full justify-start text-left"
                style={{ color: filter === 'drugs' ? 'white' : '#3b82f6' }}
              >
                💊 Drugs ({crimes.filter(c => c.type === 'drugs').length})
              </Button>
            </div>
          </Card>

          {/* Legend */}
          <Card className="feature-card p-4">
            <h3 className="text-white font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
                <span>Theft</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-pink-600 rounded-full mr-2"></div>
                <span>Women Safety</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                <span>Drugs</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Emergency SOS Button */}
        <div className="absolute bottom-8 right-8 z-40">
          <Button
            onClick={handleSOS}
            className="btn-sos w-16 h-16 rounded-full shadow-2xl"
          >
            <AlertTriangle className="w-6 h-6" />
          </Button>
          <p className="text-center text-white text-xs mt-2 font-semibold">SOS</p>
        </div>

        {/* Map Error Notice (since we're using placeholder token) */}
        <div className="absolute bottom-4 left-4 z-40">
          <Card className="feature-card p-3">
            <p className="text-yellow-400 text-xs font-medium">
              ⚠️ Demo Mode: Using placeholder Mapbox token
            </p>
            <p className="text-gray-400 text-xs">
              Replace with actual token for full functionality
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CrimeMap;