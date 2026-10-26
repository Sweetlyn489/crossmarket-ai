
"""On-demand ML evaluation endpoints."""

import yfinance as yf
from fastapi import APIRouter, HTTPException

from app.train import train_and_evaluate

router = APIRouter(tags=["machine learning"])


@router.get("/ml/evaluate/{symbol}")
def evaluate_stock_model(symbol: str):
    """Evaluate stock-direction models on five years of historical data."""
    symbol = symbol.strip().upper()

    if not symbol or len(symbol) > 30:
        raise HTTPException(status_code=400, detail="Invalid stock symbol")

    try:
        history = yf.Ticker(symbol).history(period="5y", interval="1d")

        if history.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {symbol}",
            )

        result = train_and_evaluate(history)

        return {
            "symbol": symbol,
            **result,
        }

    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to evaluate models using market data",
        ) from exc
