"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Utensils,
  Activity,
  Zap,
  Target,
  Calendar,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

const AISuggestionsPage = () => {
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [activeTab, setActiveTab] = useState("food");

  // Updated meal data following the actual AI response structure
  const mealData = {
    breakfast: {
      name: "Berry Almond Oatmeal",
      calories: 380,
      nutrients: {
        carbs: 55,
        protein: 10,
        fat: 12,
      },
      instructions:
        "Cook rolled oats with water or milk. Top with mixed berries and sliced almonds.",
      score: 9,
      benefit: "Rich in fiber, helping support healthy digestion.",
      image:
        "https://realfood.tesco.com/media/images/RFO-1400x919-BerryOatmealCrunch-be799601-93e0-44d4-9fb5-1f8bc533b93a-0-1400x919.jpg",
    },
    lunch: {
      name: "Grilled Chicken Salad",
      calories: 520,
      nutrients: {
        carbs: 30,
        protein: 45,
        fat: 25,
      },
      instructions:
        "Combine mixed greens, grilled chicken breast slices, cucumber, tomatoes, and bell peppers. Dress with a light olive oil vinaigrette.",
      score: 9.1,
      image:
        "https://www.dinneratthezoo.com/wp-content/uploads/2020/12/grilled-chicken-salad-4.jpg",
    },
    dinner: {
      name: "Baked Salmon with Quinoa",
      calories: 480,
      nutrients: {
        carbs: 35,
        protein: 40,
        fat: 18,
      },
      instructions:
        "Bake seasoned salmon fillet. Serve with cooked quinoa and steamed vegetables.",
      score: 9.3,
      benefit: "High in omega-3 fatty acids for heart health.",
      image:
        "https://www.eatingwell.com/thmb/RT-ah2NSs9DNZMAtrdWeju7JmfQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/7493350-be9d56bbbaf6461aa9f503b8e94462de.jpg",
    },
  };

  const activityData = [
    {
      id: "yoga",
      name: "Yoga Session",
      type: "Flexibility",
      duration: "60 minutes",
      calories: 180,
      difficulty: "Medium",
      equipment: "Yoga mat",
      instructions:
        "Follow a guided yoga session focusing on stretching and relaxation.",
      benefits:
        "Improves flexibility, reduces stress, and enhances mental clarity.",
      icon: "🧘‍♀️",
    },
    {
      id: "brisk_walk",
      name: "Brisk Walking",
      type: "Cardio",
      duration: "30 minutes",
      calories: 150,
      difficulty: "Low",
      equipment: "Comfortable shoes",
      instructions:
        "Maintain a brisk pace while walking in a park or neighborhood.",
      benefits: "Boosts cardiovascular health and burns calories.",
      icon: "🚶‍♂️",
    },
    {
      id: "strength_training",
      name: "Strength Training",
      type: "Strength",
      duration: "45 minutes",
      calories: 250,
      difficulty: "High",
      equipment: "Dumbbells, resistance bands",
      instructions: "Perform exercises like squats, lunges, and bicep curls.",
      benefits: "Builds muscle strength and increases metabolism.",
      icon: "💪",
    },
    {
      id: "swimming",
      name: "Swimming",
      type: "Cardio",
      duration: "40 minutes",
      calories: 300,
      difficulty: "Medium",
      equipment: "Swimming pool",
      instructions:
        "Swim laps using different strokes for a full-body workout.",
      benefits: "Low-impact exercise that works all muscle groups.",
      icon: "🏊‍♂️",
    },
  ];

  const MacroChart = ({ nutrients }) => {
    const data = [
      { name: "Carbs", value: nutrients.carbs, color: "#3B82F6" },
      { name: "Protein", value: nutrients.protein, color: "#10B981" },
      { name: "Fat", value: nutrients.fat, color: "#F59E0B" },
    ];

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={15}
            outerRadius={35}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const MealCard = ({ meal, mealId, mealType }) => {
    const isExpanded = expandedMeal === mealId;

    return (
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 mb-3">
        <CardContent className="p-0">
          <div className="flex items-center p-3">
            {/* Small food image on the left */}
            <div className="relative flex-shrink-0 mr-3">
              <img
                src={meal.image || "/placeholder.svg"}
                alt={meal.name}
                className="w-12 h-12 rounded-lg object-cover"
              />
              <Badge className="absolute -top-1 -right-1 text-xs px-1 py-0 bg-green-500 text-white">
                {meal.score}
              </Badge>
            </div>

            {/* Meal info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-base truncate">
                    {meal.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600">
                      <span className="font-medium text-orange-600">
                        {meal.calories}
                      </span>{" "}
                      kcal
                    </span>
                    <span className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600">
                        {meal.nutrients.protein}g
                      </span>{" "}
                      protein
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : mealId)}
                  className="ml-2 p-1 text-blue-600 hover:text-blue-700 transition-colors flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              </div>

              {/* Benefits - show only if exists */}
              {meal.benefit && (
                <div className="bg-green-50 border border-green-200 rounded-md p-2 mt-2">
                  <p className="text-xs text-green-700">{meal.benefit}</p>
                </div>
              )}
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">
                  Instructions
                </h4>
                <p className="text-sm text-gray-600">{meal.instructions}</p>
              </div>

              {meal.nutrients && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-sm">
                    Macro Breakdown
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20">
                      <MacroChart nutrients={meal.nutrients} />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <span>
                          <span className="font-medium">
                            {meal.nutrients.carbs}g
                          </span>{" "}
                          Carbs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span>
                          <span className="font-medium">
                            {meal.nutrients.protein}g
                          </span>{" "}
                          Protein
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                        <span>
                          <span className="font-medium">
                            {meal.nutrients.fat}g
                          </span>{" "}
                          Fat
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ActivityCard = ({ activity }) => {
    const isExpanded = expandedActivity === activity.id;

    return (
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 mb-3">
        <CardContent className="p-0">
          <div className="flex items-center p-3">
            {/* Activity icon on the left */}
            <div className="relative flex-shrink-0 mr-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center text-xl">
                {activity.icon}
              </div>
              <Badge
                className={`absolute -top-1 -right-1 text-xs px-1 py-0 ${
                  activity.difficulty === "High"
                    ? "bg-red-500"
                    : activity.difficulty === "Medium"
                    ? "bg-yellow-500"
                    : "bg-green-500"
                } text-white`}
              >
                {activity.difficulty.charAt(0)}
              </Badge>
            </div>

            {/* Activity info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-base truncate">
                    {activity.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock size={12} />
                      {activity.duration}
                    </span>
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Zap size={12} />
                      <span className="font-medium text-purple-600">
                        {activity.calories}
                      </span>{" "}
                      kcal
                    </span>
                  </div>
                  <Badge className="mt-1 text-xs" variant="outline">
                    {activity.type}
                  </Badge>
                </div>

                <button
                  onClick={() =>
                    setExpandedActivity(isExpanded ? null : activity.id)
                  }
                  className="ml-2 p-1 text-purple-600 hover:text-purple-700 transition-colors flex-shrink-0"
                >
                  {isExpanded ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
              </div>

              {/* Benefits - show only if exists */}
              {activity.benefits && (
                <div className="bg-purple-50 border border-purple-200 rounded-md p-2 mt-2">
                  <p className="text-xs text-purple-700">{activity.benefits}</p>
                </div>
              )}
            </div>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">
                  Instructions
                </h4>
                <p className="text-sm text-gray-600">{activity.instructions}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-sm">
                  Equipment
                </h4>
                <p className="text-sm text-gray-600">{activity.equipment}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-4 pb-8 text-white rounded-b-3xl shadow-lg">
        <div className="flex items-center mb-6">
          <Link to="/dashboard">
            <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
          </Link>
          <div className="ml-2">
            <p className="text-blue-100 text-sm font-medium tracking-wider uppercase">
              AI Powered
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Daily Suggestions
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Today's Plan</span>
          </span>
          <span className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <Target className="w-4 h-4" />
            <span className="text-sm font-medium">Personalized</span>
          </span>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="p-4 md:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="food" className="flex items-center gap-2">
              <Utensils size={16} />
              Food Suggestions
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity size={16} />
              Activity Suggestions
            </TabsTrigger>
          </TabsList>

          {/* Food Tab Content */}
          <TabsContent value="food" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Meal Suggestions
              </h2>
              <Badge className="bg-blue-100 text-blue-700">AI Curated</Badge>
            </div>

            {/* Breakfast */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🌅</span>
                Morning (Breakfast)
              </h3>
              <MealCard
                meal={mealData.breakfast}
                mealId="breakfast"
                mealType="breakfast"
              />
            </div>

            {/* Lunch */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">☀️</span>
                Afternoon (Lunch)
              </h3>
              <MealCard meal={mealData.lunch} mealId="lunch" mealType="lunch" />
            </div>

            {/* Dinner */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🌙</span>
                Evening (Dinner)
              </h3>
              <MealCard
                meal={mealData.dinner}
                mealId="dinner"
                mealType="dinner"
              />
            </div>
          </TabsContent>

          {/* Activity Tab Content */}
          <TabsContent value="activity" className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-purple-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Activity Suggestions
              </h2>
              <Badge className="bg-purple-100 text-purple-700">
                Personalized
              </Badge>
            </div>

            <div className="space-y-3">
              {activityData.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AISuggestionsPage;
