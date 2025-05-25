const { Op } = require("sequelize");
const { Medication, UserProfile } = require("@dtwin/shared-database");

const getMedicationsByUserId = async (userId) => {
  return await Medication.findAll({
    where: { userId },
    order: [["created_at", "ASC"]]
  });
};

const getMedicationById = async (medicationId) => {
  return await Medication.findByPk(medicationId);
};
 
const createMedication = async (userId, medicationData) => {
  if (medicationData.timings && !Array.isArray(medicationData.timings)) {
    medicationData.timings = [medicationData.timings];
  }

  return await Medication.create({
    userId,
    medicationName: medicationData.medicationName,
    afterFood: medicationData.afterFood,
    frequency: medicationData.frequency,
    timings: medicationData.timings || [],
    reminder: medicationData.reminder || false,
    dose: medicationData.dose || "",
    startDate: medicationData.startDate,
    endDate: medicationData.endDate || null,
  });
};

const updateMedication = async (medicationId, medicationData) => {
  if (medicationData.timings && !Array.isArray(medicationData.timings)) {
    medicationData.timings = [medicationData.timings];
  }

  const updateData = {
    medicationName: medicationData.medicationName,
    afterFood: medicationData.afterFood,
    frequency: medicationData.frequency,
    timings: medicationData.timings || [],
    reminder: medicationData.reminder || false,
    dose: medicationData.dose || "",
    startDate: medicationData.startDate,
    endDate: medicationData.endDate || null,
  };

  await Medication.update(updateData, {
    where: { id: medicationId },
  });

  return await getMedicationById(medicationId);
};

const deleteMedication = async (medicationId) => {
  return await Medication.destroy({
    where: { id: medicationId }
  });
};

const getUsersWithMedications = async () => {
  const medications = await Medication.findAll({
    attributes: ['userId'],
    group: ['userId']
  });
  return medications.map(med => med.userId);
};

const getLastUpdatedMedication = async (userId) => {
  return await Medication.findOne({
    where: { userId },
    order: [["updated_at", "DESC"]]
  });
};

module.exports = {
  getMedicationsByUserId,
  getMedicationById,
  createMedication,
  updateMedication,
  deleteMedication,
  getUsersWithMedications,
  getLastUpdatedMedication
};