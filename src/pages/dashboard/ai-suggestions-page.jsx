"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Plus,
  Utensils,
  Activity,
  Brain,
  Heart,
  Calendar,
  Clock,
  Zap,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"

const AISuggestionsPage = () => {
  const [selectedFilter, setSelectedFilter] = useState("Highest")
  const [currentView, setCurrentView] = useState("categories") // categories, nutrition, activities
  const [expandedMeal, setExpandedMeal] = useState(null)
  const [expandedActivity, setExpandedActivity] = useState(null)

  // Meal data following the provided JSON structure
  const mealData = {
    breakfast: {
      name: "Berry Almond Oatmeal",
      calories: 380,
      nutrients: {
        carbs: 55,
        protein: 10,
        fat: 12,
      },
      instructions: "Cook rolled oats with water or milk. Top with mixed berries and sliced almonds.",
      score: 9,
      benefit: "Rich in fiber, helping support healthy digestion.",
      image: "/placeholder.svg?height=60&width=60&query=berry almond oatmeal",
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
      image: "/placeholder.svg?height=60&width=60&query=grilled chicken salad",
    },
    dinner: {
      name: "Baked Salmon with Roasted Broccoli and Quinoa",
      calories: 600,
      nutrients: {
        carbs: 50,
        protein: 40,
        fat: 25,
      },
      instructions:
        "Bake a salmon fillet. Roast broccoli florets until tender. Cook quinoa according to package instructions and serve alongside.",
      score: 9.4,
      image: "/placeholder.svg?height=60&width=60&query=baked salmon with quinoa and broccoli",
    },
    snacks: {
      name: "Greek Yogurt with Honey & Walnuts",
      calories: 220,
      nutrients: {
        carbs: 20,
        protein: 20,
        fat: 8,
      },
      instructions: "Top a cup of plain Greek yogurt with a drizzle of honey and chopped walnuts.",
      score: 8.8,
      image: "/placeholder.svg?height=60&width=60&query=greek yogurt with honey and walnuts",
    },
  }

  const activityData = [
    {
      id: "yoga",
      name: "Morning Yoga Flow",
      type: "Flexibility",
      duration: "30 min",
      calories: 120,
      difficulty: "Medium",
      equipment: "Yoga mat",
      instructions: "Follow a gentle morning yoga sequence focusing on stretching and mindful movement.",
      benefits: "Improves flexibility, reduces stress, and enhances mental clarity.",
      icon: "🧘‍♀️",
    },
    {
      id: "cardio",
      name: "Brisk Walking",
      type: "Cardio",
      duration: "25 min",
      calories: 150,
      difficulty: "Low",
      equipment: "Comfortable shoes",
      instructions: "Maintain a steady, brisk pace while walking outdoors or on a treadmill.",
      benefits: "Boosts cardiovascular health and burns calories effectively.",
      icon: "🚶‍♂️",
    },
    {
      id: "strength",
      name: "Bodyweight Training",
      type: "Strength",
      duration: "20 min",
      calories: 180,
      difficulty: "High",
      equipment: "None required",
      instructions: "Perform exercises like push-ups, squats, and planks using your body weight.",
      benefits: "Builds muscle strength and increases metabolism.",
      icon: "💪",
    },
  ]

  const suggestionCategories = [
    {
      id: "nutrition",
      title: "Nutrition Guidance",
      subtitle: "Meal Plans, Recipes",
      duration: "Daily",
      icons: [
        { icon: Utensils, bgColor: "bg-blue-500" },
        { icon: Calendar, bgColor: "bg-blue-600" },
      ],
      action: () => setCurrentView("nutrition"),
    },
    {
      id: "physical",
      title: "Physical Activities",
      subtitle: "Workouts, Exercise",
      duration: "25-30min",
      icons: [
        { icon: Activity, bgColor: "bg-purple-500" },
        { icon: Heart, bgColor: "bg-purple-600" },
      ],
      action: () => setCurrentView("activities"),
    },
    {
      id: "mindful",
      title: "Mindful Breathing",
      subtitle: "Breathing, Relax",
      duration: "25-30min",
      icons: [
        { icon: Brain, bgColor: "bg-teal-500" },
        { icon: Activity, bgColor: "bg-teal-600" },
      ],
      action: () => {},
    },
    {
      id: "wellness",
      title: "Wellness Resources",
      subtitle: "Tips, Articles",
      duration: "Reading",
      icons: [
        { icon: Heart, bgColor: "bg-orange-500" },
        { icon: Calendar, bgColor: "bg-orange-600" },
      ],
      action: () => {},
    },
  ]

  const MacroChart = ({ nutrients }) => {
    const data = [
      { name: "Carbs", value: nutrients.carbs, color: "#6B7280" },
      { name: "Protein", value: nutrients.protein, color: "#374151" },
      { name: "Fat", value: nutrients.fat, color: "#9CA3AF" },
    ]

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={12} outerRadius={25} paddingAngle={2} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    )
  }

  const MealCard = ({ meal, mealId, mealType, timeIcon, timeLabel }) => {
    const isExpanded = expandedMeal === mealId

    return (
      <Card className="bg-white border border-gray-100 hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Food image */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50">
                <img src={meal.image || "/placeholder.svg"} alt={meal.name} className="w-full h-full object-cover" />
              </div>
              <div className="absolute -top-1 -right-1 bg-gray-800 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                {meal.score}
              </div>
            </div>

            {/* Meal content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{timeIcon}</span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{timeLabel}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{meal.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>
                      <span className="font-medium text-gray-800">{meal.calories}</span> kcal
                    </span>
                    <span>
                      <span className="font-medium text-gray-800">{meal.nutrients.protein}g</span> protein
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : mealId)}
                  className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Benefits */}
              {meal.benefit && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                  <p className="text-xs text-gray-700">{meal.benefit}</p>
                </div>
              )}

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Instructions</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{meal.instructions}</p>
                  </div>

                  {meal.nutrients && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Nutrition</h4>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16">
                          <MacroChart nutrients={meal.nutrients} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                            <span>
                              <span className="font-medium">{meal.nutrients.carbs}g</span> Carbs
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-gray-700"></div>
                            <span>
                              <span className="font-medium">{meal.nutrients.protein}g</span> Protein
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <span>
                              <span className="font-medium">{meal.nutrients.fat}g</span> Fat
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const ActivityCard = ({ activity }) => {
    const isExpanded = expandedActivity === activity.id

    return (
      <Card className="bg-white border border-gray-100 hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Activity icon */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-xl">
                {activity.icon}
              </div>
              <Badge
                className={`absolute -top-1 -right-1 text-xs px-1.5 py-0.5 ${
                  activity.difficulty === "High"
                    ? "bg-gray-800 text-white"
                    : activity.difficulty === "Medium"
                      ? "bg-gray-600 text-white"
                      : "bg-gray-400 text-white"
                }`}
              >
                {activity.difficulty.charAt(0)}
              </Badge>
            </div>

            {/* Activity content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5" variant="secondary">
                      {activity.type}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">{activity.name}</h3>

                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="font-medium">{activity.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>
                        <span className="font-medium text-gray-800">{activity.calories}</span> kcal
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedActivity(isExpanded ? null : activity.id)}
                  className="p-1 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              {/* Benefits */}
              {activity.benefits && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                  <p className="text-xs text-gray-700">{activity.benefits}</p>
                </div>
              )}

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 pt-3 mt-3 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Instructions</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{activity.instructions}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Equipment</h4>
                    <p className="text-xs text-gray-600">{activity.equipment}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getPageTitle = () => {
    switch (currentView) {
      case "nutrition":
        return "Nutrition Guidance"
      case "activities":
        return "Physical Activities"
      default:
        return "AI Health Suggestions"
    }
  }

  const handleBackClick = () => {
    if (currentView === "categories") {
      // Navigate back to dashboard
      window.history.back()
    } else {
      // Go back to categories view
      setCurrentView("categories")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with geometric pattern */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden">
        {/* Geometric pattern background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
            <path d="M50 50h60v60H50z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M130 30h80v80h-80z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M240 60h70v70h-70z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M330 40h50v50h-50z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M70 140h90v90H70z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M180 120h60v60h-60z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M260 150h80v80h-80z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M40 250h70v40H40z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M130 240h50v50h-50z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M200 220h90v70h-90z" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M310 200h60v90h-60z" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Mobile status bar */}
        <div className="flex justify-between items-center px-6 py-2 text-sm font-medium">
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <div className="w-1 h-3 bg-white rounded-full"></div>
              <div className="w-1 h-3 bg-white rounded-full"></div>
              <div className="w-1 h-3 bg-white rounded-full"></div>
              <div className="w-1 h-3 bg-white/60 rounded-full"></div>
            </div>
            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M17.778 8.222c-4.296-4.296-11.26-4.296-15.556 0A1 1 0 01.808 6.808c5.076-5.077 13.308-5.077 18.384 0a1 1 0 01-1.414 1.414zM14.95 11.05a7 7 0 00-9.9 0 1 1 0 01-1.414-1.414 9 9 0 0112.728 0 1 1 0 01-1.414 1.414zM12.12 13.88a3 3 0 00-4.24 0 1 1 0 01-1.415-1.414 5 5 0 017.07 0 1 1 0 01-1.415 1.414zM9 16a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="w-6 h-3 bg-white rounded-sm ml-1">
              <div className="w-4 h-full bg-white rounded-sm"></div>
            </div>
          </div>
        </div>

        {/* Header content */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={handleBackClick}
              className="p-3 rounded-xl border border-white/20 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-8">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {currentView === "categories" && (
          <>
            {/* Filter section */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">All Suggestions</h2>
              <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">{selectedFilter}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestion cards */}
            <div className="space-y-4">
              {suggestionCategories.map((category) => (
                <Card
                  key={category.id}
                  className="bg-white border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
                  onClick={category.action}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Icon group */}
                        <div className="flex items-center gap-2">
                          {category.icons.map((iconData, index) => {
                            const IconComponent = iconData.icon
                            return (
                              <div
                                key={index}
                                className={`w-12 h-12 ${iconData.bgColor} rounded-xl flex items-center justify-center shadow-sm`}
                              >
                                <IconComponent className="w-6 h-6 text-white" />
                              </div>
                            )
                          })}
                          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Plus className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>

                        {/* Content */}
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-1">{category.title}</h3>
                          <p className="text-gray-500 text-sm">
                            {category.subtitle} • {category.duration}
                          </p>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {currentView === "nutrition" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Meal Plan</h2>
              <p className="text-sm text-gray-600">AI-curated meals tailored to your health goals</p>
            </div>

            <div className="space-y-3">
              <MealCard
                meal={mealData.breakfast}
                mealId="breakfast"
                mealType="breakfast"
                timeIcon="🌅"
                timeLabel="Breakfast"
              />
              <MealCard meal={mealData.lunch} mealId="lunch" mealType="lunch" timeIcon="☀️" timeLabel="Lunch" />
              <MealCard meal={mealData.dinner} mealId="dinner" mealType="dinner" timeIcon="🌙" timeLabel="Dinner" />
              <MealCard meal={mealData.snacks} mealId="snacks" mealType="snacks" timeIcon="🍎" timeLabel="Snacks" />
            </div>
          </div>
        )}

        {currentView === "activities" && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Your Workout Plan</h2>
              <p className="text-sm text-gray-600">Personalized activities to boost your fitness</p>
            </div>

            <div className="space-y-3">
              {activityData.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom indicator */}
      <div className="flex justify-center pb-6">
        <div className="w-32 h-1 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  )
}

export default AISuggestionsPage
