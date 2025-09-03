import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { MapPin, Shield, AlertTriangle, Users, Brain, TrendingUp, Zap, Phone, ChevronRight, Eye, Bell, MessageSquare } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

const LandingPage = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <MapPin className="w-8 h-8" />,
      title: "Interactive Crime Map",
      description: "Real-time visualization with color-coded incidents: Red for Theft, Pink for Women's Safety, Blue for Drug-related crimes",
      color: "neon-glow-red"
    },
    {
      icon: <Bell className="w-8 h-8" />,
      title: "Geo-fenced Alerts",
      description: "Automatic notifications when entering high-risk areas based on recent crime data and AI predictions",
      color: "neon-glow-blue"
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "One-Click SOS",
      description: "Emergency alert system that instantly shares your location with campus security and emergency contacts",
      color: "neon-glow-pink"
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "News & Safety Tips",
      description: "Daily safety updates, crime prevention tips, and important campus security announcements",
      color: "neon-glow-red"
    }
  ];

  const innovations = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI Crime Trend Predictor",
      description: "Machine learning algorithms analyze patterns to predict high-risk zones and optimal patrol routes",
      gradient: "crime-theft"
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Crowdsourced Reporting",
      description: "Community-driven incident reporting with anonymous options for sensitive situations",
      gradient: "crime-women"
    },
    {
      icon: <MessageSquare className="w-8 h-8" />,
      title: "Anonymous Tip Line",
      description: "Secure anonymous reporting system for drug activities, harassment, and other campus crimes",
      gradient: "crime-drugs"
    }
  ];

  const impact = [
    { number: "85%", label: "Safer Students", description: "Improved campus safety awareness" },
    { number: "60%", label: "Reduced Theft", description: "Decrease in campus theft incidents" },
    { number: "70%", label: "Drug Prevention", description: "Effective anti-drug initiatives" },
    { number: "90%", label: "Women's Safety", description: "Enhanced safety for female students" }
  ];

  const helplines = [
    { name: "Campus Security", number: "044-2741-9999", type: "security" },
    { name: "Emergency (Police)", number: "100", type: "police" },
    { name: "Ambulance", number: "108", type: "medical" },
    { name: "Women's Helpline", number: "1091", type: "women" },
    { name: "Anti-Drug Cell", number: "044-2741-8888", type: "drugs" }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-900/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Shield className="w-8 h-8 text-red-500" />
              <span className="text-xl font-bold">Campus Safety SRM</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm">Welcome, {user.name}</span>
                  <Link to="/dashboard">
                    <Button className="btn-primary">Dashboard</Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/signin">
                    <Button variant="ghost" className="text-white hover:bg-gray-800">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="btn-primary">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-bg min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-transparent to-blue-900/20"></div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-red-200 to-pink-200 bg-clip-text text-transparent">
              Campus Crime Alert
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold mb-4 text-red-400">
              & Prevention – SRM KTR
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-gray-300 font-medium">
              Safer, Smarter, Stronger Campus
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link to={user ? "/map" : "/signin"}>
                <Button className="btn-primary px-8 py-4 text-lg font-semibold ripple-animation">
                  <MapPin className="w-5 h-5 mr-2" />
                  View Map
                </Button>
              </Link>
              
              <Link to={user ? "/dashboard" : "/signin"}>
                <Button className="btn-secondary px-8 py-4 text-lg font-semibold">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Report Incident
                </Button>
              </Link>
              
              <Button className="btn-sos px-8 py-4 text-lg font-semibold">
                <Phone className="w-5 h-5 mr-2" />
                SOS Emergency
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 slide-up">
            <h2 className="text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-xl text-gray-400">Advanced safety tools for campus protection</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className={`feature-card p-6 ${feature.color}`}>
                <div className="text-red-400 mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Innovations Section */}
      <section className="py-20 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 slide-up">
            <h2 className="text-4xl font-bold mb-4">Innovation Hub</h2>
            <p className="text-xl text-gray-400">Cutting-edge technology for campus safety</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {innovations.map((innovation, index) => (
              <Card key={index} className={`feature-card p-8 ${innovation.gradient}`}>
                <div className="text-white mb-6">{innovation.icon}</div>
                <h3 className="text-2xl font-bold mb-4 text-white">{innovation.title}</h3>
                <p className="text-gray-200 leading-relaxed">{innovation.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 slide-up">
            <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
            <p className="text-xl text-gray-400">Making SRM KTR campus safer every day</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {impact.map((stat, index) => (
              <Card key={index} className="stat-card text-center">
                <div className="text-4xl font-bold text-red-400 mb-2">{stat.number}</div>
                <div className="text-xl font-semibold mb-2">{stat.label}</div>
                <div className="text-gray-400 text-sm">{stat.description}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Helpline Directory */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-red-400">Emergency Helplines</h3>
              <div className="space-y-3">
                {helplines.map((helpline, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <span className="text-sm font-medium">{helpline.name}</span>
                    <a href={`tel:${helpline.number}`} className="text-red-400 font-bold hover:text-red-300">
                      {helpline.number}
                    </a>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-red-400">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/about" className="flex items-center text-gray-300 hover:text-white">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  About Us
                </Link>
                <Link to="/report" className="flex items-center text-gray-300 hover:text-white">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Report Crime
                </Link>
                <Link to="/contact" className="flex items-center text-gray-300 hover:text-white">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Contact
                </Link>
                <Link to="/support" className="flex items-center text-gray-300 hover:text-white">
                  <ChevronRight className="w-4 h-4 mr-2" />
                  Support
                </Link>
              </div>
            </div>
            
            {/* Campus Info */}
            <div>
              <h3 className="text-xl font-bold mb-6 text-red-400">SRM KTR Campus</h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                Making our campus safer through technology, community engagement, and proactive security measures.
              </p>
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-red-500" />
                <span className="text-sm text-gray-400">Secured by Campus Safety Team</span>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400 text-sm">
              © 2024 Campus Crime Alert & Prevention - SRM KTR. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;