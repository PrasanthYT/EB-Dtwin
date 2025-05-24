import joblib
import pandas as pd

# Load diabetes model
model = joblib.load('models/diabetes_model.pkl')

def predict_diabetes(input_json):
    df = pd.DataFrame([input_json])
    pred = model.predict(df)
    return int(pred[0])
