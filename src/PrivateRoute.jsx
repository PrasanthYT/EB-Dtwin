import {jwtDecode} from "jwt-decode";
import { Navigate } from "react-router-dom";

// ✅ PrivateRoute with Token Expiry Check
const PrivateRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");

  if (!token) return <Navigate to="/signin" replace />;

  try {
    const decoded = jwtDecode(token); // Decode JWT
    const currentTime = Date.now() / 1000; // Convert to seconds

    if (decoded.exp < currentTime) {
      sessionStorage.removeItem("token"); // Remove expired token
      return <Navigate to="/signin" replace />;
    }
  } catch (error) {
    console.error("Invalid Token:", error);
    sessionStorage.removeItem("token"); // Remove invalid token
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default PrivateRoute;