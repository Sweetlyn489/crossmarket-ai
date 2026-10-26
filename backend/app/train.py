
"""Train and evaluate stock-direction classification models."""

from typing import Any

import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, precision_score, recall_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml import FEATURE_COLUMNS, build_dataset


def train_and_evaluate(history: pd.DataFrame) -> dict[str, Any]:
    """Train models and evaluate them on later historical observations."""
    dataset = build_dataset(history)

    if len(dataset) < 60:
        raise ValueError("Need at least 60 usable observations to train and evaluate")

    split_index = int(len(dataset) * 0.8)
    train = dataset.iloc[:split_index]
    test = dataset.iloc[split_index:]

    if train["target"].nunique() < 2:
        raise ValueError("Training data must contain both target classes")

    X_train = train[FEATURE_COLUMNS]
    y_train = train["target"]
    X_test = test[FEATURE_COLUMNS]
    y_test = test["target"]

    models = {
        "dummy_baseline": DummyClassifier(strategy="most_frequent"),
        "logistic_regression": Pipeline([
            ("scaler", StandardScaler()),
            ("model", LogisticRegression(max_iter=2000, random_state=42)),
        ]),
        "random_forest": RandomForestClassifier(
            n_estimators=200,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
        ),
    }

    results = {}

    for name, model in models.items():
        model.fit(X_train, y_train)
        predictions = model.predict(X_test)

        results[name] = {
            "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "precision": round(float(precision_score(
                y_test, predictions, zero_division=0
            )), 4),
            "recall": round(float(recall_score(
                y_test, predictions, zero_division=0
            )), 4),
            "confusion_matrix": confusion_matrix(
                y_test, predictions, labels=[0, 1]
            ).tolist(),
        }

    return {
        "observations": len(dataset),
        "training_observations": len(train),
        "testing_observations": len(test),
        "target_definition": "1 = next trading day's close rises; 0 = otherwise",
        "split": "chronological 80/20; no shuffle",
        "models": results,
        "disclaimer": "Historical research only; not financial advice.",
    }
