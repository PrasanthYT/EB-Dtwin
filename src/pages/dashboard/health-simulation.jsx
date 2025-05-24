import React from 'react';
import { Card } from "@/components/ui/card";
import { Brain, Activity, HeartPulse, Loader2, Dna } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const HealthSimulation = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handle3DModel = () => {
    setIsLoading(true);
    navigate("/simulation");
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-6 rounded-xl shadow-lg overflow-hidden w-full max-w-md">
      {/* Animated Background Pattern */}

      {/* Main Content */}
      <div className="relative space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <Brain className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl">Digital Health Twin</h3>
              <p className="text-sm text-white/80">AI-Powered Health Analysis</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <HeartPulse className="text-pink-300 w-5 h-5 mb-2" />
            <p className="text-sm font-medium">Real-time Vitals</p>
          </div>
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Activity className="text-green-300 w-5 h-5 mb-2" />
            <p className="text-sm font-medium">Health Metrics</p>
          </div>
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Dna className="text-blue-300 w-5 h-5 mb-2" />
            <p className="text-sm font-medium">Genetic Insights</p>
          </div>
          <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
            <Brain className="text-purple-300 w-5 h-5 mb-2" />
            <p className="text-sm font-medium">Neural Activity</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handle3DModel}
          disabled={isLoading}
          className="w-full bg-white hover:bg-white/90 text-indigo-600 font-semibold flex items-center justify-center gap-2 px-6 py-4 rounded-lg shadow-lg transition-all duration-300 mt-4"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Generating Model...</span>
            </>
          ) : (
            <>
              <Brain className="w-5 h-5" />
              <span>Explore Your Digital Twin</span>
            </>
          )}
        </button>

        {/* Info Text */}
        <p className="text-sm text-white/70 text-center mt-4">
          Experience a revolutionary 3D visualization of your health data powered by advanced AI
        </p>
      </div>
    </Card>
  );
};

export default HealthSimulation;