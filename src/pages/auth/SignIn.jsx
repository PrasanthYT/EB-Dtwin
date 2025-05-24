import { useState } from "react";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { Eye, EyeOff } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom"; // Import useNavigate
// import { auth, googleProvider, signInWithPopup } from "../../lib/firebase";

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:4200/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid credentials. Please try again.");
      }

      toast.success("Login successful!");
      
      // Save token or user info in localStorage/sessionStorage if needed
      sessionStorage.setItem("token", data.token);

      setEmail("");
      setPassword("");

      // Redirect to the dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1000); // Delay for better UX
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // const handleGoogleSignIn = async () => {
  //   try {
  //     const result = await signInWithPopup(auth, googleProvider);
  //     const user = result.user;
  
  //     const userData = {
  //       name: user.displayName,
  //       email: user.email,
  //       photoURL: user.photoURL,
  //       uid: user.uid,
  //     };
  
  //     localStorage.setItem("token", user.accessToken);
  
  //     const response = await fetch("http://localhost:4200/api/auth/google-signup", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(userData),
  //     });
  
  //     const data = await response.json();
  
  //     if (!response.ok) {
  //       throw new Error(data.message || "Failed to store user in DB");
  //     }
  
  //     toast.success(`Welcome, ${user.displayName}!`);
  //     setTimeout(() => navigate("/dashboard"), 1000);
  //   } catch (error) {
  //     console.error(error);
  //     toast.error("Google Sign-In failed. Please try again.");
  //   }
  // };
  
  const handleSignup = () => {
    navigate("/signup");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 relative">
      <Toaster position="top-center" reverseOrder={false} />

      {/* Blue Header Section */}
      <div className="absolute top-0 left-0 w-full bg-[#1A2B50] h-40 rounded-b-3xl flex flex-col items-center justify-center">
        <img src="/Vector.png" alt="Sign In Icon" className="w-8 h-8" />
        <h2 className="text-white text-2xl font-semibold mt-3">Sign In</h2>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden relative mt-36">
        <div className="px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-700 text-sm font-medium">Email Address</label>
              <div className="relative mt-1">
                <FaEnvelope className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium">Password</label>
              <div className="relative mt-1">
                <FaLock className="absolute left-3 top-3 text-gray-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-10 pr-10 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-500"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <a href="#" className="text-sm text-gray-500 hover:underline">Forgot Password?</a>
            </div>

            <button
              type="submit"
              className={`w-full mt-2 py-3 bg-blue-600 text-white font-medium rounded-lg transition flex items-center justify-center ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
              }`}
              disabled={loading}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="my-6 flex items-center justify-center">
            <span className="text-gray-500">OR</span>
          </div>

          <button
            // onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center py-3 border rounded-lg hover:bg-gray-100 transition"
          >
            <img src="/googlelogo.png" alt="Google" className="w-6 h-6 mr-2" />
            Sign in with Google
          </button>

          <div className="mt-4 text-center">
            <p className="text-sm">
              Don’t have an account?{" "}
              <a onClick={handleSignup} className="text-red-500 font-medium hover:underline">Sign Up</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
