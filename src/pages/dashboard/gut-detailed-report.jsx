"use client";

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, ArrowDown, ArrowLeft, ArrowUp, Brain, Heart } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data for the charts - Updated for gut health
const fiberData = [
  { time: "00:00", value: 12, label: "12:00 AM" },
  { time: "04:00", value: 15, label: "4:00 AM" },
  { time: "08:00", value: 22, label: "8:00 AM" },
  { time: "12:00", value: 28, label: "12:00 PM" },
  { time: "16:00", value: 32, label: "4:00 PM" },
  { time: "20:00", value: 35, label: "8:00 PM" },
  { time: "24:00", value: 38, label: "12:00 AM" },
];

const stressFoodMapData = [
  { time: "00:00", stressLevel: 2, foodMap: 0, label: "12:00 AM" },
  { time: "08:00", stressLevel: 3, foodMap: 1, label: "8:00 AM" },
  { time: "12:00", stressLevel: 6, foodMap: 3, label: "12:00 PM" },
  { time: "16:00", stressLevel: 4, foodMap: 2, label: "4:00 PM" },
  { time: "20:00", stressLevel: 7, foodMap: 3, label: "8:00 PM" },
  { time: "24:00", stressLevel: 3, foodMap: 0, label: "12:00 AM" },
];

// Small Overview Graph Component
const OverviewGraph = ({ data, type, className = "" }) => {
  return (
    <div className={`bg-white border rounded-lg p-2 ${className}`}>
      <div className="h-12 w-full mb-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey={type === "fiber" ? "value" : "stressLevel"}
              stroke={type === "fiber" ? "#22c55e" : "#f59e0b"}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
            />
            {type === "stressFood" && (
              <Line
                type="monotone"
                dataKey="foodMap"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                dot={false}
                activeDot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-xs text-gray-600">
        {type === "fiber" ? (
          <div>
            <p className="font-medium text-green-600 text-xs">Fiber: 38g</p>
          </div>
        ) : (
          <div>
            <p className="font-medium text-amber-600 text-xs">Peak Stress: 7</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Graph Popup Modal - No close icon, click outside to close
const GraphPopup = ({ isOpen, onClose, graphType, data, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - Click to close */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl w-[90%] max-w-md mx-4 transform transition-all duration-300 animate-in zoom-in-95">
        {/* Header - No close icon */}
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            {title}
          </h3>
        </div>

        {/* Graph Content */}
        <div className="p-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  labelFormatter={(value) => {
                    const item = data.find((d) => d.time === value);
                    return item?.label || value;
                  }}
                />
                {graphType === "fiber" ? (
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 7, stroke: "#22c55e", strokeWidth: 2 }}
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="stressLevel"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: "#f59e0b", strokeWidth: 2, r: 5 }}
                      name="Stress Level"
                    />
                    <Line
                      type="monotone"
                      dataKey="foodMap"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 5 }}
                      name="Food Map Score"
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Graph Legend */}
          <div className="mt-4 flex justify-center gap-6">
            {graphType === "fiber" ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">Daily Fiber (g)</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                  <span className="text-sm text-gray-600">Stress Level</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full" />
                  <span className="text-sm text-gray-600">Food Map</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function GutDetailedReport() {
  const navigate = useNavigate();
  const [activePopup, setActivePopup] = useState(null);
  const [gutHealthData, setGutHealthData] = useState({
    foodMapScore: 85,
    prebioticLevel: 72,
    probioticCount: 88,
    diversityScore: 76,
    riskLevel: "Excellent",
  });

  const handleGraphOpen = (graphType) => {
    setActivePopup(graphType);
  };

  const handleGraphClose = () => {
    setActivePopup(null);
  };

  const getRiskBadgeColor = (risk) => {
    switch (risk.toLowerCase()) {
      case "normal":
        return "bg-green-100 text-green-700 border-green-200";
      case "elevated":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Simplified AI suggestions - only 2 points
  const aiSuggestions = [
    "Your gut microbiome diversity is excellent at 76/100. Continue consuming fermented foods like kefir and kimchi to maintain healthy probiotic levels.",
    "Consider increasing fiber intake during morning hours. Your current 38g daily intake is good, but spreading it evenly can improve digestive efficiency and reduce stress-related gut inflammation.",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="px-4 sm:px-6 pb-8 rounded-b-[2rem]">
        <div className="flex items-center gap-4 pt-8 mb-6">
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-xl border-gray-200 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-6 w-6 text-black" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-black">
            Gut Analysis Report
          </h1>
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-4 space-y-4 sm:space-y-6">
        {/* Main Vitals Card */}
        <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            {/* Food Map and Prebiotics Row */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-600">
                    Food Map Score
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {gutHealthData.foodMapScore}
                  </span>
                  <span className="text-sm sm:text-lg text-gray-500">%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  <span className="text-xs sm:text-sm font-medium text-gray-600">
                    Prebiotic Level
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {gutHealthData.prebioticLevel}
                  </span>
                  <span className="text-sm sm:text-lg text-gray-500">%</span>
                </div>
              </div>
            </div>

            {/* Probiotics and Diversity Row */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  Probiotic Count
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-green-600">
                    {gutHealthData.probioticCount}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">
                    B CFU
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">
                  Diversity Score
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-bold text-purple-600">
                    {gutHealthData.diversityScore}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500">/100</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Gut Health Assessment
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Current microbiome health status
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge
                  className={`px-3 py-1 text-sm font-semibold rounded-full border ${getRiskBadgeColor(
                    gutHealthData.riskLevel
                  )}`}
                >
                  {gutHealthData.riskLevel}
                </Badge>
                <p className="text-xs text-gray-500 mt-1">
                  Based on current metrics
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heart Visualization - Responsive Layout */}
        <div className="relative py-6 sm:py-8">
          {/* Mobile Layout - Side by Side */}
          <div className="block lg:hidden">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Left Side - Total Fiber */}

              {/* Center - Heart with Arrows */}
              <div className="relative flex justify-center items-center col-span-2">    
                {/* Arrow from left pointing to bottom of heart */}

                <img src="/gut-animation.gif" alt="" className="w-30 h-30" />

                {/* Arrow from right pointing to top of heart */}
                <div className="absolute right-3 top-20 transform translate-x-8">
                  <div className="flex items-center">
                    <ArrowLeft className="h-4 w-4 text-blue-500" />
                    <div className="w-6 h-0.5 bg-blue-300"></div>
                  </div>
                </div>
              </div>

              {/* Right Side - Stress Level */}
              <div className="flex flex-col items-center space-y-2 ">
                <Button
                  onClick={() => handleGraphOpen("stressFood")}
                  variant="ghost"
                  className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg hover:bg-amber-50 transition-colors group border border-amber-200 bg-white w-full"
                >
                  <span className="text-xs font-medium text-amber-600 group-hover:text-amber-700 text-center leading-tight">
                    Stress Level
                  </span>
                </Button>
                <OverviewGraph
                  data={stressFoodMapData}
                  type="stressFood"
                  className="w-full border-amber-200"
                />
              </div>
            </div>
          </div>

          {/* Desktop Layout - Offset positioning (not aligned) */}
          <div className="hidden lg:block">
            <div className="relative">
              {/* HRV Analysis - Top Right (offset up) */}
              <div className="absolute top-0 right-1/4 transform translate-x-1/4 -translate-y-16">
                <div className="flex flex-col items-center space-y-3">
                  <Button
                    onClick={() => handleGraphOpen("stressFood")}
                    variant="ghost"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors group border border-blue-200 bg-white"
                  >
                    <Activity className="h-5 w-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                      Stress Level
                    </span>
                  </Button>
                  <OverviewGraph
                    data={stressFoodMapData}
                    type="stressFood"
                    className="w-64 border-blue-200"
                  />

                  {/* Arrow pointing down to top of heart */}
                  <div className="flex flex-col items-center">
                    <ArrowDown className="h-6 w-6 text-blue-500 animate-bounce" />
                    <div className="w-0.5 h-20 bg-blue-300"></div>
                  </div>
                </div>
              </div>

              {/* Heart - Center */}
              <div className="flex justify-center pt-16 pb-16">
                <img src="/gut-animation.gif" alt="" />
              </div>

              {/* Heart Rate & Food - Bottom Left (offset down) */}
              <div className="absolute bottom-0 left-1/4 transform -translate-x-1/2 translate-y-16">
                <div className="flex flex-col items-center space-y-3">
                  {/* Arrow pointing up to bottom of heart */}
                  <div className="flex flex-col items-center">
                    <div className="w-0.5 h-20 bg-red-300"></div>
                    <ArrowUp className="h-6 w-6 text-red-500 animate-bounce" />
                  </div>

                  <OverviewGraph
                    data={fiberData}
                    type="fiber"
                    className="w-64 border-red-200"
                  />
                  <Button
                    onClick={() => handleGraphOpen("fiber")}
                    variant="ghost"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl hover:bg-red-50 transition-colors group border border-red-200 bg-white"
                  >
                    <Heart className="h-5 w-5 text-red-500" />
                    <span className="text-sm font-medium text-red-600 group-hover:text-red-700">
                      Total Fiber
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Health Insights - Simplified with 2 points */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                DTwin Health Insights
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Activity className="h-10 w-10 sm:h-5 sm:w-5 text-gray-500 mt-1" />
                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {suggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Graph Popups */}
      <GraphPopup
        isOpen={activePopup === "fiber"}
        onClose={handleGraphClose}
        graphType="fiber"
        data={fiberData}
        title="Daily Fiber Intake Analysis"
      />

      <GraphPopup
        isOpen={activePopup === "stressFood"}
        onClose={handleGraphClose}
        graphType="stressFood"
        data={stressFoodMapData}
        title="Stress Level & Food Map Correlation"
      />

      <style jsx>{`
        @keyframes animate-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-in {
          animation: animate-in 0.2s ease-out;
        }

        .zoom-in-95 {
          animation: animate-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
