import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import Male from "../../assets/male-illus.png";
import Female from "../../assets/female-illus.png";
import Nottosay from "../../assets/nottosay-illus.png";

export default function HealthGenders({ nextStep, prevStep, setUserData }) {
  const [selectedGender, setSelectedGender] = useState(null);
  const scrollRef = useRef(null);

  const handleNext = () => {
    setUserData((prev) => ({ ...prev, gender: selectedGender }));
    nextStep();
  };

  const genders = [
    {
      id: "male",
      label: "I Am Male",
      color: "bg-blue-600",
      image: Male,
    },
    {
      id: "Female",
      label: "I Am Female",
      color: "bg-pink-600",
      image: Female,
    },
    {
      id: "other",
      label: "I Am Other",
      color: "bg-purple-600",
      image: Nottosay,
    },
  ];

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-gray-200"
            onClick={prevStep}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <Progress value={22.22} className="h-2 w-32" />
          <Button variant="ghost" className="text-sm text-gray-600">
            Skip
          </Button>
        </div>

        {/* Title */}
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            What is your Gender?
          </h1>
          <p className="text-gray-500">
            Please select your gender for better personalized health experience.
          </p>
        </div>

        {/* Gender Cards Container */}
        <div className="relative">
          {/* Scrollable Cards */}
          <div
            className="flex gap-4 overflow-x-auto px-[calc(50%-140px)] mx-auto snap-x snap-mandatory py-4 items-center scrollbar-hide"
            ref={scrollRef}
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {genders.map((gender) => (
              <Card
                key={gender.id}
                className={cn(
                  "relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out shrink-0 snap-center shadow-xl",
                  "w-[280px] min-h-[350px]",
                  gender.color,
                  selectedGender === gender.id
                    ? "ring-2 ring-blue-600 ring-offset-2 scale-105"
                    : "hover:-translate-y-2"
                )}
                onClick={() => setSelectedGender(gender.id)}
              >
                <div className="h-full flex flex-col">
                  {/* Header content - removed mb-4 */}
                  <div className="p-6 flex items-center gap-2 text-white">
                    <span className="text-xl font-medium">{gender.label}</span>
                    {selectedGender === gender.id && (
                      <div className="ml-auto rounded-full bg-white p-1">
                        <svg
                          className="h-4 w-4 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Image container - removed padding, using flex-grow to push to bottom */}
                  <div className="flex-grow flex items-end">
                    <img
                      src={gender.image || "/placeholder.svg"}
                      alt={gender.label}
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="mt-8 space-y-3">
          <Button
            variant="outline"
            className="w-full px-10 py-6 text-blue-600 bg-blue-50 hover:bg-blue-100"
          >
            Prefer to skip this
            <Plus className="ml-2 h-4 w-4" />
          </Button>
          <Button
            className="w-full px-10 py-6 text-base font-medium bg-blue-600 hover:bg-blue-700"
            disabled={!selectedGender}
            onClick={handleNext}
          >
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
