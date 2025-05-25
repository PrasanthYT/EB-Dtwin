"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, ArrowLeft, ArrowRight, Brain, Heart, TrendingDown, TrendingUp } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Area, AreaChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

// Sample data for heart health
const heartRiskData = [
  { time: "Jan", risk: 15, label: "January" },
  { time: "Feb", risk: 12, label: "February" },
  { time: "Mar", risk: 18, label: "March" },
  { time: "Apr", risk: 14, label: "April" },
  { time: "May", risk: 16, label: "May" },
  { time: "Jun", risk: 11, label: "June" },
]

// Sample data for gut health
const gutRiskData = [
  { time: "Jan", risk: 8, label: "January" },
  { time: "Feb", risk: 6, label: "February" },
  { time: "Mar", risk: 12, label: "March" },
  { time: "Apr", risk: 9, label: "April" },
  { time: "May", risk: 7, label: "May" },
  { time: "Jun", risk: 5, label: "June" },
]

// Sample data for pancreas health
const pancreasRiskData = [
  { time: "Jan", risk: 22, glucose: 110, label: "January" },
  { time: "Feb", risk: 18, glucose: 105, label: "February" },
  { time: "Mar", risk: 25, glucose: 125, label: "March" },
  { time: "Apr", risk: 20, glucose: 115, label: "April" },
  { time: "May", risk: 23, glucose: 120, label: "May" },
  { time: "Jun", risk: 19, glucose: 108, label: "June" },
]

// Overall disease prediction data
const overallRiskData = [
  { time: "Jan", cardiovascular: 15, diabetes: 22, digestive: 8, label: "January" },
  { time: "Feb", cardiovascular: 12, diabetes: 18, digestive: 6, label: "February" },
  { time: "Mar", cardiovascular: 18, diabetes: 25, digestive: 12, label: "March" },
  { time: "Apr", cardiovascular: 14, diabetes: 20, digestive: 9, label: "April" },
  { time: "May", cardiovascular: 16, diabetes: 23, digestive: 7, label: "May" },
  { time: "Jun", cardiovascular: 11, diabetes: 19, digestive: 5, label: "June" },
]

const MiniChart = ({ data, dataKey, color, height = 60 }) => (
  <div className={`h-${height} w-full`}>
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#gradient-${dataKey})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

const getRiskLevel = (score) => {
  if (score <= 10) return { level: "Low", color: "bg-green-100 text-green-700 border-green-200" }
  if (score <= 20) return { level: "Moderate", color: "bg-yellow-100 text-yellow-700 border-yellow-200" }
  return { level: "High", color: "bg-red-100 text-red-700 border-red-200" }
}

export default function DiseasePrediction() {
  const navigate = useNavigate()
  const [selectedTimeframe, setSelectedTimeframe] = useState("6M")

  // Current risk scores
  const currentRisks = {
    heart: 11,
    gut: 5,
    pancreas: 19,
  }

  const heartRisk = getRiskLevel(currentRisks.heart)
  const gutRisk = getRiskLevel(currentRisks.gut)
  const pancreasRisk = getRiskLevel(currentRisks.pancreas)

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
          <h1 className="text-xl sm:text-2xl font-bold text-black">Disease Prediction</h1>
        </div>

        {/* Timeframe Selector */}
        <div className="flex gap-2 mb-6">
          {["1M", "3M", "6M", "1Y"].map((period) => (
            <Button
              key={period}
              variant={selectedTimeframe === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(period)}
              className="rounded-lg"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-4 space-y-4 sm:space-y-6">
        {/* Top Row - Heart and Gut */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Heart Disease Risk */}
          <Card
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/dashboard/heart-detailed-report")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Cardiovascular Risk</CardTitle>
                    <p className="text-sm text-gray-600">Heart disease prediction</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Risk Score */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{currentRisks.heart}%</span>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">-2.3%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Risk score this month</p>
                  </div>
                  <Badge className={`px-3 py-1 text-sm font-semibold rounded-full border ${heartRisk.color}`}>
                    {heartRisk.level}
                  </Badge>
                </div>

                {/* Mini Chart */}
                <MiniChart data={heartRiskData} dataKey="risk" color="#ef4444" />

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500">Heart Rate</p>
                    <p className="text-sm font-semibold text-gray-900">72 BPM</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">HRV</p>
                    <p className="text-sm font-semibold text-gray-900">45 ms</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gut Health Risk */}
          <Card
            className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => navigate("/dashboard/gut-detailed-report")}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Digestive Health Risk</CardTitle>
                    <p className="text-sm text-gray-600">Gut microbiome analysis</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* Risk Score */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{currentRisks.gut}%</span>
                      <div className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-600">-1.8%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Risk score this month</p>
                  </div>
                  <Badge className={`px-3 py-1 text-sm font-semibold rounded-full border ${gutRisk.color}`}>
                    {gutRisk.level}
                  </Badge>
                </div>

                {/* Mini Chart */}
                <MiniChart data={gutRiskData} dataKey="risk" color="#22c55e" />

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500">Diversity Score</p>
                    <p className="text-sm font-semibold text-gray-900">76/100</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Fiber Intake</p>
                    <p className="text-sm font-semibold text-gray-900">38g</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row - Pancreas (Full Width) */}
        <Card
          className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => navigate("/dashboard/pancreas-detailed-report")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">🥞</span>
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Diabetes Risk Prediction</CardTitle>
                  <p className="text-sm text-gray-600">Pancreatic function and glucose metabolism</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Risk Score Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">{currentRisks.pancreas}%</span>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <span className="text-sm text-orange-600">+1.2%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Risk score this month</p>
                  </div>
                  <Badge className={`px-3 py-1 text-sm font-semibold rounded-full border ${pancreasRisk.color}`}>
                    {pancreasRisk.level}
                  </Badge>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">HbA1c</p>
                    <p className="text-sm font-semibold text-gray-900">5.8%</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Glucose</p>
                    <p className="text-sm font-semibold text-gray-900">118 mg/dL</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Insulin</p>
                    <p className="text-sm font-semibold text-gray-900">12.5 μU/mL</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Diabetic Score</p>
                    <p className="text-sm font-semibold text-gray-900">92/100</p>
                  </div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="lg:col-span-2">
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={pancreasRiskData}>
                      <XAxis
                        dataKey="time"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: "#6b7280" }}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                        labelFormatter={(value) => {
                          const item = pancreasRiskData.find((d) => d.time === value)
                          return item?.label || value
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="risk"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                        name="Diabetes Risk (%)"
                      />
                      <Line
                        type="monotone"
                        dataKey="glucose"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
                        name="Glucose Level (mg/dL)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart Legend */}
                <div className="flex justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <span className="text-sm text-gray-600">Diabetes Risk</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full" />
                    <span className="text-sm text-gray-600">Glucose Level</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Risk Trends */}
        <Card className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Overall Disease Risk Trends</CardTitle>
                <p className="text-sm text-gray-600">Comprehensive health risk analysis</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overallRiskData}>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6b7280" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                    labelFormatter={(value) => {
                      const item = overallRiskData.find((d) => d.time === value)
                      return item?.label || value
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cardiovascular"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                    name="Cardiovascular Risk (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="diabetes"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                    name="Diabetes Risk (%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="digestive"
                    stroke="#22c55e"
                    strokeWidth={3}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                    name="Digestive Risk (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Chart Legend */}
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-sm text-gray-600">Cardiovascular</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full" />
                <span className="text-sm text-gray-600">Diabetes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600">Digestive</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 mb-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                DTwin Predictive Insights
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-gray-500 mt-1" />
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Your cardiovascular risk has decreased by 2.3% this month due to improved HRV patterns and
                    consistent exercise routine. Continue current lifestyle habits to maintain this positive trend.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-gray-500 mt-1" />
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Diabetes risk shows a slight increase (+1.2%) correlating with recent glucose spikes. Consider
                    monitoring post-meal glucose levels and reducing refined carbohydrate intake to prevent further
                    progression.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="h-5 w-5 text-gray-500 mt-1" />
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                    Excellent digestive health maintenance with 5% risk score. Your high fiber intake and diverse
                    microbiome are key protective factors against inflammatory bowel conditions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
