import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  MessageCircle,
  List,
  Eye,
  ChevronDown,
  ChevronUp,
  BarChart3
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
  const [hoveredCrime, setHoveredCrime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showIncidentList, setShowIncidentList] = useState(true);

  // Ref for incident list to enable scrolling
  const incidentListRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    fetchCrimes();
    checkLocationPermission();
  }, []);

  // Convert UTC to IST
  const formatToIST = (utcDateString) => {
    const date = new Date(utcDateString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if point is within map bounds
  const isWithinBounds = useCallback((lat, lng) => {
    if (!mapRef.current) return true;
    
    const map = mapRef.current.getMap();
    const bounds = map.getBounds();
    
    return lng >= bounds.getWest() && 
           lng <= bounds.getEast() && 
           lat >= bounds.getSouth() && 
           lat <= bounds.getNorth();
  }, []);

  // Filter crimes by current map bounds
  const visibleCrimes = useMemo(() => {
    return crimes.filter(crime => {
      const matchesFilter = filter === 'all' || crime.crime_type === filter;
      const withinBounds = isWithinBounds(crime.location.lat, crime.location.lng);
      return matchesFilter && withinBounds;
    });
  }, [crimes, filter, viewState, isWithinBounds]);

  // All filtered crimes (for sidebar stats)
  const filteredCrimes = useMemo(() => {
    return filter === 'all' ? crimes : crimes.filter(crime => crime.crime_type === filter);
  }, [crimes, filter]);

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
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API}/crimes/map-data`, { headers });
      setCrimes(response.data.crimes || []);
    } catch (error) {
      console.error('Error fetching crimes:', error);
      toast.error('Failed to load crime data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSOS = async () => {
    if (!currentLocation) {
      toast.error('Location access required for SOS');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const sosData = {
        location: {
          lat: currentLocation.latitude,
          lng: currentLocation.longitude,
          address: "Emergency Location",
          source: "current"
        },
        emergency_type: "general"
      };

      await axios.post(`${API}/sos/alert`, sosData, { headers });
      
      // WhatsApp message for trusted contacts
      const message = encodeURIComponent(
        `🚨 EMERGENCY ALERT 🚨\n\nThis is an automated SOS alert from Echo Campus Safety.\n\nUser: ${user?.name}\nLocation: https://maps.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}\nTime: ${new Date().toLocaleString()}\n\nPlease respond immediately or contact emergency services if needed.`
      );
      
      // This will open WhatsApp to send the message
      window.open(`https://wa.me/?text=${message}`, '_blank');
      
      toast.success('SOS alert sent to trusted contacts');
    } catch (error) {
      console.error('Error sending SOS:', error);
      toast.error('Failed to send SOS alert');
    }
  };

  // Handle hover events
  const handleCrimeHover = (crime) => {
    setHoveredCrime(crime);
  };

  const handleCrimeLeave = () => {
    setHoveredCrime(null);
  };

  const getCrimeColor = (type) => {
    switch(type) {
      case 'theft': return '#dc2626';
      case 'women_safety': return '#ec4899';
      case 'drugs': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getCrimeIcon = (type) => {
    switch(type) {
      case 'theft': return '🔒';
      case 'women_safety': return '👩';
      case 'drugs': return '💊';
      default: return '⚠️';
    }
  };

  const getCrimeBadgeText = (type) => {
    switch(type) {
      case 'theft': return 'THEFT';
      case 'women_safety': return 'WOMEN SAFETY';
      case 'drugs': return 'DRUGS';
      default: return 'INCIDENT';
    }
  };

  const heatmapLayer = {
    id: 'crimes-heat',
    type: 'heatmap',
    paint: {
      'heatmap-weight': {
        property: 'severity',
        type: 'categorical',
        stops: [
          ['low', 0.3],
          ['medium', 0.6],
          ['high', 1]
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
      },
      'heatmap-opacity': {
        default: 0.6,
        stops: [
          [14, 0.6],
          [22, 0]
        ]
      }
    }
  };

  const geojsonData = {
    type: 'FeatureCollection',
    features: visibleCrimes.map(crime => ({
      type: 'Feature',
      properties: {
        severity: crime.severity,
        type: crime.crime_type
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
    <div className="h-screen bg-gray-900 text-white relative flex">
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

      {/* Incident List Sidebar */}
      <div className={`${showIncidentList ? 'w-80' : 'w-12'} transition-all duration-300 bg-gray-800/90 backdrop-blur-md border-r border-gray-700 z-40 flex flex-col`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {showIncidentList && (
              <div className="flex items-center space-x-2">
                <List className="w-5 h-5 text-red-500" />
                <span className="font-semibold text-white">Incidents</span>
                <Badge variant="outline" className="text-xs">
                  {visibleCrimes.length}
                </Badge>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowIncidentList(!showIncidentList)}
              className="text-gray-300 hover:bg-gray-700"
            >
              {showIncidentList ? <ChevronDown className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {showIncidentList && (
          <>
            {/* Incident List */}
            <div className="flex-1 overflow-y-auto" ref={incidentListRef}>
              <div className="p-2">
                {visibleCrimes.length > 0 ? (
                  visibleCrimes.map((crime) => (
                    <div
                      key={crime.id}
                      id={`incident-${crime.id}`}
                      className={`p-3 mb-2 rounded-lg border cursor-default transition-all duration-200 ${
                        hoveredCrime?.id === crime.id
                          ? 'bg-gray-700/50 border-gray-600'
                          : 'bg-gray-800/50 border-gray-700'
                      }`}
                      onMouseEnter={() => handleCrimeHover(crime)}
                      onMouseLeave={handleCrimeLeave}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <Badge 
                          className="text-xs text-white"
                          style={{ backgroundColor: getCrimeColor(crime.crime_type) }}
                        >
                          {getCrimeBadgeText(crime.crime_type)}
                        </Badge>
                        <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                          {crime.severity.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <h4 className="font-medium text-white text-sm mb-1 line-clamp-2">
                        {crime.title}
                      </h4>
                      
                      <div className="flex items-center text-xs text-gray-400 mb-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate">{crime.location.address}</span>
                      </div>
                      
                      <div className="flex items-center text-xs text-gray-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatToIST(crime.created_at)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No incidents in current view</p>
                    <p className="text-xs">Zoom out or pan to see more</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Map Container */}
      <div className="flex-1 relative">
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
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="text-gray-300 hover:bg-gray-700">
                  <User className="w-4 h-4" />
                </Button>
              </Link>
              <Button onClick={handleLogout} variant="ghost" size="sm" className="text-red-400 hover:bg-red-900/20">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-full pt-16">
          <Map
            ref={mapRef}
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

            {/* Crime Markers with Fixed Ripple Effect - Display Only */}
            {visibleCrimes.map((crime) => (
              <Marker
                key={crime.id}
                longitude={crime.location.lng}
                latitude={crime.location.lat}
                anchor="center"
              >
                <div 
                  className="relative"
                  onMouseEnter={() => handleCrimeHover(crime)}
                  onMouseLeave={handleCrimeLeave}
                >
                  {/* Fixed Ripple Animation - anchored to exact coordinates */}
                  <div 
                    className={`absolute inset-0 w-8 h-8 rounded-full animate-ping transform -translate-x-1/2 -translate-y-1/2 ${
                      hoveredCrime?.id === crime.id ? 'animate-pulse' : 'animate-ping'
                    }`}
                    style={{ 
                      backgroundColor: getCrimeColor(crime.crime_type), 
                      opacity: hoveredCrime?.id === crime.id ? 0.8 : 0.4,
                      left: '50%',
                      top: '50%'
                    }}
                  ></div>
                  
                  {/* Main Marker - centered and fixed */}
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg relative z-10 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${
                      hoveredCrime?.id === crime.id ? 'scale-110' : 'scale-100'
                    }`}
                    style={{
                      backgroundColor: getCrimeColor(crime.crime_type),
                      boxShadow: `0 0 20px ${getCrimeColor(crime.crime_type)}60`,
                      left: '50%',
                      top: '50%'
                    }}
                  >
                    {getCrimeIcon(crime.crime_type)}
                  </div>
                </div>
              </Marker>
            ))}

            {/* Current Location Marker */}
            {currentLocation && (
              <Marker
                longitude={currentLocation.longitude}
                latitude={currentLocation.latitude}
                anchor="center"
              >
                <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse transform -translate-x-1/2 -translate-y-1/2"></div>
              </Marker>
            )}
          </Map>
        </div>

        {/* Legend - Fixed bottom-left */}
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

        {/* Emergency SOS Button */}
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