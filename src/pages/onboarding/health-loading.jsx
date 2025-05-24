import React from "react";

const HealthLoading = () => {
  return (
    <div className="h-screen w-full bg-blue-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative background curves */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/20 rounded-full -translate-y-1/4 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/20 rounded-full translate-y-1/4 -translate-x-1/4" />

      {/* Plus icon with continuous rotation */}
      <div className="mb-4 animate-spin">
        <img
          src="/Vector.png"
          className="w-13 h-13 text-white"
          alt="Loading icon"
        />
      </div>

      {/* Loading text */}
      <div className="flex flex-col items-center space-y-1">
        <p className="text-white text-md font-medium">
          Compiling Assessment data...
        </p>
        <p className="text-white/80 text-sm">Please wait!</p>
      </div>
    </div>
  );
};

export default HealthLoading;
