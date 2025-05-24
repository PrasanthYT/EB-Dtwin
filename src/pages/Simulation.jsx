import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  Heart,
  Moon,
  Brain,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Info,
  ArrowLeft,
  DropletIcon,
  Play,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100">
        <p className="font-semibold text-gray-800 mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-blue-600 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-600"></div>
            Baseline: {payload[0].value}
          </p>
          <p className="text-rose-600 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-600"></div>
            Simulated: {payload[1].value}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

// Metric Card Component
const MetricCard = ({
  icon: Icon,
  title,
  value,
  unit,
  min,
  max,
  onChange,
  recommendation,
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-gray-50">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="text-xl font-semibold text-gray-800">
          {value}{" "}
          <span className="text-sm font-normal text-gray-500">{unit}</span>
        </p>
      </div>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={(max - min) / 100}
      onValueChange={(val) => onChange(val[0])}
      className="my-4"
    />
    <p className="text-sm text-gray-600 mt-2">{recommendation}</p>
  </div>
);

// Loading State Component
const LoadingState = () => (
  <Card className="p-6 mb-8 bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-lg">
    <div className="flex items-center justify-center">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-indigo-800 mb-2">
          Loading Health Data
        </h1>
        <p className="text-gray-600">
          Please wait while we retrieve your latest health metrics...
        </p>
      </div>
    </div>
    <div className="mt-8 space-y-4">
      <Skeleton className="h-8 w-3/4 mx-auto rounded-md" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
        <Skeleton className="h-24 rounded-md" />
      </div>
      <Skeleton className="h-10 w-40 mx-auto rounded-md mt-6" />
    </div>
  </Card>
);

// Results Section Component
const ResultsSection = ({ results, baselineMetrics, onReset }) => {
  const chartData = [
    {
      name: "Heart Rate",
      baseline: baselineMetrics.heartRate,
      simulated: results.updatedMetrics.heartRate,
    },
    {
      name: "Sleep Hours",
      baseline: baselineMetrics.sleepHours,
      simulated: results.updatedMetrics.sleepHours,
    },
    {
      name: "Daily Steps",
      baseline: baselineMetrics.dailySteps,
      simulated: results.updatedMetrics.dailySteps,
    },
    {
      name: "Blood Sugar",
      baseline: baselineMetrics.bloodSugar,
      simulated: results.updatedMetrics.bloodSugar,
    },
  ];

  return (
    <Card className="p-8 bg-white rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Simulation Results</h2>
        <Button
          variant="outline"
          onClick={onReset}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </Button>
      </div>

      <div className="bg-gray-50 p-6 rounded-xl mb-8">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="baseline"
              name="Baseline"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="baseline" position="top" />
            </Bar>
            <Bar
              dataKey="simulated"
              name="Simulated"
              fill="#e11d48"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="simulated" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Potential Risks
          </h3>
          <ul className="space-y-4">
            {results.potentialRisks.map((risk, index) => (
              <li
                key={index}
                className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg"
              >
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                <span className="text-gray-700">{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Health Impacts
          </h3>
          <ul className="space-y-4">
            {results.healthImpacts.map((impact, index) => (
              <li
                key={index}
                className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg"
              >
                <Info className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                <span className="text-gray-700">{impact}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-xl">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          AI Analysis
        </h3>
        <p className="text-gray-700 leading-relaxed">
          {results.overallSummary}
        </p>
      </div>

      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-start gap-3 text-sm text-gray-500">
          <Info className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
          <p>
            Simulation generated at{" "}
            {new Date(results.timestamp).toLocaleString()}. This is an
            AI-powered simulation and should not be used for medical decisions.
            Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </Card>
  );
};

// Main Health Simulator Component
const HealthSimulator = () => {
  const [scenario, setScenario] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baselineMetrics, setBaselineMetrics] = useState({
    heartRate: 70,
    sleepHours: 7,
    stressLevel: 3,
    bloodSugar: 100,
    bloodPressure: { systolic: 120, diastolic: 80 },
    dailySteps: 8000,
    activeMinutes: 30,
    healthScore: 85,
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = sessionStorage.getItem("token");

        if (!token) {
          throw new Error("No authentication token found");
        }

        const [userResponse, fitbitResponse] = await Promise.all([
          axios.get("http://localhost:4200/api/auth/user", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:4200/api/fitbit/get", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (
          userResponse.data &&
          fitbitResponse.data?.data?.weeklyData?.length > 0
        ) {
          const weeklyData = [...fitbitResponse.data.data.weeklyData].sort(
            (a, b) => new Date(b.date) - new Date(a.date)
          );

          const recentData = weeklyData[0];
          const recentSleepData = weeklyData.find(
            (day) => day.sleep?.sleepRecords?.length > 0
          );
          const recentSleepRecord = recentSleepData?.sleep?.sleepRecords?.[0];

          setBaselineMetrics((prev) => ({
            ...prev,
            heartRate:
              recentData?.activity?.summary?.restingHeartRate || prev.heartRate,
            sleepHours: recentSleepRecord?.minutesAsleep
              ? parseFloat((recentSleepRecord.minutesAsleep / 60).toFixed(1))
              : prev.sleepHours,
            dailySteps: recentData?.activity?.summary?.steps || prev.dailySteps,
            activeMinutes:
              recentData?.activity?.summary?.lightlyActiveMinutes ||
              prev.activeMinutes,
            healthScore:
              userResponse.data?.user?.healthData?.healthScore ||
              prev.healthScore,
          }));
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Failed to load your health data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const runSimulation = async () => {
    if (!scenario.trim()) return;

    setIsSimulating(true);
    setError(null);

    try {
      // Simulate AI response for demo purposes
      const mockResponse = {
        updatedMetrics: {
          ...baselineMetrics,
          heartRate: baselineMetrics.heartRate + Math.floor(Math.random() * 20),
          sleepHours: Math.max(
            baselineMetrics.sleepHours - Math.random() * 2,
            0
          ),
          dailySteps: Math.max(
            baselineMetrics.dailySteps - Math.floor(Math.random() * 2000),
            0
          ),
          bloodSugar:
            baselineMetrics.bloodSugar + Math.floor(Math.random() * 30),
        },
        potentialRisks: [
          "Increased stress levels",
          "Potential sleep deprivation",
          "Reduced physical activity",
        ],
        healthImpacts: [
          "Higher heart rate indicating increased stress",
          "Reduced sleep may affect cognitive function",
          "Decreased activity level may impact cardiovascular health",
        ],
        overallSummary:
          "The scenario suggests potential negative impacts on your health metrics. Consider maintaining regular sleep patterns and physical activity levels.",
        timestamp: new Date().toISOString(),
      };

      setSimulationResults(mockResponse);
    } catch (err) {
      console.error("Simulation error:", err);
      setError("An error occurred during the simulation. Please try again.");
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = () => {
    setSimulationResults(null);
    setScenario("");
    setError(null);
  };

  if (loading) {
    return <LoadingState />;
  }
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          onClick={() => navigate("/dashboard")}
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Health Simulator</h1>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* Main Input Card */}
          <Card className="p-8 mb-8 bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg rounded-xl">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                AI Health Predictor
              </h2>
              <p className="text-gray-600 text-center mb-8">
                Describe a scenario to see how it might affect your health
                metrics
              </p>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Textarea
                placeholder="Example: I haven't slept for 24 hours and had 3 cups of coffee..."
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="min-h-[100px] mb-8 text-lg"
              />

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <MetricCard
                  icon={Heart}
                  title="Heart Rate"
                  value={baselineMetrics.heartRate}
                  unit="BPM"
                  min={40}
                  max={120}
                  onChange={(val) =>
                    setBaselineMetrics({ ...baselineMetrics, heartRate: val })
                  }
                  recommendation="Normal range: 60-100 BPM"
                />
                <MetricCard
                  icon={Moon}
                  title="Sleep Duration"
                  value={baselineMetrics.sleepHours}
                  unit="hours"
                  min={0}
                  max={12}
                  onChange={(val) =>
                    setBaselineMetrics({ ...baselineMetrics, sleepHours: val })
                  }
                  recommendation="Recommended: 7-9 hours"
                />
                <MetricCard
                  icon={Activity}
                  title="Daily Activity"
                  value={baselineMetrics.dailySteps}
                  unit="steps"
                  min={0}
                  max={20000}
                  onChange={(val) =>
                    setBaselineMetrics({ ...baselineMetrics, dailySteps: val })
                  }
                  recommendation="Target: 8,000-10,000 steps"
                />
                <MetricCard
                  icon={DropletIcon}
                  title="Blood Sugar"
                  value={baselineMetrics.bloodSugar}
                  unit="mg/dL"
                  min={70}
                  max={200}
                  onChange={(val) =>
                    setBaselineMetrics({ ...baselineMetrics, bloodSugar: val })
                  }
                  recommendation="Normal fasting: 70-100 mg/dL"
                />
              </div>

              {/* Simulation Button */}
              <div className="flex justify-center">
                <Button
                  disabled={!scenario || isSimulating}
                  onClick={runSimulation}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSimulating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Running Simulation...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Start Simulation
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>

          {/* Results Section */}
          {simulationResults && (
            <ResultsSection
              results={simulationResults}
              baselineMetrics={baselineMetrics}
              onReset={resetSimulation}
            />
          )}
        </>
      )}
    </div>
  );
};

export default HealthSimulator;
