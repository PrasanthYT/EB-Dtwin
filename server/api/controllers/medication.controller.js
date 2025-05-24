const medicationService = require("../../services/medication/medicationService");
const {
  info,
  fatal,
  successResponse,
  errorResponse,
  errorLog,
} = require("@dtwin/config");

// Add this new function for creating medication
const createMedication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const medicationData = req.body;
    const result = await medicationService.updateMedication(
      userId,
      medicationData
    );
    successResponse(
      res,
      result.message || "Medication created successfully",
      result
    );
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred while creating medication",
      null,
      error.statusCode || 500
    );
  }
};

// Fix the updateMedication function
const updateMedication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medicationId } = req.params;
    const updateData = req.body;

    if (!medicationId) {
      return errorResponse(res, "Medication ID is required", null, 400);
    }

    const result = await medicationService.updateMedication(
      userId,
      medicationId,
      updateData
    );

    if (!result.success) {
      return errorResponse(
        res,
        result.error.message || "Failed to update medication",
        result.error,
        result.error.code === "MEDICATION_NOT_FOUND" ? 404 : 400
      );
    }

    successResponse(
      res,
      result.message || "Medication updated successfully",
      result.data
    );
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getUserMedications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await medicationService.getUserMedications(userId);
    successResponse(res, "Medications fetched successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getDailyMedicationData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.params;
    const result = await medicationService.getDailyMedicationData(userId, date);
    successResponse(res, "Daily medication data fetched successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const getMonthlyMedicationData = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { year, month } = req.params;
    const result = await medicationService.getMonthlyMedicationData(
      userId,
      year,
      month
    );
    successResponse(
      res,
      "Monthly medication data fetched successfully",
      result
    );
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const takeMedication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medicationId } = req.params;
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'date' and 'time'.",
      });
    }

    const result = await medicationService.takeMedication(
      userId,
      medicationId,
      date,
      time
    );
    res.status(200).json({
      success: true,
      message: "Medication marked as taken successfully.",
      data: result,
    });
  } catch (error) {
    errorLog(error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred.",
      error: error.stack || null,
    });
  }
};

const skipMedication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medicationId } = req.params;
    const { date, time, reason } = req.body;
    const result = await medicationService.skipMedication(
      userId,
      medicationId,
      date,
      time,
      reason
    );
    successResponse(res, "Medication marked as skipped", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "An error occurred",
      null,
      error.statusCode || 500
    );
  }
};

const deleteMedication = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { medicationId } = req.params;

    const result = await medicationService.deleteMedication(
      userId,
      medicationId
    );
    successResponse(res, "Medication deleted successfully", result);
  } catch (error) {
    fatal(error);
    errorResponse(
      res,
      error.message || "Failed to delete medication",
      null,
      error.statusCode || 500
    );
  }
};

module.exports = {
  createMedication,
  updateMedication,
  getUserMedications,
  getDailyMedicationData,
  getMonthlyMedicationData,
  takeMedication,
  skipMedication,
  deleteMedication,
};
