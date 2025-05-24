import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";

export default function AgeSelector({ nextStep, prevStep, setUserData }) {
  const [selectedAge, setSelectedAge] = useState(19);
  const scrollRef = useRef(null);

  const handleNext = () => {
    setUserData((prev) => ({ ...prev, age: selectedAge }));
    nextStep();
  };

  // Generate age range around the selected age
  const generateAgeRange = (currentAge) => {
    return [
      currentAge - 2,
      currentAge - 1,
      currentAge,
      currentAge + 1,
      currentAge + 2,
    ];
  };

  useEffect(() => {
    if (scrollRef.current) {
      const selectedIndex = selectedAge - 18;
      scrollRef.current.scrollTop = selectedIndex * 80;
    }
  }, [selectedAge]);


  return (
    <div className="min-h-screen bg-white px-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between w-full max-w-md">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-gray-200"
          onClick={prevStep}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <Progress value={44.44} className="h-2 w-32" />
        <Button variant="ghost" className="text-sm text-gray-600">
          Skip
        </Button>
      </div>

      {/* Title */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-gray-900 mb-12">
          {/* Removed text-center */}
          What is your age?
        </h1>
      </div>

      {/* Clickable Age Selector */}
      <div className="space-y-5 mb-12">
        {generateAgeRange(selectedAge).map((age) => (
          <button
            key={age}
            onClick={() => setSelectedAge(age)}
            className={cn(
              "w-full h-16 flex items-center justify-center transition-all duration-200",
              selectedAge === age
                ? "relative" // Container for selected state
                : ""
            )}
          >
            <span
              className={cn(
                "font-medium transition-all flex items-center justify-center",
                selectedAge === age
                  ? "w-32 h-32 bg-[#0066FF] text-white text-[32px] rounded-2xl shadow-[0_0_0_12px_rgba(0,102,255,0.08)]"
                  : Math.abs(selectedAge - age) === 2
                  ? "text-gray-300 text-[28px]"
                  : Math.abs(selectedAge - age) === 1
                  ? "text-gray-500 text-[28px]"
                  : "text-gray-900 text-[28px]"
              )}
            >
              {age}
            </span>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <button
        className="w-full max-w-md bg-[#0066FF] text-white rounded-xl py-4 flex items-center justify-center gap-2 text-[16px] font-medium mt-6"
        onClick={handleNext}
      >
        Continue
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
