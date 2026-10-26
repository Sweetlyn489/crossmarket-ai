
from datetime import datetime, timezone

import yfinance as yf
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from app.ml_routes import router as ml_router
APP_NAME = "CrossMarket AI API"
APP_VERSION = "0.2.0"

app = FastAPI(
   
    title=APP_NAME,
    version=APP_VERSION,
    description="Cross-market analysis of Indian and US stock markets.",
)

app.include_router(ml_router)
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


@app.get("/compare", tags=["market analysis"])
def compare_markets(
    symbols: str = Query(..., description="Comma-separated stock symbols, e.g. AAPL,RELIANCE.NS"),
    period: str = Query(default="1mo", pattern="^(5d|1mo|3mo|6mo|1y)$"),
):
    symbol_list = [s.strip().upper() for s in symbols.split(",")]

    if not 2 <= len(symbol_list) <= 5:
        raise HTTPException(
            status_code=400,
            detail="Provide between 2 and 5 stock symbols",
        )

    if any(not s or len(s) > 30 for s in symbol_list):
        raise HTTPException(status_code=400, detail="Invalid stock symbol")

    if len(set(symbol_list)) != len(symbol_list):
        raise HTTPException(status_code=400, detail="Duplicate stock symbols are not allowed")

    results = []

    for symbol in symbol_list:
        try:
            history = yf.Ticker(symbol).history(period=period, interval="1d")

            if history.empty or history["Close"].dropna().empty:
                raise HTTPException(
                    status_code=404,
                    detail=f"No market data found for {symbol}",
                )

            closes = history["Close"].dropna()
            returns = closes.pct_change().dropna()

            first_close = float(closes.iloc[0])
            last_close = float(closes.iloc[-1])

            period_return = (
                (last_close - first_close) / first_close * 100
                if first_close != 0 else 0
            )

            daily_volatility = (
                float(returns.std(ddof=1) * (252 ** 0.5) * 100)
                if len(returns) >= 2 else 0
            )

            results.append({
                "symbol": symbol,
                "period": period,
                "first_close": round(first_close, 2),
                "latest_close": round(last_close, 2),
                "period_return_pct": round(period_return, 2),
                "highest_close": round(float(closes.max()), 2),
                "lowest_close": round(float(closes.min()), 2),
                "average_daily_volume": round(float(history["Volume"].mean()), 2),
                "annualized_volatility_pct": round(daily_volatility, 2),
                "observations": len(closes),
            })

        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Unable to retrieve market data for {symbol}",
            ) from exc

    return {
        "period": period,
        "comparison_basis": "Percentage return; prices remain in their original currencies",
        "results": results,
    }
