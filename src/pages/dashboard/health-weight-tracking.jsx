import { useState } from "react";
import { ArrowLeft, MoreHorizontal, Scale, Flag } from "lucide-react";
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const currentWeight = 75.22;
const bmi = 3.2;
const startWeight = 78.54;
const targetWeight = 68.54;

const dataSets = {
  "1 Day": [
    { day: 1, weight: 75 },
  ],
  "1 Week": [
    { day: 1, weight: 75 },
    { day: 2, weight: 74 },
    { day: 3, weight: 73 },
    { day: 4, weight: 72 },
    { day: 5, weight: 71 },
    { day: 6, weight: 70 },
    { day: 7, weight: 69 },
  ],
  "1 Month": [...Array(4)].map((_, i) => ({ week: `Week ${i + 1}`, weight: 75 - i * 2 })),
};

export default function HealthWeightTracking() {
  const [selectedRange, setSelectedRange] = useState("1 Week");

  return (
    <div className="max-w-md mx-auto min-h-screen">
      <div className="bg-blue-600 p-4 text-white rounded-b-3xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-white rounded-xl border-gray-200">
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-xl font-semibold">Weight</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-200" />
            <span className="text-sm text-blue-200">Current Weight</span>
          </div>
          <span className="px-2 py-1 bg-blue-500 rounded-md text-xs">BMI: {bmi}</span>
        </div>

        <div className="mb-4">
          <span className="text-5xl font-bold">{currentWeight}</span>
          <span className="text-2xl ml-1">kg</span>
        </div>
      </div>

      <div className="p-4">
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
              <Card className="border-none shadow-sm w-full overflow-x-auto">
                <CardContent className="p-4">
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <XAxis dataKey={range === "1 Month" ? "week" : "day"} axisLine={false} tickLine={false} tick={{ fill: "#94a3b8" }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8" }} domain={[60, 80]} />
                        <Tooltip cursor={{ fill: "#f3f4f6" }} contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "8px" }} />
                        <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Goals</h2>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-6 w-6" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-purple-50">
                  <Scale className="h-6 w-6 text-purple-500" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold">{startWeight}</span>
                <span className="text-lg ml-1">kg</span>
                <p className="text-sm text-gray-500">Start Weight</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl bg-red-50">
                  <Flag className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <div>
                <span className="text-2xl font-bold">{targetWeight}</span>
                <span className="text-lg ml-1">kg</span>
                <p className="text-sm text-gray-500">Target Weight</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}