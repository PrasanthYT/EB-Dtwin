const timezoneUtils = require("../../../common/utils/timezone");

const calculateTimeToNextOccurrence = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${timeStr}. Expected format: "HH:MM" in 24-hour format.`);
  }
  const now = timezoneUtils.getCurrentIST();
  const targetTime = timezoneUtils.getCurrentIST();
  targetTime.setHours(hours, minutes, 0, 0);
  if (targetTime <= now) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  return targetTime - now;
};
const calculateTimeToNextMedication = (timeStr) => {
  return calculateTimeToNextOccurrence(timeStr);
};
const calculateTimeToNextMeal = (timeStr) => {
  return calculateTimeToNextOccurrence(timeStr);
};
const formatDateTime = (date) => {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};
const isValidTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    return false;
  }
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
};
const getCurrentTimeString = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};
const compareTimeStrings = (time1, time2) => {
  if (!isValidTimeFormat(time1) || !isValidTimeFormat(time2)) {
    throw new Error('Invalid time format. Expected format: "HH:MM" in 24-hour format.');
  }
  const [hours1, minutes1] = time1.split(':').map(Number);
  const [hours2, minutes2] = time2.split(':').map(Number);
  if (hours1 < hours2) return -1;
  if (hours1 > hours2) return 1;
  if (minutes1 < minutes2) return -1;
  if (minutes1 > minutes2) return 1;
  return 0;
};
const hoursBetween = (date1, date2) => {
  const diffMs = Math.abs(date2 - date1);
  return diffMs / (1000 * 60 * 60);
};
module.exports = {
  calculateTimeToNextOccurrence,
  calculateTimeToNextMedication,
  calculateTimeToNextMeal,
  formatDateTime,
  isValidTimeFormat,
  getCurrentTimeString,
  compareTimeStrings,
  hoursBetween
}; 