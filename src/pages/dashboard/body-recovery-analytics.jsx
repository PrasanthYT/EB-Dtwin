"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Activity,
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Battery,
    Brain,
    CheckCircle,
    Clock,
    Heart,
    Moon,
    Sparkles,
    Target,
    TrendingDown,
    TrendingUp,
    Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from "recharts";

const BodyRecoveryAnalytics = () => {
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState("7D");

  // Mock data for recovery analytics
  const overallRecoveryScore = 87;
  const recoveryTrend = 5.2; // percentage change

  const recoveryTrendData = [
    { date: "Mon", score: 82, sleep: 85, hrv: 78, stress: 25 },
    { date: "Tue", score: 85, sleep: 88, hrv: 82, stress: 22 },
    { date: "Wed", score: 79, sleep: 75, hrv: 80, stress: 35 },
    { date: "Thu", score: 88, sleep: 92, hrv: 85, stress: 18 },
    { date: "Fri", score: 91, sleep: 89, hrv: 88, stress: 15 },
    { date: "Sat", score: 85, sleep: 87, hrv: 83, stress: 20 },
    { date: "Sun", score: 87, sleep: 90, hrv: 86, stress: 17 },
  ];

  const dailyRecoveryPattern = [
    { time: "6AM", recovery: 95, phase: "Peak" },
    { time: "9AM", recovery: 88, phase: "High" },
    { time: "12PM", recovery: 75, phase: "Moderate" },
    { time: "3PM", recovery: 65, phase: "Low" },
    { time: "6PM", recovery: 70, phase: "Moderate" },
    { time: "9PM", recovery: 80, phase: "High" },
    { time: "12AM", recovery: 90, phase: "Peak" },
  ];

  const recoveryFactors = [
    { name: "Sleep Quality", value: 92, color: "#3B82F6" },
    { name: "HRV", value: 86, color: "#10B981" },
    { name: "Stress Level", value: 78, color: "#F59E0B" },
    { name: "Training Load", value: 71, color: "#EF4444" },
  ];

  const weeklyTrainingLoad = [
    { day: "Mon", load: 65, recovery: 82 },
    { day: "Tue", load: 78, recovery: 85 },
    { day: "Wed", load: 92, recovery: 79 },
    { day: "Thu", load: 45, recovery: 88 },
    { day: "Fri", load: 88, recovery: 91 },
    { day: "Sat", load: 55, recovery: 85 },
    { day: "Sun", load: 30, recovery: 87 },
  ];

  const getRecoveryStatus = (score) => {
    if (score >= 85)
      return { status: "Excellent", color: "bg-green-500", icon: CheckCircle };
    if (score >= 70)
      return { status: "Good", color: "bg-blue-500", icon: Target };
    if (score >= 55)
      return { status: "Fair", color: "bg-yellow-500", icon: AlertTriangle };
    return { status: "Poor", color: "bg-red-500", icon: AlertTriangle };
  };

  const recoveryStatus = getRecoveryStatus(overallRecoveryScore);

  const chartConfig = {
    score: { label: "Recovery Score", color: "#3B82F6" },
    sleep: { label: "Sleep Quality", color: "#10B981" },
    hrv: { label: "HRV", color: "#8B5CF6" },
    stress: { label: "Stress Level", color: "#F59E0B" },
    load: { label: "Training Load", color: "#EF4444" },
    recovery: { label: "Recovery", color: "#06B6D4" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <div className="px-6 pt-12 pb-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="text-white hover:bg-white/10 rounded-xl p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Body Recovery Analytics</h1>
              <p className="text-slate-300 text-sm mt-1">
                Advanced recovery insights powered by DTwin AI
              </p>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-2">
            {["24H", "7D", "1M", "3M"].map((period) => (
              <Button
                key={period}
                variant={selectedTimeframe === period ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setSelectedTimeframe(period)}
                className={`rounded-xl text-xs ${
                  selectedTimeframe === period
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:bg-white/10"
                }`}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 mt-6 space-y-6">
        {/* Overall Recovery Score */}
        <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-200 p-6 rounded-3xl shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 ${recoveryStatus.color} rounded-3xl flex items-center justify-center shadow-lg`}
              >
                <recoveryStatus.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {overallRecoveryScore}%
                </h2>
                <p className="text-gray-600">Overall Recovery Score</p>
                <Badge className={`mt-1 ${recoveryStatus.color} text-white`}>
                  {recoveryStatus.status}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {recoveryTrend > 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                )}
                <span
                  className={`font-semibold ${
                    recoveryTrend > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {Math.abs(recoveryTrend)}%
                </span>
              </div>
              <p className="text-sm text-gray-500">vs last week</p>
            </div>
          </div>

          {/* Recovery Trend Chart */}
          <div className="h-48">
            <ChartContainer config={chartConfig}>
              <AreaChart data={recoveryTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  fill="url(#recoveryGradient)"
                  strokeWidth={3}
                />
                <defs>
                  <linearGradient
                    id="recoveryGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ChartContainer>
          </div>
        </Card>

        {/* Recovery Factors Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Sleep Recovery */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-5 rounded-2xl hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Moon className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-blue-500 text-white">92%</Badge>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Sleep Recovery</h3>
            <p className="text-sm text-gray-600 mb-3">8.2h deep sleep</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoveryTrendData.slice(-4)}>
                  <Bar dataKey="sleep" fill="#3B82F6" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* HRV Recovery */}
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-5 rounded-2xl hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-green-500 text-white">86%</Badge>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">HRV Recovery</h3>
            <p className="text-sm text-gray-600 mb-3">45ms RMSSD</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoveryTrendData.slice(-4)}>
                  <Bar dataKey="hrv" fill="#10B981" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Stress Recovery */}
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 p-5 rounded-2xl hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-yellow-500 text-white">78%</Badge>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Stress Recovery</h3>
            <p className="text-sm text-gray-600 mb-3">Low cortisol</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoveryTrendData.slice(-4)}>
                  <Bar dataKey="stress" fill="#F59E0B" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Energy Levels */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-5 rounded-2xl hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <Badge className="bg-purple-500 text-white">89%</Badge>
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Energy Levels</h3>
            <p className="text-sm text-gray-600 mb-3">Peak performance</p>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyRecoveryPattern.slice(0, 4)}>
                  <Area
                    type="monotone"
                    dataKey="recovery"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Analytics Tabs */}
        <Card className="bg-white border border-gray-200 rounded-3xl p-6 shadow-lg">
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="daily" className="rounded-xl">
                Daily Pattern
              </TabsTrigger>
              <TabsTrigger value="training" className="rounded-xl">
                Training Load
              </TabsTrigger>
              <TabsTrigger value="factors" className="rounded-xl">
                Recovery Factors
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Daily Recovery Pattern
                </h3>
              </div>
              <div className="h-64">
                <ChartContainer config={chartConfig}>
                  <BarChart data={dailyRecoveryPattern}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="time" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="recovery" fill="#3B82F6" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </TabsContent>

            <TabsContent value="training" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Training Load vs Recovery
                </h3>
              </div>
              <div className="h-64">
                <ChartContainer config={chartConfig}>
                  <BarChart data={weeklyTrainingLoad}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="day" stroke="#6B7280" fontSize={12} />
                    <YAxis stroke="#6B7280" fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="load" fill="#EF4444" radius={4} />
                    <Bar dataKey="recovery" fill="#06B6D4" radius={4} />
                  </BarChart>
                </ChartContainer>
              </div>
            </TabsContent>

            <TabsContent value="factors" className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  Recovery Factor Breakdown
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={recoveryFactors}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {recoveryFactors.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {recoveryFactors.map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: factor.color }}
                        ></div>
                        <span className="font-medium text-gray-900">
                          {factor.name}
                        </span>
                      </div>
                      <span className="font-bold text-gray-900">
                        {factor.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* AI Insights */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                DTwin AI Insights
              </h3>
              <p className="text-sm text-gray-600">
                Personalized recovery recommendations
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">
                  Excellent Recovery Trend
                </span>
              </div>
              <p className="text-sm text-gray-700">
                Your recovery score has improved by 5.2% this week. Your sleep
                quality and HRV are in optimal ranges.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-900">
                  Training Load Balance
                </span>
              </div>
              <p className="text-sm text-gray-700">
                Consider reducing training intensity on Wednesday to optimize
                recovery. Your body shows peak recovery between 6-9 AM.
              </p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Battery className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold text-gray-900">
                  Energy Optimization
                </span>
              </div>
              <p className="text-sm text-gray-700">
                Schedule important activities during your peak recovery windows
                (6-9 AM and 9-11 PM) for maximum performance.
              </p>
            </div>
          </div>
        </Card>

        {/* Recovery Recommendations */}
        <Card className="bg-white border border-gray-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-gray-900">
              Recovery Recommendations
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Immediate Actions</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-700">
                    Maintain 8+ hours sleep
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Moon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-700">
                    Practice meditation before bed
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm text-gray-700">
                    Take active recovery days
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Long-term Goals</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-700">
                    Improve stress management
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                  <Activity className="w-5 h-5 text-red-600" />
                  <span className="text-sm text-gray-700">
                    Optimize training periodization
                  </span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl">
                  <Heart className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm text-gray-700">
                    Enhance HRV consistency
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default BodyRecoveryAnalytics;
