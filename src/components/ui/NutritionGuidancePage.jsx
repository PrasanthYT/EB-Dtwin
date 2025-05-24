import  { useEffect, useState } from 'react';
import { ArrowLeft, MoreHorizontal, Apple, CheckCircle, Scale, Utensils, BookOpen, Timer, Heart, Eye, MessageCircle, Bookmark } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'axios';
import { Link } from "react-router-dom";
import { Skeleton } from '@/components/ui/skeleton';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDo-YvanSAVyvuEZ7jwQpLoPG9NNwQOCSc"; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction:`System Instruction for AI Wellness Data Processing
Objective:
The AI should analyze user data related to physical fitness, nutrition, and mental wellness, then provide structured recommendations for improvement in a predefined JSON format.

Input Format:
The AI will receive JSON input containing various wellness parameters such as:

Physical Fitness: Step count, calories burned, heart rate, weight, height, active time, workout details.
Nutrition: Daily intake values, macronutrient distribution, hydration levels, micronutrient status.
Mental Wellness: Sleep data, stress levels, mindfulness activities, mood tracking.
Output Format:
The AI must return:

Key Metrics Summary: A structured list of wellness-related metrics with icons, color coding, and units.
Five Steps for Improvement: Actionable, personalized suggestions based on the input data.
Analysis & Insights: A summary explaining key observations and areas for improvement.
Processing Rules:
Identify Patterns: The AI should detect trends from user data and suggest improvements accordingly.
Personalized Insights: Recommendations should be tailored based on user-specific metrics.
Holistic Approach: Ensure balance across physical fitness, nutrition, and mental wellness.
JSON Structure Compliance: The AI must return responses in the correct format.
Example Response Structure:
json
Copy
Edit
{
  "fitnessMetrics": [
    {
      "title": "Metric 1",
      "amount": "Value 1",
      "icon": "related emoji 1😊",
      "color": "Color 1",
      "textColor": "random TextColor 1",
      "unit": "Unit 1"
    },
    {
      "title": "Metric 2",
      "amount": "Value 2",
      "icon": "related emoji 😊2",
      "color": "Color 2",
      "textColor": "random TextColor 2",
      "unit": "Unit 2"
    },
    {
      "title": "Metric 3",
      "amount": "Value 3",
      "icon": "related emoji 😊3",
      "color": "Color 3",
      "textColor": "random TextColor 3",
      "unit": "Unit 3"
    }
  ],
  "improvementSteps": [
    {
      "id": 1,
      "activity": "Step 1",
      "text": "Description of step 1",
      "completed": false,
      "duration": "Duration 1",
      "target": "Target 1"
    },
    {
      "id": 2,
      "activity": "Step 2",
      "text": "Description of step 2",
      "completed": false,
      "duration": "Duration 2",
      "target": "Target 2"
    },
    {
      "id": 3,
      "activity": "Step 3",
      "text": "Description of step 3",
      "completed": false,
      "duration": "Duration 3",
      "target": "Target 3"
    },
    {
      "id": 4,
      "activity": "Step 4",
      "text": "Description of step 4",
      "completed": false,
      "duration": "Duration 4",
      "target": "Target 4"
    },
    {
      "id": 5,
      "activity": "Step 5",
      "text": "Description of step 5",
      "completed": false,
      "duration": "Duration 5",
      "target": "Target 5"
    }
  ],
  "analysis": "Summary of observations and areas for improvement."
}
Integration Guidelines:
AI should retrieve actual user data and process it accordingly.
Context-aware recommendations should be generated based on user-specific input.
Strict adherence to JSON format is required for seamless data processing`,
});

const MetricsLoadingSkeleton = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 mt-3 md:grid-cols-3 gap-4">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const StepsLoadingSkeleton = () => (
  <div className="space-y-8 mt-8">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-start space-x-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <div className="bg-white p-4 rounded-xl">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);



const NutritionGuidancePage = () => {
  const [nutritionMetrics, setNutritionMetrics] = useState([]);
  const [userData, setUserData] = useState([]);
  const [fitbitData, setFitbitData] = useState([]);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  

  const fetchHealthScore = async () => {
    setLoading(true)
    setError("");
    console.log("bruhhhhh :",userData)
    console.log(fitbitData)
    const healthInput = {
      age: userData.userDetails.age,
      gender: userData.userDetails.gender,
      weight_kg: userData.userDetails.weight,
      steps: fitbitData.data.weeklyData[fitbitData.data.weeklyData.length - 1].activity.summary.steps,
      active_minutes: fitbitData.data.weeklyData[fitbitData.data.weeklyData.length - 1].sleep.minutesAwake,
      calories_burnt: fitbitData.data.weeklyData[fitbitData.data.weeklyData.length - 1].activity.summary.caloriesOut,
      calories_BMR: fitbitData.data.weeklyData[fitbitData.data.weeklyData.length - 1].activity.summary.caloriesBMR,
      calories_taken: 2000,
      description: "give about meal and nutrient fixs for steps"
    };
    console.log(healthInput)
    try {
      const chatSession = model.startChat({
        generationConfig: {
          temperature: 0.15,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        history: [],
      });
      const result = await chatSession.sendMessage(JSON.stringify(healthInput));
      let responseText = result.response.text();
      responseText = responseText.replace(/```json|```/g, "").trim()
      const aiResponse = JSON.parse(responseText);

      setNutritionMetrics(aiResponse.fitnessMetrics  || []);
      setMeals(aiResponse.improvementSteps || []);
    } catch (err) {
      console.error("Error fetching health AI data:", err);
      setError("Failed to fetch AI recommendations.");
    }

    setLoading(false);
  };
  const fetchFitbitData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await axios.get("http://localhost:4200/api/fitbit/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 200) {
        console.log("✅ Fitbit Data:", response.data);
        setFitbitData(response.data);
      }
    } catch (error) {
      console.error("❌ Error fetching Fitbit data:", error);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch("http://localhost:4200/api/auth/user", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log("User Data:", data.user);
        setUserData((prev) => ({
          ...prev,
          ...data.user,
          healthScore: data.user.healthData?.healthScore || null, // ✅ Store healthScore
        }));
      } else {
        console.error("Failed to fetch user data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  };



  const [video, setVideo] = useState(null);
  const [stats, setStats] = useState({ views: 0, likes: 0, comments: 0 });

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const apiKey = "AIzaSyCVlNRgryFu9ogSwss9ZSgPSgd2oYAQM5o"; // Replace with your YouTube API Key
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=nutrition+guide&type=video&maxResults=1&key=${apiKey}`
        );
        if (response.data.items.length > 0) {
          const videoData = response.data.items[0];
          setVideo(videoData);
          fetchVideoStats(videoData.id.videoId);
        }
      } catch (error) {
        console.error("Error fetching video: ", error);
      }
    };

    const formatNumber = (num) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
      }
      return num;
    };
  
    const fetchVideoStats = async (videoId) => {
      try {
        const response = await axios.get(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=AIzaSyCVlNRgryFu9ogSwss9ZSgPSgd2oYAQM5o`
        );
        if (response.data.items.length > 0) {
          const statsData = response.data.items[0].statistics;
          setStats({
            views: formatNumber(parseInt(statsData.viewCount, 10)),
            likes: formatNumber(parseInt(statsData.likeCount, 10)),
            comments: formatNumber(parseInt(statsData.commentCount, 10)),
          });
        }
      } catch (error) {
        console.error("Error fetching video stats: ", error);
      }
    };
    fetchUserData()
    fetchFitbitData()
    fetchVideo();
  }, []);
  useEffect(()=>{
    fetchHealthScore(); // Fetch AI data when component mounts
  },[fitbitData,userData])
  const [recipeData, setRecipeData] = useState({
    id: "healthy-recipe",
    title: "Mediterranean Buddha Bowl",
    description:
      "A nutrient-rich bowl packed with quinoa, chickpeas, fresh vegetables, and tahini dressing",
    stats: {
      calories: 450,
      prepTime: "20 min",
      difficulty: "Easy",
    },
  });

  const toggleMeal = (mealId) => {
    setMeals(
      meals.map((meal) =>
        meal.id === mealId ? { ...meal, completed: !meal.completed } : meal
      )
    );
  };

  const getProgress = () => {
    const completed = meals.filter((meal) => meal.completed).length;
    return (completed / meals.length) * 100;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Enhanced Header with Gradient */}
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 p-4 pb-8 text-white rounded-b-3xl shadow-lg relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Header Content */}
        <div className="relative z-10">
          <div className="flex items-center mb-6">
            <Link to="/healthsuggestion">
              <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <ArrowLeft size={24} />
              </button>
            </Link>
            <div className="ml-2">
              <p className="text-blue-100 text-sm font-medium tracking-wider uppercase">
                Daily Nutrition
              </p>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
                Meal Planning
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-lg">🥗</span>
                <span className="text-sm sm:text-base font-medium">
                  <span className="font-semibold">1,900</span> kcal Goal
                </span>
              </span>
              <span className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-lg">📊</span>
                <span className="text-sm sm:text-base font-medium">
                  <span className="font-semibold">Balance</span> Diet
                </span>
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-pulse" />
              <span className="text-sm sm:text-base font-medium">
                {Math.round(getProgress())}% Consumed
              </span>
            </div>
          </div>

          <div className="w-full bg-white/20 rounded-full h-2.5 backdrop-blur-sm">
            <div
              className="bg-gradient-to-r from-blue-200 to-white rounded-full h-2.5 transition-all duration-300"
              style={{ width: `${getProgress()}%` }}
            />
          </div>

          <p className="text-blue-50 text-sm mt-4 font-medium tracking-wide">
            "Let food be thy medicine, and medicine be thy food."
          </p>
        </div>
      </div>

      {loading ? (
          <MetricsLoadingSkeleton />
        ) : (
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Nutrition Metrics</h2>
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
            View Details
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {nutritionMetrics.map((metric) => (
            <Card
              key={metric.title}
              className="hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className={`${metric.color} p-3 rounded-xl`}>
                    <span className="text-2xl">{metric.icon}</span>
                  </div>
                  <div>
                    <h3 className={`font-semibold text-lg ${metric.textColor}`}>
                      {metric.title}
                    </h3>
                    <p className="text-gray-600 font-medium">
                      {metric.amount} {metric.unit}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
        )}
      {/* Meals Section */}
      {loading ? (
          <StepsLoadingSkeleton />
        ) : (
      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Daily Meal Plan</h2>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreHorizontal className="text-gray-400" />
          </button>
        </div>
        <div className="space-y-8">
          {meals.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start space-x-4 cursor-pointer group"
              onClick={() => toggleMeal(item.id)}
            >
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    item.completed
                      ? "bg-blue-600 scale-110"
                      : "bg-gray-200 group-hover:bg-blue-100"
                  }`}
                >
                  {item.completed ? (
                    <CheckCircle className="w-6 h-6 text-white" />
                  ) : (
                    <Utensils className="w-5 h-5 text-gray-500" />
                  )}
                </div>
                {index < meals.length - 1 && (
                  <div className="absolute top-10 left-5 w-0.5 h-20 bg-gray-200" />
                )}
              </div>
              <div className="flex-1 bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">
                      {item.activity}
                    </h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">{item.time}</span>
                      <span className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {item.calories}
                      </span>
                    </div>
                  </div>
                  {item.completed && (
                    <span className="text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full">
                      Consumed
                    </span>
                  )}
                </div>
                <p className="text-gray-600 mb-3">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
        )}
      {/* Featured Recipe Section */}
      <div className="p-4 md:p-6 ">
             <div className="rounded-xl overflow-hidden shadow-lg bg-white">
            {video && 
             <div className="relative">
             <iframe
               className="w-full h-48 rounded-lg"
               src={`https://www.youtube.com/embed/${video.id.videoId}`}
               title="Nutrition Guide"
               allowFullScreen
             ></iframe>
           </div>
            }
               <div className="p-4">
                 <h3 className="text-lg font-semibold text-gray-900">{video ? video.snippet.title : ""}</h3>
                 <p className="text-gray-600 mt-1">{video ? video.snippet.description : ""}</p>
                 <div className="flex items-center justify-between mt-4 text-sm">
                   <div className="flex space-x-6">
                     <span className="flex items-center space-x-2 text-gray-600">
                       <Eye className="w-4 h-4" />
                       <span>{stats.views.toLocaleString()}</span>
                     </span>
                     <span className="flex items-center space-x-2 text-gray-600">
                       <Heart className="w-4 h-4" />
                       <span>{stats.likes.toLocaleString()}</span>
                     </span>
                     <span className="flex items-center space-x-2 text-gray-600">
                       <MessageCircle className="w-4 h-4" />
                       <span>{stats.comments.toLocaleString()}</span>
                     </span>
                   </div>
                   <button className="flex items-center space-x-2 text-blue-600 font-medium hover:text-blue-700">
                     <Bookmark className="w-4 h-4" />
                     <span>Save</span>
                   </button>
                 </div>
               </div>
             </div>
             </div>
      <div className="p-4 md:p-6">
        <h2 className="text-xl font-bold mb-4">Featured Recipe</h2>
        <div className="rounded-xl overflow-hidden shadow-lg bg-white">
          <div className="relative aspect-video bg-blue-100">
            <img
              src="https://cdn.loveandlemons.com/wp-content/uploads/2020/06/IMG_25456.jpg"
              alt="Mediterranean Buddha Bowl"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {recipeData.title}
            </h3>
            <p className="text-gray-600 mt-1">{recipeData.description}</p>
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex space-x-6">
                <span className="flex items-center space-x-2 text-gray-600">
                  <Scale className="w-4 h-4" />
                  <span>{recipeData.stats.calories} kcal</span>
                </span>
                <span className="flex items-center space-x-2 text-gray-600">
                  <Timer className="w-4 h-4" />
                  <span>{recipeData.stats.prepTime}</span>
                </span>
                <span className="flex items-center space-x-2 text-gray-600">
                  <Apple className="w-4 h-4" />
                  <span>{recipeData.stats.difficulty}</span>
                </span>
              </div>
              <button className="flex items-center space-x-2 text-blue-600 font-medium hover:text-blue-700">
                <BookOpen className="w-4 h-4" />
                <span>View Recipe</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionGuidancePage;
