import { useState } from "react";
import { Link } from "react-router-dom";
import { Progress } from "../ui/progress"; // Assuming this is your progress bar component

// Onboarding Screens Data (Updated with colors)
const onboardingScreens = [
  {
    title: "Personalize Your Health with Smart AI.",
    description: "Achieve your wellness goals with AI-powered insights.",
    image: "/secondpage.png",
    bgColor: "#FFFFFF", // Background color for this screen
    buttonColor: "#0066FF", // Button color for this screen
  },
  {
    title: "Your Intelligent Fitness Companion.",
    description: "Track calories & fitness with AI recommendations.",
    image: "/thirdpage.png",
    bgColor: "#FFFFFF",
    buttonColor: "#0066FF",
  },
  {
    title: "Empathic AI Wellness Chatbot For All.",
    description: "Experience compassionate AI-based care.",
    image: "/fourthpage.png",
    bgColor: "#FFFFFF",
    buttonColor: "#0066FF",
  },
  {
    title: "Intuitive Nutrition & Med Tracker with AI.",
    description: "Easily track your medication & nutrition with AI.",
    image: "/fifthpage.png",
    bgColor: "#FFFFFF",
    buttonColor: "#0066FF",
  },
  {
    title: "Helpful Resources & Community.",
    description: "Join a community of 5,000+ users dedicated to health.",
    image: "/sixthpage.png",
    bgColor: "#FFFFFF",
    buttonColor: "#0066FF",
  },
];

const Onboarding = () => {
  const [currentScreen, setCurrentScreen] = useState(0);

  const nextScreen = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  return (
    <div
      className="h-screen flex flex-col items-center justify-between"
      style={{ backgroundColor: onboardingScreens[currentScreen].bgColor }}
    >
      {/* Progress Bar */}
      <Progress
        value={((currentScreen + 1) / onboardingScreens.length) * 100}
        className="w-full fixed top-0 z-10"
      />

      {/* Onboarding Content */}
      <div className="w-full h-full flex flex-col items-center justify-between relative overflow-hidden">
        {/* Text Content */}
        <div className="mt-12 px-6 text-left z-20">
          <h2 className="text-xl font-bold mb-2">
            {onboardingScreens[currentScreen].title}
          </h2>
          <p className="text-gray-600 mt-2">
            {onboardingScreens[currentScreen].description}
          </p>
        </div>

        {/* Image */}
        <div className="w-full h-full overflow-hidden">
          <img
            src={onboardingScreens[currentScreen].image}
            alt="Onboarding"
            className="w-full h-full object-cover mt-6"
          />
        </div>

        {/* Button (Overlay) */}
        <div className="absolute bottom-8 right-8 transform -translate-x-1/2 z-20">
          {currentScreen < onboardingScreens.length - 1 ? (
            <button
              onClick={nextScreen}
              className="rounded-xl w-14 h-14 flex items-center justify-center"
              style={{
                backgroundColor: onboardingScreens[currentScreen].buttonColor,
              }}
            >
              <img src="/arrow.png" alt="Next" className="w-8 h-8 text-white" />
            </button>
          ) : (
            <Link
              to="/signin"
              className="rounded-xl w-14 h-14 flex items-center justify-center bg-[#023324] text-white"
            >
              <img
                src="/arrow.png"
                alt="Get Started"
                className="w-8 h-8 text-white"
              />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
