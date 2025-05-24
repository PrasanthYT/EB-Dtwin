const express = require('express');
const router = express.Router();
const diseaseController = require('../controllers/disease.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');


// Disease Prediction routes
router.post('/predict', authMiddleware, diseaseController.predictDisease);

module.exports = router;
