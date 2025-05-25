// services/geminiExerciseService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { info, errorLog } = require("@dtwin/config");

class GeminiExerciseService {
  constructor() {
    if (!process.env.GEMINI_API_KEY_EXERCISE) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY_EXERCISE);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro-preview-05-06" });
  }

  /**
   * Generate 3 exercise recommendations based on user profile
   * @param {Object} profile - User profile data
   * @returns {Promise<Object>} - Generated exercise plan with exactly 3 workouts
   */
  async generateExercisePlan(profile) {
    try {
      info(`Generating exercise plan for user ${profile.userId}`);

      const prompt = this._buildPrompt(profile);
      const response = await this._callGeminiAPI(prompt);
      let exercisePlan = this._parseResponse(response);

      // Ensure we always return exactly 3 workouts
      exercisePlan = this._ensureThreeWorkouts(exercisePlan, profile);
      exercisePlan = this._validateExercisePlan(exercisePlan);

      return exercisePlan;
    } catch (error) {
      errorLog("Failed to generate exercise plan with Gemini:", error);
      return this._getFallbackPlan();
    }
  }

  /**
   * Build the prompt for Gemini
   * @private
   */
  _buildPrompt(profile) {
    return `
      Create exactly 3 simple exercise recommendations for a ${profile.age} year old user.
      
      User Profile:
      - Height: ${profile.height_cm} cm
      - Weight: ${profile.weight_kg} kg
      - Goal: ${profile.health_goals || 'general fitness'}
      - Available time: ${profile.exercise_preferences?.time_available || 30} mins total
      - Equipment: ${profile.exercise_preferences?.equipment_available?.join(', ') || 'None'}
      - Health conditions: ${this._getHealthNotes(profile)}
      - Dislikes: ${JSON.stringify(profile.disliked_exercises || [])}

      Requirements:
      1. Return exactly 3 different exercises (5-15 minutes each)
      2. Include: 1 cardio, 1 strength, 1 flexibility
      3. Benefits: 3-5 words each
      4. Total time ≤ ${profile.exercise_preferences?.time_available || 30} minutes
      5. Avoid disliked exercises
      6. Adapt to health conditions

      Response Format (strict JSON):
      {
        "workouts": [
          {
            "name": "Short name (2-3 words)",
            "duration_minutes": 5-15,
            "type": "Cardio/Strength/Flexibility",
   q         "intensity": "Low/Medium/High",
            "description": "Under 10 words",
            "benefits": ["3-5 words", "3-5 words"],
            "calories": 50
          },
          {...},
          {...}
        ]
      }
    `;
  }

  /**
   * Call Gemini API
   * @private
   */
  async _callGeminiAPI(prompt) {
    info("Calling Gemini API");
    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  }

  /**
   * Parse Gemini response
   * @private
   */
  _parseResponse(responseText) {
    try {
      const jsonString = responseText
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      return JSON.parse(jsonString);
    } catch (error) {
      errorLog("Failed to parse Gemini response:", error);
      throw new Error("Invalid response format from Gemini");
    }
  }

  /**
   * Ensure exactly 3 workouts exist
   * @private
   */
  _ensureThreeWorkouts(plan, profile) {
    if (!plan.workouts || plan.workouts.length < 3) {
      const defaultWorkouts = this._getDefaultWorkouts(profile);
      return {
        workouts: [
          ...(plan.workouts || []),
          ...defaultWorkouts.slice(0, 3 - (plan.workouts?.length || 0))
        ]
      };
    }
    return plan;
  }

  /**
   * Validate and format exercise plan
   * @private
   */
  _validateExercisePlan(plan) {
    if (!plan.workouts || !Array.isArray(plan.workouts)) {
      throw new Error("Invalid exercise plan structure");
    }

    return {
      workouts: plan.workouts.map((workout, index) => ({
        name: workout.name || `Exercise ${index + 1}`,
        duration_minutes: Math.min(Math.max(workout.duration_minutes || 10, 5), 15),
        type: ["Cardio", "Strength", "Flexibility"][index] || workout.type || "General",
        intensity: workout.intensity || "Medium",
        description: this._shortenDescription(workout.description),
        benefits: this._simplifyBenefits(workout.benefits),
        calories: workout.calories || Math.floor(Math.random() * 50) + 30
      }))
    };
  }

  /**
   * Shorten description
   * @private
   */
  _shortenDescription(desc) {
    if (!desc) return "Effective exercise";
    return desc.split('.')[0].substring(0, 30).trim();
  }

  /**
   * Simplify benefits
   * @private
   */
  _simplifyBenefits(benefits) {
    if (!benefits || !Array.isArray(benefits)) return ["Improves health"];
    return benefits
      .filter(b => b)
      .map(b => {
        const words = b.split(' ').slice(0, 5).join(' ');
        return words.charAt(0).toUpperCase() + words.slice(1);
      })
      .slice(0, 2); // Max 2 benefits per exercise
  }

  /**
   * Get health notes
   * @private
   */
  _getHealthNotes(profile) {
    const notes = [];
    if (profile.cardiac_status?.score) notes.push(`Cardiac: ${profile.cardiac_status.score}`);
    if (profile.diabetes_status?.score) notes.push(`Diabetes: ${profile.diabetes_status.score}`);
    if (profile.gut_status?.score) notes.push(`Gut: ${profile.gut_status.score}`);
    return notes.join(', ') || 'None';
  }

  /**
   * Default workouts
   * @private
   */
  _getDefaultWorkouts(profile) {
    const equipment = profile.exercise_preferences?.equipment_available || [];
    const hasYogaMat = equipment.includes('Yoga mat');
    const hasDumbbells = equipment.includes('Dumbbells');

    return [
      { // Cardio
        name: hasYogaMat ? "Mat Jogging" : "March in Place",
        duration_minutes: 10,
        type: "Cardio",
        intensity: "Medium",
        description: "Gentle cardio workout",
        benefits: ["Boosts energy", "Burns calories"],
        calories: 70
      },
      { // Strength
        name: hasDumbbells ? "Dumbbell Rows" : "Wall Push-ups",
        duration_minutes: 8,
        type: "Strength",
        intensity: "Medium",
        description: "Upper body strength",
        benefits: ["Builds muscle", "Improves posture"],
        calories: 50
      },
      { // Flexibility
        name: hasYogaMat ? "Mat Stretches" : "Chair Yoga",
        duration_minutes: 7,
        type: "Flexibility",
        intensity: "Low",
        description: "Relieve muscle tension",
        benefits: ["Reduces stiffness", "Improves mobility"],
        calories: 20
      }
    ];
  }

  /**
   * Fallback plan
   * @private
   */
  _getFallbackPlan() {
    return {
      workouts: [
        {
          name: "Brisk Walking",
          duration_minutes: 12,
          type: "Cardio",
          intensity: "Medium",
          description: "Walk at quick pace",
          benefits: ["Heart health", "Boosts mood"],
          calories: 80
        },
        {
          name: "Body Squats",
          duration_minutes: 8,
          type: "Strength",
          intensity: "Medium",
          description: "Lower body exercise",
          benefits: ["Stronger legs", "Better balance"],
          calories: 60
        },
        {
          name: "Neck Rolls",
          duration_minutes: 5,
          type: "Flexibility",
          intensity: "Low",
          description: "Relieve tension",
          benefits: ["Reduces stress", "Prevents pain"],
          calories: 15
        }
      ]
    };
  }
}

// Singleton instance
const geminiExerciseService = new GeminiExerciseService();

module.exports = geminiExerciseService;