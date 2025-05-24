const auth = require("./firebase"); // Import Firebase Auth
const { errorLog } = require("@dtwin/config");
const { getCache, setCache, delCache } = require("@dtwin/config");
const jwt = require('jsonwebtoken'); // Add this line

const generateOTP = () => Math.floor(1000 + Math.random() * 9000).toString();

const storeOTP = async (email, otp) => {
  await setCache(`otp:${email}`, otp, 300); // OTP expires in 5 minutes
};

const verifyOTP = async (email, otp) => {
  const storedOTP = await getCache(`otp:${email}`);
  if (!storedOTP) return false;

  await delCache(`otp:${email}`); // Delete the OTP after verification
  return storedOTP === otp;
};

const generateOneTimeToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const verifyOneTimeToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

async function verifyAndExtractUser(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      mobileNumber: decodedToken.phone_number || null,
    };
  } catch (error) {
    errorLog("Firebase Token Verification Failed:", error.message);
    throw new Error("Invalid Firebase ID token");
  }
}

module.exports = { 
  verifyAndExtractUser, 
  generateOTP, 
  storeOTP, 
  verifyOTP,
  generateOneTimeToken,
  verifyOneTimeToken 
};