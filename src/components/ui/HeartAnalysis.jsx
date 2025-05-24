import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const HeartAnalysis = () => {
  const [heartData, setHeartData] = useState({
    avgHeartRate: 72,
    minHeartRate: 60,
    maxHeartRate: 110,
    status: "Healthy",
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchHeartRateData();
  }, []);

  // ✅ Simulate Fetching Heart Rate Data with Dummy Values
  const fetchHeartRateData = () => {
    setTimeout(() => {
      const randomHR = Math.floor(Math.random() * (80 - 65) + 65);
      const randomMin = Math.floor(Math.random() * (65 - 58) + 58);
      const randomMax = Math.floor(Math.random() * (120 - 100) + 100);

      setHeartData({
        avgHeartRate: randomHR,
        minHeartRate: randomMin,
        maxHeartRate: randomMax,
        status: getHeartStatus(randomHR),
      });
    }, 1000); // Simulate API delay
  };

  // ✅ Determine Heart Health Status
  const getHeartStatus = (bpm) => {
    if (bpm >= 100) return "High - Consider Resting";
    if (bpm < 60) return "Low - Monitor Closely";
    return "Healthy";
  };

  const handleBack = () => navigate(-1);

  return (
    <div className="w-screen h-screen bg-[#F2F7FB] p-6 flex flex-col relative">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-gray-200"
          onClick={handleBack}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-lg font-semibold">Smart Heart Analysis</h2>
        <button className="p-2">⋮</button>
      </div>

      {/* Status */}
      <div className="mt-4">
        <span
          className={`px-3 py-1 rounded-full text-sm ${
            heartData.status.includes("High")
              ? "bg-red-100 text-red-600"
              : heartData.status.includes("Low")
              ? "bg-yellow-100 text-yellow-600"
              : "bg-green-100 text-green-600"
          }`}
        >
          {heartData.status}
        </span>
      </div>

      {/* Summary */}
      <h1 className="text-3xl font-bold mt-2">{heartData.status.split(" - ")[0]}</h1>
      <p className="text-gray-500">
        {heartData.status.includes("High")
          ? "Your heart rate is higher than normal. Take rest and monitor it."
          : heartData.status.includes("Low")
          ? "Your heart rate is lower than normal. Keep an eye on it."
          : "No health abnormality detected."}
      </p>

      {/* Placeholder for Side Image */}
      <div className="absolute -right-7 top-20 w-1/2 h-3/4 flex items-center flex-end">
        <img
          src="/heartanalysis.png"
          alt="Heart Analysis"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Stats */}
      <div className="mt-6 space-y-4 pr-20">
        <div className="bg-white p-3 rounded-xl shadow flex flex-col items-center w-2/5">
          <span className="text-xl font-bold">{heartData.avgHeartRate} bpm</span>
          <span className="text-gray-500 text-sm">Avg Heart Rate</span>
        </div>
        <div className="bg-white p-3 rounded-xl shadow flex flex-col items-center w-2/5">
          <span className="text-xl font-bold">{heartData.minHeartRate} bpm</span>
          <span className="text-gray-500 text-sm">Min Heart Rate</span>
        </div>
        <div className="bg-white p-3 rounded-xl shadow flex flex-col items-center w-2/5">
          <span className="text-xl font-bold text-red-500">{heartData.maxHeartRate} bpm</span>
          <span className="text-gray-500 text-sm">Max Heart Rate</span>
        </div>
      </div>
    </div>
  );
};

export default HeartAnalysis;
