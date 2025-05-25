// geminiDietService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { info, errorLog } = require("@dtwin/config");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_DIET);

/**
 * Generate diet plan using Gemini
 * @param {Object} userProfile - User profile data
 * @returns {Object} Generated diet plan
 */
const generateDietPlan = async (userProfile) => {
  try {
    info("Generating diet plan with Gemini...");
    
    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });
    
    // Prepare the prompt
    const prompt = buildDietPrompt(userProfile);
    
    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the response
    return parseGeminiResponse(text);
  } catch (error) {
    errorLog("Error generating diet plan with Gemini:", error);
    throw error;
  }
};

/**
 * Build the prompt for Gemini
 * @param {Object} profile - User profile
 * @returns {string} Complete prompt
 */
function buildDietPrompt(profile) {
  return `
  ROLE: You are an expert nutritionist with 20 years of experience creating personalized diet plans for clients with various health conditions.

  TASK: Create a detailed daily diet plan with 2 options for each meal (breakfast, lunch, dinner, and 2 snacks) specifically tailored to the user's profile below.

  USER PROFILE:
  - Basic Info: ${profile.age} year old ${profile.gender}
  - Physical Stats: ${profile.height_cm} cm tall, ${profile.weight_kg} kg
  - Targets: ${profile.target_calories} daily calories, Goal: ${profile.health_goals}
  - Preferences: ${profile.diet_preferences?.dietary_restrictions?.join(', ') || 'No restrictions'}
  - Allergies: ${profile.diet_preferences?.allergies?.join(', ') || 'None'}
  - Dislikes: ${profile.disliked_meals?.map(m => m.name).join(', ') || 'None'}
  
  HEALTH STATUS:
  - Cardiac: ${profile.cardiac_status?.score}/100 - ${profile.cardiac_status?.message}
  - Diabetes: ${profile.diabetes_status?.score}/100 - ${profile.diabetes_status?.message}
  - Gut Health: ${profile.gut_status?.score}/100 - ${profile.gut_status?.message}
  - Conditions: ${profile.medical_conditions?.join(', ') || 'None'}

  REQUIREMENTS:
  1. Each meal must include:
     - Name
     - Exact calorie count
     - Macronutrient breakdown (carbs, protein, fat in grams)
     - Brief preparation instructions (1-2 sentences)
     - Health suitability score (1-10 based on user's profile)
  2. Add a single additional field called **"benefit"** to only **one** meal across the entire diet plan. This should explain in one sentence why that meal is especially beneficial for **gut, cardiac, or diabetes** health.
  3. Do not include the "benefit" field in other meals.
  4. Meals should:
     - Avoid allergens and disliked foods
     - Align with health conditions
     - Support health goals
     - Include locally available ingredients
     - Vary options for nutritional diversity

  RESPONSE FORMAT: Return ONLY valid JSON in this exact structure:
  {
    "breakfast": [
      {
        "name": "Meal Name",
        "calories": 300,
        "nutrients": {
          "carbs": 30,
          "protein": 15,
          "fat": 10
        },
        "instructions": "Brief steps...",
        "score": 8.5
      },
      {
        "name": "Meal Name",
        "calories": 310,
        "nutrients": {
          "carbs": 32,
          "protein": 14,
          "fat": 11
        },
        "instructions": "Brief steps...",
        "score": 8.7,
        "benefit": "Rich in probiotics, helping improve gut health."
      }
    ],
    "lunch": [...],
    "dinner": [...],
    "snacks": [...]
  }

  IMPORTANT: Do not include any markdown formatting, code fences, or explanatory text. Only return the JSON object.
  `;
}


/**
 * Parse Gemini's response into structured data
 * @param {string} text - Gemini's response text
 * @returns {Object} Parsed diet plan
 */
function parseGeminiResponse(text) {
  try {
    // Try to extract JSON from markdown if present
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    const jsonString = text.slice(jsonStart, jsonEnd);
    
    return JSON.parse(jsonString);
  } catch (error) {
    errorLog("Failed to parse Gemini response:", error);
    throw new Error("Invalid response format from Gemini");
  }
}

module.exports = {
  generateDietPlan
};