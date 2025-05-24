import joblib
import numpy as np

# Load saved model
model = joblib.load("gut_health_model.pkl")

# Define the order of input features
FEATURE_ORDER = [
    "age", "sex", "fiber_intake", "fodmap_score", "stress_level",
    "prebiotic_intake", "probiotic_intake", "hrv", "rhr"
]

def predict_gut(input_dict: dict) -> float:
    # Set default values if features are missing
    default_values = {
        "age": 30, "sex": 0, "fiber_intake": 25, "fodmap_score": 5,
        "stress_level": 5, "prebiotic_intake": 5, "probiotic_intake": 3,
        "hrv": 50, "rhr": 70
    }

    input_filled = [input_dict.get(key, default_values[key]) for key in FEATURE_ORDER]
    input_array = np.array(input_filled).reshape(1, -1)

    prediction = model.predict(input_array)[0]
    return round(float(prediction), 2)
