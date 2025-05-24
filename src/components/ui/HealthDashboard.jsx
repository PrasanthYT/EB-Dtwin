import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HealthScore = () => {
  const [healthData, setHealthData] = useState({
    score: "--",
    heartRate: "--",
    steps: "--",
    sleep: "--",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchHealthData();
  }, []);

  // ✅ Fetch Health Score from User API & Steps from Fitbit API
  const fetchHealthData = async () => {
    try {
      const token = sessionStorage.getItem("token");
  
      // Fetch User Health Score
      const userResponse = await axios.get("http://localhost:4200/api/auth/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      const healthScore = userResponse.data?.user?.healthData?.healthScore || "--";
  
      // Fetch Fitbit Data
      const fitbitResponse = await axios.get("http://localhost:4200/api/fitbit/get", {
        headers: { Authorization: `Bearer ${token}` },
      });
  
      if (fitbitResponse.status === 200) {
        const weeklyData = fitbitResponse.data?.data?.weeklyData || [];
        const latestData = weeklyData.length ? weeklyData[0] : null; // Get latest entry
  
        if (latestData) {
          const activitySummary = latestData?.activity?.summary || {};
          const restingHeartRate = activitySummary.restingHeartRate || "--";
          const steps = activitySummary.steps || "--";
          const caloriesOut = activitySummary.caloriesOut || "--"; // Added Calories Out
  
          // ✅ Extract Sleep Duration (Convert ms to hours)
          const sleepRecords = latestData?.sleep?.sleepRecords || [];
          const sleepDuration = sleepRecords.length > 0
            ? Math.round(sleepRecords.reduce((sum, record) => sum + record.duration, 0) / (1000 * 60 * 60))
            : "--";
  
          setHealthData({
            score: healthScore,
            heartRate: restingHeartRate,
            steps,
            sleep: sleepDuration,
            caloriesOut, // ✅ Display Calories Burned
          });
        }
      }
    } catch (error) {
      console.error("❌ Error fetching health data:", error);
    }
  };
  

  const handleback = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center text-white p-4 relative">
      {/* Blue Background for Top Half with Design */}
      <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-r from-blue-600 to-blue-500 rounded-b-3xl shadow-xl"></div>

      {/* Header */}
      <div className="flex justify-between items-center w-full max-w-sm z-10 mt-4">
      <ChevronLeft onClick={handleback} className="w-10 h-8" />
        <h1 className="text-lg font-semibold">Metabolic Score</h1>
        <Button className="bg-white text-black px-4 py-1 rounded-lg">Normal</Button>
      </div>

      {/* Score Section */}
      <div className="mt-6 text-center z-10">
        <h2 className="text-6xl font-bold">{healthData.score}</h2>
        <p className="text-lg mt-2">You are a healthy individual.</p>
      </div>

      {/* Stats Cards */}
      <div className="w-full max-w-sm mt-24 z-10 space-y-6 pb-10">
        <Card className="p-4 bg-white text-black rounded-xl flex justify-between items-center shadow-lg">
          <div>
            <h3 className="text-lg font-semibold">Heart Rate</h3>
            <p className="text-2xl font-bold">{healthData.heartRate} <span className="text-sm">bpm</span></p>
          </div>
          <img src="/heartrateimage.png" alt="Heart Rate Graph" className="w-16 h-10" />
        </Card>

        <Card className="p-4 bg-white text-black rounded-xl flex justify-between items-center shadow-lg">
          <div>
            <h3 className="text-lg font-semibold">Steps</h3>
            <p className="text-2xl font-bold">{healthData.steps} <span className="text-sm">steps</span></p>
          </div>
          <img src="/bpimage.png" alt="Steps Graph" className="w-16 h-10" />
        </Card>

        <Card className="p-4 bg-white text-black rounded-xl flex justify-between items-center shadow-lg">
          <div>
            <h3 className="text-lg font-semibold">Sleep</h3>
            <p className="text-2xl font-bold">{healthData.sleep} <span className="text-sm">hr</span></p>
          </div>
          <img src="./sleepimage.png" alt="Sleep Graph" className="w-16 h-10" />
        </Card>
      </div>
    </div>
  );
};

export default HealthScore;
