"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Bot, Heart, PillIcon as Pills, Scale, Smartphone } from "lucide-react";
import { useState } from "react";

export default function HealthGoals({ nextStep, prevStep, setUserData }) {
  const [selectedGoal, setSelectedGoal] = useState("");

  const goals = [
    {
      id: "healthy",
      label: "Get healthier",
      icon: Heart,
      color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    {
      id: "weight",
      label: "Lose weight",
      icon: Scale,
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      id: "chatbot",
      label: "Try AI chatbot",
      icon: Bot,
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
    {
      id: "meds",
      label: "Manage medications",
      icon: Pills,
      color: "bg-orange-50 border-orange-200 text-orange-700",
    },
    {
      id: "trying",
      label: "Just exploring",
      icon: Smartphone,
      color: "bg-gray-50 border-gray-200 text-gray-700",
    },
  ];

  const handleNext = () => {
    setUserData((prev) => ({ ...prev, healthGoal: selectedGoal }));
    nextStep();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={prevStep}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Progress value={20} className="h-1 w-24 bg-gray-100" />
        <Button variant="ghost" className="text-sm text-gray-400 font-normal">
          Skip
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-8">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            What brings you here?
          </h1>
          <p className="text-gray-500 mb-8">
            Help us personalize your experience
          </p>

          {/* Goals List */}
          <div className="space-y-3">
            {goals.map((goal) => {
              const Icon = goal.icon;
              const isSelected = selectedGoal === goal.id;

              return (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id)}
                  className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl ${
                      isSelected ? "bg-blue-100" : goal.color
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${isSelected ? "text-blue-600" : ""}`}
                    />
                  </div>
                  <span
                    className={`text-base font-medium ${
                      isSelected ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {goal.label}
                  </span>
                  {isSelected && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6">
        <Button
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedGoal}
          onClick={handleNext}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
