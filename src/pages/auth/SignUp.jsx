import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock } from "react-icons/fa";
import { Eye, EyeOff, Plus } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function SignUp() {
  const [step, setStep] = useState("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile_number, setMobileNumber] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        "https://test-prod-f427.onrender.com/api/users/email/initiate-signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            first_name: "Monesh",
            last_name: "B",
            mobile_number,
          }),
        }
      );

      const data = await response.json();
      console.log("Signup response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Signup initiation failed");
      }

      toast.success("OTP sent to your email.");
      setToken(data.data.token); // Save the token for OTP verification
      setStep("otp"); // Move to OTP step
    } catch (error) {
      console.log("Error during signup:", error);
      toast.error(error[0] || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerification = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        "https://test-prod-f427.onrender.com/api/users/email/complete-signup",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            otp,
          }),
        }
      );

      const data = await response.json();
      console.log("OTP verification response:", data);
      if (!response.ok) {
        throw new Error(data.message || "OTP verification failed");
      }

      sessionStorage.setItem("token", data.token);
      toast.success("Account verified! Redirecting...");

      setTimeout(() => {
        navigate("/home");
      }, 2000);
    } catch (error) {
      console.log("Error during OTP verification:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignin = () => {
    navigate("/signin");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 relative">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="absolute top-0 left-0 w-full bg-[#1A2B50] h-40 rounded-b-3xl flex flex-col items-center justify-center">
        <Plus className="text-white h-8 w-8" />
        <h2 className="text-white text-2xl font-semibold mt-3">
          {step === "signup" ? "Sign Up For Free!" : "Enter OTP to Verify"}
        </h2>
      </div>
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden relative mt-36">
        <div className="px-6 py-8">
          {step === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <FaEnvelope className="absolute left-3 top-3 text-gray-500" />
                  <input
                    type="email"
                    className="w-full pl-10 pr-4 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="test@dtwin.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium">
                  Mobile Number
                </label>
                <div className="relative mt-1">
                  <input
                    type="tel"
                    className="w-full pl-4 pr-4 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Enter your mobile number"
                    value={mobile_number}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    required
                    pattern="[0-9]{10,15}"
                    maxLength={15}
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium">
                  Password
                </label>
                <div className="relative mt-1">
                  <FaLock className="absolute left-3 top-3 text-gray-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="****************"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-medium">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <FaLock className="absolute left-3 top-3 text-gray-500" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full pl-10 pr-10 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="****************"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-500"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full mt-2 py-3 bg-blue-600 text-white font-medium rounded-lg transition flex items-center justify-center ${
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-blue-700"
                }`}
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Sign Up"}
                <Plus className="ml-2 h-5 w-5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerification} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium">
                  OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  pattern="\d{4}"
                  className="w-full px-4 py-2 text-gray-900 border rounded-lg shadow-md focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Enter 4-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className={`w-full mt-2 py-3 bg-green-600 text-white font-medium rounded-lg transition ${
                  loading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-green-700"
                }`}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {step === "signup" && (
            <div className="mt-4 text-center">
              <p className="text-sm">
                Already have an account?{" "}
                <a
                  onClick={handleSignin}
                  className="text-red-500 font-medium hover:underline cursor-pointer"
                >
                  Sign In.
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
