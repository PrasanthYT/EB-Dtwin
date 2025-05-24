import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import SplashScreen from "./SplashScreen";

const StartingPage = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!showSplash) {
      setFadeOut(true); // Trigger fade-in transition after splash disappears
    }
  }, [showSplash]);

  return (
    <div className="h-screen flex items-center justify-center bg-white relative overflow-hidden">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      <div
        className={`max-w-md text-center flex flex-col items-center transition-opacity duration-500 ease-in-out ${
          fadeOut ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Logo at the Top */}
        <div className="bg-blue-500 rounded-xl p-2 mb-4">
          <img src="/Vector.png" alt="D-Twin Logo" className="w-12 h-12" />
        </div>

        {/* Welcome Text */}
        <h1 className="text-2xl font-bold mb-4">
          Welcome to <span className="text-[#023324]">D-Twin</span>
        </h1>

        {/* Illustration */}
        <img
          src="/firstpage.png"
          alt="Welcome Illustration"
          className="w-full max-w-xs mb-6"
        />

        {/* Get Started Button */}
        <Link
          to="/onboarding"
          className="flex items-center justify-center gap-2 w-48 p-3 bg-[#0066FF] text-white text-lg rounded-xl shadow-md transition-colors duration-300"
        >
          Get Started{" "}
          <span className="text-lg">
            <img src="/arrow.png" alt="arrow" className="w-7 h-7" />
          </span>
        </Link>

        {/* Sign In Link */}
        <p className="mt-4 text-[#667085] text-sm">
          Already have an account?{" "}
          <Link
            to="/signin"
            className="text-[#ff3c3c] font-bold hover:underline transition-colors duration-300"
          >
            Sign In.
          </Link>
        </p>
      </div>
    </div>
  );
};

export default StartingPage;
