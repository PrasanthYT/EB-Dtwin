"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import axios from "axios";
import {
  Activity,
  Bell,
  Heart,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  Target,
  TrendingUp,
  X,
  Shield,
  BarChart3,
  Sparkles,
  Brain,
  Zap,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fitbit from "./Fitbit/Fitbit";
import BottomNav from "./dashboard/bottom-nav";
import HealthSimulation from "./dashboard/health-simulation";
import ModelVisualizationCard from "./dashboard/health-threeD-twin";

const   HealthDashboard = () => {
  const navigate = useNavigate();

  // ** State for User & Fitbit Data **
  const [userData, setUserData] = useState(null);
  const [fitbitData, setFitbitData] = useState(null);
  const [loading, setLoading] = useState(true);

  const randomBloodSugar = Math.floor(Math.random() * (180 - 70 + 1)) + 70;

  // ** Fetch User Data **
  const fetchUserData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        console.log("✅ User Data:", response.data);
        setUserData(response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching user data:", error);
    }
  };

  // ** Fetch Fitbit Data **
  const fetchFitbitData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:4000/api/connect/fitbit/data", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        console.log("✅ Fitbit Data:", response.data);
        setFitbitData(response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching Fitbit data:", error);
    }
  };

  // ** State for Health Metrics **
  const [healthMetrics, setHealthMetrics] = useState({
    heartRate: null,
    bloodSugar: null,
    sleep: null,
    steps: null,
  });

  // ** Fetch Health Metrics Data **
  const fetchHealthMetrics = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const today = new Date().toISOString().split("T")[0];

      // Fetch heart rate data
      const heartRateResponse = await axios.get(
        `http://localhost:4000/api/health-metrics/heart?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch steps data
      const stepsResponse = await axios.get(
        `http://localhost:4000/api/health-metrics?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Fetch sleep data (you might need to adjust this endpoint)
      const sleepResponse = await axios.get(
        `http://localhost:4000/api/sleep?date=${today}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setHealthMetrics({
        heartRate: heartRateResponse.data?.data || generateFallbackHeartRate(),
        bloodSugar: generateFallbackBloodSugar(), // Typically not from Fitbit
        sleep: sleepResponse.data?.data?.[0] || generateFallbackSleep(),
        steps: stepsResponse.data?.data || generateFallbackSteps(),
      });
    } catch (error) {
      console.error("Error fetching health metrics:", error);
      // Use fallback data if API fails
      setHealthMetrics({
        heartRate: generateFallbackHeartRate(),
        bloodSugar: generateFallbackBloodSugar(),
        sleep: generateFallbackSleep(),
        steps: generateFallbackSteps(),
      });
    }
  };

  // ** Fallback Data Generators **
  const generateFallbackHeartRate = () => ({
    resting_heart_rate: Math.floor(Math.random() * (75 - 60 + 1)) + 60,
    min_heart_rate: Math.floor(Math.random() * (60 - 50 + 1)) + 50,
    max_heart_rate: Math.floor(Math.random() * (120 - 100 + 1)) + 100,
    heart_rate_data: Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      value: Math.floor(Math.random() * (100 - 60 + 1)) + 60,
    })),
  });

  const generateFallbackBloodSugar = () =>
    Math.floor(Math.random() * (180 - 70 + 1)) + 70;

  const generateFallbackSleep = () => ({
    minutesAsleep: Math.floor(Math.random() * (480 - 360 + 1)) + 360, // 6-8 hours
    efficiency: Math.floor(Math.random() * (95 - 80 + 1)) + 80,
    sleepStages: [
      { stageType: "LIGHT", durationSeconds: 18000 }, // 5 hours
      { stageType: "DEEP", durationSeconds: 7200 }, // 2 hours
      { stageType: "REM", durationSeconds: 5400 }, // 1.5 hours
    ],
  });

  const generateFallbackSteps = () => ({
    total_steps: Math.floor(Math.random() * (10000 - 4000 + 1)) + 4000,
    distance_covered: (Math.random() * 8 + 2).toFixed(1), // 2-10 km
  });

  // Helper to generate heart rate path for SVG
  const generateHeartRatePath = (data) => {
    if (!data || data.length === 0) return "M0 12 L100 12";

    const points = data.map((item, i) => {
      const x = (i / (data.length - 1)) * 100;
      // Normalize heart rate value to fit in the SVG (assuming 40-120 BPM range)
      const y = 24 - ((item.value - 40) / 80) * 24;
      return `${x} ${y}`;
    });

    return `M${points.join(" L")}`;
  };

  // Helper to get color for sleep stages
  const getSleepStageColor = (stageType) => {
    switch (stageType) {
      case "DEEP":
        return "rgba(56, 182, 255, 0.7)";
      case "REM":
        return "rgba(168, 85, 247, 0.7)";
      case "AWAKE":
        return "rgba(248, 113, 113, 0.7)";
      default:
        return "rgba(255, 255, 255, 0.4)"; // LIGHT
    }
  };

  // Add to your useEffect to fetch metrics
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchUserData();
      await fetchFitbitData();
      await fetchHealthMetrics(); // Add this line
      setLoading(false);
    };
    fetchData();
  }, []);

  const email = userData?.user?.username || "";
  const extractedName = email.split("@")[0];
  const username = userData?.user?.name || extractedName || "User";
  const healthScore = userData?.user?.healthData?.healthScore || "--";
  const userId = userData?.user?.userId;

  // ✅ Get Weekly Data
  const weeklyData = fitbitData?.data?.weeklyData || [];

  // ✅ Sort weeklyData by date (latest first)
  const sortedWeeklyData = [...weeklyData].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  // ✅ Get Today's Date
  const today = new Date().toISOString().split("T")[0];

  // ✅ Find the Most Recent Data Entry
  const recentData = sortedWeeklyData.find(
    (day) => new Date(day.date) <= new Date(today)
  );

  // ✅ Extract Heart Rate Details
  const recentRestingHeartRate =
    recentData?.activity?.summary?.restingHeartRate || "--";

  // ✅ Extract Sleep Data (Check if sleepRecords exist)
  const recentSleepData = sortedWeeklyData.find(
    (day) => day.sleep?.sleepRecords?.length > 0
  );
  const recentSleepRecord = recentSleepData?.sleep?.sleepRecords?.[0] || null;

  const recentSleepDuration = recentSleepRecord?.minutesAsleep
    ? (recentSleepRecord.minutesAsleep / 60).toFixed(1) // Convert minutes to hours
    : "--";

  const recentSleepEfficiency = recentSleepRecord?.efficiency || "--";

  // ✅ Extract Activity Data
  const recentDailySteps =
    recentData?.activity?.summary?.steps?.toLocaleString() || "--"; // Format Steps
  const recentActiveMinutes =
    recentData?.activity?.summary?.lightlyActiveMinutes || 0;

  // ✅ Extract Total Distance
  const totalDistance =
    recentData?.activity?.summary?.distances?.find(
      (d) => d.activity === "total"
    )?.distance || "--";

  // ✅ Extract Calories Burned
  const caloriesBurned = recentData?.activity?.summary?.caloriesOut || "--";

  // ✅ Extract Heart Rate Zones
  const heartRateZones = recentData?.activity?.summary?.heartRateZones || [];

  // ** Handle Navigation **
  const handleWellnessAI = () => navigate("/wellnessai");
  const handleSearchBar = () => navigate("/search");
  const handleNavigateDP = () => navigate("/diseaseprediction");
  const handleChatBotLink = () => navigate("/chatbot");
  const handleHeartRate = () => navigate("/heartratemonitor");
  const handleHealthScore = () => navigate("/healthscore");
  const handleAddMeds = () => navigate("/addmeds");
  const handleHealthBloodSugar = () => navigate("/healthbloodsugar");
  const handleGutHealthLink = () => navigate("/guthealth");

  const handleRemoveMed = async (medication) => {
    try {
      const token = sessionStorage.getItem("token");
      await axios.post(
        "http://localhost:4200/api/auth/remove-medication",
        { medication },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchUserData(); // Refresh user data after removing
    } catch (error) {
      console.error("❌ Error removing medication:", error);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token"); // ✅ Remove token
    navigate("/signin"); // ✅ Redirect to login page
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 overflow-x-hidden">
      {/* Main content wrapper with bottom padding for navigation */}
      <div className="pb-32">
        {/* Enhanced Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white border-b border-gray-700 shadow-lg rounded-b-3xl">
          <div className="px-6 pt-12 pb-6">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-slate-300">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Bell className="w-5 h-5 text-slate-300 hover:text-white transition-colors cursor-pointer" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-bounce"></div>
                </div>
                <LogOut
                  onClick={handleLogout}
                  className="w-5 h-5 text-slate-300 hover:text-white transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* User Greeting */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-xl">👋</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Hi, {username}!
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-300">Pro Member</span>
                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded-full font-medium backdrop-blur-sm">
                      Score {healthScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative" onClick={handleSearchBar}>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search health insights..."
                className="w-full bg-white/10 backdrop-blur-sm rounded-2xl py-3 pl-12 pr-4 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/20 border border-white/20 text-white transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 mt-6">
          {/* Innovative Health Features Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">
                  AI Health Features
                </h2>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                    Premium
                  </span>
                </div>
              </div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>

            {/* Innovative Staggered Grid Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Disease Prediction - Large Card */}
              <Card onClick={handleNavigateDP} className="col-span-2 bg-gradient-to-br from-red-50 to-red-100 border border-red-200 p-6 rounded-3xl hover:shadow-xl hover:border-red-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/30 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-red-300/20 rounded-full translate-y-8 -translate-x-8"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-red-600" />
                      <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded-full font-medium">
                        AI Powered
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Disease Prediction
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Advanced AI algorithms analyze your health data to predict
                    potential health risks
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm bg-red-500 text-white px-3 py-1 rounded-full font-medium">
                      95% Accuracy
                    </span>
                    <div className="flex items-center gap-1 text-red-600">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs font-medium">
                        Smart Analysis
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Gut Health */}
              <Card onClick={handleGutHealthLink} className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-2xl hover:shadow-lg hover:border-green-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-green-200/30 rounded-full -translate-y-8 translate-x-8"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    Gut Health
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Microbiome tracking & analysis
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full font-medium">
                      88% Health
                    </span>
                    <div className="w-8 h-1 bg-green-200 rounded-full">
                      <div className="w-7 h-1 bg-green-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Mental Chatbot */}
              <Card onClick={handleChatBotLink} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-2xl hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-200/30 rounded-full translate-y-8 -translate-x-8"></div>
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-md">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">
                    Mental Chatbot
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    24/7 mental wellness support
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                      Online
                    </span>
                    <div className="flex gap-1">
                      <div className="w-1 h-3 bg-blue-300 rounded-full animate-pulse"></div>
                      <div
                        className="w-1 h-2 bg-blue-400 rounded-full animate-pulse"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                      <div
                        className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"
                        style={{ animationDelay: "0.4s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Body Recovery Graph */}
              <Card className="col-span-2 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 p-5 rounded-2xl hover:shadow-lg hover:border-orange-300 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-orange-200/20 rounded-full -translate-y-12 translate-x-12"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full font-medium">
                        92% Recovery
                      </span>
                      <TrendingUp className="w-4 h-4 text-orange-600" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    Body Recovery Analytics
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    Track your body's recovery patterns and optimize performance
                  </p>
                  <div className="flex gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-orange-200 rounded-sm group-hover:bg-orange-300 transition-colors"
                        style={{
                          height: `${30 + (i % 4) * 20}%`,
                          alignSelf: "flex-end",
                        }}
                      ></div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Compact Fitbit Integration */}
          <div className="mb-8">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <Fitbit />
            </div>
          </div>

          {/* Health Score */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Your Health Overview
            </h2>
            <Card
              className="bg-gradient-to-br from-white to-blue-50 rounded-3xl border border-blue-200 p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              onClick={handleHealthScore}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                    <span className="text-3xl font-bold">{healthScore}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Metabolic Score
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Your health status is above average
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 text-sm font-medium">
                        Improving
                      </span>
                      <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                        +5%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-gray-400 group-hover:text-blue-500 transition-colors">
                  <svg
                    className="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Health Metrics Grid */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Live Metrics</h2>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Heart Rate Card */}
              <Card
                onClick={handleHeartRate}
                className="bg-gradient-to-br from-red-500 to-red-600 text-white border-0 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <Heart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Heart Rate</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">
                    {healthMetrics.heartRate?.resting_heart_rate || "--"}
                  </span>
                  <span className="text-xs opacity-80">BPM</span>
                </div>
                <div className="mt-3 h-6">
                  <svg className="w-full h-full" viewBox="0 0 100 24">
                    <path
                      d={
                        healthMetrics.heartRate?.heart_rate_data
                          ? generateHeartRatePath(
                              healthMetrics.heartRate.heart_rate_data
                            )
                          : "M0 12 L15 12 L20 4 L25 20 L30 12 L45 12 L50 4 L55 20 L60 12 L75 12 L80 4 L85 20 L90 12 L100 12"
                      }
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-80"
                    />
                  </svg>
                </div>
              </Card>

              {/* Blood Sugar Card */}
              <Card
                onClick={handleHealthBloodSugar}
                className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-3">
                  <Activity className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${
                      healthMetrics.bloodSugar > 140
                        ? "bg-red-300"
                        : healthMetrics.bloodSugar < 90
                        ? "bg-yellow-300"
                        : "bg-green-300"
                    }`}
                  ></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Blood Sugar</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">
                    {healthMetrics.bloodSugar || "--"}
                  </span>
                  <span className="text-xs opacity-80">mg/dL</span>
                </div>
                <div className="mt-3 text-center bg-white/20 rounded-xl py-1 text-xs font-medium">
                  {healthMetrics.bloodSugar > 140
                    ? "High"
                    : healthMetrics.bloodSugar < 90
                    ? "Low"
                    : "Normal"}
                </div>
              </Card>

              {/* Sleep Card */}
              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <Moon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">
                  Sleep Quality
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">
                    {healthMetrics.sleep?.minutesAsleep
                      ? (healthMetrics.sleep.minutesAsleep / 60).toFixed(1)
                      : "--"}
                  </span>
                  <span className="text-xs opacity-80">hrs</span>
                </div>
                <div className="flex justify-between mt-3 h-6 gap-1">
                  {healthMetrics.sleep?.sleepStages?.length > 0
                    ? healthMetrics.sleep.sleepStages.map((stage, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white/40 rounded-full group-hover:bg-white/60 transition-colors"
                          style={{
                            height: `${Math.min(
                              100,
                              stage.durationSeconds / 180
                            )}%`,
                            backgroundColor: getSleepStageColor(
                              stage.stageType
                            ),
                          }}
                        ></div>
                      ))
                    : [...Array(7)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white/40 rounded-full group-hover:bg-white/60 transition-colors"
                          style={{ height: `${60 + (i % 3) * 20}%` }}
                        ></div>
                      ))}
                </div>
              </Card>

              {/* Steps Card */}
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 p-5 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Daily Steps</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">
                    {healthMetrics.steps?.total_steps
                      ? Math.floor(healthMetrics.steps.total_steps / 1000) + "K"
                      : "--"}
                  </span>
                  <span className="text-xs opacity-80">steps</span>
                </div>
                <div className="mt-3 bg-white/20 rounded-full h-2">
                  <div
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{
                      width: `${
                        healthMetrics.steps?.total_steps
                          ? Math.min(100, healthMetrics.steps.total_steps / 100)
                          : 75
                      }%`,
                    }}
                  ></div>
                </div>
              </Card>
            </div>
          </div>

          {/* 3D Model & Simulation */}
          <div className="mb-6">
            <ModelVisualizationCard />
          </div>

          <div className="mb-6">
            <HealthSimulation />
          </div>

          {/* Medications Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Medications</h2>
              <Button
                onClick={handleAddMeds}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl px-4 py-2 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Med
              </Button>
            </div>

            <div className="space-y-3">
              {userData?.user?.userDetails?.medications?.length > 0 ? (
                userData.user.userDetails.medications.map((med, index) => (
                  <Card
                    key={med._id || index}
                    className="bg-white rounded-2xl border border-blue-200 p-4 hover:shadow-lg hover:border-blue-300 hover:-translate-y-0.5 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
                          <Activity className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {med.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {med.category}
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleRemoveMed(med)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl hover:scale-110 transition-all duration-300"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-500 mb-2">No medications added yet</p>
                  <p className="text-sm text-gray-400">
                    Add your medications to track them
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default HealthDashboard;
