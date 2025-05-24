const express = require("express");
const router = express.Router();
const medicationController = require("../controllers/medication.controller");
const { authMiddleware } = require("../middlewares/auth.middleware");

// Endpoints
router.post("/", authMiddleware, medicationController.createMedication);
router.put("/:medicationId", authMiddleware, medicationController.updateMedication);
router.get("/daily/:date", authMiddleware, medicationController.getDailyMedicationData);
router.get("/monthly/:year/:month", authMiddleware, medicationController.getMonthlyMedicationData);
router.get("/", authMiddleware, medicationController.getUserMedications);
router.put("/take/:medicationId", authMiddleware, medicationController.takeMedication);
router.put("/skip/:medicationId", authMiddleware, medicationController.skipMedication);
router.delete("/:medicationId", authMiddleware, medicationController.deleteMedication);

module.exports = router;