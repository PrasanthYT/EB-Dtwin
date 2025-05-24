import React, { useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function WeightSelector({ nextStep, prevStep, setUserData }) {
  const MIN_WEIGHT = 40;
  const MAX_WEIGHT = 200;
  const STEP = 1;

  const [weight, setWeight] = useState(30);
  const [unit, setUnit] = useState("kg");
  const [isDragging, setIsDragging] = useState(false);
  const scaleRef = useRef(null);
  const lastX = useRef(null);

  const handleNext = () => {
    setUserData((prev) => ({ ...prev, weight: weight }));
    nextStep();
  };

  const calculateScalePosition = (currentWeight) => {
    const range = MAX_WEIGHT - MIN_WEIGHT;
    const percentage = ((currentWeight - MIN_WEIGHT) / range) * 100;
    // Limit the movement range to keep scale visible
    return Math.max(Math.min(50 - percentage, 40), -40);
  };

  const scalePosition = calculateScalePosition(weight);

  const generateScaleMarkers = () => {
    const markers = [];
    for (let i = MIN_WEIGHT; i <= MAX_WEIGHT; i += STEP) {
      let lineHeight = "h-4";
      if (i % 10 === 0) {
        lineHeight = "h-12";
      } else if (i % 5 === 0) {
        lineHeight = "h-8";
      }
      markers.push({
        value: i,
        lineHeight,
      });
    }
    return markers;
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    lastX.current = e.clientX || e.touches?.[0]?.clientX;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const clientX = e.clientX || e.touches?.[0]?.clientX;
    if (!clientX || !lastX.current) return;

    const diff = lastX.current - clientX;
    // Adjusted for smoother movement
    const weightChange = diff * 0.4;

    setWeight((prev) => {
      const newWeight = Math.round(
        Math.min(MAX_WEIGHT, Math.max(MIN_WEIGHT, prev + weightChange))
      );
      return newWeight;
    });

    lastX.current = clientX;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const events = [
      { type: "mousemove", handler: handleMouseMove },
      { type: "mouseup", handler: handleMouseUp },
      { type: "touchmove", handler: handleMouseMove },
      { type: "touchend", handler: handleMouseUp },
    ];

    events.forEach(({ type, handler }) => {
      document.addEventListener(type, handler, { passive: false });
    });

    return () => {
      events.forEach(({ type, handler }) => {
        document.removeEventListener(type, handler);
      });
    };
  }, [isDragging]);

  const getDisplayedWeight = () => {
    if (unit === "lbs") {
      return Math.round(weight * 2.20462);
    }
    return Math.round(weight);
  };

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-gray-200"
            onClick={prevStep}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Progress value={33.33} className="h-2 w-32" />
          <Button variant="ghost" className="text-sm text-gray-600">
            Skip
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            What is your weight?
          </h1>
        </div>

        <div className="mb-8 w-full flex gap-2">
          <button
            className={cn(
              "px-6 py-3 rounded-xl text-lg font-medium transition-all w-1/2", // Added w-1/2
              unit === "lbs"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500"
            )}
            onClick={() => setUnit("lbs")}
          >
            lbs
          </button>
          <button
            className={cn(
              "px-6 py-3 rounded-xl text-lg font-medium transition-all w-1/2", // Added w-1/2
              unit === "kg"
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500"
            )}
            onClick={() => setUnit("kg")}
          >
            kg
          </button>
        </div>

        <div className="mb-8 text-center">
          <div className="text-7xl font-bold text-gray-900">
            {getDisplayedWeight()}
            <span className="text-3xl ml-2">{unit}</span>
          </div>
        </div>

        <div className="mb-24 relative h-24 overflow-hidden select-none">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1 h-16 bg-blue-600 z-10 rounded-full">
            <div className="w-2 h-2 rounded-full bg-blue-600 absolute -top-1 left-1/2 transform -translate-x-1/2" />
            <div className="w-2 h-2 rounded-full bg-blue-600 absolute -bottom-1 left-1/2 transform -translate-x-1/2" />
          </div>

          <div
            ref={scaleRef}
            className="absolute w-full h-16 cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            style={{
              transform: `translateX(${scalePosition}%)`,
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          >
            <div className="absolute top-0 left-0 h-full flex items-center">
              {generateScaleMarkers().map((mark) => (
                <div
                  key={mark.value}
                  className="flex flex-col items-center"
                  style={{ width: "6px" }}
                >
                  <div className={cn("w-px bg-gray-200", mark.lineHeight)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          className="w-full px-6 py-6 text-base font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          onClick={handleNext}
        >
          Continue
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
