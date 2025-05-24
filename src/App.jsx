import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";

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
       <Route path="/" element={<SignUp/>} />
       <Route path="/signin" element={<SignIn/>} />
      </Routes>
    </Router>
  );
};

export default App;
