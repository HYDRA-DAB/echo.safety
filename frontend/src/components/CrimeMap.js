import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
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
  LogOut,
  Navigation,
  MessageCircle
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Actual Mapbox token provided by user
const MAPBOX_TOKEN = 'pk.eyJ1IjoidGFubWF5eXl5eSIsImEiOiJjbWY0NHdkODgwMW10MmlzaDljNThmbjkzIn0.htjxLePu6Z7UXOKU3ltpIg';

// SRM KTR Campus coordinates (updated as per user specification)
const SRM_CAMPUS = {
  latitude: 12.8236,
  longitude: 80.0452
};

// Map bounds (5km radius as specified)
const MAP_BOUNDS = [
  [80.0002, 12.7786], // Southwest
  [80.0902, 12.8686]  // Northeast
];

const CrimeMap = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [viewState, setViewState] = useState({
    longitude: SRM_CAMPUS.longitude,
    latitude: SRM_CAMPUS.latitude,
    zoom: 13
  });
  
  const [crimes, setCrimes] = useState([]);
  const [selectedCrime, setSelectedCrime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    fetchCrimes();
    checkLocationPermission();
  }, []);

  const checkLocationPermission = () => {
    if (navigator.geolocation) {
      navigator.permissions.query({name: 'geolocation'}).then((result) => {
        setLocationPermission(result.state);
        if (result.state === 'prompt') {
          setShowLocationDialog(true);
        }
      }).catch(() => {
        setShowLocationDialog(true);
      });
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ latitude, longitude });
          setLocationPermission('granted');
          setShowLocationDialog(false);
          toast.success('Location access granted');
        },
        (error) => {
          setLocationPermission('denied');
          setShowLocationDialog(false);
          toast.error('Location access denied');
        }
      );
    }
  };

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
            
            // WhatsApp SOS integration
            const sosMessage = `🚨 EMERGENCY ALERT - ECHO 🚨\n\nUser: ${user?.name}\nSRM Roll: ${user?.srm_roll_number}\nTime: ${new Date().toLocaleString()}\nLocation: https://maps.google.com/maps?q=${latitude},${longitude}\n\nImmediate assistance required at SRM KTR Campus!`;
            
            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(sosMessage)}`;
            window.open(whatsappUrl, '_blank');
            
            toast.success(`SOS Alert sent! WhatsApp emergency message ready to send.`);
          } catch (error) {
            toast.error('Failed to send SOS alert');
          }
        },
        (error) => {
          toast.error('Unable to get location for SOS');
        }
      );
    } else {
      toast.error('Geolocation not supported');
    }
  };

  // Heatmap layer configuration
  const heatmapLayer = {
    id: 'crime-heatmap',
    type: 'heatmap',
    source: 'crimes',
    maxzoom: 15,
    paint: {
      'heatmap-weight': {
        property: 'severity',
        type: 'categorical',
        stops: [
          ['low', 1],
          ['medium', 2], 
          ['high', 3]
        ]
      },
      'heatmap-intensity': {
        stops: [
          [11, 1],
          [15, 3]
        ]
      },
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgb(103,169,207)',
        0.4, 'rgb(209,229,240)',
        0.6, 'rgb(253,219,199)',
        0.8, 'rgb(239,138,98)',
        1, 'rgb(178,24,43)'
      ],
      'heatmap-radius': {
        stops: [
          [11, 15],
          [15, 20]
        ]
      }
    }
  };

  const geojsonData = {
    type: 'FeatureCollection',
    features: filteredCrimes.map(crime => ({
      type: 'Feature',
      properties: {
        severity: crime.severity,
        type: crime.type
      },
      geometry: {
        type: 'Point',
        coordinates: [crime.location.lng, crime.location.lat]
      }
    }))
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
      {/* Location Permission Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Navigation className="w-5 h-5 mr-2 text-red-500" />
              Location Access Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Echo needs access to your location to provide accurate emergency services and safety alerts.
            </p>
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-200 text-sm">
                🚨 Location access is essential for SOS emergency alerts and crime mapping
              </p>
            </div>
            <div className="flex space-x-3">
              <Button onClick={requestLocation} className="btn-primary flex-1">
                Allow Location Access
              </Button>
              <Button 
                onClick={() => setShowLocationDialog(false)} 
                variant="ghost" 
                className="text-gray-400 hover:bg-gray-700"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              <span className="text-lg font-bold text-white">Echo Crime Map</span>
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
      <div className="h-full pt-16" style={{ minHeight: '500px' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden', height: '100%' }}>
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: '100%', height: '100%' }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            attributionControl={false}
            maxBounds={MAP_BOUNDS}
          >
            {/* Heatmap Layer */}
            <Source id="crimes" type="geojson" data={geojsonData}>
              <Layer {...heatmapLayer} />
            </Source>

            {/* Crime Markers with Ripple Effect */}
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
                <div className="relative">
                  {/* Ripple Animation */}
                  <div 
                    className="absolute inset-0 w-8 h-8 rounded-full animate-ping"
                    style={{ backgroundColor: getCrimeColor(crime.type), opacity: 0.4 }}
                  ></div>
                  {/* Main Marker */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-lg relative z-10"
                    style={{
                      backgroundColor: getCrimeColor(crime.type),
                      boxShadow: `0 0 20px ${getCrimeColor(crime.type)}60`
                    }}
                  >
                    {getCrimeIcon(crime.type)}
                  </div>
                </div>
              </Marker>
            ))}

            {/* Current Location Marker */}
            {currentLocation && (
              <Marker
                longitude={currentLocation.longitude}
                latitude={currentLocation.latitude}
                anchor="bottom"
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
              </Marker>
            )}

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
                      className="text-xs text-white"
                      style={{ backgroundColor: getCrimeColor(selectedCrime.type) }}
                    >
                      {selectedCrime.type.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {selectedCrime.severity.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <h3 className="text-white font-semibold text-sm mb-2">
                    {selectedCrime.title}
                  </h3>
                  
                  <div className="flex items-center text-gray-300 text-xs mb-1">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(selectedCrime.created_at)}
                  </div>
                  
                  <div className="flex items-center text-gray-300 text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {selectedCrime.location.address || 
                     `${selectedCrime.location.lat.toFixed(4)}, ${selectedCrime.location.lng.toFixed(4)}`}
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

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
                className="w-full justify-start text-left text-white"
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
        </div>

        {/* Legend - Fixed bottom-left with white text */}
        <div className="absolute bottom-8 left-4 z-40">
          <Card className="bg-black/70 backdrop-blur-md border-gray-700 p-4">
            <h3 className="text-white font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 rounded-full mr-2"></div>
                <span className="text-white">Theft</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-pink-600 rounded-full mr-2"></div>
                <span className="text-white">Women's Safety</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
                <span className="text-white">Drugs</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Emergency SOS Button with WhatsApp */}
        <div className="absolute bottom-8 right-8 z-40">
          <Button
            onClick={handleSOS}
            className="btn-sos w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center"
          >
            <AlertTriangle className="w-6 h-6 mb-1" />
            <MessageCircle className="w-3 h-3" />
          </Button>
          <p className="text-center text-white text-xs mt-2 font-semibold">SOS + WhatsApp</p>
        </div>
      </div>
    </div>
  );
};

export default CrimeMap;