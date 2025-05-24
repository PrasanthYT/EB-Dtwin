import { useState, useEffect } from "react";
import axios from "axios";
import { Card } from "@tremor/react";
import { CheckCircle, Loader2, RefreshCcw, Link, Watch } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast"; // ✅ Toast for error messages

function Fitbit() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem("isAuthenticated") === "true"
  );
  const [fitbitData, setFitbitData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) checkSession();
  }, []);

  // ✅ Check if user is authenticated via session
  const checkSession = async () => {
    try {
      const response = await axios.get("http://localhost:4200/api/fitbit/session", {
        withCredentials: true,
      });

      if (response.data.authenticated) {
        setIsAuthenticated(true);
        sessionStorage.setItem("isAuthenticated", "true"); // ✅ Store in sessionStorage
        fetchFitbitData();
      }
    } catch (error) {
      console.error("Session check failed:", error);
    }
  };

  // ✅ Start Fitbit Authentication
  const handleAuth = async () => {
    setError(null);
    try {
      const response = await axios.get("http://localhost:4200/auth/fitbit", {
        withCredentials: true,
      });
      window.location.href = response.data.authUrl; // Redirect to Fitbit login
    } catch (error) {
      setError(error.response?.data?.error || "Error initiating authentication");
      console.error("Auth error:", error);
      toast.error("Failed to authenticate with Fitbit");
    }
  };

  // ✅ Fetch Fitbit Data and Push to Backend
  const fetchFitbitData = async () => {
    setError(null);
    setIsSyncing(true);

    try {
      const response = await axios.get("http://localhost:4200/api/fitbit/data", {
        withCredentials: true,
      });

      setFitbitData(response.data);
      setIsAuthenticated(true);

      // ✅ Send Fitbit data to backend for saving
      await saveFitbitData(response.data);
      toast.success("Fitbit data synced successfully!");
    } catch (error) {
      setError(error.response?.data?.error || "Error fetching Fitbit data");
      console.error("❌ Data fetch error:", error);
      toast.error("Error fetching Fitbit data. Please try again.");

      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        sessionStorage.removeItem("isAuthenticated"); // ✅ Remove if session expired
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // ✅ Save Fitbit Data to Backend with JWT Authorization
  const saveFitbitData = async (data) => {
    try {
      const token = sessionStorage.getItem("token"); // 🔥 Get JWT token
      if (!token) {
        console.error("❌ No auth token found in sessionStorage");
        toast.error("Authentication expired. Please reconnect.");
        return;
      }

      await axios.post("http://localhost:4200/api/fitbit/save", data, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });

      console.log("✅ Fitbit data saved successfully!");
    } catch (error) {
      console.error("❌ Error saving Fitbit data:", error.response?.data || error);
      toast.error("Error saving Fitbit data.");
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

        {/* Main Content */}
        <div className="relative space-y-6">
          {/* Fitbit Icon & Status */}
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

          {/* Full-Width Connect / Sync Button */}
          <button
            onClick={isAuthenticated ? fetchFitbitData : handleAuth}
            disabled={isLoading || isSyncing}
            className="w-full bg-white text-blue-500 hover:bg-white/90 flex items-center justify-center gap-2 px-6 py-3 rounded-md shadow-md"
          >
            {isLoading || isSyncing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />{" "}
                {isAuthenticated ? "Syncing..." : "Connecting..."}
              </>
            ) : (
              <>
                {isAuthenticated ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Link className="w-5 h-5" />
                )}
                {isAuthenticated ? "Sync Now" : "Connect Fitbit"}
              </>
            )}
          </button>
        </div>
      </Card>
  );
}

export default Fitbit;
