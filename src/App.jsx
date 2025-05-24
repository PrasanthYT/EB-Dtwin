import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import HealthGoals from "./pages/onboarding/health-goal";
import HealthGenders from "./pages/onboarding/health-gender";
import WeightSelector from "./pages/onboarding/health-weight";
import AgeSelector from "./pages/onboarding/health-age";
import ScrollableMedicationSelection from "./pages/onboarding/health-medications";
import HealthSymptoms from "./pages/onboarding/health-symptoms";
import HealthSetup from "./pages/onboarding/health-setup";
import HealthDashboard from "./pages/Dashboard";
import HeartDetailedReport from "./pages/dashboard/heart-detailed-report";
import GutDetailedReport from "./pages/dashboard/gut-detailed-report";
import PancreasDetailedReport from "./pages/dashboard/pancreas-detailed-report";

// // ✅ PublicRoute to prevent signed-in users from accessing auth pages
// const PublicRoute = ({ children }) => {
//   const token = sessionStorage.getItem("token");
//   return token ? <Navigate to="/dashboard" replace /> : children;
// };

const App = () => {
//   const [isSplashVisible, setIsSplashVisible] = useState(true);
//   const [hasVisited, setHasVisited] = useState(
//     localStorage.getItem("hasVisited")
//   );

//   // ✅ Show splash screen for 2.5 seconds before routing
//   useEffect(() => {
//     setTimeout(() => setIsSplashVisible(false), 2500);
//   }, []);

//   // ✅ Handle onboarding completion
//   const markOnboardingComplete = () => {
//     localStorage.setItem("hasVisited", "true");
//     setHasVisited("true");
//   };

  // ✅ Show splash screen before routing
//   if (isSplashVisible) {
//     return <SplashScreen />;
//   }

  return (
    <Router>
      <Routes>
       <Route path="/" element={<HealthDashboard />} />
       <Route path="/signin" element={<SignIn/>} />
      </Routes>
    </Router>
  );
};

export default App;
