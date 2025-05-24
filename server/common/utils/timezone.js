// const moment = require('moment-timezone');

// IST = UTC +5:30
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
// const IST_TIMEZONE = 'Asia/Kolkata'; // Not needed anymore

/**
 * Convert a date to IST timezone
 * @param {Date|string} date - The date to convert
 * @returns {Date} Date object in IST timezone
 */
function toIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return new Date(dateObj.getTime() + IST_OFFSET_MS);
}

/**
 * Format a date to ISO string in IST timezone
 * @param {Date|string} date - The date to format
 * @returns {string} ISO string representation in IST
 */
function toISTString(date) {
  return toIST(date).toISOString();
}

/**
 * Format a date to YYYY-MM-DD format in IST timezone
 * @param {Date|string} date - The date to format
 * @returns {string} Date string in YYYY-MM-DD format
 */
function formatISTDate(date) {
  return toISTString(date).split('T')[0];
}

/**
 * Get current date and time in IST timezone
 * @returns {Date} Current date/time in IST
 */
function getCurrentIST() {
  return toIST(new Date());
}

/**
 * Get current date in YYYY-MM-DD format in IST timezone
 * @returns {string} Current date in YYYY-MM-DD format
 */
function getCurrentISTDate() {
  return formatISTDate(new Date());
}

/**
 * Get year, month, day components from date in IST timezone
 * @param {Date|string} date - The date to extract components from
 * @returns {Object} Object with year, month, day properties
 */
function getISTDateComponents(date) {
  const istDate = toIST(date);
  return {
    year: istDate.getFullYear(),
    month: istDate.getMonth() + 1, // 0-indexed to 1-indexed
    day: istDate.getDate()
  };
}

/**
 * Check if a date is today in IST timezone
 * @param {Date|string} date - The date to check
 * @returns {boolean} True if date is today in IST
 */
function isISTToday(date) {
  const today = getCurrentISTDate();
  const checkDate = formatISTDate(date);
  return today === checkDate;
}

/**
 * Create a Date object for a specific IST date and time
 * @param {number} year - Year
 * @param {number} month - Month (0-11)
 * @param {number} day - Day of month
 * @param {number} hours - Hours (optional)
 * @param {number} minutes - Minutes (optional)
 * @param {number} seconds - Seconds (optional)
 * @returns {Date} Date object in IST timezone
 */
function createISTDate(year, month, day, hours = 0, minutes = 0, seconds = 0) {
  // Create UTC date and adjust for IST
  const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
  // Subtract IST offset to get correct UTC time
  return new Date(utcDate.getTime() - IST_OFFSET_MS);
}

/**
 * Format a date to HH:MM:SS format in IST timezone
 * @param {Date|string} date - The date to format
 * @returns {string} Time string in HH:MM:SS format
 */
function formatISTTime(date) {
  const istDate = toIST(date);
  const hours = String(istDate.getHours()).padStart(2, '0');
  const minutes = String(istDate.getMinutes()).padStart(2, '0');
  const seconds = String(istDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a date to YYYY-MM-DD HH:MM:SS format in IST timezone
 * @param {Date|string} date - The date to format
 * @returns {string} Datetime string in YYYY-MM-DD HH:MM:SS format
 */
function formatISTDateTime(date) {
  const dateStr = formatISTDate(date);
  const timeStr = formatISTTime(date);
  return `${dateStr} ${timeStr}`;
}

/**
 * Get date in IST that is a specified number of days before the current date
 * @param {number} days - Number of days to subtract
 * @returns {Date} Date object in IST timezone
 */
function subtractDays(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toIST(date);
}

/**
 * Get date in IST that is a specified number of months before the current date
 * @param {number} months - Number of months to subtract
 * @returns {Date} Date object in IST timezone
 */
function subtractMonths(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return toIST(date);
}

/**
 * Format a date as a string with a specific format
 * Currently only supports 'YYYY-MM-DD' format
 * @param {Date|string} date - The date to format
 * @param {string} format - Format string (only 'YYYY-MM-DD' supported)
 * @returns {string} Formatted date string
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const istDate = toIST(date);
  
  if (format === 'YYYY-MM-DD') {
    return formatISTDate(istDate);
  }
  
  return formatISTDate(istDate);
}

module.exports = {
  IST_OFFSET_MS,
  toIST,
  toISTString,
  formatISTDate,
  getCurrentIST,
  getCurrentISTDate,
  getISTDateComponents,
  isISTToday,
  createISTDate,
  formatISTTime,
  formatISTDateTime,
  subtractDays,
  subtractMonths,
  formatDate
}; 