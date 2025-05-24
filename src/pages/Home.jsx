import React, { useEffect, useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

import HealthGenders from "../components/onboarding/health-gender";
import HealthGoals from "../components/onboarding/health-goal";
import HealthWeight from "../components/onboarding/health-weight";
import HealthAge from "../components/onboarding/health-age";
import HealthBloodFGroup from "../components/onboarding/health-blood-group";
import HealthFitness from "../components/onboarding/health-fitness";
import HealthSleepLevel from "../components/onboarding/health-sleeplevel";
import HealthMedication from "../components/onboarding/health-medications";
import HealthSymptoms from "../components/onboarding/health-symptoms";
import HealthSetup from "../components/onboarding/health-setup";
import HealthAvatar from "../components/onboarding/health-avatar";
import HealthLoading from "../components/onboarding/health-loading";
import HealthText from "../components/onboarding/health-text";

function Home({ markOnboardingComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false); // Track loading state
  const [healthScore, setHealthScore] = useState(null);

  // User data state
  const [userData, setUserData] = useState({
    healthGoal: "",
    gender: "",
    weight: "",
    age: "",
    bloodGroup: "",
    fitnessLevel: "",
    sleepLevel: "",
    medications: [],
    symptoms: [],
    healthInput: "",
    healthReport: "",
    avatar: "", // ✅ Ensure this has a valid value before submitting
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = sessionStorage.getItem("token");
        if (!token) {
          console.warn("No token found, user may not be authenticated.");
          return;
        }

        const response = await fetch("http://localhost:4200/api/auth/user", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.error("Failed to fetch user data:", response);
          return;
        }

        const data = await response.json();
        console.log("User Data:", data.user);

        setUserData((prev) => ({
          ...prev,
          ...data.user,
          healthScore: data.user?.healthData?.healthScore || null,
        }));
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, []);

  // ✅ Function to fetch user data

  const steps = [
    (props) => <HealthGoals {...props} setUserData={setUserData} />,
    (props) => <HealthGenders {...props} setUserData={setUserData} />,
    (props) => <HealthWeight {...props} setUserData={setUserData} />,
    (props) => <HealthAge {...props} setUserData={setUserData} />,
    (props) => <HealthBloodFGroup {...props} setUserData={setUserData} />,
    (props) => <HealthFitness {...props} setUserData={setUserData} />,
    (props) => <HealthSleepLevel {...props} setUserData={setUserData} />,
    (props) => <HealthMedication {...props} setUserData={setUserData} />,
    (props) => (
      <HealthSymptoms
        {...props}
        userData={userData}
        setUserData={setUserData}
      />
    ),
    (props) => (
      <HealthText
        {...props}
        userData={userData}
        setUserData={setUserData}
        submitData={submitData}
      />
    ),
    () => <HealthLoading />,
    (props) => (
      <HealthSetup
        {...props}
        healthScore={healthScore}
        nextStep={nextStep}
      />
    ), // ✅ Pass nextStep
    (props) => (
      <HealthAvatar
        {...props}
        setUserData={setUserData}
        submitAvatar={submitAvatar}
      />
    ),
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const Metabolic_input = {
    healthGoal: userData.healthGoal,
    gender: userData.gender,
    weight: userData.weight,
    age: userData.age,
    bloodGroup: userData.bloodGroup,
    fitnessLevel: userData.fitnessLevel,
    sleepLevel: userData.sleepLevel,
    medications: userData.medications,
    symptoms: userData.symptoms,
  };

  // Function to submit user health data
  const submitData = async () => {
    try {
      const token = sessionStorage.getItem("token");

      console.log("Submitting user data...", JSON.stringify(userData, null, 2));

      setLoading(true); // Loading before fetch
      setCurrentStep(9); // Loading screen

      const response = await fetch("http://localhost:4200/api/auth/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        console.log("User data submitted successfully");
        await Get_metabolicscore(); // Call after successful submission
        // markOnboardingComplete(); // Mark onboarding as complete
      } else {
        console.error("Failed to submit data:", response.status);
        setLoading(false); // Hide loading on error
      }
    } catch (error) {
      console.error("Error submitting data:", error);
      setLoading(false); // Hide loading on error
    }
  };

  const submitAvatar = async (avatarUrl) => {
    try {
      const token = sessionStorage.getItem("token");

      // ✅ Check if avatar exists before submitting
      if (!avatarUrl) {
        console.error("No avatar selected. Please select an avatar.");
        return;
      }

      console.log("Submitting avatar:", avatarUrl);

      const response = await fetch(
        "http://localhost:4200/api/auth/user-avatar",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ avatar: avatarUrl }), // ✅ Send correct avatar URL
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Avatar submitted successfully:", data);
        nextStep();
      } else {
        console.error("Failed to submit avatar:", response.status);
      }
    } catch (error) {
      console.error("Error submitting avatar:", error);
    }
  };

  const apiKey = "AIzaSyB2Y2vfS9zsIYrDL2F-HuNnTsoer7vpBPw";
  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-pro-exp-02-05",
    systemInstruction:
      'The AI should analyze user health data and generate a health score out of 100, along with key insights and structured recommendations for improvement.\nInput Data:\nThe AI will receive JSON input containing user health information, including:\nBasic Details: Weight, age, gender, blood group.\nSymptoms: Any reported health symptoms (e.g., dizziness, headache).\nMedications: List of ongoing medications.\nSleep: Average sleep duration.\nFitness Level: A self-reported fitness level (scale of 1 to 5).\nFitness Goal: User’s fitness objective (e.g., weight loss, muscle gain).\nOutput Format:\nThe AI must return a JSON response containing:\nHealth Score: A numerical score (0-100) representing overall health.\nScore Breakdown: Explanation of how the score was calculated based on different health factors.\nKey Health Insights: A summary of observations from the input data.\nImprovement Steps: Five personalized recommendations for enhancing health.\nProcessing Rules:\nWeighted Scoring: The health score should be calculated by analyzing all input factors, prioritizing major health concerns.\nDynamic Adjustments: If symptoms or low sleep hours are detected, the score should reflect potential health risks.\nBalance Between Factors: Ensure a holistic evaluation, combining fitness, sleep, symptoms, and medication impact.\nStrict JSON Format: The response must always adhere to the defined JSON structure.\nExample JSON Response:\njson\nCopyEdit\n{\n  "healthScore": 75,\n  "scoreBreakdown": {\n    "fitness": 15,\n    "sleep": 10,\n    "nutrition": 20,\n    "symptoms": -10,\n    "medications": -5,\n    "lifestyle": 15,\n    "otherFactors": 30\n  },\n  "healthInsights": "Your fitness level is moderate, but symptoms like dizziness and headache may indicate underlying issues. Sleep duration is below optimal levels, which can impact overall health.",\n  "improvementSteps": [\n    {\n      "id": 1,\n      "activity": "Step 1",\n      "text": "Description of step 1",\n      "completed": false,\n      "target": "Target 1"\n    },\n    {\n      "id": 2,\n      "activity": "Step 2",\n      "text": "Description of step 2",\n      "completed": false,\n      "target": "Target 2"\n    }\n  ]\n}\nIntegration Notes:\nThe AI should dynamically generate health scores based on weighted factors.\nRecommendations should be tailored to fitness level, symptoms, and lifestyle habits.\nEnsure realistic and actionable advice that aligns with the user’s health status.',
  });

  const generationConfig = {
    temperature: 0.15,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
    responseMimeType: "text/plain",
  };

  async function Get_metabolicscore() {
    try {
      setLoading(true);
      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              {
                text: '{\n  "weight": 75,\n  "age": 30,\n  "gender": "male",\n  "bloodGroup": "O+",\n  "symptoms": ["dizziness", "headache"],\n  "medications": ["Metformin"],\n  "sleep": 5,\n  "fitnessLevel": 3,\n  "fitnessGoal": "muscle gain"\n}\n',
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: '```json\n{\n  "healthScore": 62,\n  "scoreBreakdown": {\n    "fitness": 12,\n    "sleep": 5,\n    "nutrition": 15,\n    "symptoms": -15,\n    "medications": -8,\n    "lifestyle": 18,\n    "otherFactors": 35\n  },\n  "healthInsights": "Your fitness level is moderate, and your goal is muscle gain.  However, you are experiencing dizziness and headaches, which could be related to your medication (Metformin) or insufficient sleep (only 5 hours).  These symptoms should be investigated.  The low sleep duration significantly impacts your overall health and ability to achieve your fitness goals.",\n  "improvementSteps": [\n    {\n      "id": 1,\n      "activity": "Consult with Doctor",\n      "text": "Discuss your dizziness and headaches with your doctor, especially since you are taking Metformin.  They can rule out any underlying medical conditions or medication side effects.",\n      "completed": false,\n      "target": "Schedule an appointment within the next week."\n    },\n    {\n      "id": 2,\n      "activity": "Increase Sleep Duration",\n      "text": "Aim for at least 7-9 hours of sleep per night.  Establish a regular sleep schedule, create a relaxing bedtime routine, and ensure your sleep environment is conducive to rest.",\n      "completed": false,\n      "target": "Increase sleep by 30 minutes per night each week until you reach at least 7 hours."\n    },\n    {\n      "id": 3,\n      "activity": "Hydration and Nutrition",\n      "text": "Ensure you are adequately hydrated, especially since dizziness can be a sign of dehydration.  Consume a balanced diet rich in protein, complex carbohydrates, and healthy fats to support muscle gain and overall health. Consider consulting a nutritionist or dietitian for a personalized meal plan.",\n      "completed": false,\n      "target": "Drink at least 2-3 liters of water daily and track your food intake to ensure balanced nutrition."\n    },\n    {\n      "id": 4,\n      "activity": "Stress Management",\n      "text": "Headaches and dizziness can be exacerbated by stress. Incorporate stress-reducing activities into your routine, such as yoga, meditation, or deep breathing exercises.",\n      "completed": false,\n      "target": "Practice at least 10 minutes of a stress-reducing activity daily."\n    },\n    {\n      "id": 5,\n      "activity": "Monitor Blood Sugar",\n      "text": "Since you are taking Metformin (typically prescribed for managing blood sugar), regularly monitor your blood sugar levels as directed by your doctor. This will help identify if your symptoms are related to blood sugar fluctuations.",\n      "completed": false,\n      "target": "Follow your doctor\'s instructions for blood sugar monitoring."\n    }\n  ]\n}\n```\n',
              },
            ],
          },
          {
            role: "user",
            parts: [
              {
                text: '{\n  "weight": 75,\n  "age": 30,\n  "gender": "male",\n  "bloodGroup": "O+",\n  "symptoms": ["dizziness", "headache"],\n  "medications": ["Metformin"],\n  "sleep": 5,\n  "fitnessLevel": 3,\n  "fitnessGoal": "muscle gain"\n}\n{\n  "weight": 75,\n  "age": 30,\n  "gender": "male",\n  "bloodGroup": "O+",\n  "symptoms": ["dizziness", "headache"],\n  "medications": ["Metformin"],\n  "sleep": 5,\n  "fitnessLevel": 3,\n  "fitnessGoal": "muscle gain"\n}\n',
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: 'You provided the same JSON input twice.  I\'ll process it as a single request and provide the same output as before, since the data hasn\'t changed.  If you intended to provide different data, please resubmit with the updated information.\n\n```json\n{\n  "healthScore": 62,\n  "scoreBreakdown": {\n    "fitness": 12,\n    "sleep": 5,\n    "nutrition": 15,\n    "symptoms": -15,\n    "medications": -8,\n    "lifestyle": 18,\n    "otherFactors": 35\n  },\n  "healthInsights": "Your fitness level is moderate, and your goal is muscle gain.  However, you are experiencing dizziness and headaches, which could be related to your medication (Metformin) or insufficient sleep (only 5 hours).  These symptoms should be investigated.  The low sleep duration significantly impacts your overall health and ability to achieve your fitness goals.",\n  "improvementSteps": [\n    {\n      "id": 1,\n      "activity": "Consult with Doctor",\n      "text": "Discuss your dizziness and headaches with your doctor, especially since you are taking Metformin.  They can rule out any underlying medical conditions or medication side effects.",\n      "completed": false,\n      "target": "Schedule an appointment within the next week."\n    },\n    {\n      "id": 2,\n      "activity": "Increase Sleep Duration",\n      "text": "Aim for at least 7-9 hours of sleep per night.  Establish a regular sleep schedule, create a relaxing bedtime routine, and ensure your sleep environment is conducive to rest.",\n      "completed": false,\n      "target": "Increase sleep by 30 minutes per night each week until you reach at least 7 hours."\n    },\n    {\n      "id": 3,\n      "activity": "Hydration and Nutrition",\n      "text": "Ensure you are adequately hydrated, especially since dizziness can be a sign of dehydration.  Consume a balanced diet rich in protein, complex carbohydrates, and healthy fats to support muscle gain and overall health. Consider consulting a nutritionist or dietitian for a personalized meal plan.",\n      "completed": false,\n      "target": "Drink at least 2-3 liters of water daily and track your food intake to ensure balanced nutrition."\n    },\n    {\n      "id": 4,\n      "activity": "Stress Management",\n      "text": "Headaches and dizziness can be exacerbated by stress. Incorporate stress-reducing activities into your routine, such as yoga, meditation, or deep breathing exercises.",\n      "completed": false,\n      "target": "Practice at least 10 minutes of a stress-reducing activity daily."\n    },\n    {\n      "id": 5,\n      "activity": "Monitor Blood Sugar",\n      "text": "Since you are taking Metformin (typically prescribed for managing blood sugar), regularly monitor your blood sugar levels as directed by your doctor. This will help identify if your symptoms are related to blood sugar fluctuations.",\n      "completed": false,\n      "target": "Follow your doctor\'s instructions for blood sugar monitoring."\n    }\n  ]\n}\n```\n',
              },
            ],
          },
        ],
      });

      const result = await chatSession.sendMessage(
        JSON.stringify(Metabolic_input)
      );

      // ✅ Extract JSON by removing markdown code block (```json ... ```)
      const aiResponseText = result.response.text();

      // ✅ Remove ```json and ``` from the response
      const cleanedJson = aiResponseText.replace(/```json|```/g, "").trim();

      // ✅ Parse the cleaned JSON
      const metabolicScoreData = JSON.parse(cleanedJson);

      console.log("Metabolic Score Response:", metabolicScoreData);

      // ✅ Store in MongoDB
      const storedSuccessfully = await storeHealthScore(metabolicScoreData);

      if (storedSuccessfully) {
        console.log("true");
        setHealthScore(metabolicScoreData.healthScore); // Update healthScore state
        setLoading(false); // Hide loading after everything is done
        setCurrentStep(11); // Navigate to HealthSetup after data and loading are handled
      } else {
        setLoading(false); // Hide loading on error
      }
    } catch (error) {
      console.error("Error generating metabolic score:", error);
      setLoading(false); // Hide loading on error
    }
  }

  const storeHealthScore = async (healthData) => {
    try {
      const token = sessionStorage.getItem("token");

      const response = await fetch(
        "http://localhost:4200/api/auth/user-health-score",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(healthData),
        }
      );

      if (response.ok) {
        console.log("Health score stored successfully");
        return true; // ✅ Indicate success
      } else {
        console.error("Failed to store health score:", response.status);
        return false; // ❌ Indicate failure
      }
    } catch (error) {
      console.error("Error storing health score:", error);
      return false; // ❌ Handle error case
    }
  };

  // Show HealthLoading screen after symptoms page
  const CurrentComponent = loading ? HealthLoading : steps[currentStep];

  return <CurrentComponent nextStep={nextStep} prevStep={prevStep} />;
}

export default Home;
