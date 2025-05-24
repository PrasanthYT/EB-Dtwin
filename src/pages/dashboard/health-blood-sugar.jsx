import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  ArrowLeft,
  MoreHorizontal,
  Flame,
  Activity,
  HeartPulse,
  LineChart,
} from "lucide-react";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  Tooltip,
  ReferenceLine,
  Area,
} from "recharts";
import { Button } from "../ui/button";
import { useNavigate } from "react-router-dom";

const GlucoseMonitor = () => {
  const fileInputRef = useRef(null);
  const [glucoseData, setGlucoseData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [currentGlucose, setCurrentGlucose] = useState(0);
  const [timeInRange, setTimeInRange] = useState(0);
  const [fastingAverage, setFastingAverage] = useState(0);
  const [avgGlucose, setAvgGlucose] = useState(0);
  const [hba1c, setHba1c] = useState(0);
  const [lastMeasurementTime, setLastMeasurementTime] = useState("");
  const [selectedRange, setSelectedRange] = useState("Today");
  const [latestDate, setLatestDate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const navigate = useNavigate();

  // Define target values in mg/dL
  const TARGET_MIN = 70;
  const TARGET_MAX = 180;

  useEffect(() => {
    const uploaded = localStorage.getItem("glucoseFileUploaded");
    if (uploaded) {
      setFileUploaded(true);
      fetchGlucoseData(); // Fetch previously uploaded data
    }
  }, []);

  const fetchGlucoseData = async () => {
    setFetchingData(true);
    setError(null);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No authentication token found");

      const decodedToken = jwtDecode(token);
      const userId = decodedToken?.userId;
      if (!userId) throw new Error("Invalid token: User ID not found");

      const response = await axios.get(
        `http://localhost:4200/api/glucose/get?userId=${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.data || response.data.length === 0) {
        console.warn("No glucose data received from API");
        setFetchingData(false);
        return;
      }

      // ✅ Format API Response for the Graph
      const formattedData = response.data.data.map((record) => ({
        time: record.time,
        fullDate: new Date(record.date),
        dateString: record.date,
        glucose: record.glucoseLevel,
        highArea: record.glucoseLevel > TARGET_MAX ? record.glucoseLevel : null,
        lowArea: record.glucoseLevel < TARGET_MIN ? record.glucoseLevel : null,
        normalArea:
          record.glucoseLevel >= TARGET_MIN && record.glucoseLevel <= TARGET_MAX
            ? record.glucoseLevel
            : null,
      }));

      console.log("✅ Formatted Glucose Data:", formattedData);

      // ✅ Update State and Graph
      setGlucoseData(formattedData);
      setLatestDate(new Date());
      updateDisplayData(formattedData, selectedRange, new Date());
    } catch (error) {
      console.error("❌ Error fetching glucose data:", error);
      setError("Failed to load glucose data.");
    } finally {
      setFetchingData(false);
    }
  };

  // Convert mmol/L to mg/dL
  const mmolToMgDl = (mmol) => Math.round(mmol * 18);

  // Checks whether a glucose value is within the target range
  const isInRange = (glucoseValue) =>
    glucoseValue >= TARGET_MIN && glucoseValue <= TARGET_MAX;

  // Calculate estimated HbA1c from average glucose
  const calculateHbA1c = (avgGlucose) =>
    ((parseFloat(avgGlucose) + 46.7) / 28.7).toFixed(1);

  // Process the TXT file data
  const processGlucoseData = (fileContent) => {
    try {
      // Skip the header line if present
      const lines = fileContent.split("\n").slice(1);
      const processedData = [];
      let maxDate = new Date(0);

      lines.forEach((line) => {
        if (!line.trim()) return;
        const [id, timeStr, recordType, glucoseStr] = line.split("\t");
        if (!timeStr || !glucoseStr) return;

        // Parse the glucose value.
        // If the value is less than 20, assume it’s in mmol/L and convert it.
        const rawGlucose = parseFloat(glucoseStr);
        if (isNaN(rawGlucose)) return;
        let glucoseMgDl = rawGlucose;
        if (rawGlucose < 20) {
          glucoseMgDl = mmolToMgDl(rawGlucose);
        }

        // Parse the date.
        // The file date format is "YYYY/MM/DD HH:mm"
        const date = new Date(timeStr);
        if (date > maxDate) maxDate = date;

        processedData.push({
          time: `${date.getHours()}:${date
            .getMinutes()
            .toString()
            .padStart(2, "0")}`,
          fullDate: date,
          dateString: date.toISOString().split("T")[0],
          glucose: glucoseMgDl,
          highArea: glucoseMgDl > TARGET_MAX ? glucoseMgDl : null,
          lowArea: glucoseMgDl < TARGET_MIN ? glucoseMgDl : null,
          normalArea:
            glucoseMgDl >= TARGET_MIN && glucoseMgDl <= TARGET_MAX
              ? glucoseMgDl
              : null,
        });
      });

      processedData.sort((a, b) => a.fullDate - b.fullDate);
      return { processedData, maxDate };
    } catch (error) {
      console.error("Error processing glucose data:", error);
      throw new Error("Failed to process glucose data");
    }
  };

  const getStatusColor = (hba1c) => {
    if (hba1c < 5.7) return "text-green-600";
    if (hba1c < 6.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusText = (hba1c) => {
    if (hba1c < 5.7) return "Normal";
    if (hba1c < 6.5) return "Pre-diabetic";
    return "Diabetic";
  };

  const validateToken = () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      throw new Error("No authentication token found");
    }
    const decodedToken = jwtDecode(token);
    if (!decodedToken?.userId) {
      throw new Error("Invalid token: User ID not found");
    }
    return { token, userId: decodedToken.userId };
  };

  const formatDataForAPI = (processedData) => {
    return processedData.map((record) => ({
      date: record.dateString,
      time: record.time,
      glucoseLevel: record.glucose,
      status: isInRange(record.glucose) ? "In Range" : "Out of Range",
    }));
  };

  // Filter data by the selected time range and update metrics
  const updateDisplayData = (data, range, lastDate) => {
    if (!lastDate || !data.length) return;
    const endDate = new Date(lastDate);
    const startDate = new Date(lastDate);
    let filteredData = [];

    switch (range) {
      case "Today":
        startDate.setHours(0, 0, 0, 0);
        filteredData = data.filter(
          (reading) =>
            reading.fullDate.toDateString() === lastDate.toDateString()
        );
        break;
      case "7 days":
        startDate.setDate(lastDate.getDate() - 6);
        filteredData = data.filter(
          (reading) =>
            reading.fullDate >= startDate && reading.fullDate <= endDate
        );
        break;
      case "Month":
        startDate.setMonth(lastDate.getMonth() - 1);
        filteredData = data.filter(
          (reading) =>
            reading.fullDate >= startDate && reading.fullDate <= endDate
        );
        break;
      case "Quarter":
        startDate.setMonth(lastDate.getMonth() - 3);
        filteredData = data.filter(
          (reading) =>
            reading.fullDate >= startDate && reading.fullDate <= endDate
        );
        break;
      default:
        filteredData = data;
    }

    console.log("📊 Filtered Display Data:", filteredData); // ✅ Debugging Log

    setDisplayData(filteredData);
    updateMetrics(filteredData);
  };

  // Update current glucose, time in range, averages, and HbA1c
  const updateMetrics = (data) => {
    if (data.length === 0) return;
    const lastReading = data[data.length - 1];
    setCurrentGlucose(lastReading.glucose);
    setLastMeasurementTime(lastReading.time);

    const inRangeCount = data.filter((r) => isInRange(r.glucose)).length;
    setTimeInRange(Math.round((inRangeCount / data.length) * 100));

    // Fasting average – assuming readings at 6 AM are fasting readings
    const fastingReadings = data.filter(
      (reading) => new Date(reading.fullDate).getHours() === 6
    );
    const fastingAvg =
      fastingReadings.length > 0
        ? fastingReadings.reduce((acc, curr) => acc + curr.glucose, 0) /
          fastingReadings.length
        : 0;
    setFastingAverage(fastingAvg.toFixed(1));

    const avg = data.reduce((acc, curr) => acc + curr.glucose, 0) / data.length;
    setAvgGlucose(avg.toFixed(1));
    setHba1c(calculateHbA1c(avg));
  };

  // Handle file upload via the hidden input
  const handleFileUpload = async (event) => {
    console.log("File upload triggered", event);
    const file = event.target.files[0];
    if (!file) return;
    setIsLoading(true);
    setError(null);

    try {
      // Validate authentication
      const { token, userId } = validateToken();

      // Read and process file
      const fileContent = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsText(file);
      });

      // Process data from file content
      const { processedData, maxDate } = processGlucoseData(fileContent);
      if (processedData.length === 0) {
        throw new Error("No valid glucose data found in file");
      }

      // Update state with new data
      setGlucoseData(processedData);
      setLatestDate(maxDate);
      updateDisplayData(processedData, selectedRange, maxDate);
      setFileUploaded(true);
      localStorage.setItem("glucoseFileUploaded", "true");

      // Format data and send to API
      const formattedData = formatDataForAPI(processedData);
      await axios.post(
        "http://localhost:4200/api/glucose/save",
        { userId, glucoseRecords: formattedData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("✅ Glucose data saved successfully!");
    } catch (error) {
      console.error("Error in handleFileUpload:", error);
      setError(error.message || "Failed to upload glucose data");
    } finally {
      setIsLoading(false);
    }
  };

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const reading = payload[0].payload;
      const inRange = isInRange(reading.glucose);
      return (
        <div className="bg-white text-gray-800 p-2 border border-gray-200 rounded shadow-sm">
          <p className="text-xs">{`Time: ${reading.time}`}</p>
          <p className="text-xs">{`Date: ${new Date(
            reading.fullDate
          ).toLocaleDateString()}`}</p>
          <p className="text-xs">
            <span>{`Glucose: ${reading.glucose} mg/dL `}</span>
            <span className={inRange ? "text-green-600" : "text-red-600"}>
              ({inRange ? "In Range" : "Out of Range"})
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handleBack = () => {
    navigate("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen px-4 py-6 space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          onClick={handleBack}
          variant="outline"
          size="icon"
          className="rounded-lg"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold">Blood Sugar</h1>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Card */}
      <Card className="shadow-lg border border-gray-200 rounded-xl">
        <CardContent className="p-6">
          {!fileUploaded ? (
            // No Data Available – prompt to upload a file
            <div className="text-center py-12">
              <Upload className="mx-auto h-16 w-16 text-gray-400 animate-bounce mb-4" />
              <p className="text-xl font-semibold">No Data Found</p>
              <p className="text-sm text-gray-500 mb-6">
                Upload a .txt file to start tracking
              </p>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".txt"
                onChange={handleFileUpload}
                disabled={isLoading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-medium rounded-lg shadow-md transition-all"
              >
                Upload File
              </Button>
            </div>
          ) : (
            // Data Available – show current reading and graph
            <>
              <div className="text-center mb-6">
                <h2 className="text-6xl font-extrabold">
                  {currentGlucose || "--"}
                </h2>
                <p className="text-gray-500 font-medium">mg/dL</p>
                <p className="text-gray-400 text-sm mt-1">
                  {lastMeasurementTime
                    ? `Last measurement: ${lastMeasurementTime}`
                    : "No data available"}
                </p>
              </div>

              {/* Tabs for Time Range */}
              <Tabs
                value={selectedRange}
                onValueChange={(range) => {
                  setSelectedRange(range);
                  updateDisplayData(glucoseData, range, latestDate);
                }}
              >
                <TabsList className="flex justify-center gap-2 bg-gray-100 p-1 rounded-lg">
                  {["Today", "7 days", "Month", "Quarter"].map((range) => (
                    <TabsTrigger
                      key={range}
                      value={range}
                      className="px-4 py-2 text-sm rounded-md transition data-[state=active]:bg-blue-500 data-[state=active]:text-white"
                    >
                      {range}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {["Today", "7 days", "Month", "Quarter"].map((range) => (
                  <TabsContent key={range} value={range}>
                    <div className="w-full h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          data={displayData}
                          margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="time"
                            tick={{ fontSize: 10, fill: "#6B7280" }}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          {/* Threshold Lines */}
                          <ReferenceLine
                            y={TARGET_MAX}
                            stroke="#9CA3AF"
                            strokeDasharray="3 3"
                          />
                          <ReferenceLine
                            y={TARGET_MIN}
                            stroke="#9CA3AF"
                            strokeDasharray="3 3"
                          />
                          <Area
                            dataKey="highArea"
                            stroke="none"
                            fill="#FEE2E2"
                            fillOpacity={0.5}
                          />
                          <Area
                            dataKey="lowArea"
                            stroke="none"
                            fill="#FEE2E2"
                            fillOpacity={0.5}
                          />
                          <Area
                            dataKey="normalArea"
                            stroke="none"
                            fill="#E8F5E9"
                            fillOpacity={0.4}
                          />
                          <Line
                            type="monotone"
                            dataKey="glucose"
                            stroke="#2563EB"
                            strokeWidth={2}
                            dot={false}
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </CardContent>
      </Card>

      {/* Full-Width Upload Button (Bottom, shown after first upload) */}
      {fileUploaded && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-medium rounded-lg shadow-md transition-all"
          >
            Upload New File
          </Button>
        </>
      )}

      {/* Stats Cards – only shown if data is available */}
      {fileUploaded && glucoseData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Time in Range */}
          <Card className="bg-green-50 shadow-md border border-green-200 rounded-xl relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Time in Range
              </CardTitle>
              <Flame className="h-5 w-5 text-green-600 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-green-700">
                {timeInRange}%
              </div>
              <p className="text-xs text-gray-600">
                of readings within target range
              </p>
              <div className="mt-2 w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${timeInRange}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fasting Average */}
          <Card className="bg-blue-50 shadow-md border border-blue-200 rounded-xl relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Fasting Avg</CardTitle>
              <Activity className="h-5 w-5 text-blue-600 animate-bounce" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-blue-700">
                {fastingAverage} <span className="text-lg">mg/dL</span>
              </div>
              <p className="text-xs text-gray-600">Morning glucose levels</p>
              <p className="mt-2 text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full w-fit">
                🔥 7-day streak
              </p>
            </CardContent>
          </Card>

          {/* Average Glucose */}
          <Card className="bg-purple-50 shadow-md border border-purple-200 rounded-xl relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Avg Glucose</CardTitle>
              <LineChart className="h-5 w-5 text-purple-600 animate-wiggle" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extrabold text-purple-700">
                {avgGlucose} <span className="text-lg">mg/dL</span>
              </div>
              <p className="text-xs text-gray-600">Overall average level</p>
              <p
                className={`mt-2 text-xs font-medium px-2 py-1 rounded-full w-fit ${
                  avgGlucose < 6
                    ? "bg-green-200 text-green-700"
                    : "bg-red-200 text-red-700"
                }`}
              >
                {avgGlucose < 6 ? "📉 Trending Down" : "📈 Slight Increase"}
              </p>
            </CardContent>
          </Card>

          {/* Estimated HbA1c */}
          <Card className="bg-red-50 shadow-md border border-red-200 rounded-xl relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">Est. HbA1c</CardTitle>
              <HeartPulse className="h-5 w-5 text-red-600 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-extrabold ${getStatusColor(hba1c)}`}
              >
                {hba1c}%
              </div>
              <p className={`text-xs ${getStatusColor(hba1c)}`}>
                {getStatusText(hba1c)}
              </p>
              <p className="mt-2 text-xs font-medium bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full w-fit">
                🎯 Goal: Stay below 6.5%
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GlucoseMonitor;
