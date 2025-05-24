import { Plus, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "/Vector.png";

export default function HealthSetup({ healthScore, nextStep }) {
  // ✅ Accept nextStep as a prop
  return (
    <div className="min-h-screen bg-blue-600 px-6 pb-8 relative overflow-hidden flex items-center justify-center">
      {/* Background Pattern with Logo Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,#4287f5,#0055ff)] opacity-90" />
      <div className="absolute inset-0 flex flex-wrap gap-10 opacity-10">
        {[...Array(10)].map((_, i) => (
          <img
            key={i}
            src={Logo}
            alt="Background Texture"
            className="w-16 h-16 absolute"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-6">
        {/* Score Card */}
        <Card className="w-36 h-36 bg-white rounded-3xl flex flex-col items-center justify-center shadow-xl relative border border-blue-200">
          <span className="text-blue-600 text-6xl font-bold">
            {healthScore}
          </span>
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white rounded-full p-3 shadow-lg border border-blue-300 flex items-center justify-center">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
        </Card>

        {/* Text Content */}
        <h1 className="text-3xl font-bold text-white drop-shadow-lg">
          You're All Set Up.
        </h1>
        <p className="text-2xl font-semibold text-white drop-shadow-lg">
          Your health score is {healthScore}.
        </p>

        {/* Status Indicators */}
        <div className="flex gap-6 text-white/90">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            <span className="text-md text-left">16 AI Suggestions</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-md text-left">2 Anomalies</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={nextStep} // ✅ Call nextStep when clicked
          className="outline-white text-white hover:bg-white/90 rounded-md px-8 py-6 text-lg font-semibold"
          variant="ghost"
        >
          Let's Get Healthy
          <Plus className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
