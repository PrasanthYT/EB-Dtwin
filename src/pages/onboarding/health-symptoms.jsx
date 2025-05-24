import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Progress } from "../../components/ui/progress";

const predefinedSymptoms = [
  "Headache",
  "Muscle Fatigue",
  "Asthma",
  "Fever",
  "Cough",
  "Nausea",
  "Dizziness",
  "Rash",
  "Joint Pain",
  "Shortness of Breath",
];

export default function HealthSymptoms({
  nextStep,
  prevStep,
  userData,
  setUserData,
}) {
  const [selectedSymptoms, setSelectedSymptoms] = useState(
    userData.symptoms || []
  );
  const [customSymptom, setCustomSymptom] = useState("");

  const handleNext = () => {
    setUserData((prev) => ({ ...prev, symptoms: selectedSymptoms }));
    nextStep();
  };

  const togglePredefinedSymptom = (symptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((s) => s !== symptom)
        : [...prev, symptom].slice(0, 10)
    );
  };

  const addCustomSymptom = (e) => {
    if (
      e.key === "Enter" &&
      customSymptom.trim() &&
      !selectedSymptoms.includes(customSymptom.trim())
    ) {
      e.preventDefault();
      setSelectedSymptoms((prev) => {
        const newSymptoms = [...prev, customSymptom.trim()];
        return newSymptoms.slice(0, 10);
      });
      setCustomSymptom("");
    }
  };

  const removeSymptom = (symptom) => {
    setSelectedSymptoms((prev) => prev.filter((s) => s !== symptom));
  };

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-xl border-gray-200"
          onClick={prevStep}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <Progress value={100} className="h-2 w-32" />
        <Button variant="ghost" className="text-sm text-gray-600">
          Skip
        </Button>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold mb-4">
        Do you have any symptoms/allergy?
      </h1>

      {/* Microorganism Illustration */}
      <div className="flex justify-center mb-8">
        <img src="/sys.png" alt="" />
      </div>

      {/* Predefined Symptoms */}
      <div className="flex flex-wrap gap-2 mb-4">
        {predefinedSymptoms.map((symptom) => (
          <button
            key={symptom}
            onClick={() => togglePredefinedSymptom(symptom)}
            className={`px-3 py-2 rounded-full text-sm transition-colors ${
              selectedSymptoms.includes(symptom)
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {symptom}
          </button>
        ))}
      </div>

      {/* Custom Symptom Input */}
      <textarea
        value={customSymptom}
        onChange={(e) => setCustomSymptom(e.target.value)}
        onKeyDown={addCustomSymptom}
        placeholder="Add custom symptom (press Enter to add)"
        className="w-full p-2 border rounded-lg mb-4 resize-none h-20 focus:outline-blue-500"
      />

      {/* Selected Symptoms Tags */}
      {selectedSymptoms.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedSymptoms.map((symptom) => (
            <div
              key={symptom}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
            >
              {symptom}
              <button onClick={() => removeSymptom(symptom)} className="ml-2">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selection Counter */}
      <div className="text-sm text-gray-500 mb-4">
        {selectedSymptoms.length}/10
      </div>

      {/* Continue Button */}
      <button
        className="w-full bg-[#0066FF] text-white rounded-xl py-4 flex items-center justify-center gap-2 text-[16px] font-medium"
        onClick={handleNext}
      >
        Continue
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
