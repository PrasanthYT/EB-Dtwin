import sys
import json
import lightgbm as lgb
import pandas as pd
import os

# Determine absolute path to the model
current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, 'heart_disease_model.txt')

# Load model
model = lgb.Booster(model_file=model_path)

def predict(input_json):
    print("DEBUG input:", input_json, file=sys.stderr)
    df = pd.DataFrame([input_json])
    pred = model.predict(df)
    return pred[0]

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.argv[1])
        if not isinstance(input_data, dict):
            raise ValueError("Input must be a JSON object with feature names and numeric values.")
        prediction = predict(input_data)
        print(prediction)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
