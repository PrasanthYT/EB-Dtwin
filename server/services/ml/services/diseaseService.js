const { execFile } = require("child_process");
const path = require("path");

function predictDisease(input) {
  // Sanitize input: allow only number, boolean, or numeric strings
  const sanitizedInput = {};
  for (const key in input) {
    const value = input[key];
    if (typeof value === "number" || typeof value === "boolean") {
      sanitizedInput[key] = value;
    } else if (typeof value === "string" && !isNaN(Number(value))) {
      sanitizedInput[key] = Number(value);
    }
    // Ignore other types (like null, undefined, arrays, objects, etc.)
  }

  const inputStr = JSON.stringify(sanitizedInput);
  const scriptPath = path.resolve(__dirname, "../models/predict.py");

  return new Promise((resolve, reject) => {
    execFile(
      "C:\\Python313\\python.exe",
      [scriptPath, inputStr],
      { cwd: path.dirname(scriptPath) },
      (error, stdout, stderr) => {
        if (error) {
          console.error("Error executing script:", error);
          return reject(error);
        }
        if (stderr) {
          console.error("Script stderr:", stderr);
          return reject(new Error(stderr));
        }
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (parseError) {
          console.error("Error parsing script output:", parseError);
          reject(parseError);
        }
      }
    );
  });
}

module.exports = { predictDisease };
