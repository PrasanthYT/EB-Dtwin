const { format } = require("date-fns");
const medicationRepository = require("./repositories/medicationRepository");
const HealthMetricsService = require("../user/healthMetricService");
const userProfileService = require("../user/userProfileService");
const MonthlyHealthMetricService = require("../user/monthlyHealthMetricService");
const { updateMedicationNotifications } = require('../notification/utils/notificationUpdateUtils');
const { 
  toIST, 
  formatISTDate, 
  getCurrentIST, 
  getCurrentISTDate,
  getISTDateComponents,
  createISTDate,
  formatISTDateTime
} = require("../../common/utils/timezone");

async function updateMedication(userId, medicationData) {
  // Check if user exists
  const userProfile = await userProfileService.getProfile(userId);
  if (!userProfile) {
    throw new Error("User not found");
  }

  let result;
  let previousTimings = [];
  let medicationId = null;
  
  // If it's an update, check if medication exists
  if (medicationData.id) {
    medicationId = medicationData.id;
    const existingMedication = await medicationRepository.getMedicationById(medicationId);
    if (!existingMedication) {
      throw new Error("Medication not found");
    }
    if (existingMedication.userId !== userId) {
      throw new Error("Unauthorized access to medication");
    }
    
    // Store previous timings for notification handling
    previousTimings = existingMedication.timings || [];
    
    // Update the medication in the database
    result = await medicationRepository.updateMedication(medicationId, medicationData);
    
    // Check if timings have changed
    const newTimings = medicationData.timings || [];
    const timingsChanged = JSON.stringify(previousTimings.sort()) !== JSON.stringify(newTimings.sort());
    
    // If timings have changed and reminder is enabled, update notifications
    if (timingsChanged && medicationData.reminder) {
      try {
        // Get notification queues
        const notificationQueues = await getNotificationQueues();
        
        if (notificationQueues) {
          // Cancel existing and schedule new notifications with the updated timings
          await updateMedicationNotifications(
            notificationQueues, 
            userId, 
            medicationData.medicationName,
            medicationId,
            newTimings,
            medicationData.dose
          );
        }
      } catch (notifError) {
        console.warn(`Failed to update medication notifications: ${notifError.message}`);
        // Continue processing - notification update failure shouldn't fail the medication update
      }
    }
  } else {
    // Create new medication
    result = await medicationRepository.createMedication(userId, medicationData);
    
    // If reminder is enabled for new medication, schedule notifications
    if (result.reminder && result.timings && result.timings.length > 0) {
      try {
        // Get notification queues
        const notificationQueues = await getNotificationQueues();
        
        if (notificationQueues) {
          // Schedule notifications for the new medication
          await updateMedicationNotifications(
            notificationQueues, 
            userId, 
            result.medicationName,
            result.id,
            result.timings,
            result.dose
          );
        }
      } catch (notifError) {
        console.warn(`Failed to schedule medication notifications: ${notifError.message}`);
        // Continue processing - notification scheduling failure shouldn't fail the medication creation
      }
    }
  }

  // Update health metrics for today and upcoming days
  await updateHealthMetricsForMedication(userId, result);

  return result;
}

// Helper function to get notification queues
async function getNotificationQueues() {
  try {
    // Try to get global notification queues
    if (global.notificationQueues) {
      return global.notificationQueues;
    }
    
    // If not available globally, try to require and initialize
    const { initQueues } = require('../notification/queues');
    return await initQueues();
  } catch (error) {
    console.warn(`Failed to get notification queues: ${error.message}`);
    return null;
  }
}

// New function to update health metrics when medications change
async function updateHealthMetricsForMedication(userId, medication) {
  const today = getCurrentIST(); // Already using IST current date
  const endDate = medication.endDate ? toIST(new Date(medication.endDate)) : today;
  // Make a copy to avoid modifying the original endDate
  const endDateCopy = new Date(endDate.getTime());
  endDateCopy.setMonth(endDateCopy.getMonth() + 1); // Look one month ahead max

  let currentDate = new Date(today.getTime());
  
  while (currentDate <= endDateCopy) {
    try {
      const formattedDate = formatISTDate(currentDate); // Using IST date formatting
      await getDailyMedicationData(userId, formattedDate, true);
      currentDate.setDate(currentDate.getDate() + 1);
    } catch (error) {
      console.error(`Error updating health metrics for date ${formatISTDate(currentDate)}:`, error);
    }
  }
}

async function getUserMedications(userId) {
  // Check if user exists before fetching medications
  const userProfile = await userProfileService.getProfile(userId);
  if (!userProfile) {
    throw new Error("User not found");
  }
  
  return await medicationRepository.getMedicationsByUserId(userId);
}

async function getDailyMedicationData(userId, date, forceRefresh = false) {
  const [year, month, day] = date.split("-").map(Number);
  
  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }

  // Create a proper IST date object for validation
  const istDate = createISTDate(year, month - 1, day);

  // Check if user exists
  const userProfile = await userProfileService.getProfile(userId);
  if (!userProfile) {
    throw new Error("User not found");
  }

  // First check if we have the data in health metrics and if it's not a forced refresh
  if (!forceRefresh) {
    const healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
    if (healthMetric?.medication_data) {
      return healthMetric.medication_data;
    }
  }

  // Otherwise generate fresh data
  const userMedications = await medicationRepository.getMedicationsByUserId(userId);
  if (!userMedications.length) {
    return { medications: [], summary: { total: 0, taken: 0, missed: 0 } };
  }

  // Filter medications that are valid for the given date
  // Create the date in IST timezone for comparison
  const validDate = createISTDate(year, month - 1, day);
  const validMedications = userMedications.filter(medication => {
    const startDate = toIST(new Date(medication.startDate));
    const endDate = medication.endDate ? toIST(new Date(medication.endDate)) : null;
    
    return startDate <= validDate && (!endDate || validDate <= endDate);
  });

  // Generate daily checklist from valid user medications
  const medicationChecklist = validMedications.flatMap(medication => {
    return (medication.timings || []).map(time => ({
      id: medication.id,
      medicationId: medication.id, // Adding this for consistency
      medicationName: medication.medicationName,
      time,
      timings: medication.timings, // Add full timings array
      afterFood: medication.afterFood,
      dose: medication.dose || "",
      status: "pending", // pending, taken, missed
      takenAt: null,
      skippedReason: null
    }));
  });

  const medicationData = {
    medications: medicationChecklist,
    summary: {
      total: medicationChecklist.length,
      taken: 0,
      missed: 0
    },
    lastUpdated: getCurrentIST().toISOString()
  };

  // Get existing health metric, if any
  const healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
  
  // If we have existing data, preserve taken/missed status
  if (healthMetric?.medication_data?.medications) {
    const existingMeds = healthMetric.medication_data.medications;
    
    medicationData.medications = medicationData.medications.map(newMed => {
      const existingMed = existingMeds.find(med => 
        med.id === newMed.id && med.time === newMed.time
      );
      
      if (existingMed && existingMed.status !== "pending") {
        newMed.status = existingMed.status;
        newMed.takenAt = existingMed.takenAt;
        newMed.skippedReason = existingMed.skippedReason;
        
        // Update summary counts
        if (existingMed.status === "taken") {
          medicationData.summary.taken += 1;
        } else if (existingMed.status === "missed") {
          medicationData.summary.missed += 1;
        }
      }
      
      return newMed;
    });
  }

  // Update health metrics with the medication data
  await HealthMetricsService.updateHealthMetricByDate(year, month, day, userId, {
    medication_data: medicationData
  });

  return medicationData;
}

async function getMonthlyMedicationData(userId, year, month) {
  // Check if user exists
  const userProfile = await userProfileService.getProfile(userId);
  if (!userProfile) {
    throw new Error("User not found");
  }
  
  // Check if monthly medication data exists and is up-to-date
  const monthlyHealthMetric = await MonthlyHealthMetricService.getHealthMetricForMonth(
    userId,
    year,
    month,
    true
  );

  // Determine if the data needs to be refreshed
  let needsRefresh = false;
  const currentDate = getCurrentIST();
  const isCurrentMonth = 
    Number(year) === currentDate.getFullYear() && 
    Number(month) === currentDate.getMonth() + 1;

  if (isCurrentMonth) {
    needsRefresh = true;
  } else if (monthlyHealthMetric?.monthly_medication_data) {
    const lastMedicationUpdate = await medicationRepository.getLastUpdatedMedication(userId);
    needsRefresh = 
      lastMedicationUpdate && 
      toIST(new Date(lastMedicationUpdate.updated_at)) > 
      toIST(new Date(monthlyHealthMetric.monthly_medication_data.lastUpdated));
  }

  // Return cached data if valid
  if (monthlyHealthMetric?.monthly_medication_data && !needsRefresh) {
    // Add monthlyHealthMetric.id to the returned data
    return {
      ...monthlyHealthMetric.monthly_medication_data,
      healthMetricId: monthlyHealthMetric.id
    };
  }

  // Get all days in the month
  // Use proper timezone handling for daysInMonth calculation
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Fetch medication data for each day
  const dailyData = [];
  let monthlyTotalMeds = 0;
  let monthlyTakenMeds = 0;
  let monthlyMissedMeds = 0;

  for (const day of days) {
    const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = await getDailyMedicationData(userId, formattedDate);
    
    const daySummary = {
      date: formattedDate,
      total: dayData.summary.total,
      taken: dayData.summary.taken,
      missed: dayData.summary.missed,
      pending: dayData.summary.total - (dayData.summary.taken + dayData.summary.missed),
      adherenceRate: dayData.summary.total > 0 
        ? (dayData.summary.taken / dayData.summary.total * 100).toFixed(1) 
        : null,
      medicationIds: dayData.medications?.map(med => med.id) || [] // Include medication IDs
    };

    dailyData.push(daySummary);
    monthlyTotalMeds += dayData.summary.total;
    monthlyTakenMeds += dayData.summary.taken;
    monthlyMissedMeds += dayData.summary.missed;
  }

  const monthlySummary = {
    total: monthlyTotalMeds,
    taken: monthlyTakenMeds,
    missed: monthlyMissedMeds,
    adherenceRate: monthlyTotalMeds > 0 
      ? (monthlyTakenMeds / monthlyTotalMeds * 100).toFixed(1) 
      : null
  };

  const monthlyMedicationData = {
    days: dailyData,
    summary: monthlySummary,
    lastUpdated: getCurrentIST().toISOString()
  };

  // Update monthly health metric
  await MonthlyHealthMetricService.updateHealthMetricForMonth(userId, year, month, {
    monthly_medication_data: monthlyMedicationData,
    monthly_medication_adherence: monthlySummary.adherenceRate
  });

  // Get the updated health metric to include its ID
  const updatedHealthMetric = await MonthlyHealthMetricService.getHealthMetricForMonth(
    userId,
    year,
    month
  );

  // Return the data with the health metric ID
  return {
    ...monthlyMedicationData,
    healthMetricId: updatedHealthMetric?.id
  };
}

async function takeMedication(userId, medicationId, date, time) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }

  if (!time || typeof time !== "string") {
    throw new Error("Invalid or missing 'time' parameter. Please provide a valid time.");
  }

  // Normalize time format for comparison
  const normalizedTime = time.trim().toLowerCase();

  // Get medication to verify ownership
  const medication = await medicationRepository.getMedicationById(medicationId);
  if (!medication) {
    throw new Error("Medication not found");
  }
  if (medication.userId !== userId) {
    throw new Error("Unauthorized access to medication");
  }

  // Get health metric for the day
  let healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
  if (!healthMetric || !healthMetric.medication_data) {
    // If data doesn't exist, generate it
    await getDailyMedicationData(userId, date, true);
    healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
    
    if (!healthMetric || !healthMetric.medication_data) {
      throw new Error("Medication data not found for this date");
    }
  }

  const medicationData = healthMetric.medication_data;

  // Improved medication finding logic
  const medicationIndex = medicationData.medications.findIndex(med => {
    // Match by medication ID
    const isCorrectMed = med.id === medicationId || med.medicationId === medicationId;
    
    // Time matching - check both time property and timings array
    let timeMatch = false;
    
    // Check the direct time property
    if (med.time && med.time.trim().toLowerCase() === normalizedTime) {
      timeMatch = true;
    }
    
    // Also check the timings array if it exists
    if (!timeMatch && Array.isArray(med.timings)) {
      timeMatch = med.timings.some(t => 
        typeof t === 'string' && t.trim().toLowerCase() === normalizedTime
      );
    }
    
    return isCorrectMed && timeMatch;
  });

  if (medicationIndex === -1) {
    throw new Error(`Medication timing not found for time: ${time}`);
  }

  // Update medication status to taken
  medicationData.medications[medicationIndex].status = "taken";
  medicationData.medications[medicationIndex].takenAt = getCurrentIST().toISOString();
  medicationData.medications[medicationIndex].skippedReason = null;

  // Update summary
  medicationData.summary.taken += 1;

  // Update health metric
  await HealthMetricsService.updateHealthMetricByDate(year, month, day, userId, {
    medication_data: medicationData
  });

  return {
    medication: medicationData.medications[medicationIndex],
    summary: medicationData.summary
  };
}

async function skipMedication(userId, medicationId, date, time, reason) {
  const [year, month, day] = date.split("-").map(Number);
  
  if (!year || !month || !day) {
    throw new Error("Invalid date format. Please use 'YYYY-MM-DD'.");
  }

  if (!time || typeof time !== "string") {
    throw new Error("Invalid or missing 'time' parameter. Please provide a valid time.");
  }

  // Normalize time format for comparison
  const normalizedTime = time.trim().toLowerCase();

  // Get medication to verify ownership
  const medication = await medicationRepository.getMedicationById(medicationId);
  if (!medication) {
    throw new Error("Medication not found");
  }
  if (medication.userId !== userId) {
    throw new Error("Unauthorized access to medication");
  }

  // Get health metric for the day
  let healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
  if (!healthMetric || !healthMetric.medication_data) {
    // If data doesn't exist, generate it
    await getDailyMedicationData(userId, date, true);
    healthMetric = await HealthMetricsService.getHealthMetric(userId, date);
    
    if (!healthMetric || !healthMetric.medication_data) {
      throw new Error("Medication data not found for this date");
    }
  }

  const medicationData = healthMetric.medication_data;

  // Improved medication finding logic (same as takeMedication)
  const medicationIndex = medicationData.medications.findIndex(med => {
    // Match by medication ID
    const isCorrectMed = med.id === medicationId || med.medicationId === medicationId;
    
    // Time matching - check both time property and timings array
    let timeMatch = false;
    
    // Check the direct time property
    if (med.time && med.time.trim().toLowerCase() === normalizedTime) {
      timeMatch = true;
    }
    
    // Also check the timings array if it exists
    if (!timeMatch && Array.isArray(med.timings)) {
      timeMatch = med.timings.some(t => 
        typeof t === 'string' && t.trim().toLowerCase() === normalizedTime
      );
    }
    
    return isCorrectMed && timeMatch;
  });

  if (medicationIndex === -1) {
    throw new Error(`Medication timing not found for time: ${time}`);
  }

  // Update medication status to missed
  medicationData.medications[medicationIndex].status = "missed";
  medicationData.medications[medicationIndex].takenAt = null;
  medicationData.medications[medicationIndex].skippedReason = reason || "Skipped";

  // Update summary
  medicationData.summary.missed += 1;
  
  // Update health metric
  await HealthMetricsService.updateHealthMetricByDate(year, month, day, userId, {
    medication_data: medicationData
  });

  return {
    medication: medicationData.medications[medicationIndex],
    summary: medicationData.summary
  };
}

// Scheduler functions for automated tasks

async function generateDailyMedicationChecklists() {
  // Use IST timezone for today's date
  const formattedDate = getCurrentISTDate();
  
  // Get all users with medications
  const usersWithMedications = await medicationRepository.getUsersWithMedications();
  
  for (const userId of usersWithMedications) {
    try {
      // Use our existing function to generate daily data
      await getDailyMedicationData(userId, formattedDate, true);
    } catch (error) {
      console.error(`Error generating medication checklist for user ${userId}:`, error);
    }
  }
}

async function deleteMedication(userId, medicationId) {
  const medication = await medicationRepository.getMedicationById(medicationId);

  if (!medication) {
    throw new Error("Medication not found");
  }

  if (medication.userId !== userId) {
    throw new Error("Unauthorized access to medication");
  }

  // First, clean up medication references in HealthMetrics
  await cleanupMedicationFromHealthMetrics(userId, medicationId);
  await cleanupMedicationFromMonthlyHealthMetrics(userId, medicationId);
  
  // Then delete the medication from the database
  await medicationRepository.deleteMedication(medicationId);
  return { id: medicationId };
}

// New helper function to clean up medication references in HealthMetrics
async function cleanupMedicationFromHealthMetrics(userId, medicationId) {
  // Get a range of dates to check (e.g., past year to future year)
  const today = getCurrentIST();
  const startDate = new Date(today);
  startDate.setFullYear(startDate.getFullYear() - 1); // 1 year ago
  
  const endDate = new Date(today);
  endDate.setFullYear(endDate.getFullYear() + 1); // 1 year in future
  
  let currentDate = new Date(startDate);
  
  // Loop through each day in the range
  while (currentDate <= endDate) {
    const formattedDate = formatISTDate(currentDate);
    const [year, month, day] = formattedDate.split("-").map(Number);
    
    try {
      // Get health metric for this day
      const healthMetric = await HealthMetricsService.getHealthMetric(userId, formattedDate);
      
      // If this day has medication data
      if (healthMetric?.medication_data?.medications) {
        let medicationData = healthMetric.medication_data;
        const originalCount = medicationData.medications.length;
        
        // Filter out the medication to be deleted
        medicationData.medications = medicationData.medications.filter(med => 
          med.id !== medicationId && med.medicationId !== medicationId
        );
        
        // If medications were removed, update the summary and save
        if (medicationData.medications.length !== originalCount) {
          // Recalculate summary
          const takenCount = medicationData.medications.filter(med => med.status === "taken").length;
          const missedCount = medicationData.medications.filter(med => med.status === "missed").length;
          
          medicationData.summary = {
            total: medicationData.medications.length,
            taken: takenCount,
            missed: missedCount
          };
          
          // Update health metrics
          await HealthMetricsService.updateHealthMetricByDate(year, month, day, userId, {
            medication_data: medicationData
          });
        }
      }
    } catch (error) {
      console.error(`Error cleaning up medication ${medicationId} from health metrics for ${formattedDate}:`, error);
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Also clean up from monthly health metrics
  await cleanupMedicationFromMonthlyHealthMetrics(userId, medicationId);
}

// Clean up from monthly health metrics
async function cleanupMedicationFromMonthlyHealthMetrics(userId, medicationId) {
  // Get the current date
  const today = getCurrentIST();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  
  // Check past 12 months and future 12 months
  for (let i = -12; i <= 12; i++) {
    let targetDate = new Date(currentYear, currentMonth - 1 + i, 1);
    targetDate = toIST(targetDate); // Convert to IST
    let year = targetDate.getFullYear();
    let month = targetDate.getMonth() + 1;
    
    try {
      // Fetch monthly health metric
      const monthlyHealthMetric = await MonthlyHealthMetricService.getHealthMetricForMonth(
        userId,
        year,
        month,
        false
      );
      
      // If no monthly data, skip
      if (!monthlyHealthMetric?.monthly_medication_data) continue;
      
      // Force regeneration of monthly data
      await MonthlyHealthMetricService.updateHealthMetricForMonth(userId, year, month, {
        force_refresh_medication: true
      });
      
    } catch (error) {
      console.error(`Error cleaning up monthly health metrics for ${year}-${month}:`, error);
    }
  }
}

module.exports = {
  updateMedication,
  getUserMedications,
  getDailyMedicationData,
  getMonthlyMedicationData,
  takeMedication,
  skipMedication,
  deleteMedication,
  generateDailyMedicationChecklists,
};