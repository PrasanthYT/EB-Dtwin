require("dotenv").config();

module.exports = {
  CLIENT_ID: process.env.FITBIT_CLIENT_ID,
  CLIENT_SECRET: process.env.FITBIT_CLIENT_SECRET,
  REDIRECT_URI: process.env.FITBIT_REDIRECT_URI,
  FITBIT_AUTH_URL: "https://www.fitbit.com/oauth2/authorize",
  FITBIT_TOKEN_URL: "https://api.fitbit.com/oauth2/token",
  FITBIT_API_URL: "https://api.fitbit.com/1/user/-/",
  SESSION_SECRET: process.env.SESSION_SECRET || "supersecretkey",
}; 