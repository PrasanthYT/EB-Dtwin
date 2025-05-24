const { body } = require("express-validator");

// Validation rules using express-validator
const validateCreateUser = [
  body("mobile_number")
    .isString()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Invalid mobile number"),
  body("location").isString().withMessage("Invalid location"),
  body("first_name").isString().withMessage("Invalid first name"),
  body("last_name").isString().withMessage("Invalid last name"),
];

const validateUpdateUser = [
  body("age").optional().isNumeric().withMessage("Invalid age"),
  body("first_name").optional().isString().withMessage("Invalid first name"),
  body("last_name").optional().isString().withMessage("Invalid last name"),
  body("dob").optional().isISO8601().toDate().withMessage("Invalid date of birth"),
  body("user_plan").optional().isString().withMessage("Invalid user plan"),
  body("location").optional().isString().withMessage("Invalid location"),
];

const validateRequest = (req, res, next) => {
  const errors = require("express-validator").validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((item) => item.msg);
    return res.status(400).json({ error: errorMessages });
  }
  next();
};

const validateOTPRequest = [
  body("email").isEmail().withMessage("Invalid email format"),
];

const validateOTPVerification = [
  body("email").isEmail().withMessage("Invalid email format"),
  body("otp")
    .isNumeric()
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
];

const validateFeedback = [
  body("feedback")
    .isString()
    .notEmpty()
    .withMessage("Feedback text is required"),
  body("rating")
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be between 1 and 5"),
];

const validateEmailSignup = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
  body("first_name").isString().withMessage("Invalid first name"),
  body("last_name").isString().withMessage("Invalid last name"),
  body("mobile_number")
    .optional()
    .isString()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage("Invalid mobile number"),
];

const validateCompleteSignup = [
  body("token").isString().withMessage("Token is required"),
  body("otp")
    .isString()
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
];

const validateEmailLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").isString().withMessage("Password is required"),
];

const validateOAuthSignin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("provider").isString().withMessage("Provider is required"),
  body("first_name").isString().withMessage("First name is required"),
  body("last_name").isString().withMessage("Last name is required"),
  body("mobile_number").optional().isString().withMessage("Invalid mobile number"),
];

const validateForgotPassword = [
  body("email").isEmail().withMessage("Valid email is required"),
];

const validateResetPassword = [
  body("token").isString().withMessage("Token is required"),
  body("otp")
    .isString()
    .isLength({ min: 4, max: 4 })
    .withMessage("OTP must be 4 digits"),
  body("password")
    .isString()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateRequest,
  validateOTPRequest,
  validateOTPVerification,
  validateFeedback,
  validateEmailSignup,
  validateCompleteSignup,
  validateEmailLogin,
  validateOAuthSignin, 
  validateForgotPassword,
  validateResetPassword,
};
