
from datetime import datetime, timezone

import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel

APP_NAME = "CrossMarket AI API"
APP_VERSION = "0.2.0"

app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="Cross-market analysis of Indian and US stock markets.",
)


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: str


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=APP_NAME,
        version=APP_VERSION,
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/market-data/{symbol}", tags=["market data"])
def get_market_data(
    symbol: str,
    period: str = Query(default="1mo", pattern="^(5d|1mo|3mo|6mo|1y)$"),
):
    symbol = symbol.strip().upper()

    if not symbol or len(symbol) > 30:
        raise HTTPException(status_code=400, detail="Invalid stock symbol")

    try:
        ticker = yf.Ticker(symbol)
        history = ticker.history(period=period, interval="1d")

        if history.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for {symbol}",
            )

        prices = []

        for date, row in history.iterrows():
            prices.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })

        return {
            "symbol": symbol,
            "period": period,
            "count": len(prices),
            "prices": prices,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Market data provider is temporarily unavailable",
        ) from exc
