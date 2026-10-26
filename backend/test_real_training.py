
import yfinance as yf

from app.train import train_and_evaluate


def main():
    symbol = "AAPL"

    print(f"Downloading 5 years of historical data for {symbol}...")
    history = yf.Ticker(symbol).history(period="5y", interval="1d")

    if history.empty:
        print("No historical data returned. Please try again later.")
        return

    print(f"Downloaded {len(history)} daily price records.")

    result = train_and_evaluate(history)

    print("\n=== CrossMarket AI: ML Evaluation ===")
    print(f"Symbol: {symbol}")
    print(f"Usable observations: {result['observations']}")
    print(f"Training observations: {result['training_observations']}")
    print(f"Testing observations: {result['testing_observations']}")

    for model_name, metrics in result["models"].items():
        print(f"\n{model_name}")
        print(f"  Accuracy:  {metrics['accuracy']:.1%}")
        print(f"  Precision: {metrics['precision']:.1%}")
        print(f"  Recall:    {metrics['recall']:.1%}")
        print(f"  Confusion matrix: {metrics['confusion_matrix']}")

    print(f"\nDisclaimer: {result['disclaimer']}")


if __name__ == "__main__":
    main()

