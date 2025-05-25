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
import Chatbot from "./pages/ai/chatbot";
import GutDetailedReport from "./pages/dashboard/gut-detailed-report";
import FoodSection from "./pages/dashboard/food-section";
import DiseasePrediction from "./pages/dashboard/disease-prediction";
import HeartDetailedReport from "./pages/dashboard/heart-detailed-report";
import PancreasDetailedReport from "./pages/dashboard/pancreas-detailed-report";

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
        <Route path="/dashboard" element={<HealthDashboard/>}/>
        <Route path="/chatbot" element={<Chatbot/>}/>
        <Route path="/guthealth" element={<GutDetailedReport/>}/>
        <Route path="/analytics" element={<AISuggestionsPage/>}/>
        <Route path="/3d-model" element={<HealthVisualizationApp/>}/>
        <Route path="/foodmodule" element={<FoodSection/>}/>
        <Route path="/diseaseprediction" element={<DiseasePrediction/>}/>
        <Route path="/dashboard/heart-detailed-report" element={<HeartDetailedReport/>}/>
        <Route path="/dashboard/gut-detailed-report" element={<GutDetailedReport/>}/>
        <Route path="/dashboard/pancreas-detailed-report" element={<PancreasDetailedReport/>}/>
        <Route path="/simulation" element={<BodySimulator/>}/>
      </Routes>
    </Router>
  );
};

export default App;