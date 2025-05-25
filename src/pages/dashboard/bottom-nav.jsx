import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, BarChart2, Camera, Sparkles, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";

const BottomNav = () => {
  const [activeTab, setActiveTab] = useState("home");

  const navItems = [
    { id: "home", icon: Home, label: "Home", path: "/dashboard" },
    { id: "stats", icon: BarChart2, label: "Stats", path: "/analytics" },
    { id: "food", icon: Sparkles, label: "Food", path: "/foodmodule" },
    { id: "settings", icon: Settings, label: "Settings", path: "/settings" }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <Card className="relative bg-white border-t shadow-lg mx-auto">
        {/* Camera Button - Positioned above the navigation bar */}
        <Link 
          to="/foodscan" 
          className="absolute left-1/2 -translate-x-1/2 -top-6"
        >
          <Button
            onClick={() => setActiveTab("camera")}
            className={cn(
              "w-20 h-20 p-0",
              "bg-gradient-to-r from-blue-500 to-blue-600",
              "hover:from-blue-600 hover:to-blue-700",
              "rounded-full shadow-lg border-4 border-white",
              "flex items-center justify-center",
              "transition-all duration-200 hover:scale-105 hover:-translate-y-1"
            )}
          >
            <Camera size={48} className="text-white" />
            <div className="absolute inset-0 bg-blue-600 rounded-full animate-pulse opacity-0 hover:opacity-20" />
          </Button>
        </Link>

        <nav className="px-2 py-2 sm:px-6">
          <div className="flex items-center justify-around relative">
            {/* Left Navigation Items */}
            {navItems.slice(0, 2).map((item) => (
              <Link
                to={item.path}
                key={item.id}
                className="relative flex-1"
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full min-w-[64px] h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200",
                    activeTab === item.id 
                      ? "text-blue-600 bg-blue-50" 
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform duration-200",
                    activeTab === item.id && "scale-110"
                  )} />
                  <span className="text-xs font-medium">
                    {item.label}
                  </span>
                </Button>
              </Link>
            ))}

            {/* Spacer for Camera Button */}
            <div className="flex-1 min-w-[64px]" />

            {/* Right Navigation Items */}
            {navItems.slice(2).map((item) => (
              <Link
                to={item.path}
                key={item.id}
                className="relative flex-1"
              >
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full min-w-[64px] h-12 flex flex-col items-center justify-center gap-1 rounded-xl transition-all duration-200",
                    activeTab === item.id 
                      ? "text-blue-600 bg-blue-50" 
                      : "text-gray-500 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveTab(item.id)}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform duration-200",
                    activeTab === item.id && "scale-110"
                  )} />
                  <span className="text-xs font-medium">
                    {item.label}
                  </span>
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </Card>
    </div>
  );
};

export default BottomNav;