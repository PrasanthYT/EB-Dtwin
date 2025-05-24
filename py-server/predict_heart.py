import lightgbm as lgb
import pandas as pd

# Load heart disease model
model = lgb.Booster(model_file='models/heart_model.txt')

def predict_heart(input_json):
    df = pd.DataFrame([input_json])
    pred = model.predict(df)
    return float(pred[0])
