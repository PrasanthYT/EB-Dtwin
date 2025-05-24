import { useState, useEffect } from "react";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { FaHeart, FaRunning } from 'react-icons/fa'; // Import Font Awesome icons
import { GiKidneys } from "react-icons/gi";
import { LuBone } from "react-icons/lu";
import { useNavigate } from "react-router-dom";

const apiKey = "AIzaSyBpu2KDNWOqG_qzzVLqNfzrZ7SH-KYGvFY";
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const dataSets = {
  "1 Day": [{ day: "Mon", target: 85, reached: 80, current: 78 }],
  "1 Week": [
    { day: "Mon", target: 85, reached: 80, current: 78 },
    { day: "Tue", target: 90, reached: 70, current: 85 },
    { day: "Wed", target: 88, reached: 60, current: 82 },
    { day: "Thu", target: 85, reached: 70, current: 80 },
    { day: "Fri", target: 82, reached: 70, current: 75 },
    { day: "Sat", target: 80, reached: 75, current: 72 },
    { day: "Sun", target: 88, reached: 65, current: 82 },
  ],
  "1 Month": [
    { week: "Week 1", target: 85, reached: 75, current: 80 },
    { week: "Week 2", target: 88, reached: 78, current: 83 },
    { week: "Week 3", target: 90, reached: 80, current: 85 },
    { week: "Week 4", target: 87, reached: 77, current: 82 },
  ],
};

export default function HealthBloodPressure() {
  const [selectedRange, setSelectedRange] = useState("1 Week");
  const [error, setError] = useState(null);
  const [diseaseRisks, setDiseaseRisks] = useState([]);
  const navigate = useNavigate();

  const fetchHealthRisksFromAI = async (healthReport) => {
    try {
      const chatSession = model.startChat({
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
        },
        history: [],
      });

      const caseStudyPrompt = `Generate all possible health problems for each body part with a risk level using the below report:

      ${JSON.stringify(healthReport)}

      Please provide the response as a strictly valid JSON array in the following format:

      [
        {
          "name": "Heart Failure",
          "risk": "High Risk",
          "message": "Consult Doctor.",
          "icon": "Heart",
          "color": "text-red-500",
          "bgColor": "bg-red-50",
          "tagColor": "bg-red-500"
        },
        {
          "name": "Kidney Disease",
          "risk": "Medium Risk",
          "message": "Call Doctor.",
          "icon": "Kidney",
          "color": "text-purple-500",
          "bgColor": "bg-purple-50",
          "tagColor": "bg-purple-500"
        }
      ]`;

      const result = await chatSession.sendMessage(caseStudyPrompt);
      const aiData = await result.response.text();
      console.log("AI Response:", aiData);

      try {
        const parsedRisks = JSON.parse(aiData);
        if (!Array.isArray(parsedRisks)) {
          throw new Error("Invalid AI response format");
        }
        const iconMap = {
          // Map your icon strings to the actual components
          Heart: FaHeart,
          Kidney: GiKidneys,
          Activity: FaRunning, // Or choose a more appropriate activity icon
          Bone: LuBone,
        };

        const updatedRisks = parsedRisks.map((risk) => ({
          ...risk,
          icon: iconMap[risk.icon] || FaHeart, // Use the map, default to Heart if not found
        }));

        setDiseaseRisks(updatedRisks);
      } catch (err) {
        console.error("Failed to parse AI response:", err);
        setError("Invalid AI response format.");
      }
    } catch (err) {
      console.error("Error calling AI:", err);
      setError("Failed to generate AI health risks.");
    }
  };

  // This function will fetch the user data (including health report)
  const fetchUserData = async () => {
    try {
      const response = await fetch("http://localhost:4200/api/auth/user", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const data = await response.json();
      const healthReport = data.user.userDetails.healthReport;
      console.log("Health Report:", healthReport);
      await fetchHealthRisksFromAI(healthReport);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const handleBack = () => {
    navigate(-1);
  }

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button onClick={handleBack} variant="ghost" size="icon" className="rounded-xl bg-white">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-semibold">Analytics</h1>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      <Tabs defaultValue="1 Week" onValueChange={setSelectedRange}>
        <TabsList className="flex gap-2 mb-6 overflow-x-auto">
          {Object.keys(dataSets).map((range) => (
            <TabsTrigger key={range} value={range} className="rounded-full">
              {range}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(dataSets).map(([range, data]) => (
          <TabsContent key={range} value={range} className="mb-6">
            <Card className="w-full overflow-x-auto">
              <CardContent className="p-4">
                <div className="h-[300px] w-full overflow-x-auto">
                  <div className="w-[800px]">
                    <BarChart
                      data={data}
                      width={800}
                      height={300}
                      barCategoryGap={15}
                    >
                      <XAxis
                        dataKey={range === "1 Month" ? "week" : "day"}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#4b5563", fontSize: 12 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#4b5563", fontSize: 12 }}
                        domain={[40, 100]}
                      />
                      <Tooltip
                        cursor={{ fill: "#f3f4f6" }}
                        contentStyle={{
                          backgroundColor: "#ffffff",
                          borderRadius: "8px",
                          padding: "8px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        dataKey="target"
                        fill="#2563eb"
                        radius={[6, 6, 0, 0]}
                        name="Target"
                      />
                      <Bar
                        dataKey="reached"
                        fill="#3b82f6"
                        radius={[6, 6, 0, 0]}
                        name="Reached"
                      />
                      <Bar
                        dataKey="current"
                        fill="#93c5fd"
                        radius={[6, 6, 0, 0]}
                        name="Current"
                      />
                    </BarChart>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Disease Risks</h2>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-3">
        {diseaseRisks.length > 0 ? (
          diseaseRisks.map((risk) => (
            <Card key={risk.name} className="border-none shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${risk.bgColor}`}>
                      <risk.icon className={`h-6 w-6 ${risk.color}`} />{" "}
                      {/* Use the component */}
                    </div>
                    <div>
                      <h3 className="font-semibold">{risk.name}</h3>
                      <p className="text-sm text-gray-500">{risk.message}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-white text-sm ${risk.tagColor}`}
                  >
                    {risk.risk.split(" ")[0]}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-gray-500">Loading AI-generated risks...</p>
        )}
      </div>
    </div>
  );
}
