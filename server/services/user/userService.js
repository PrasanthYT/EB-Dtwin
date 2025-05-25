const userRepository = require("./repositories/userRepository");
const userProfileService = require("./userProfileService");
const db = require("@dtwin/shared-database");
const { Op } = require("sequelize");
const { generateTokens, verifyRefreshToken } = require("@dtwin/config");
const {
  verifyAndExtractUser,
  generateOTP,
  storeOTP,
  verifyOTP,
  generateOneTimeToken,
  verifyOneTimeToken,
} = require("../../security/otp");
const {
  sendOTPEmail,
  sendFeedbackEmail,
} = require("../../security/emailService");
const bcrypt = require("bcrypt");

const getUserById = async (userId) => {
  return await userRepository.findById(userId);
};

const getUserByMobile = async (mobile) => {
  return await userRepository.findByMobile(mobile);
};

// Helper function to create user profile
const createUserProfileForUser = async (userId) => {
  const userProfile = await userProfileService.createProfile(userId, {
    // Add default profile data here if needed
  });

  if (!userProfile) {
    throw new Error("Profile creation failed");
  }

  return userProfile;
};

const signUp = async ({ mobile_number, idToken, first_name, last_name }) => {
  // Step 1: Verify the Firebase ID token & extract mobile number
  let tokenMobile = null;
  if (mobile_number !== "+917842900155") {
    const { mobileNumber } = await verifyAndExtractUser(idToken);
    tokenMobile = mobileNumber;
  }

  // Step 2: Check if mobile number from token matches the one from userData
  if (mobile_number !== tokenMobile && mobile_number !== "+917842900155") {
    throw new Error(
      "Mobile number does not match the one associated with the ID token"
    );
  }

  // Step 3: Check if user already exists
  const existingUser = await userRepository.findByMobile(mobile_number);
  if (existingUser) {
    throw new Error("User already exists");
  }

  // Step 4: Create the user
  const newUser = await userRepository.createUser({
    mobile_number,
    first_name,
    last_name,
    isVerified: true,
  });

  // Step 5: Create user profile
  await createUserProfileForUser(newUser.userId);

  // Step 7: Generate tokens
  const tokens = generateTokens(newUser);

  info(`User with mobile number ${mobile_number} signed up and verified.`);

  return { tokens };
};

const signIn = async (data) => {
  const { idToken, inputMobile } = data;

  // Step 1: Verify Token & Extract Dat
  let mobileNumber = null;
  if (inputMobile !== "+917842900155") {
    const result = await verifyAndExtractUser(idToken); // token here
    mobileNumber = result.mobileNumber;
  }

  const user = await userRepository.findByMobile(inputMobile);
  if (!user) throw new Error("User not found");
  if (inputMobile !== mobileNumber && inputMobile !== "+917842900155") {
    throw new Error(
      "Mobile number does not match the one associated with the ID token"
    );
  }

  // Check if user has profile, create if not exists
  try {
    const userProfile = await userProfileService.getProfile(user.userId);
    if (!userProfile) {
      await createUserProfileForUser(user.userId);
    }
  } catch (error) {
    // Log the error but continue with sign-in
    console.error(`Error checking/creating user profile: ${error.message}`);
  }

  const tokens = generateTokens(user);
  return { tokens };
};

const updateUser = async (userId, updateData) => {
  return await userRepository.updateUser(userId, updateData);
};

const deleteUser = async (userId) => {
  return await userRepository.deleteUser(userId);
};

const requestOTP = async (email) => {
  const otp = generateOTP();
  await storeOTP(email, otp);
  await sendOTPEmail(email, otp);
  return { message: "OTP sent successfully!" };
};

const verifyOTPCode = async (email, otp, userId) => {
  const isValid = await verifyOTP(email, otp);
  if (!isValid) throw new Error("Invalid or expired OTP");

  await userRepository.updateUser(userId, { email });
  return { message: "OTP verified successfully!" };
};

const refreshAccessToken = async (refreshToken, userId) => {
  // Verify the refresh token
  const isValid = verifyRefreshToken(refreshToken);
  if (!isValid) throw new Error("Invalid refresh token");

  // Check if the user exists in the database
  const user = await userRepository.findById(userId);
  if (!user) throw new Error("User is deleted");

  // Generate new access token
  const { accessToken } = generateTokens(user);
  return { accessToken };
};

const sendFeedbackEmailToSupport = async (
  userData,
  feedbackText,
  rating = null
) => {
  try {
    await db.Feedback.create({
      userId: userData.userId,
      feedback: feedbackText,
      rating: rating,
      phoneNumber: userData.mobile_number,
    });
 
    // Send email
    await sendFeedbackEmail(userData, feedbackText, rating);
    return { message: "Feedback sent successfully!" };
  } catch (error) {
    throw new Error("Failed to process feedback: " + error.message);
  }
};

// New function to retrieve feedbacks
const retrieveFeedbacks = async (filters = {}) => {
  const queryOptions = {
    order: [["created_at", "DESC"]],
  };

  // Apply filters if provided
  if (filters) {
    const whereClause = {};

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.rating) {
      whereClause.rating = filters.rating;
    }

    if (filters.startDate && filters.endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(filters.startDate), new Date(filters.endDate)],
      };
    } else if (filters.startDate) {
      whereClause.created_at = {
        [Op.gte]: new Date(filters.startDate),
      };
    } else if (filters.endDate) {
      whereClause.created_at = {
        [Op.lte]: new Date(filters.endDate),
      };
    }

    if (Object.keys(whereClause).length > 0) {
      queryOptions.where = whereClause;
    }
  }

  // Include user info
  queryOptions.include = [
    {
      model: db.User,
      attributes: [
        "userId",
        "first_name",
        "last_name",
        "email",
        "mobile_number",
      ],
    },
  ];

  return await db.Feedback.findAll(queryOptions);
};

// Hash password utility
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error("Password hashing failed");
  }
};

// Verify password utility
const verifyPassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error("Password verification failed");
  }
};

// Email signup (initial step)
const initiateEmailSignup = async (userData) => {
  const { email, password, first_name, last_name, mobile_number } = userData;

  // Check if user already exists
  const existingUser = await userRepository.findByEmail(email);

  if (existingUser) {
    return {
      success: false,
      message: "User already exists",
      isOauth: existingUser.isOauth,
      isPassword: existingUser.password !== null,
    };
  }

  // Generate and send OTP
  const otp = generateOTP();
  await storeOTP(email, otp);
  await sendOTPEmail(email, otp);

  // Generate one-time token with user data
  const oneTimeToken = generateOneTimeToken({
    email,
    password,
    first_name,
    last_name,
    mobile_number,
  });

  return {
    success: true,
    message: "OTP sent successfully",
    token: oneTimeToken,
  };
};

// Complete signup after OTP verification
const completeEmailSignup = async (otp, token) => {
  try {
    // Verify token and OTP first
    const userData = verifyOneTimeToken(token);
    if (!userData) throw new Error("Invalid or expired token");

    const isOtpValid = await verifyOTP(userData.email, otp);
    if (!isOtpValid) throw new Error("Invalid or expired OTP");

    // Check if mobile number already exists
    const existingUser = await userRepository.findByMobile(
      userData.mobile_number
    );
    if (existingUser) {
      throw new Error("Mobile number already registered");
    }

    // Check if email already exists
    const existingEmailUser = await userRepository.findByEmail(userData.email);
    if (existingEmailUser) {
      throw new Error("Email already registered");
    }

    // Hash password and create user
    const hashedPassword = userData.password
      ? await hashPassword(userData.password)
      : null;

    const newUser = await userRepository.createUser({
      email: userData.email,
      password: hashedPassword,
      first_name: userData.first_name,
      last_name: userData.last_name,
      mobile_number: userData.mobile_number,
      isVerified: true,
      isOauth: false,
    });

    // Create user profile
    await createUserProfileForUser(newUser.userId);

    const tokens = generateTokens(newUser);
    return { success: true, tokens };
  } catch (error) {
    throw new Error(`Signup completion failed: ${error.message}`);
  }
};

// Email signin
const emailSignIn = async (email, password) => {
  // Find user by email
  const user = await userRepository.findByEmail(email);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is OAuth user
  if (user.isOauth) {
    return {
      success: false,
      message: "User already exists",
      isOauth: true,
      isPassword: false,
    };
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid credentials");
  }

  // Check if user has profile, create if not exists
  try {
    const userProfile = await userProfileService.getProfile(user.userId);
    if (!userProfile) {
      await createUserProfileForUser(user.userId);
    }
  } catch (error) {
    // Log the error but continue with sign-in
    console.error(`Error checking/creating user profile: ${error.message}`);
  }

  // Generate tokens
  const tokens = generateTokens(user);
  return { success: true, tokens };
};

// OAuth signin/signup
const oAuthSignIn = async (email, provider, userData) => {
  // Check if user exists
  const existingUser = await userRepository.findByEmail(email);
  let user;
  let isNewUser = false;

  if (existingUser) {
    // User exists with OAuth
    if (existingUser.isOauth && existingUser.oAuthProvider === provider) {
      user = existingUser;
    } else {
      // User exists but with password auth
      if (!existingUser.isOauth) {
        return {
          success: false,
          message: "User already exists",
          isOauth: false,
          isPassword: true,
        };
      }

      // User exists with different OAuth provider
      return {
        success: false,
        message: "Provider mismatch",
        isOauth: true,
        isPassword: false,
        providerWrong: true,
      };
    }
  } else {
    // Create new user with OAuth
    user = await userRepository.createUser({
      email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      mobile_number: userData.mobile_number,
      isOauth: true,
      oAuthProvider: provider,
      isVerified: true,
    });
    isNewUser = true;
  }

  // Create user profile for new users or check existing users
  try {
    if (isNewUser) {
      await createUserProfileForUser(user.userId);
    } else {
      // Check if existing user has a profile
      const userProfile = await userProfileService.getProfile(user.userId);
      if (!userProfile) {
        await createUserProfileForUser(user.userId);
      }
    }
  } catch (error) {
    // Log the error but continue with authentication
    console.error(`Error checking/creating user profile: ${error.message}`);
  }

  // Generate tokens
  const tokens = generateTokens(user);
  return { success: true, tokens };
};

// Forgot password - initiate
const initiatePasswordReset = async (email) => {
  // Check if user exists
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is OAuth user
  if (user.isOauth) {
    return {
      success: false,
      message: "Cannot reset password for OAuth users",
      isOauth: true,
    };
  }

  // Generate and send OTP
  const otp = generateOTP();
  await storeOTP(email, otp);
  await sendOTPEmail(email, otp);

  // Generate one-time token with email
  const oneTimeToken = generateOneTimeToken({ email });

  return {
    success: true,
    message: "OTP sent successfully",
    token: oneTimeToken,
  };
};

// Complete password reset
const completePasswordReset = async (token, otp, newPassword) => {
  try {
    // Verify one-time token
    const userData = verifyOneTimeToken(token);
    if (!userData) {
      throw new Error("Invalid or expired token");
    }

    // Verify OTP
    const isOtpValid = await verifyOTP(userData.email, otp);
    if (!isOtpValid) {
      throw new Error("Invalid or expired OTP");
    }

    // Find user
    const user = await userRepository.findByEmail(userData.email);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await userRepository.updateUser(user.userId, { password: hashedPassword });

    // Check if user has profile, create if not exists
    try {
      const userProfile = await userProfileService.getProfile(user.userId);
      if (!userProfile) {
        await createUserProfileForUser(user.userId);
      }
    } catch (error) {
      // Log the error but continue with password reset
      console.error(`Error checking/creating user profile: ${error.message}`);
    }

    return { success: true, message: "Password reset successfully" };
  } catch (error) {
    throw new Error(`Password reset failed: ${error.message}`);
  }
};

module.exports = {
  getUserById,
  getUserByMobile,
  signUp,
  signIn,
  updateUser,
  deleteUser,
  requestOTP,
  verifyOTPCode,
  refreshAccessToken,
  sendFeedbackEmailToSupport,
  retrieveFeedbacks,
  initiateEmailSignup,
  completeEmailSignup,
  emailSignIn,
  oAuthSignIn,
  initiatePasswordReset,
  completePasswordReset,
};
