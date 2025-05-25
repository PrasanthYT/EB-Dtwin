/**
 * Helper script to copy firebase-messaging-sw.js to the server root
 * 
 * Usage: 
 *   node copy-firebase-sw.js [target-dir]
 * 
 * If target-dir is not specified, it will copy to the current directory
 */

const fs = require('fs');
const path = require('path');

// Get target directory from command line or use current directory
const targetDir = process.argv[2] || '.';

// Source file path
const sourceFile = path.join(__dirname, 'firebase-messaging-sw.js');

// Target file path
const targetFile = path.join(targetDir, 'firebase-messaging-sw.js');

try {
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.error(`Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  // Make sure target directory exists
  if (!fs.existsSync(targetDir)) {
    console.error(`Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  // Copy the file
  fs.copyFileSync(sourceFile, targetFile);
  
  console.log(`\x1b[32m✓ Successfully copied firebase-messaging-sw.js to ${targetFile}\x1b[0m`);
  console.log('\nYou can now use Firebase Cloud Messaging in your web app.');
  console.log('Make sure to access your site via localhost or HTTPS for FCM to work.\n');
} catch (error) {
  console.error(`\x1b[31m✗ Error copying file: ${error.message}\x1b[0m`);
  process.exit(1);
} 