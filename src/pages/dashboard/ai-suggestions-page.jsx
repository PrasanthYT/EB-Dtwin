"use client";

import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Clock,
  Utensils,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";

const AISuggestionsPage = () => {
  const [expandedMeal, setExpandedMeal] = useState(null);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [randomMeals, setRandomMeals] = useState({});
  const [randomActivities, setRandomActivities] = useState([]);
  const navigate = useNavigate();

  // Extended meal data pool
  const allMealsData = {
    breakfast: [
      {
        name: "Berry Almond Oatmeal",
        calories: 380,
        nutrients: { carbs: 55, protein: 10, fat: 12 },
        instructions:
          "Cook rolled oats with water or milk. Top with mixed berries and sliced almonds.",
        score: 9,
        benefit: "Rich in fiber, helping support healthy digestion.",
        image:
          "https://realfood.tesco.com/media/images/RFO-1400x919-BerryOatmealCrunch-be799601-93e0-44d4-9fb5-1f8bc533b93a-0-1400x919.jpg",
      },
      {
        name: "Avocado Toast with Eggs",
        calories: 420,
        nutrients: { carbs: 35, protein: 18, fat: 25 },
        instructions:
          "Toast whole grain bread, mash avocado with lime, top with poached eggs and seasoning.",
        score: 8.8,
        benefit: "Packed with healthy fats and protein for sustained energy.",
        image:
          "https://www.eatingwell.com/thmb/ZHXRyJgN5ikb5Zk0SMw1XhQ8W9g=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/EWL-267169-avocado-egg-toast-Hero-02-037627ac211748fc857b5a69989fa8e9.jpg",
      },
      {
        name: "Greek Yogurt Parfait",
        calories: 320,
        nutrients: { carbs: 40, protein: 20, fat: 8 },
        instructions:
          "Layer Greek yogurt with granola, fresh berries, and a drizzle of honey.",
        score: 8.5,
        benefit:
          "High in probiotics for gut health and protein for muscle support.",
        image:
          "https://tealnotes.com/wp-content/uploads/2023/05/Greek-Yogurt-Parfait-1.jpg",
      },
      {
        name: "Protein Smoothie Bowl",
        calories: 350,
        nutrients: { carbs: 45, protein: 25, fat: 10 },
        instructions:
          "Blend protein powder with frozen fruits, top with nuts and seeds.",
        score: 9.2,
        image:
          "https://plantifulbakery.com/wp-content/uploads/2020/11/choc-smoothie-2020-2-blog-1.jpg",
      },
    ],
    lunch: [
      {
        name: "Grilled Chicken Salad",
        calories: 520,
        nutrients: { carbs: 30, protein: 45, fat: 25 },
        instructions:
          "Combine mixed greens, grilled chicken breast slices, cucumber, tomatoes, and bell peppers. Dress with a light olive oil vinaigrette.",
        score: 9.1,
        image:
          "https://hips.hearstapps.com/hmg-prod/images/grilled-chicken-salad-index-6628169554c88.jpg?crop=0.6667863339915036xw:1xh;center,top&resize=1200:*",
      },
      {
        name: "Quinoa Buddha Bowl",
        calories: 480,
        nutrients: { carbs: 55, protein: 20, fat: 18 },
        instructions:
          "Combine quinoa with roasted vegetables, chickpeas, and tahini dressing.",
        score: 8.9,
        benefit: "Complete protein source with essential amino acids.",
        image:
          "https://feelgoodfoodie.net/wp-content/uploads/2017/12/Quinoa-Buddha-Bowl-4.jpg",
      },
      {
        name: "Turkey and Hummus Wrap",
        calories: 450,
        nutrients: { carbs: 40, protein: 30, fat: 20 },
        instructions:
          "Wrap lean turkey, hummus, vegetables in a whole wheat tortilla.",
        score: 8.6,
        image:
          "https://www.theorganickitchen.org/wp-content/uploads/2014/05/IMG_8287wm-2.jpg",
      },
      {
        name: "Lentil Soup with Bread",
        calories: 400,
        nutrients: { carbs: 50, protein: 22, fat: 12 },
        instructions:
          "Simmer lentils with vegetables and spices, serve with whole grain bread.",
        score: 8.7,
        benefit: "High in fiber and plant-based protein for sustained energy.",
        image:
          "https://siamesesourdough.com/wp-content/uploads/2020/08/IMG_8670-e1597341003126.jpeg",
      },
    ],
    dinner: [
      {
        name: "Baked Salmon with Roasted Broccoli and Quinoa",
        calories: 600,
        nutrients: { carbs: 50, protein: 40, fat: 25 },
        instructions:
          "Bake a salmon fillet. Roast broccoli florets until tender. Cook quinoa according to package instructions and serve alongside.",
        score: 9.4,
        image: "https://tastendash.com/wp-content/uploads/Salmon-1.jpg",
      },
      {
        name: "Grilled Chicken with Sweet Potato",
        calories: 550,
        nutrients: { carbs: 45, protein: 42, fat: 18 },
        instructions:
          "Grill seasoned chicken breast, roast sweet potato wedges, serve with steamed green beans.",
        score: 9.0,
        benefit: "Rich in beta-carotene and lean protein for muscle recovery.",
        image:
          "https://www.eatingwell.com/thmb/lpcs5PVRkxzny-oandlZYTe7vJ0=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/roast-chicken-sweet-potatoes-250549-1x1-bab6fea85bda439fa5f0ad5fd07e29d8.jpg",
      },
      {
        name: "Vegetarian Stir-fry with Tofu",
        calories: 480,
        nutrients: { carbs: 40, protein: 25, fat: 22 },
        instructions:
          "Stir-fry tofu with mixed vegetables in sesame oil, serve over brown rice.",
        score: 8.8,
        image:
          "https://jessicainthekitchen.com/wp-content/uploads/2022/07/Vegan-Stir-Fry01030.jpg",
      },
      {
        name: "Lean Beef with Roasted Vegetables",
        calories: 580,
        nutrients: { carbs: 35, protein: 45, fat: 24 },
        instructions:
          "Grill lean beef steak, roast mixed vegetables with herbs and olive oil.",
        score: 9.1,
        benefit: "High in iron and B-vitamins for energy metabolism.",
        image:
          "https://thewholecook.com/wp-content/uploads/2023/01/Steak-with-Roasted-Veggies-1-3-500x500.jpg",
      },
    ],
  };

  // Extended activity data pool
  const allActivitiesData = [
    {
      id: "yoga",
      name: "Morning Yoga Flow",
      type: "Flexibility",
      duration: "30 min",
      calories: 120,
      difficulty: "Medium",
      equipment: "Yoga mat",
      instructions:
        "Follow a gentle morning yoga sequence focusing on stretching and mindful movement.",
      benefits:
        "Improves flexibility, reduces stress, and enhances mental clarity.",
      image:
        "https://res.cloudinary.com/peloton-cycle/image/fetch/c_fill,dpr_1.0,w_1280,h_720,x_905,y_1337/f_auto/q_auto/https://images.ctfassets.net/6ilvqec50fal/4etuYztO7f1eMUnRn8e4Ia/62281f46a148c25651f09b8f8287ad0c/GettyImages-1223389038.jpg",
    },
    {
      id: "cardio",
      name: "Brisk Walking",
      type: "Cardio",
      duration: "25 min",
      calories: 150,
      difficulty: "Low",
      equipment: "Comfortable shoes",
      instructions:
        "Maintain a steady, brisk pace while walking outdoors or on a treadmill.",
      benefits: "Boosts cardiovascular health and burns calories effectively.",
      image:
        "https://cdn.centr.com/content/29000/28859/images/landscapewidedesktop1x-centr-brand-vision-0381-16.9.jpg",
    },
    {
      id: "strength",
      name: "Bodyweight Training",
      type: "Strength",
      duration: "20 min",
      calories: 180,
      difficulty: "High",
      equipment: "None required",
      instructions:
        "Perform exercises like push-ups, squats, and planks using your body weight.",
      benefits: "Builds muscle strength and increases metabolism.",
      image:
        "https://i0.wp.com/www.muscleandfitness.com/wp-content/uploads/2019/04/triceps-pushup-lean-muscular.jpg?quality=86&strip=all",
    },
    {
      id: "swimming",
      name: "Swimming Laps",
      type: "Cardio",
      duration: "35 min",
      calories: 280,
      difficulty: "Medium",
      equipment: "Swimming pool",
      instructions:
        "Swim continuous laps alternating between different strokes for a full-body workout.",
      benefits: "Low-impact exercise that works all major muscle groups.",
      image:
        "https://www.onelifefitness.com/hs-fs/hubfs/iStock_49148278_XLARGE.jpg?width=1344&height=897&name=iStock_49148278_XLARGE.jpg",
    },
    {
      id: "cycling",
      name: "Indoor Cycling",
      type: "Cardio",
      duration: "40 min",
      calories: 320,
      difficulty: "High",
      equipment: "Stationary bike",
      instructions:
        "Cycle at varying intensities with intervals of high and moderate effort.",
      benefits: "Excellent for cardiovascular fitness and leg strength.",
      image:
        "https://ride.shimano.com/cdn/shop/articles/7-Tips-to-help-you-get-started-with-indoor-cycling-thumbnail.jpg?v=1744916969",
    },
    {
      id: "pilates",
      name: "Core Pilates",
      type: "Flexibility",
      duration: "30 min",
      calories: 140,
      difficulty: "Medium",
      equipment: "Exercise mat",
      instructions:
        "Focus on core strengthening exercises with controlled movements and breathing.",
      benefits: "Improves core stability, posture, and body awareness.",
      image: "https://cdn.mos.cms.futurecdn.net/dGHTTd9e3gjtkz7Rjqifr6.jpg",
    },
    {
      id: "hiit",
      name: "HIIT Workout",
      type: "Strength",
      duration: "25 min",
      calories: 250,
      difficulty: "High",
      equipment: "None required",
      instructions:
        "Alternate between high-intensity exercises and short rest periods.",
      benefits:
        "Burns calories efficiently and improves cardiovascular fitness.",
      image:
        "https://storage.googleapis.com/flex-web-media-prod/content/images/wp-content/uploads/2024/06/kettlebell-hiit-workout-cover.jpg",
    },
    {
      id: "stretching",
      name: "Full Body Stretch",
      type: "Flexibility",
      duration: "15 min",
      calories: 60,
      difficulty: "Low",
      equipment: "Exercise mat",
      instructions:
        "Gentle stretching routine targeting all major muscle groups.",
      benefits: "Improves flexibility and reduces muscle tension.",
      image:
        "https://images.squarespace-cdn.com/content/v1/646546094f831c0ce07778b7/1684358709538-EOFYBHG5QVFZO68Q3YOW/Daily-Body-Stretching-Routine-for-Optimal-Health.jpg",
    },
  ];

  // Function to get random items from array
  const getRandomItems = (array, count) => {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const handleBackButtonClick = () => navigate("/dashboard");

  // Function to get random meal for each time
  const getRandomMeal = (mealType) => {
    const meals = allMealsData[mealType];
    return meals[Math.floor(Math.random() * meals.length)];
  };

  // Initialize random suggestions on component mount
  useEffect(() => {
    setRandomMeals({
      breakfast: getRandomMeal("breakfast"),
      lunch: getRandomMeal("lunch"),
      dinner: getRandomMeal("dinner"),
    });
    setRandomActivities(getRandomItems(allActivitiesData, 3));
  }, []);

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
            innerRadius={25}
            outerRadius={45}
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

  const MealCard = ({ meal, mealId, timeIcon, timeLabel }) => {
    const isExpanded = expandedMeal === mealId;

    if (!meal) return null;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Food Image */}
        <div className="relative h-24">
          <img
            src={meal.image || "/placeholder.svg"}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
            <span className="text-xs font-bold text-gray-800">
              {meal.score}
            </span>
          </div>
          <div className="absolute bottom-2 left-2 text-white">
            <span className="text-lg drop-shadow-lg">{timeIcon}</span>
          </div>
        </div>

        {/* Food Info */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                {meal.name}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  {meal.calories} cal
                </span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {meal.nutrients.protein}g protein
                </span>
              </div>
            </div>
            <button
              onClick={() => setExpandedMeal(isExpanded ? null : mealId)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 ml-2"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Benefits */}
          {meal.benefit && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 mb-2">
              <p className="text-xs text-emerald-700 leading-relaxed">
                {meal.benefit}
              </p>
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <div className="border-t border-gray-100 pt-3 mt-2 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-xs">
                  Instructions
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {meal.instructions}
                </p>
              </div>

              {meal.nutrients && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 text-xs">
                    Nutrition
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 flex-shrink-0">
                      <MacroChart nutrients={meal.nutrients} />
                    </div>
                    <div className="space-y-1 text-xs flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span className="text-gray-600">Carbs</span>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {meal.nutrients.carbs}g
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          <span className="text-gray-600">Protein</span>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {meal.nutrients.protein}g
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-600">Fat</span>
                        </div>
                        <span className="font-semibold text-gray-800">
                          {meal.nutrients.fat}g
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
    );
  };

  const ActivityCard = ({ activity }) => {
    const isExpanded = expandedActivity === activity.id;

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Activity Image */}
        <div className="relative h-24">
          <img
            src={activity.image || "/placeholder.svg"}
            alt={activity.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div
            className={`absolute top-2 right-2 px-2 py-1 rounded-full shadow-sm text-xs font-bold text-white ${
              activity.difficulty === "High"
                ? "bg-red-500"
                : activity.difficulty === "Medium"
                ? "bg-yellow-500"
                : "bg-green-500"
            }`}
          >
            {activity.difficulty.charAt(0)}
          </div>
          <div className="absolute bottom-2 left-2">
            <Badge className="bg-white/95 text-gray-700 text-xs px-2 py-0.5 font-medium backdrop-blur-sm">
              {activity.type}
            </Badge>
          </div>
        </div>

        {/* Activity Info */}
        <div className="p-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1 truncate">
                {activity.name}
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activity.duration}
                </span>
                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {activity.calories} cal
                </span>
              </div>
            </div>
            <button
              onClick={() =>
                setExpandedActivity(isExpanded ? null : activity.id)
              }
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all duration-200 ml-2"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Benefits */}
          {activity.benefits && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
              <p className="text-xs text-blue-700 leading-relaxed">
                {activity.benefits}
              </p>
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && (
            <div className="border-t border-gray-100 pt-3 mt-2 space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-xs">
                  Instructions
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {activity.instructions}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1 text-xs">
                  Equipment
                </h4>
                <p className="text-xs text-gray-600">{activity.equipment}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden rounded-b-2xl">
        {/* Geometric pattern background */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
            <path
              d="M50 50h60v60H50z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M130 30h80v80h-80z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M240 60h70v70h-70z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M330 40h50v50h-50z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M70 140h90v90H70z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M180 120h60v60h-60z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M260 150h80v80h-80z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M40 250h70v40H40z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M130 240h50v50h-50z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M200 220h90v70h-90z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
            <path
              d="M310 200h60v90h-60z"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </svg>
        </div>

        {/* Header content */}
        <div className="px-6 py-6">
          <div className="flex items-center gap-4 mb-6">
            <button
              className="p-3 rounded-xl border border-white/20 hover:bg-white/10 transition-colors z-50"
            >
              <ArrowLeft onClick={handleBackButtonClick} size={20} />
            </button>
          </div>
          <h1 className="text-3xl font-bold mb-8">AI Health Suggestions</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Meals Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Utensils className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Meal Suggestions
            </h2>
            <Badge className="bg-blue-100 text-blue-700">AI Curated</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Morning */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-base">🌅</span>
                Morning
              </h3>
              <MealCard
                meal={randomMeals.breakfast}
                mealId="breakfast"
                timeIcon="🌅"
                timeLabel="Breakfast"
              />
            </div>

            {/* Afternoon */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-base">☀️</span>
                Afternoon
              </h3>
              <MealCard
                meal={randomMeals.lunch}
                mealId="lunch"
                timeIcon="☀️"
                timeLabel="Lunch"
              />
            </div>

            {/* Evening */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <span className="text-base">🌙</span>
                Evening
              </h3>
              <MealCard
                meal={randomMeals.dinner}
                mealId="dinner"
                timeIcon="🌙"
                timeLabel="Dinner"
              />
            </div>
          </div>
        </div>

        {/* Activities Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Activity Suggestions
            </h2>
            <Badge className="bg-purple-100 text-purple-700">
              Personalized
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {randomActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="flex justify-center pb-6">
        <div className="w-32 h-1 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );
};

export default AISuggestionsPage;
