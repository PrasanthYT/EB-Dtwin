'''
import pandas as pd
from tqdm import tqdm  # for progress bar
import numpy as np
import neurokit2 as nk
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
import lightgbm as lgb


# Load and clean dataset
df = pd.read_csv('/content/framingham.csv')
df = df.dropna().reset_index(drop=True)

total_available = len(df)
print(f"Total available subjects after cleaning: {total_available}")

num_subjects_to_generate = total_available
print(f"Generating HRV features for {num_subjects_to_generate} subjects...")

# Trim the dataframe
df = df.iloc[:num_subjects_to_generate].reset_index(drop=True)

def generate_hrv_features_for_subjects_low_risk(num_subjects=total_available):
    hrv_features_list = []

    for _ in tqdm(range(num_subjects), desc="Generating HRV features"):
        # Simulate ECG with heart rate centered around 60-70 bpm (healthy range)
        hr = np.random.normal(65, 3)  # Low risk heart rate around 65 ± 3 bpm
        
        # Generate ECG signal of 60 seconds
        signal = nk.ecg_simulate(duration=60, sampling_rate=1000, heart_rate=hr)

        # Extract R peaks
        _, rpeaks = nk.ecg_peaks(signal, sampling_rate=1000)
        
        # Calculate HRV features
        hrv = nk.hrv(rpeaks, sampling_rate=1000, show=False)

        # Post-process some HRV features to reflect healthy ranges:
        # For example, SDNN (normal: 50-100 ms), RMSSD (normal: 30-50 ms), etc.
        # Clamp or shift values if out of typical healthy ranges
        
        # Clamp SDNN between 50 and 100 ms
        if 'HRV_SDNN' in hrv.columns:
            hrv['HRV_SDNN'] = hrv['HRV_SDNN'].clip(lower=50, upper=100)
        
        # Clamp RMSSD between 30 and 50 ms
        if 'HRV_RMSSD' in hrv.columns:
            hrv['HRV_RMSSD'] = hrv['HRV_RMSSD'].clip(lower=30, upper=50)

        # You can add more clamping for other features as needed

        hrv_features_list.append(hrv)

    combined_hrv = pd.concat(hrv_features_list, axis=0).reset_index(drop=True)
    return combined_hrv

# Generate the synthetic HRV features biased towards healthy (low-risk) ranges
synthetic_hrv = generate_hrv_features_for_subjects_low_risk(num_subjects=num_subjects_to_generate)

# Align indexes
synthetic_hrv = synthetic_hrv.reset_index(drop=True)
df = df.reset_index(drop=True)

# Merge datasets
df_combined = pd.concat([df, synthetic_hrv], axis=1)

print(f"\n✅ Combined dataframe shape: {df_combined.shape}")
print("Combined dataframe preview:")
print(df_combined.head())



def generate_realistic_blood_markers(df, seed=42):
    """
    Given a DataFrame of N subjects (rows), add three columns:
     - LDL_to_HDL ratio ~ Normal(3.0, 0.5), clamp [1.0, 6.0]
     - CRP (mg/L)       ~ LogNormal(log(1.0), 0.5), clamp [0.1, 10.0]
     - HbA1c (%)        ~ Normal(5.5, 0.7), clamp [4.0, 9.0]

    Returns a new DataFrame with these columns added.
    """
    np.random.seed(seed)
    N = df.shape[0]
    
    # LDL/HDL ratio around 3.0 ± 0.5
    lhd = np.random.normal(loc=3.0, scale=0.5, size=N)
    lhd = np.clip(lhd, 1.0, 6.0)
    
    # CRP is skewed – use a log-normal around median ~1 mg/L
    # log(CRP) ~ Normal(0, 0.5)
    crp = np.random.lognormal(mean=0, sigma=0.5, size=N)
    crp = np.clip(crp, 0.1, 10.0)
    
    # HbA1c around 5.5 ± 0.7
    hba1c = np.random.normal(loc=5.5, scale=0.7, size=N)
    hba1c = np.clip(hba1c, 4.0, 9.0)
    
    out = df.copy()
    out['LDL_to_HDL'] = lhd
    out['CRP']        = crp
    out['HbA1c']      = hba1c
    return out

# Usage:
df_realistic = generate_realistic_blood_markers(df, seed=42)
print(df_realistic[['LDL_to_HDL','CRP','HbA1c']].describe())


target = 'TenYearCHD'

# Framingham feature candidates
framingham_features = [
    'age', 'cigsPerDay', 'BPMeds', 'prevalentStroke', 'prevalentHyp', 'diabetes',
    'totChol', 'sysBP', 'diaBP', 'BMI', 'heartRate', 'glucose',
    'LDL_to_HDL', 'CRP', 'HbA1c'
]

# Filter out features not present in df_combined
available_framingham_features = [f for f in framingham_features if f in df_combined.columns]

# Add HRV columns (excluding 'nni_counter')
hrv_cols = [col for col in synthetic_hrv.columns if col != 'nni_counter']

# Final features to use
feature_cols = available_framingham_features + hrv_cols

# Create X and y
X = df_combined[feature_cols]
y = df_combined[target]

# Print shape and distribution
print("Using features:", feature_cols)
print("Features shape:", X.shape)
print("Target distribution:\n", y.value_counts())




# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Create LightGBM datasets
train_data = lgb.Dataset(X_train, label=y_train)
test_data = lgb.Dataset(X_test, label=y_test, reference=train_data)

# Set parameters
params = {
    'objective': 'binary',
    'metric': 'auc',
    'boosting_type': 'gbdt',
    'learning_rate': 0.05,
    'num_leaves': 41,
    'feature_fraction': 0.9,
    'bagging_fraction': 0.8,
    'bagging_freq': 5,
    'verbose': -1
}

print("Training LightGBM model...")

# Use callbacks for early stopping
model = lgb.train(
    params,
    train_data,
    valid_sets=[test_data],
    num_boost_round=100,
    callbacks=[lgb.early_stopping(stopping_rounds=100)]
)

model.save_model('heart_disease_model.txt')
print("Model saved to chd_lgb_model.txt")

# Predict
y_pred_prob = model.predict(X_test)

# Evaluate
auc = roc_auc_score(y_test, y_pred_prob)
print(f"Test AUC Score: {auc:.4f}")

'''