import React from 'react';
import { Card } from "@/components/ui/card";
import { Box, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const ModelVisualizationCard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);

  const handle3DModel = () => {
    setIsLoading(true);
    navigate("/3d-model");
  };

  return (
    <Card className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-xl shadow-lg overflow-hidden w-full max-w-md">
      {/* Background Waves */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          <path
            d="M0,100 C50,150 150,50 200,100 C250,150 350,50 400,100 V200 H0 Z"
            fill="white"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Main Content */}
      <div className="relative space-y-6">
        {/* 3D Model Icon & Status */}
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-full">
            <Box className="text-blue-500 w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-xl">3D Health Model</h3>
            <p className="text-sm text-white/80">
              Visualize your digital twin
            </p>
          </div>
        </div>

        {/* Full-Width View Model Button */}
        <button
          onClick={handle3DModel}
          disabled={isLoading}
          className="w-full bg-white text-blue-500 hover:bg-white/90 flex items-center justify-center gap-2 px-6 py-3 rounded-md shadow-md transition-all duration-300"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading Model...
            </>
          ) : (
            <>
              <Box className="w-5 h-5" />
              View 3D Model
            </>
          )}
        </button>
      </div>
    </Card>
  );
};

export default ModelVisualizationCard;