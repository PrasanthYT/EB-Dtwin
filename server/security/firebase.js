const admin = require("firebase-admin");

const serviceAccount = require("../common/constants/firebase-service-account.json"); // Replace with actual path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();

module.exports = auth;
