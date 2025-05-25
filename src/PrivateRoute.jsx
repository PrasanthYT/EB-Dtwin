import { jwtDecode } from "jwt-decode";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
  const token = sessionStorage.getItem("token");
  console.log("Token in sessionStorage:", token);
  if (!token) return <Navigate to="/signin" replace />;

  try {
    const decoded = jwtDecode(token); // ✅ No secret key
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      sessionStorage.removeItem("token");
      return <Navigate to="/signin" replace />;
    }
  } catch (error) {
    console.error("Invalid Token:", error);
    sessionStorage.removeItem("token");
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default PrivateRoute;
