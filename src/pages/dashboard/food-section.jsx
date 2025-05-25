"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Search,
  X,
  Target,
  Camera,
  RotateCcw,
  Zap,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useState } from "react";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const FoodSection = () => {
  const [currentView, setCurrentView] = useState("main"); // main, addFood, camera, scanning, scannedResult
  const [selectedMeal, setSelectedMeal] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [selectedFood, setSelectedFood] = useState(null);
  const [scanningProgress, setScanningProgress] = useState(0);
  const [scannedFood, setScannedFood] = useState(null);

  const [addedMeals, setAddedMeals] = useState({
    morning: [],
    afternoon: [],
    evening: [],
  });

  const totalCalories = Object.values(addedMeals)
    .flat()
    .reduce((total, meal) => total + meal.calories * meal.servingMultiplier, 0);
  const foodScore = Math.min(100, Math.round(totalCalories / 20));

  // Simulated scanned food results
  const scannedFoodResults = [
    {
      id: "scanned_1",
      name: "Samosa",
      description: "Deep-fried pastry with filling",
      calories: 262,
      carbs: 28,
      protein: 6,
      fat: 14,
      fiber: 3,
      sugar: 2,
      category: "Snack",
      healthScore: 6.8,
      confidence: 94,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 125 },
        { time: 60, level: 110 },
        { time: 90, level: 95 },
        { time: 120, level: 88 },
      ],
      serving: "1 piece (100g)",
    },
  ];

  // Default Indian foods with nutritional data
  const indianFoods = [
    {
      id: 1,
      name: "Idli",
      description: "Steamed rice cakes",
      calories: 120,
      carbs: 22,
      protein: 4,
      fat: 1,
      fiber: 2,
      sugar: 1,
      category: "Traditional",
      healthScore: 9.2,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 110 },
        { time: 60, level: 95 },
        { time: 90, level: 88 },
        { time: 120, level: 85 },
      ],
      serving: "2 pieces (100g)",
    },
    {
      id: 2,
      name: "Roti",
      description: "Whole wheat flatbread",
      calories: 80,
      carbs: 15,
      protein: 3,
      fat: 1,
      fiber: 2,
      sugar: 0,
      category: "Staple",
      healthScore: 8.8,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 105 },
        { time: 60, level: 92 },
        { time: 90, level: 87 },
        { time: 120, level: 85 },
      ],
      serving: "1 piece (30g)",
    },
    {
      id: 3,
      name: "Dal Rice",
      description: "Lentils with steamed rice",
      calories: 250,
      carbs: 45,
      protein: 12,
      fat: 3,
      fiber: 4,
      sugar: 2,
      category: "Complete Meal",
      healthScore: 9.5,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 115 },
        { time: 60, level: 100 },
        { time: 90, level: 90 },
        { time: 120, level: 85 },
      ],
      serving: "1 bowl (200g)",
    },
    {
      id: 4,
      name: "Dosa",
      description: "Crispy fermented crepe",
      calories: 150,
      carbs: 28,
      protein: 4,
      fat: 2,
      fiber: 1,
      sugar: 1,
      category: "Traditional",
      healthScore: 8.5,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 112 },
        { time: 60, level: 98 },
        { time: 90, level: 89 },
        { time: 120, level: 85 },
      ],
      serving: "1 piece (120g)",
    },
    {
      id: 5,
      name: "Rajma Chawal",
      description: "Kidney beans with rice",
      calories: 320,
      carbs: 55,
      protein: 15,
      fat: 5,
      fiber: 8,
      sugar: 3,
      category: "Complete Meal",
      healthScore: 9.0,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 108 },
        { time: 60, level: 95 },
        { time: 90, level: 88 },
        { time: 120, level: 85 },
      ],
      serving: "1 plate (250g)",
    },
    {
      id: 6,
      name: "Poha",
      description: "Flattened rice with vegetables",
      calories: 180,
      carbs: 35,
      protein: 4,
      fat: 3,
      fiber: 2,
      sugar: 2,
      category: "Light Meal",
      healthScore: 8.2,
      sugarSpike: [
        { time: 0, level: 85 },
        { time: 30, level: 118 },
        { time: 60, level: 102 },
        { time: 90, level: 92 },
        { time: 120, level: 85 },
      ],
      serving: "1 bowl (150g)",
    },
  ];

  const filteredFoods = indianFoods.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFoodMeal = (meal) => {
    setSelectedMeal(meal);
    setCurrentView("addFood");
  };

  const handleSelectFood = (food) => {
    setSelectedFood(food);
  };

  const handleServingChange = (multiplier) => {
    setServingMultiplier(multiplier);
  };

  const handleCameraClick = () => {
    setCurrentView("camera");
  };

  const handleStartScanning = () => {
    setCurrentView("scanning");
    setScanningProgress(0);

    // Simulate ML processing
    const interval = setInterval(() => {
      setScanningProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setScannedFood(scannedFoodResults[0]);
          setCurrentView("scannedResult");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const getMacroData = (food) => {
    if (!food) return [];
    const adjustedCarbs = food.carbs * servingMultiplier;
    const adjustedProtein = food.protein * servingMultiplier;
    const adjustedFat = food.fat * servingMultiplier;

    return [
      { name: "Carbs", value: adjustedCarbs, color: "#6366f1" },
      { name: "Protein", value: adjustedProtein, color: "#10b981" },
      { name: "Fat", value: adjustedFat, color: "#f59e0b" },
    ];
  };

  const getMealIcon = (mealTime) => {
    switch (mealTime.toLowerCase()) {
      case "morning":
        return "🌅";
      case "afternoon":
        return "☀️";
      case "evening":
        return "🌙";
      default:
        return "🍽️";
    }
  };

  const renderMainView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden rounded-b-3xl">
        {/* Geometric Pattern Background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 300">
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Header Content */}
        <div className="relative px-6 pb-8 pt-6">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              className="p-3 border border-white/20 rounded-2xl hover:bg-white/10 backdrop-blur-sm"
              onClick={() => window.history.back()}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Food Intelligence</h1>
          </div>

          {/* Food Score */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="text-7xl font-bold mb-2 bg-gradient-to-br from-white to-gray-200 bg-clip-text text-transparent">
                {foodScore}
              </div>
            </div>
            <div className="text-lg mb-4 text-gray-200">Your Food Score</div>
            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 px-4 py-1">
              Healthy
            </Badge>
          </div>
        </div>
      </div>

      {/* Food Timeline */}
      <div className="px-6 pt-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Food Timeline
            </h2>
            <p className="text-gray-500 text-sm">Track your daily nutrition</p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center">
              <Flame className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900">{totalCalories}</div>
              <div className="text-xs text-gray-500">cal today</div>
            </div>
          </div>
        </div>

        {/* Meal Sections */}
        {["Morning", "Afternoon", "Evening"].map((mealTime, index) => (
          <div key={mealTime} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center">
                <span className="text-xl">{getMealIcon(mealTime)}</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {mealTime}
                </h3>
                <p className="text-sm text-gray-500">
                  {addedMeals[mealTime.toLowerCase()].length} item
                  {addedMeals[mealTime.toLowerCase()].length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {addedMeals[mealTime.toLowerCase()].length > 0 ? (
              <div className="space-y-3">
                {addedMeals[mealTime.toLowerCase()].map((meal, mealIndex) => (
                  <div key={meal.id} className="group">
                    <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-300 bg-white/80 backdrop-blur-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Compact Food Icon */}
                          <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                              <span className="text-lg">🍽️</span>
                            </div>
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-white">
                                {meal.servingMultiplier}x
                              </span>
                            </div>
                          </div>

                          {/* Compact Food Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-gray-900 text-sm truncate pr-2">
                                {meal.name}
                              </h4>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 flex-shrink-0"
                              >
                                {meal.healthScore}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                              {meal.description}
                            </p>

                            {/* Nutrition Info in Grid */}
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-orange-400 rounded-full flex-shrink-0"></div>
                                <span className="font-medium text-gray-700">
                                  {Math.round(
                                    meal.calories * meal.servingMultiplier
                                  )}{" "}
                                  cal
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full flex-shrink-0"></div>
                                <span className="font-medium text-gray-700">
                                  {Math.round(
                                    meal.protein * meal.servingMultiplier
                                  )}
                                  g protein
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                                <span className="text-gray-600">
                                  {Math.round(
                                    meal.carbs * meal.servingMultiplier
                                  )}
                                  g carbs
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full flex-shrink-0"></div>
                                <span className="text-gray-600">
                                  {Math.round(
                                    meal.fat * meal.servingMultiplier
                                  )}
                                  g fat
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Compact Action Button */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1.5 rounded-lg"
                            >
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}

                {/* Compact Add More Button */}
                <Card className="border-2 border-dashed border-gray-200 hover:border-gray-300 transition-colors cursor-pointer bg-gray-50/50">
                  <CardContent className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full h-full text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 py-2"
                      onClick={() => handleAddFoodMeal(mealTime.toLowerCase())}
                    >
                      <Plus className="w-4 h-4" />
                      <span className="font-medium text-sm">
                        Add another meal
                      </span>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-white to-gray-50">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl opacity-60">🍽️</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    No meals logged for {mealTime}
                  </h4>
                  <p className="text-gray-500 text-sm mb-6">
                    Add your first meal to start tracking
                  </p>

                  <div className="flex gap-3 justify-center">
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => handleAddFoodMeal(mealTime.toLowerCase())}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add a meal
                    </Button>
                    <Button
                      variant="outline"
                      className="px-6 py-3 rounded-2xl border-gray-200 hover:bg-gray-50"
                      onClick={handleCameraClick}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Scan food
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const handleAddFood = (food) => {
    const mealToAdd = {
      ...food,
      servingMultiplier: servingMultiplier,
      id: Date.now(),
    };

    setAddedMeals((prev) => ({
      ...prev,
      [selectedMeal]: [...prev[selectedMeal], mealToAdd],
    }));

    setSelectedFood(null);
    setServingMultiplier(1);
    setCurrentView("main");
  };

  const renderAddFoodView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="relative px-6 pb-6 pt-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="p-3 border border-white/20 rounded-2xl hover:bg-white/10 backdrop-blur-sm"
              onClick={() => setCurrentView("main")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Food Intelligence</h1>
          </div>
        </div>
      </div>

      {/* Add Food Modal */}
      <div className="bg-white rounded-t-3xl mt-4 min-h-[85vh] shadow-2xl">
        <div className="p-6">
          {/* Modal Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Add to {selectedMeal}
              </h2>
              <p className="text-gray-500 text-sm">
                Choose from our curated food database
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 rounded-xl hover:bg-gray-100"
              onClick={() => setCurrentView("main")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Search className="w-5 h-5" />
            </div>
            <Input
              placeholder="Search for food..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 py-4 rounded-2xl border-gray-200 bg-gray-50 focus:bg-white transition-colors text-lg"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <Button
              variant="outline"
              className="flex-1 py-3 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
              onClick={handleCameraClick}
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan Food
            </Button>
          </div>

          {/* Popular Foods Header */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Popular Foods
            </h3>
            <p className="text-gray-500 text-sm">Handpicked Indian cuisine</p>
          </div>

          {/* Compact Food List */}
          <div className="space-y-3">
            {filteredFoods.length > 0 ? (
              filteredFoods.map((food) => (
                <Card
                  key={food.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-300 border-0 shadow-sm bg-white hover:-translate-y-0.5"
                  onClick={() => handleSelectFood(food)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Compact Food Icon */}
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center">
                          <span className="text-xl">🍽️</span>
                        </div>
                        <Badge className="absolute -top-1 -right-1 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs px-1.5 py-0.5">
                          {food.healthScore}
                        </Badge>
                      </div>

                      {/* Compact Food Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {food.name}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5"
                          >
                            {food.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {food.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-medium text-orange-600">
                            {food.calories} cal
                          </span>
                          <span className="font-medium text-blue-600">
                            {food.protein}g protein
                          </span>
                          <span className="text-gray-500">{food.serving}</span>
                        </div>
                      </div>

                      {/* Compact Action Button */}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-colors">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No foods found
                </h3>
                <p className="text-gray-500">
                  Try searching with different keywords
                </p>
              </div>
            )}
          </div>

          {/* Food Details Modal */}
          {selectedFood && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50">
              <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-8">
                  {/* Food Header */}
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center">
                        <span className="text-3xl">🍽️</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {selectedFood.name}
                        </h3>
                        <p className="text-gray-600 mb-2">
                          {selectedFood.description}
                        </p>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                          Health Score: {selectedFood.healthScore}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-2 rounded-xl hover:bg-gray-100"
                      onClick={() => setSelectedFood(null)}
                    >
                      <X className="w-6 h-6" />
                    </Button>
                  </div>

                  {/* Serving Size Adjuster */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          Serving Size
                        </h4>
                        <p className="text-gray-500 text-sm">
                          {selectedFood.serving}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-10 h-10 rounded-xl bg-white shadow-sm hover:bg-gray-100"
                          onClick={() =>
                            handleServingChange(
                              Math.max(0.5, servingMultiplier - 0.5)
                            )
                          }
                        >
                          -
                        </Button>
                        <span className="w-16 text-center font-bold text-lg">
                          {servingMultiplier}x
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-10 h-10 rounded-xl bg-white shadow-sm hover:bg-gray-100"
                          onClick={() =>
                            handleServingChange(servingMultiplier + 0.5)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nutrition Info */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                          {Math.round(
                            selectedFood.calories * servingMultiplier
                          )}
                        </div>
                        <div className="text-sm font-medium text-orange-700">
                          Calories
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          {Math.round(selectedFood.protein * servingMultiplier)}
                          g
                        </div>
                        <div className="text-sm font-medium text-blue-700">
                          Protein
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Macro Breakdown */}
                  <div className="mb-8">
                    <h4 className="font-bold text-gray-900 mb-4">
                      Macro Breakdown
                    </h4>
                    <Card className="border-0 bg-gray-50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-6">
                          <div className="w-32 h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={getMacroData(selectedFood)}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={35}
                                  outerRadius={55}
                                  dataKey="value"
                                >
                                  {getMacroData(selectedFood).map(
                                    (entry, index) => (
                                      <Cell
                                        key={`cell-${index}`}
                                        fill={entry.color}
                                      />
                                    )
                                  )}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-3">
                            {getMacroData(selectedFood).map((macro) => (
                              <div
                                key={macro.name}
                                className="flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: macro.color }}
                                  ></div>
                                  <span className="font-medium text-gray-700">
                                    {macro.name}
                                  </span>
                                </div>
                                <span className="font-bold text-gray-900">
                                  {macro.value}g
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Sugar Spike Graph */}
                  <div className="mb-8">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Blood Sugar Impact
                    </h4>
                    <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
                      <CardContent className="p-6">
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={selectedFood.sugarSpike}>
                              <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                              />
                              <YAxis
                                domain={[80, 120]}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: "#6b7280" }}
                              />
                              <Line
                                type="monotone"
                                dataKey="level"
                                stroke="#6366f1"
                                strokeWidth={3}
                                dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, fill: "#4f46e5" }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-gray-600 mt-3 flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          Blood glucose levels (mg/dL) over 2 hours
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Additional Nutrients */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card className="border-0 bg-gray-50">
                      <CardContent className="p-4 text-center">
                        <div className="font-bold text-xl text-gray-900 mb-1">
                          {Math.round(selectedFood.carbs * servingMultiplier)}g
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          Carbs
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gray-50">
                      <CardContent className="p-4 text-center">
                        <div className="font-bold text-xl text-gray-900 mb-1">
                          {Math.round(selectedFood.fat * servingMultiplier)}g
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          Fat
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-0 bg-gray-50">
                      <CardContent className="p-4 text-center">
                        <div className="font-bold text-xl text-gray-900 mb-1">
                          {Math.round(selectedFood.fiber * servingMultiplier)}g
                        </div>
                        <div className="text-xs text-gray-600 font-medium">
                          Fiber
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Add Button */}
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() => handleAddFood(selectedFood)}
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Add to {selectedMeal}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderCameraView = () => (
    <div className="min-h-screen bg-black relative">
      {/* Camera Interface */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40">
        {/* Header */}
        <div className="flex items-center justify-between p-6 text-white">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-xl bg-black/30 backdrop-blur-sm border border-white/20"
            onClick={() => setCurrentView("main")}
          >
            <X className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Scan Food</h1>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-xl bg-black/30 backdrop-blur-sm"
          >
            <RotateCcw className="w-5 h-5" />
          </Button>
        </div>

        {/* Camera Viewfinder */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="relative w-80 h-80 border-2 border-white/50 rounded-3xl">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
            <div className="absolute top-4 right-4 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
            <div className="absolute bottom-4 left-4 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
            <div className="absolute bottom-4 right-4 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>

            {/* Center crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/70 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center text-white px-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">
            Position your food in the frame
          </h2>
          <p className="text-white/80 text-sm">
            Make sure the food is well-lit and clearly visible
          </p>
        </div>

        {/* Camera Controls */}
        <div className="flex items-center justify-center pb-12">
          <Button
            className="w-20 h-20 rounded-full bg-white hover:bg-gray-100 shadow-lg"
            onClick={handleStartScanning}
          >
            <Camera className="w-8 h-8 text-gray-900" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderScanningView = () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center text-white px-6">
        {/* AI Processing Animation */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>
          <div
            className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: "1s" }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto mb-4">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${scanningProgress}%` }}
            ></div>
          </div>
          <p className="text-lg font-semibold mb-2">Analyzing food...</p>
          <p className="text-white/70 text-sm">
            AI is identifying nutritional content
          </p>
        </div>

        {/* Processing Steps */}
        <div className="space-y-2 text-sm text-white/60">
          <div
            className={`flex items-center justify-center gap-2 ${
              scanningProgress > 20 ? "text-green-400" : ""
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                scanningProgress > 20 ? "bg-green-400" : "bg-gray-600"
              }`}
            ></div>
            <span>Detecting food items</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 ${
              scanningProgress > 50 ? "text-green-400" : ""
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                scanningProgress > 50 ? "bg-green-400" : "bg-gray-600"
              }`}
            ></div>
            <span>Calculating nutrition</span>
          </div>
          <div
            className={`flex items-center justify-center gap-2 ${
              scanningProgress > 80 ? "text-green-400" : ""
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                scanningProgress > 80 ? "bg-green-400" : "bg-gray-600"
              }`}
            ></div>
            <span>Generating health insights</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScannedResultView = () => (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="relative px-6 pb-6 pt-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="p-3 border border-white/20 rounded-2xl hover:bg-white/10 backdrop-blur-sm"
              onClick={() => setCurrentView("main")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold">Scanned Food</h1>
          </div>
        </div>
      </div>

      {/* Scanned Result */}
      <div className="p-6">
        {scannedFood && (
          <div>
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🎯</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Food Detected!
              </h2>
              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2">
                {scannedFood.confidence}% Confidence
              </Badge>
            </div>

            {/* Food Details Card */}
            <Card className="border-0 shadow-lg bg-white mb-6">
              <CardContent className="p-8">
                <div className="flex items-center gap-6 mb-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center">
                    <span className="text-4xl">🥟</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {scannedFood.name}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {scannedFood.description}
                    </p>
                    <div className="flex items-center gap-4">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                        Health Score: {scannedFood.healthScore}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-700"
                      >
                        {scannedFood.category}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Nutrition Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      {scannedFood.calories}
                    </div>
                    <div className="text-sm font-medium text-orange-700">
                      Calories
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {scannedFood.protein}g
                    </div>
                    <div className="text-sm font-medium text-blue-700">
                      Protein
                    </div>
                  </div>
                </div>

                {/* Additional Nutrients */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <div className="font-bold text-gray-900">
                      {scannedFood.carbs}g
                    </div>
                    <div className="text-xs text-gray-600">Carbs</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <div className="font-bold text-gray-900">
                      {scannedFood.fat}g
                    </div>
                    <div className="text-xs text-gray-600">Fat</div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl text-center">
                    <div className="font-bold text-gray-900">
                      {scannedFood.fiber}g
                    </div>
                    <div className="text-xs text-gray-600">Fiber</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-2xl font-semibold"
                    onClick={() => {
                      handleAddFood(scannedFood);
                      setScannedFood(null);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Meal
                  </Button>
                  <Button
                    variant="outline"
                    className="px-6 py-3 rounded-2xl"
                    onClick={() => setCurrentView("camera")}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );

  // Render based on current view
  switch (currentView) {
    case "camera":
      return renderCameraView();
    case "scanning":
      return renderScanningView();
    case "scannedResult":
      return renderScannedResultView();
    case "addFood":
      return renderAddFoodView();
    default:
      return renderMainView();
  }
};

export default FoodSection;
