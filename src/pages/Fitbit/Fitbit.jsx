// src/components/Fitbit.jsx

import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@tremor/react";
import { CheckCircle, Loader2, RefreshCcw, Link, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const BASE_URL = "https://test-prod-f427.onrender.com/api/connect/fitbit"; // Adjust to your backend URL

export default function Fitbit() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");

  // 1️⃣ On mount, check session
  useEffect(() => {
    const stored = sessionStorage.getItem("isAuthenticated") === "true";
    if (stored) {
      setIsAuthenticated(true);
    } else {
      checkSession();
    }
  }, []);

  // 2️⃣ Check if the user has already connected Fitbit
  const checkSession = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/session`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      if (data.error) {
        console.error("Session check error:", data.error);
      }
      if (data.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem("isAuthenticated", "true");
      }
    } catch (err) {
      console.error("Session check failed:", err);
    }
  };

  // 3️⃣ Kick off the OAuth flow
  const handleAuth = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/authorize`, {
        withCredentials: true,
      });
      window.location.href = data.authUrl;
    } catch (err) {
      console.error("Auth error:", err);
      toast.error("Failed to initiate Fitbit connection");
    }
  };

  // 5️⃣ Acknowledge save (no-op on server)
  const saveFitbitData = async (payload) => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        toast.error("Authentication expired. Please reconnect.");
        return;
      }
      await axios.post(`${BASE_URL}/save`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
    } catch (err) {
      console.error("Error saving Fitbit data:", err);
    }
  };

  // Main button handler
  const handleButtonClick = () => {
    if (isAuthenticated) {

    } else {
      handleAuth();
    }
  };

  return (
    <Card className="relative bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-6 rounded-xl shadow-lg overflow-hidden w-full max-w-md">
      {/* Background Waves */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 200">
          <path
            d="M0,100 C50,150 150,50 200,100 C250,150 350,50 400,100 V200 H0 Z"
            fill="white"
            opacity="0.3"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-white p-3 rounded-full">
            <Watch className="text-blue-500 w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-xl">Fitbit Sync</h3>
            <p className="text-sm text-white/80">
              {isAuthenticated ? "Connected & Synced" : "Not Connected"}
            </p>
          </div>
        </div>

        <button
          onClick={handleButtonClick}
          disabled={isSyncing}
          className="w-full bg-white text-blue-500 hover:bg-white/90 flex items-center justify-center gap-2 px-6 py-3 rounded-md shadow-md"
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Syncing...
            </>
          ) : isAuthenticated ? (
            <>
              <RefreshCcw className="w-5 h-5" /> Sync Now
            </>
          ) : (
            <>
              <Link className="w-5 h-5" /> Connect Fitbit
            </>
          )}
        </button>
      </div>
    </Card>
  );
}
