import React from "react";
import {
  Utensils,
  Apple,
  Dumbbell,
  Activity,
  Leaf,
  Wind,
  HeartPulse,
  UserCog,
  ArrowLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const healthSuggestions = [
  {
    title: "Nutrition Guidance",
    description:
      "Personalized meal plans • Nutrition tracking • Supplement advice",
    color: "bg-blue-500",
    link: "/nutritionguidancepage",
    icons: [
      <Utensils key="1" className="text-white h-5 w-5" />, 
      <Apple key="2" className="text-white h-5 w-5" />, 
      <Plus key="3" className="text-white h-5 w-5" />,
    ],
  },
  {
    title: "Physical Activities",
    description: "Workout routines • Exercise demos • Recovery tips",
    color: "bg-purple-500",
    link: "/workoutactivitypage",
    icons: [
      <Dumbbell key="1" className="text-white h-5 w-5" />, 
      <Activity key="2" className="text-white h-5 w-5" />, 
      <Plus key="3" className="text-white h-5 w-5" />,
    ],
  },
  {
    title: "Mindful Breathing",
    description: "Stress relief • Meditation guides • Sleep improvement",
    color: "bg-teal-500",
    link: "/mindwellnesspage",
    icons: [
      <Leaf key="1" className="text-white h-5 w-5" />, 
      <Wind key="2" className="text-white h-5 w-5" />, 
      <Plus key="3" className="text-white h-5 w-5" />,
    ],
  },
  {
    title: "Wellness Resources",
    description: "Health articles • Expert videos • Community support",
    color: "bg-orange-500",
    link: "/wellnessresourcepage",
    icons: [
      <HeartPulse key="1" className="text-white h-5 w-5" />, 
      <UserCog key="2" className="text-white h-5 w-5" />, 
      <Plus key="3" className="text-white h-5 w-5" />,
    ],
  },
];

const HealthSuggestionCard = ({ title, description, color, icons = [], link }) => {
  return (
    <Link to={link} className="block">
      <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow duration-200 cursor-pointer bg-white">
        <div className="flex items-center gap-4 md:gap-6 w-full">
          <div className="flex-shrink-0">
            <div className="flex items-center">
              <div className={`${color} p-2.5 rounded-xl z-20 relative`}>{icons[0]}</div>
              <div className={`${color} p-2.5 rounded-xl z-10 relative -ml-2`}>{icons[1]}</div>
              <div className={`${color} opacity-80 p-2.5 rounded-xl relative -ml-2`}>{icons[2]}</div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1 truncate">{title}</h3>
            <p className="text-sm md:text-base text-gray-600 line-clamp-2">{description}</p>
          </div>

          <ChevronRight className="h-6 w-6 text-gray-400 flex-shrink-0 ml-2" />
        </div>
      </Card>
    </Link>
  );
};

const HealthSuggestions = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e2642] px-6 md:px-12 pb-32 md:pb-48 rounded-b-[3rem] md:rounded-b-[4rem]">
        <div className="flex items-center gap-6 pt-8 md:pt-12">
          <Link to="/dashboard">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl border-gray-200 bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <ArrowLeft className="h-8 w-8 text-white" />
            </Button>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white">AI Health Suggestions</h1>
        </div>
      </div>

      <div className="px-6 md:px-12 -mt-19 md:-mt-24">
        <div className="space-y-6 md:space-y-8 mt-4">
          {healthSuggestions.map((suggestion, index) => (
            <HealthSuggestionCard key={index} {...suggestion} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HealthSuggestions;
