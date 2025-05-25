import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import HealthDashboard from "./pages/Dashboard";
import HeartAnalysis from "./components/ui/HeartAnalysis";
import HealthSuggestions from "./components/ui/HealthSuggestions";
import WorkoutActivityPage from "./components/ui/WorkoutActivityPage";
import MindWellnessPage from "./components/ui/MindWellnessPage";
import WellnessResourcePage from "./components/ui/WellnessResourcePage";
import NutritionGuidancePage from "./components/ui/NutritionGuidancePage";
import Onboarding from "./pages/onboarding/LandingPage";
import StartingPage from "./pages/onboarding/StartingPage";
import Fitbit from "./pages/Fitbit/Fitbit";
import HealthHeartRate from "./pages/dashboard/health-heart-rate";
import HealthBloodPressure from "./pages/dashboard/health-blood-pressure";
import HealthWeightTracking from "./pages/dashboard/health-weight-tracking";
import AddMeds from "./pages/onboarding/health-addmeds";
import SplashScreen from "./pages/onboarding/SplashScreen";
import PrivateRoute from "./PrivateRoute";
import Settings from "./pages/dashboard/settings";
import HealthBloodSugar from "./pages/dashboard/health-blood-sugar";
import BodySimulator from "./pages/Simulation";
import HealthVisualizationApp from "./pages/dashboard/three-d-model";
import AISuggestionsPage from "./pages/dashboard/ai-suggestions-page";
import FoodSection from "./pages/dashboard/food-section";

// ✅ PublicRoute to prevent signed-in users from accessing auth pages
// const PublicRoute = ({ children }) => {
//   const token = sessionStorage.getItem("token");
//   return token ? <Navigate to="/dashboard" replace /> : children;
// };

const App = () => {
  // const [isSplashVisible, setIsSplashVisible] = useState(true);
  // const [hasVisited, setHasVisited] = useState(
  //   localStorage.getItem("hasVisited")
  // );

  // // ✅ Show splash screen for 2.5 seconds before routing
  // useEffect(() => {
  //   setTimeout(() => setIsSplashVisible(false), 2500);
  // }, []);

  // // ✅ Handle onboarding completion
  // const markOnboardingComplete = () => {
  //   localStorage.setItem("hasVisited", "true");
  //   setHasVisited("true");
  // };

  // // ✅ Show splash screen before routing
  // if (isSplashVisible) {
  //   return <SplashScreen />;
  // }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AISuggestionsPage/>}/>
      </Routes>
    </Router>
  );
};

export default App;