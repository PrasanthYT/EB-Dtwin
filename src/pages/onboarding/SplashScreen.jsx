import { useEffect } from "react";

const SplashScreen = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000); // Disappear after 3s
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/pattern.png')] bg-cover opacity-20"></div>

      <div className="text-center max-w-xs px-6 relative z-10">
        {/* Quote Icon */}
        <span className="text-3xl text-blue-600 font-bold">❝</span>

        {/* Quote Text */}
        <h2 className="text-xl font-bold text-gray-800 mt-2">
          "Health is the complete harmony of the body and soul."
        </h2>

        {/* Author Name */}
        <p className="text-blue-600 font-semibold mt-4">— Aristotle</p>
      </div>
    </div>
  );
};

export default SplashScreen;
