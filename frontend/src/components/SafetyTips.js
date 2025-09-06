import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { 
  Shield, 
  ArrowLeft, 
  Users, 
  MapPin, 
  Phone, 
  Eye, 
  Lock, 
  AlertTriangle, 
  Clock, 
  Heart,
  Book,
  Lightbulb,
  CheckCircle,
  Home,
  Car
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const SafetyTips = () => {
  const { user } = useAuth();

  const generalSafetyTips = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Stay Alert & Aware",
      description: "Always be aware of your surroundings. Avoid using headphones at high volume and keep your head up when walking.",
      category: "awareness"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Travel in Groups",
      description: "Whenever possible, travel with friends or classmates, especially during late hours or in isolated areas.",
      category: "social"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Know Your Routes",
      description: "Familiarize yourself with well-lit and frequently traveled paths. Avoid shortcuts through isolated areas.",
      category: "navigation"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Emergency Contacts Ready",
      description: "Keep emergency numbers readily accessible and inform someone about your whereabouts and expected return time.",
      category: "communication"
    }
  ];

  const womenSafetyTips = [
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Trust Your Instincts",
      description: "If a situation feels unsafe or uncomfortable, trust your gut feeling and remove yourself from the situation immediately.",
      priority: "high"
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Secure Personal Items",
      description: "Keep bags zipped and close to your body. Don't display expensive items or large amounts of cash publicly.",
      priority: "medium"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Avoid Late Night Isolation",
      description: "Avoid being alone in isolated areas after dark. Use campus shuttle services or arrange for safe transportation.",
      priority: "high"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Share Location & Plans",
      description: "Always inform trusted friends or family about your location and plans. Use location sharing features when necessary.",
      priority: "high"
    }
  ];

  const theftPreventionTips = [
    {
      icon: <Lock className="w-6 h-6" />,
      title: "Secure Your Belongings",
      description: "Use lockers in gyms, libraries, and common areas. Never leave valuables unattended, even for a short time.",
      tip: "Always lock your room/locker even for quick trips"
    },
    {
      icon: <Eye className="w-6 h-6" />,
      title: "Be Discreet with Valuables",
      description: "Don't flash expensive electronics, jewelry, or large amounts of cash. Keep them out of sight when not in use.",
      tip: "Use a basic phone case to make expensive phones less obvious"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Report Suspicious Activity",
      description: "If you notice someone acting suspiciously around parked vehicles, dorms, or personal property, report it immediately.",
      tip: "Note descriptions and locations for security reports"
    },
    {
      icon: <Home className="w-6 h-6" />,
      title: "Secure Your Living Space",
      description: "Always lock doors and windows. Don't prop doors open or let strangers into residence halls.",
      tip: "Create a buddy system with roommates for security checks"
    }
  ];

  const drugAwarenessTips = [
    {
      icon: <AlertTriangle className="w-6 h-6" />,
      title: "Recognize Warning Signs",
      description: "Be aware of signs of drug activity: unusual odors, excessive traffic to certain areas, or suspicious gatherings.",
      level: "awareness"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Peer Pressure Resistance",
      description: "Learn to say no confidently. Have exit strategies for situations where drugs might be present.",
      level: "prevention"
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Anonymous Reporting",
      description: "Use Echo's anonymous tip line to report drug-related activities. Your identity will be protected.",
      level: "action"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Support System",
      description: "If you or someone you know needs help with substance abuse, reach out to campus counseling services.",
      level: "support"
    }
  ];

  const emergencyProcedures = [
    {
      step: 1,
      title: "Assess the Situation",
      description: "Quickly evaluate the threat level and your immediate safety options.",
      action: "Stay calm and think clearly"
    },
    {
      step: 2,
      title: "Use Echo SOS",
      description: "Press the SOS button in the Echo app to send your location via WhatsApp to emergency contacts.",
      action: "Your location will be shared automatically"
    },
    {
      step: 3,
      title: "Call Emergency Services",
      description: "Dial appropriate emergency numbers: 100 (Police), 108 (Ambulance), or campus security.",
      action: "Provide clear location and situation details"
    },
    {
      step: 4,
      title: "Find Safe Location",
      description: "Move to a well-lit, populated area or secure building if possible.",
      action: "Stay on the line with emergency services"
    },
    {
      step: 5,
      title: "Follow Up",
      description: "Report the incident through official channels and seek support if needed.",
      action: "Document details while they're fresh in your memory"
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

  const getLevelIcon = (level) => {
    switch (level) {
      case 'awareness': return <Eye className="w-4 h-4" />;
      case 'prevention': return <Shield className="w-4 h-4" />;
      case 'action': return <AlertTriangle className="w-4 h-4" />;
      case 'support': return <Heart className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="text-white hover:bg-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <Book className="w-8 h-8 text-red-500" />
                <span className="text-xl font-bold text-white">Echo Safety Tips</span>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-300">Welcome, {user.name}</span>
                <Link to="/dashboard">
                  <Button className="btn-primary">Dashboard</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Campus Safety Guidelines</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive safety tips and emergency procedures to keep you safe on SRM KTR campus
          </p>
        </div>

        {/* Safety Tips Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-gray-800 mb-8">
            <TabsTrigger value="general" className="text-white data-[state=active]:bg-red-600">
              General Safety
            </TabsTrigger>
            <TabsTrigger value="women" className="text-white data-[state=active]:bg-pink-600">
              Women's Safety
            </TabsTrigger>
            <TabsTrigger value="theft" className="text-white data-[state=active]:bg-red-600">
              Theft Prevention
            </TabsTrigger>
            <TabsTrigger value="drugs" className="text-white data-[state=active]:bg-blue-600">
              Drug Awareness
            </TabsTrigger>
            <TabsTrigger value="emergency" className="text-white data-[state=active]:bg-yellow-600">
              Emergency
            </TabsTrigger>
          </TabsList>

          {/* General Safety Tab */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {generalSafetyTips.map((tip, index) => (
                <Card key={index} className="feature-card p-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-red-400 flex-shrink-0">
                      {tip.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">{tip.title}</h3>
                      <p className="text-gray-300 leading-relaxed">{tip.description}</p>
                      <Badge className="mt-3 bg-gray-700 text-gray-300">
                        {tip.category}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Women's Safety Tab */}
          <TabsContent value="women" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {womenSafetyTips.map((tip, index) => (
                <Card key={index} className="feature-card p-6 border-l-4 border-pink-500">
                  <div className="flex items-start space-x-4">
                    <div className="text-pink-400 flex-shrink-0">
                      {tip.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-xl font-semibold text-white">{tip.title}</h3>
                        <Badge className={`${getPriorityColor(tip.priority)} text-white`}>
                          {tip.priority} priority
                        </Badge>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Theft Prevention Tab */}
          <TabsContent value="theft" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {theftPreventionTips.map((tip, index) => (
                <Card key={index} className="feature-card p-6 border-l-4 border-red-500">
                  <div className="flex items-start space-x-4">
                    <div className="text-red-400 flex-shrink-0">
                      {tip.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">{tip.title}</h3>
                      <p className="text-gray-300 leading-relaxed mb-3">{tip.description}</p>
                      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-200 text-sm font-medium">
                          💡 Pro Tip: {tip.tip}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Drug Awareness Tab */}
          <TabsContent value="drugs" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {drugAwarenessTips.map((tip, index) => (
                <Card key={index} className="feature-card p-6 border-l-4 border-blue-500">
                  <div className="flex items-start space-x-4">
                    <div className="text-blue-400 flex-shrink-0">
                      {tip.icon}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-xl font-semibold text-white">{tip.title}</h3>
                        <Badge className="bg-blue-600 text-white flex items-center space-x-1">
                          {getLevelIcon(tip.level)}
                          <span>{tip.level}</span>
                        </Badge>
                      </div>
                      <p className="text-gray-300 leading-relaxed">{tip.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Emergency Procedures Tab */}
          <TabsContent value="emergency" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {emergencyProcedures.map((procedure, index) => (
                <Card key={index} className="feature-card p-6 border-l-4 border-yellow-500">
                  <div className="flex items-start space-x-4">
                    <div className="bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                      {procedure.step}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white mb-2">{procedure.title}</h3>
                      <p className="text-gray-300 leading-relaxed mb-3">{procedure.description}</p>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 text-sm font-medium">{procedure.action}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Emergency Contacts Card */}
        <Card className="feature-card p-8 mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Phone className="w-6 h-6 text-red-500 mr-2" />
            Emergency Contacts - Always Keep Handy
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Campus Security", number: "044-2741-9999", type: "Primary" },
              { name: "Police Emergency", number: "100", type: "Emergency" },
              { name: "Ambulance", number: "108", type: "Medical" },
              { name: "Women's Helpline", number: "1091", type: "Support" },
              { name: "Anti-Drug Cell", number: "044-2741-8888", type: "Special" },
              { name: "Fire Emergency", number: "101", type: "Emergency" }
            ].map((contact, index) => (
              <div key={index} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">{contact.name}</h3>
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                    {contact.type}
                  </Badge>
                </div>
                <a 
                  href={`tel:${contact.number}`} 
                  className="text-red-400 font-bold text-lg hover:text-red-300 block"
                >
                  {contact.number}
                </a>
                <p className="text-gray-400 text-xs mt-1">Tap to call</p>
              </div>
            ))}
          </div>
          
          <div className="mt-6 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-red-400 font-semibold">Remember</h3>
            </div>
            <p className="text-red-200 text-sm">
              In case of immediate danger, call 100 (Police) or use Echo's SOS feature to send your location via WhatsApp to emergency contacts instantly.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SafetyTips;