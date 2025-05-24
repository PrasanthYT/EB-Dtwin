const express = require("express");
const router = express.Router();
const { validateEmailSignup, validateCompleteSignup, validateEmailLogin, validateOAuthSignin,  } = require("../validation/userValidator");
const userController = require("../controllers/user.controller");
const {
  authMiddleware,
  refreshMiddleWare,
} = require("../middlewares/auth.middleware");
const {
  validateCreateUser,
  validateUpdateUser,
  validateForgotPassword,
  validateResetPassword,
  validateRequest,
  validateOTPRequest,
  validateOTPVerification,
  validateFeedback,
} = require("../validation/userValidator");

// Existing routes
router.get("/", validateRequest, authMiddleware, userController.getUserById);
router.delete("/", validateRequest, authMiddleware, userController.deleteUser);
router.patch(
  "/",
  validateUpdateUser,
  validateRequest,
  authMiddleware,
  userController.updateUser
);

router.post(
  "/signup",
  validateCreateUser,
  validateRequest,
  userController.signup
);
router.post("/signin", validateRequest, userController.signin);

router.post(
  "/request-otp",
  validateOTPRequest,
  validateRequest,
  authMiddleware,
  userController.requestOTP
);
router.post(
  "/verify-otp",
  validateOTPVerification,
  validateRequest,
  authMiddleware,
  userController.verifyOTP
);
router.post(
  "/refresh-token",
  refreshMiddleWare,
  userController.refreshAccessToken
);

// Email signup flow
router.post(
  "/email/initiate-signup",
  validateEmailSignup,
  validateRequest,
  userController.initiateSignup
);

router.post(
  "/email/complete-signup",
  validateCompleteSignup,
  validateRequest,
  userController.completeSignup
);

// Email login
router.post(
  "/email/login",
  validateEmailLogin,
  validateRequest,
  userController.emailLogin
);

// OAuth signin/signup
router.post(
  "/oauth/signin",
  validateOAuthSignin,
  validateRequest,
  userController.oauthSignin
);

// Password reset flow
router.post(
  "/password/forgot",
  validateForgotPassword,
  validateRequest,
  userController.forgotPassword
);

router.post(
  "/password/reset",
  validateResetPassword,
  validateRequest,
  userController.resetPassword
);

// Updated feedback route with validation
router.post(
  "/feedback", 
  validateFeedback, 
  validateRequest, 
  authMiddleware, 
  userController.sendFeedbackEmail
);

// New route to get all feedbacks
router.get("/admin/feedbacks", userController.getAllFeedbacks);

module.exports = router;