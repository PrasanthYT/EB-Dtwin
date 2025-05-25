'''# Imports
import pandas as pd
import os
import requests
from urllib.parse import urlparse
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score

# Step 1: Load your dataset file
df = pd.read_csv('/content/filereport_read_run_PRJEB11419_tsv.txt', sep='\t')

print(f"Total samples in dataset: {len(df)}")

# Step 2: Download a few raw FASTQ files (first 3 for demo)
os.makedirs('fastq_downloads', exist_ok=True)

for i, url in enumerate(df['fastq_ftp'].dropna().head(3)):
    # sometimes URLs separated by ; take first
    first_url = url.split(';')[0]
    filename = os.path.basename(urlparse(first_url).path)
    filepath = f'fastq_downloads/{filename}'
    if os.path.exists(filepath):
        print(f"{filename} already downloaded.")
        continue
    print(f"Downloading {filename} ...")
    try:
        r = requests.get('https://' + first_url, stream=True)
        r.raise_for_status()
        with open(filepath, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        print(f"Downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

# Step 3: Create synthetic metadata for gut health modeling
np.random.seed(42)
n_samples = len(df)

synthetic_metadata = pd.DataFrame({
    'sample_accession': df['sample_accession'],
    'total_fiber_g': np.random.uniform(10, 40, n_samples),    # grams of fiber intake per day
    'fodmap_g': np.random.uniform(0, 20, n_samples),          # grams of FODMAP intake per day
    'stress_level': np.random.randint(1, 11, n_samples),      # 1 (low) to 10 (high)
    'probiotic_food_servings': np.random.randint(0, 5, n_samples),  # servings per day
    'hrv': np.random.uniform(20, 100, n_samples),             # heart rate variability in ms
    'rhr': np.random.uniform(50, 90, n_samples),              # resting heart rate bpm
})

# Step 4: Create synthetic microbial abundance data (100 taxa)
microbial_abundance = pd.DataFrame(
    np.random.poisson(lam=5, size=(n_samples, 100)),
    columns=[f'taxon_{i}' for i in range(100)]
)

# Step 5: Create a synthetic target variable "gut_health_score"
# We'll assume gut health improves with more fiber, more probiotics, lower stress, higher HRV, lower RHR, and certain taxa
# Use a weighted combination + noise

weights = {
    'total_fiber_g': 0.3,
    'fodmap_g': -0.1,
    'stress_level': -0.25,
    'probiotic_food_servings': 0.2,
    'hrv': 0.15,
    'rhr': -0.15,
}

# Microbial taxa effect: let's say first 10 taxa positively influence gut health
microbe_effect = microbial_abundance.iloc[:, :10].sum(axis=1) * 0.05

gut_health_score = (
    synthetic_metadata['total_fiber_g'] * weights['total_fiber_g'] +
    synthetic_metadata['fodmap_g'] * weights['fodmap_g'] +
    synthetic_metadata['stress_level'] * weights['stress_level'] +
    synthetic_metadata['probiotic_food_servings'] * weights['probiotic_food_servings'] +
    synthetic_metadata['hrv'] * weights['hrv'] +
    synthetic_metadata['rhr'] * weights['rhr'] +
    microbe_effect +
    np.random.normal(0, 1, n_samples)  # noise
)

synthetic_metadata['gut_health_score'] = gut_health_score

print("\nSample of synthetic metadata + target:")
print(synthetic_metadata.head())

# Step 6: Prepare features and target for ML
X = pd.concat([synthetic_metadata.drop(['sample_accession', 'gut_health_score'], axis=1), microbial_abundance], axis=1)
y = synthetic_metadata['gut_health_score']

# Train/test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 7: Train a Random Forest regressor
model = RandomForestRegressor(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

# Predict & evaluate
y_pred = model.predict(X_test)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\nModel performance on synthetic test data:")
print(f"Mean Squared Error (MSE): {mse:.3f}")
print(f"R^2 Score: {r2:.3f}")

# Step 8: Save model (optional)
import joblib
joblib.dump(model, 'gut_health_rf_model.joblib')
print("\nModel saved as gut_health_rf_model.joblib")

'''