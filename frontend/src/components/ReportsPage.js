import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { 
  Shield, 
  ArrowLeft, 
  Filter, 
  Calendar, 
  MapPin, 
  Clock,
  AlertTriangle,
  Eye,
  Search,
  LogOut,
  FileText,
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ReportsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchTerm, filterType, filterSeverity]);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/crimes`);
      setReports(response.data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const filterReports = () => {
    let filtered = reports;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(report => 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location.address.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by crime type
    if (filterType !== 'all') {
      filtered = filtered.filter(report => report.crime_type === filterType);
    }

    // Filter by severity
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(report => report.severity === filterSeverity);
    }

    setFilteredReports(filtered);
  };

  const getCrimeColor = (type) => {
    switch (type) {
      case 'theft': return 'bg-red-600';
      case 'women_safety': return 'bg-pink-600';
      case 'drugs': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-500 text-red-300';
      case 'medium': return 'border-yellow-500 text-yellow-300';
      case 'low': return 'border-green-500 text-green-300';
      default: return 'border-gray-500 text-gray-300';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading reports...</p>
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
                <FileText className="w-8 h-8 text-red-500" />
                <span className="text-xl font-bold text-white">All Crime Reports</span>
              </div>
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
        {/* Filters Section */}
        <Card className="feature-card p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search reports by title, description, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
            </div>

            {/* Crime Type Filter */}
            <div className="w-full lg:w-48">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="All Crime Types" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Crime Types</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="women_safety">Women's Safety</SelectItem>
                  <SelectItem value="drugs">Drug Related</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Severity Filter */}
            <div className="w-full lg:w-48">
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="input-field">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="text-gray-400 text-sm whitespace-nowrap">
              {filteredReports.length} of {reports.length} reports
            </div>
          </div>
        </Card>

        {/* Reports List */}
        {filteredReports.length > 0 ? (
          <div className="space-y-6">
            {filteredReports.map((report, index) => {
              const dateTime = formatDate(report.created_at);
              return (
                <Card key={report.id} className="feature-card p-6 hover:bg-gray-800/60 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                    {/* Report Content */}
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex flex-wrap items-center gap-3 mb-4">
                        <Badge className={`${getCrimeColor(report.crime_type)} text-white`}>
                          {report.crime_type.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`${getSeverityColor(report.severity)} border-2`}
                        >
                          {report.severity.toUpperCase()} PRIORITY
                        </Badge>
                      </div>

                      {/* Title and Description */}
                      <h3 className="text-xl font-semibold text-white mb-3">
                        {report.title}
                      </h3>
                      <p className="text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap">
                        {report.description}
                      </p>

                      {/* Meta Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center text-gray-400">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span className="text-sm">
                            {dateTime.date} at {dateTime.time}
                          </span>
                        </div>
                        <div className="flex items-center text-gray-400">
                          <MapPin className="w-4 h-4 mr-2" />
                          <span className="text-sm truncate">
                            {report.location.address}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 lg:w-32">
                      <Link to="/map">
                        <Button size="sm" variant="ghost" className="w-full text-red-400 hover:bg-red-900/20">
                          <Eye className="w-4 h-4 mr-2" />
                          View on Map
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="feature-card p-12 text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">No Reports Found</h3>
            <p className="text-gray-400 mb-6">
              {searchTerm || filterType !== 'all' || filterSeverity !== 'all' 
                ? 'Try adjusting your filters or search terms' 
                : 'No crime reports have been submitted yet'}
            </p>
            {(searchTerm || filterType !== 'all' || filterSeverity !== 'all') && (
              <Button 
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterSeverity('all');
                }}
                className="btn-primary"
              >
                Clear Filters
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;