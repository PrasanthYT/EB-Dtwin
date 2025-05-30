from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from predict_diabetes import predict_diabetes
from predict_heart import predict_heart
from predict_gut import predict_gut  # <-- Import added

app = FastAPI()

# 🎯 Generic input schema (update to include gut-relevant features)
class InputData(BaseModel):
    age: float | None = None
    bmi: float | None = None
    glucose: float | None = None
    insulin: float | None = None
    bloodpressure: float | None = None
    cholesterol: float | None = None
    sex: int | None = None
    cp: int | None = None
    thalach: float | None = None

    # Gut-specific features
    fiber_intake: float | None = None
    fodmap_score: float | None = None
    stress_level: float | None = None
    prebiotic_intake: float | None = None
    probiotic_intake: float | None = None
    hrv: float | None = None
    rhr: float | None = None

@app.post("/predict/diabetes")
def diabetes_prediction(input_data: InputData):
    try:
        input_dict = input_data.dict(exclude_none=True)
        result = predict_diabetes(input_dict)
        return {"prediction": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/heart")
def heart_prediction(input_data: InputData):
    try:
        input_dict = input_data.dict(exclude_none=True)
        result = predict_heart(input_dict)
        return {"prediction": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/gut")
def gut_prediction(input_data: InputData):
    try:
        input_dict = input_data.dict(exclude_none=True)
        result = predict_gut(input_dict)
        return {"prediction": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
