"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import axios from "axios";
import {
  Activity,
  Award,
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
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Fitbit from "./Fitbit/Fitbit";
import BottomNav from "./dashboard/bottom-nav";
import HealthSimulation from "./dashboard/health-simulation";
import ModelVisualizationCard from "./dashboard/health-threeD-twin";

const HealthDashboard = () => {
  const navigate = useNavigate();

  // ** State for User & Fitbit Data **
  const [userData, setUserData] = useState(null);
  const [fitbitData, setFitbitData] = useState(null);
  const [loading, setLoading] = useState(true);

  const randomBloodSugar = Math.floor(Math.random() * (180 - 70 + 1)) + 70;

  // ** Fetch Data on Component Mount **
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchUserData();
      await fetchFitbitData();
      setLoading(false);
    };
    fetchData();
  }, []);

  // ** Fetch User Data **
  const fetchUserData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:4200/api/auth/user", {
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
      const response = await axios.get("http://localhost:4200/api/fitbit/get", {
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

  const handleHeartRate = () => navigate("/heartratemonitor");
  const handleHealthScore = () => navigate("/healthscore");
  const handleAddMeds = () => navigate("/addmeds");
  const handleHealthBloodSugar = () => navigate("/healthbloodsugar");

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
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Main content wrapper with bottom padding for navigation */}
      <div className="pb-32">
        {/* Clean Modern Header */}
        <div className="bg-white text-gray-900 border-b border-gray-100">
          <div className="px-6 pt-12 pb-6">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium text-gray-600">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                <LogOut
                  onClick={handleLogout}
                  className="w-5 h-5 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
                />
              </div>
            </div>

            {/* User Greeting */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center">
                    <span className="text-xl">👋</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Hi, {username}!
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-600">Pro Member</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                      Score {healthScore}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative" onClick={handleSearchBar}>
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search health insights..."
                className="w-full bg-gray-50 rounded-2xl py-3 pl-12 pr-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white border border-gray-200 text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 mt-6">
          {/* AI Assistant Card */}
          <Card className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-2xl border-0 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium opacity-90">
                    AI Powered
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1">Wellness Assistant</h3>
                <p className="text-sm opacity-90">
                  Get personalized health insights
                </p>
              </div>
              <Button
                onClick={handleWellnessAI}
                className="bg-white text-blue-600 hover:bg-gray-100 rounded-xl px-4 py-2 font-semibold"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </div>
          </Card>

          {/* Health Features Grid */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Health Features
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white border border-gray-200 p-4 rounded-2xl cursor-pointer hover:border-purple-200 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    Disease Prediction
                  </h3>
                  <p className="text-xs text-gray-500">
                    AI-powered risk assessment
                  </p>
                </div>
              </Card>

              <Card className="bg-white border border-gray-200 p-4 rounded-2xl cursor-pointer hover:border-green-200 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3">
                    <Heart className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    Gut Health
                  </h3>
                  <p className="text-xs text-gray-500">
                    Digestive wellness tracking
                  </p>
                </div>
              </Card>

              <Card className="bg-white border border-gray-200 p-4 rounded-2xl cursor-pointer hover:border-blue-200 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    Mental Chatbot
                  </h3>
                  <p className="text-xs text-gray-500">
                    Mental wellness support
                  </p>
                </div>
              </Card>

              <Card className="bg-white border border-gray-200 p-4 rounded-2xl cursor-pointer hover:border-orange-200 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">
                    Recovery Graph
                  </h3>
                  <p className="text-xs text-gray-500">
                    Body recovery analytics
                  </p>
                </div>
              </Card>
            </div>
          </div>

          {/* Health Score */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Your Health Overview
            </h2>
            <Card
              className="bg-white rounded-3xl border-0 p-6 cursor-pointer transition-all duration-300"
              onClick={handleHealthScore}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-3xl flex items-center justify-center text-white">
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
                    </div>
                  </div>
                </div>
                <div className="text-gray-400">
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
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Live Metrics
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <Card
                onClick={handleHeartRate}
                className="bg-gradient-to-br from-red-500 to-pink-600 text-white border-0 p-5 rounded-3xl cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <Heart className="w-6 h-6" />
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Heart Rate</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">74</span>
                  <span className="text-xs opacity-80">BPM</span>
                </div>
                <div className="mt-3 h-6">
                  <svg className="w-full h-full" viewBox="0 0 100 24">
                    <path
                      d="M0 12 L15 12 L20 4 L25 20 L30 12 L45 12 L50 4 L55 20 L60 12 L75 12 L80 4 L85 20 L90 12 L100 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="opacity-80"
                    />
                  </svg>
                </div>
              </Card>

              <Card
                onClick={handleHealthBloodSugar}
                className="bg-gradient-to-br from-orange-500 to-red-500 text-white border-0 p-5 rounded-3xl cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <Activity className="w-6 h-6" />
                  <div
                    className={`w-2 h-2 rounded-full ${
                      randomBloodSugar > 140
                        ? "bg-red-300"
                        : randomBloodSugar < 90
                        ? "bg-yellow-300"
                        : "bg-green-300"
                    }`}
                  ></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Blood Sugar</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">{randomBloodSugar}</span>
                  <span className="text-xs opacity-80">mg/dL</span>
                </div>
                <div className="mt-3 text-center bg-white/20 rounded-xl py-1 text-xs font-medium">
                  {randomBloodSugar > 140
                    ? "High"
                    : randomBloodSugar < 90
                    ? "Low"
                    : "Normal"}
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0 p-5 rounded-3xl cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Moon className="w-6 h-6" />
                  <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">
                  Sleep Quality
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">
                    {recentSleepDuration}
                  </span>
                  <span className="text-xs opacity-80">hrs</span>
                </div>
                <div className="flex justify-between mt-3 h-6 gap-1">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-white/40 rounded-full"
                      style={{ height: `${60 + (i % 3) * 20}%` }}
                    ></div>
                  ))}
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 p-5 rounded-3xl cursor-pointer hover:scale-105 transition-transform duration-200 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <Target className="w-6 h-6" />
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                </div>
                <h3 className="text-sm font-medium opacity-90">Daily Steps</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">4.1K</span>
                  <span className="text-xs opacity-80">steps</span>
                </div>
                <div className="mt-3 bg-white/20 rounded-full h-2">
                  <div className="bg-white rounded-full h-2 w-3/4"></div>
                </div>
              </Card>
            </div>
          </div>

          {/* Fitbit Integration */}
          <div className="mb-6">
            <Fitbit />
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
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-semibold"
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
                    className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
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
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </Card>
                ))
              ) : (
                <Card className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Plus className="w-8 h-8 text-gray-400" />
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
