import { useState, useEffect } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Line, LineChart, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function HealthHeartRate() {
  const [selectedRange, setSelectedRange] = useState("1 Week");
  const [heartRateData, setHeartRateData] = useState({
    "1 Day": [
      { day: "12AM", value: 72 },
      { day: "6AM", value: 68 },
      { day: "12PM", value: 75 },
      { day: "6PM", value: 78 },
    ],
    "1 Week": [
      { day: "Mon", value: 72 },
      { day: "Tue", value: 74 },
      { day: "Wed", value: 70 },
      { day: "Thu", value: 76 },
      { day: "Fri", value: 73 },
      { day: "Sat", value: 75 },
      { day: "Sun", value: 71 },
    ],
    "1 Month": [
      { day: "Week 1", value: 72 },
      { day: "Week 2", value: 73 },
      { day: "Week 3", value: 74 },
      { day: "Week 4", value: 75 },
    ],
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchHeartRateData();
  }, []);

  // ✅ Fetch Heart Rate Data from Fitbit API
  const fetchHeartRateData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const response = await axios.get("http://localhost:4200/api/fitbit/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ Fitbit API Response:", response.data);

      if (response.status === 200 && response.data?.data?.weeklyData) {
        const weeklyData = response.data.data.weeklyData;
        const formattedData = processHeartRateData(weeklyData);
        setHeartRateData(formattedData);
      } else {
        console.warn("⚠ No heart rate data received. Using dummy data.");
      }
    } catch (error) {
      console.error(
        "❌ Error fetching heart rate data, using dummy data:",
        error
      );
    }
  };

  // ✅ Process Fitbit Data into Chart Format
  const processHeartRateData = (weeklyData) => {
    if (!weeklyData || weeklyData.length === 0) {
      console.warn("⚠ No weekly heart rate data available. Using dummy data.");
      return heartRateData;
    }

    const sortedData = weeklyData.sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const oneDayData = sortedData.slice(0, 1).flatMap((day) => [
      { day: "12AM", value: day?.activity?.summary?.restingHeartRate || 70 },
      { day: "6AM", value: day?.activity?.summary?.restingHeartRate - 3 || 67 },
      {
        day: "12PM",
        value: day?.activity?.summary?.restingHeartRate + 2 || 72,
      },
      { day: "6PM", value: day?.activity?.summary?.restingHeartRate + 5 || 75 },
    ]);

    const oneWeekData = sortedData.slice(0, 7).map((day, index) => ({
      day: new Date(day.date).toLocaleDateString("en-US", { weekday: "short" }),
      value:
        day?.activity?.summary?.restingHeartRate + (index % 2 === 0 ? 1 : -1) ||
        72,
    }));

    const oneMonthData = [
      { day: "Week 1", value: getAverage(sortedData.slice(0, 7)) },
      { day: "Week 2", value: getAverage(sortedData.slice(7, 14)) },
      { day: "Week 3", value: getAverage(sortedData.slice(14, 21)) },
      { day: "Week 4", value: getAverage(sortedData.slice(21, 28)) },
    ];

    return {
      "1 Day": oneDayData,
      "1 Week": oneWeekData,
      "1 Month": oneMonthData,
    };
  };

  // ✅ Helper Function to Calculate Weekly Average
  const getAverage = (data) => {
    if (!data || data.length === 0) return 72;
    const total = data.reduce(
      (sum, day) => sum + (day?.activity?.summary?.restingHeartRate || 72),
      0
    );
    return Math.round(total / data.length);
  };

  // ✅ Get Current Heart Rate (Most Recent Entry)
  const latestHeartRate = heartRateData["1 Week"]?.[0]?.value || 72;

  // ✅ Determine Heart Rate Status & Message
  const getHeartRateStatus = (bpm) => {
    if (bpm >= 100) {
      return {
        label: "High",
        message:
          "Your heart rate is elevated. Take a break, hydrate, and relax.",
        color: "bg-red-100 text-red-500",
      };
    } else if (bpm < 60) {
      return {
        label: "Low",
        message:
          "Your heart rate is lower than normal. Consider consulting a doctor if you feel dizzy.",
        color: "bg-yellow-100 text-yellow-500",
      };
    } else {
      return {
        label: "Normal",
        message:
          "Your heart rate is within the healthy range. Keep up your fitness routine!",
        color: "bg-green-100 text-green-500",
      };
    }
  };

  const heartRateStatus = getHeartRateStatus(latestHeartRate);
  const handleFullReport = () => navigate("/healthanalysis");

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen p-4">
      <div className="flex items-center justify-between mb-8">
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          size="icon"
          className="rounded-xl"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Heart Rate</h1>
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="bg-red-50 p-2 rounded-xl">
          <div className="text-red-500">❤️</div>
        </div>
        <div>
          <span className="text-4xl font-bold">{latestHeartRate}</span>
          <span className="text-xl text-gray-400 ml-1">BPM</span>
        </div>
      </div>

      <Tabs defaultValue="1 Week" onValueChange={setSelectedRange}>
        <TabsList className="flex gap-2 mb-8">
          {Object.keys(heartRateData).map((range) => (
            <TabsTrigger key={range} value={range} className="rounded-full">
              {range}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(heartRateData).map(([range, data]) => (
          <TabsContent
            key={range}
            value={range}
            className="mb-8 h-[200px] w-full"
          >
            <LineChart data={data} width={350} height={200}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </TabsContent>
        ))}
      </Tabs>

      <Card className={`${heartRateStatus.color} border-none p-4 mt-4`}>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">{`Heart Rate Status: ${heartRateStatus.label}`}</h2>
          <p className="text-gray-500">{heartRateStatus.message}</p>
        </CardContent>
      </Card>
      <button
        onClick={handleFullReport}
        className="w-full max-w-md bg-[#0066FF] text-white rounded-xl py-4 flex items-center justify-center gap-2 text-[16px] font-medium mt-6"
      >
        View Full Report
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
