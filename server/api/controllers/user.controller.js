const { userService } = require("../../services/user/index");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
} = require("@dtwin/config");
const { verifyAndExtractUser } = require("../../security/otp");

const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.userId);

    if (!user) return errorResponse(res, { message: "User not found" }, 404);
    successResponse(res, "User fetched successfully", user);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const signup = async (req, res) => {
  try {
    const newUser = await userService.signUp(req.body);
    successResponse(res, "User created successfully", newUser, 201);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "User signup failed", error);
  }
};

const signin = async (req, res) => {
  try {
    const input = {
      idToken: req.body.idToken,
      inputMobile: req.body.mobile_number,
    };
    const user = await userService.signIn(input);
    successResponse(res, "User logged in successfully", user);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "User signin failed", error);
  }
};

const updateUser = async (req, res) => {
  try {
    const updatedUser = await userService.updateUser(req.user.userId, req.body);

    if (!updatedUser) return errorResponse(res, "User not found", 404);
    successResponse(res, "User updated successfully", updatedUser);
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const deleteUser = async (req, res) => {
  try {
    const deletedUser = await userService.deleteUser(req.user.userId);
    if (!deletedUser)
      return errorResponse(res, "User not found", deletedUser, 404);
    successResponse(res, "User deleted successfully");
  } catch (error) {
    fatal(error);
    errorResponse(res, error);
  }
};

const requestOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const response = await userService.requestOTP(email);
    successResponse(res, response.message, response);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message, error);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const userId = req.user.userId;
    const response = await userService.verifyOTPCode(email, otp, userId);
    successResponse(res, response.message, response);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message, error);
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.headers["authorization"];
    const userId = req.user.userId;
    const token =
      refreshToken && refreshToken.startsWith("Bearer ")
        ? refreshToken.split(" ")[1]
        : null;

    if (!token) {
      return errorResponse(res, "Invalid or missing refresh token", 401);
    }
    const newAccessToken = await userService.refreshAccessToken(token, userId);
    successResponse(res, "Access token refreshed successfully", {
      accessToken: newAccessToken,
    });
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message, error);
  }
};

const sendFeedbackEmail = async (req, res) => {
  try {
    const { feedback, rating } = req.body;
    const userId = req.user.userId;
    const userDetails = await userService.getUserById(userId);
    if (!userDetails) return errorResponse(res, "User not found", 404);

    const result = await userService.sendFeedbackEmailToSupport(
      userDetails,
      feedback,
      rating
    );
    successResponse(res, result.message);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Feedback processing failed", error);
  }
};

const getAllFeedbacks = async (req, res) => {
  try {
    const { password, email, ...filters } = req.query;

    // Check password (use environment variable for security)
    if (password !== process.env.ADMIN_FEEDBACK_PASSWORD) {
      return errorResponse(res, "Unauthorized access", 401);
    }

    // Validate target email
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return errorResponse(res, "Valid email address required", 400);
    }

    // Get all feedbacks with filters
    const feedbacks = await userService.retrieveFeedbacks(filters);

    // Send email with feedbacks
    const { sendAllFeedbacksEmail } = require("../../security/emailService");
    await sendAllFeedbacksEmail(email, feedbacks);

    successResponse(
      res,
      "Feedbacks retrieved and sent successfully",
      feedbacks
    );
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Failed to retrieve feedbacks", error);
  }
};

const initiateSignup = async (req, res) => {
  try {
    const { email, password, first_name, last_name, mobile_number } = req.body;

    const result = await userService.initiateEmailSignup({
      email,
      password,
      first_name,
      last_name,
      mobile_number,
    });

    if (!result.success) {
      return successResponse(res, result.message, result);
    }

    successResponse(res, result.message, { token: result.token });
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Failed to initiate signup", error);
  }
};

const completeSignup = async (req, res) => {
  try {
    const { token, otp } = req.body;
    const result = await userService.completeEmailSignup(otp, token);
    successResponse(res, "User created successfully", result.tokens);
  } catch (error) {
    const statusCode = error.message.includes("already registered") ? 409 : 400;
    errorResponse(res, error.message, statusCode);
  }
};

const emailLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await userService.emailSignIn(email, password);

    if (!result.success) {
      return successResponse(res, result.message, result);
    }

    successResponse(res, "User logged in successfully", result.tokens);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Login failed", error);
  }
};

const oauthSignin = async (req, res) => {
  try {
    const { email, provider, first_name, last_name, mobile_number } = req.body;

    const result = await userService.oAuthSignIn(email, provider, {
      first_name,
      last_name,
      mobile_number,
    });

    if (!result.success) {
      return successResponse(res, result.message, result);
    }

    successResponse(res, "User logged in successfully", result.tokens);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "OAuth login failed", error);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await userService.initiatePasswordReset(email);

    if (!result.success) {
      return successResponse(res, result.message, result);
    }

    successResponse(res, result.message, { token: result.token });
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "Failed to request password reset",
      error
    );
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, otp, password } = req.body;

    const result = await userService.completePasswordReset(
      token,
      otp,
      password
    );

    successResponse(res, result.message);
  } catch (error) {
    fatal(error);
    errorResponse(res, error.message || "Failed to reset password", error);
  }
};

module.exports = {
  getUserById,
  signup,
  signin,
  updateUser,
  deleteUser,
  requestOTP,
  verifyOTP,
  refreshAccessToken,
  sendFeedbackEmail,
  getAllFeedbacks,
  initiateSignup,
  completeSignup,
  emailLogin,
  oauthSignin,
  forgotPassword,
  resetPassword,
};
