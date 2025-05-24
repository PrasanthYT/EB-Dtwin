'''
# Install dependencies (if running first time)
# !pip install xgboost lightgbm imbalanced-learn

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, RandomizedSearchCV, StratifiedKFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, classification_report
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from sklearn.ensemble import RandomForestClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from imblearn.over_sampling import SMOTE
import warnings
import joblib
warnings.filterwarnings('ignore')

# Load dataset
url = "https://raw.githubusercontent.com/jbrownlee/Datasets/master/pima-indians-diabetes.data.csv"
columns = ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin',
           'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome']
df = pd.read_csv(url, names=columns)

# Replace zeros with NaN for medically impossible zero values
zero_invalid_cols = ['Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI']
df[zero_invalid_cols] = df[zero_invalid_cols].replace(0, np.nan)

# Add synthetic lifestyle features
np.random.seed(42)
df['meal_calories'] = np.random.normal(2200, 300, len(df)).clip(1500, 3000)
df['glycemic_index_avg'] = np.random.normal(55, 10, len(df)).clip(30, 80)
df['sleep_hours'] = np.random.normal(7, 1.5, len(df)).clip(4, 10)
df['stress_level'] = np.random.randint(1, 6, len(df))  # 1 (low) to 5 (high)
df['steps'] = np.random.normal(8000, 2000, len(df)).clip(2000, 15000)
df['resting_hr'] = np.random.normal(72, 8, len(df)).clip(50, 100)
df['active_minutes'] = np.random.normal(45, 20, len(df)).clip(10, 120)

# Feature engineering
df['sleep_efficiency'] = df['active_minutes'] / df['sleep_hours']
df['stress_sleep_ratio'] = df['stress_level'] / df['sleep_hours']
df['activity_index'] = (df['steps'] + df['active_minutes'] * 100) / df['BMI']

# Check for inf or very large values
df.replace([np.inf, -np.inf], np.nan, inplace=True)

# Prepare features and target
X = df.drop('Outcome', axis=1)
y = df['Outcome']

# Impute missing data (mean imputation)
imputer = SimpleImputer(strategy='mean')
X_imputed = imputer.fit_transform(X)

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X_imputed)

# Stratified train-test split
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y,
                                                    test_size=0.2,
                                                    stratify=y,
                                                    random_state=42)

# Handle class imbalance with SMOTE on training data
smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train, y_train)

# Define models
xgb = XGBClassifier(eval_metric='logloss', use_label_encoder=False, random_state=42)
lgb = LGBMClassifier(random_state=42)
rf = RandomForestClassifier(random_state=42)

# Hyperparameter grids for tuning
param_grid_xgb = {
    'n_estimators': [100, 300, 500],
    'max_depth': [3, 5, 7],
    'learning_rate': [0.01, 0.05, 0.1],
    'subsample': [0.6, 0.8, 1.0],
    'colsample_bytree': [0.6, 0.8, 1.0],
    'gamma': [0, 1],
    'reg_alpha': [0, 0.01, 0.1],
    'reg_lambda': [0.5, 1, 2]
}

param_grid_lgb = {
    'n_estimators': [100, 300, 500],
    'max_depth': [3, 5, 7],
    'learning_rate': [0.01, 0.05, 0.1],
    'num_leaves': [31, 50, 70],
    'subsample': [0.6, 0.8, 1.0],
    'colsample_bytree': [0.6, 0.8, 1.0],
    'reg_alpha': [0, 0.01, 0.1],
    'reg_lambda': [0.5, 1, 2]
}

param_grid_rf = {
    'n_estimators': [100, 300, 500],
    'max_depth': [None, 10, 20, 30],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
    'bootstrap': [True, False]
}

# RandomizedSearchCV helper
def tune_model(model, param_grid):
    search = RandomizedSearchCV(model, param_grid, n_iter=25, cv=5,
                                scoring='accuracy', n_jobs=-1, random_state=42)
    search.fit(X_train_bal, y_train_bal)
    print(f"Best params for {model.__class__.__name__}: {search.best_params_}")
    return search.best_estimator_

# Tune models
best_xgb = tune_model(xgb, param_grid_xgb)
best_lgb = tune_model(lgb, param_grid_lgb)
best_rf = tune_model(rf, param_grid_rf)

# Stacking ensemble
estimators = [
    ('xgb', best_xgb),
    ('lgb', best_lgb),
    ('rf', best_rf)
]

stacking_clf = StackingClassifier(
    estimators=estimators,
    final_estimator=LogisticRegression(),
    cv=5,
    n_jobs=-1,
    passthrough=True
)

stacking_clf.fit(X_train_bal, y_train_bal)



joblib.dump(stacking_clf, 'stacking_model.pkl')
# Evaluate test set
y_pred = stacking_clf.predict(X_test)

print("\n=== Stacking Ensemble Test Performance ===")
print("Accuracy:", accuracy_score(y_test, y_pred))
print("F1 Score:", f1_score(y_test, y_pred))
print("\nClassification Report:\n", classification_report(y_test, y_pred))

# Stable cross-validation score
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_acc = cross_val_score(stacking_clf, X_scaled, y, cv=cv, scoring='accuracy', n_jobs=-1)
cv_f1 = cross_val_score(stacking_clf, X_scaled, y, cv=cv, scoring='f1', n_jobs=-1)

print(f"\nCross-Validated Accuracy: {cv_acc.mean():.4f} ± {cv_acc.std():.4f}")
print(f"Cross-Validated F1 Score: {cv_f1.mean():.4f} ± {cv_f1.std():.4f}")
'''
