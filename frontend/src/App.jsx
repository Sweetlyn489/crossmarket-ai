
import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  RefreshCw,
  Search,
  TrendingUp,
  BrainCircuit,
  Target,
  AlertCircle,
} from 'lucide-react'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || '/api'

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'RELIANCE.NS']

const PERIODS = [
  { label: '5D', value: '5d' },
  { label: '1M', value: '1mo' },
  { label: '3M', value: '3mo' },
  { label: '6M', value: '6mo' },
  { label: '1Y', value: '1y' },
]

const MODEL_COLORS = ['#61e7bd', '#8a9cff', '#f5bc70']

const money = (value) =>
  Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const percent = (value) => `${(Number(value) * 100).toFixed(2)}%`

function App() {
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS)
  const [input, setInput] = useState('')
  const [period, setPeriod] = useState('1mo')
  const [comparison, setComparison] = useState([])
  const [prices, setPrices] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  // Machine-learning evaluation state
  const [mlEvaluation, setMlEvaluation] = useState(null)
  const [mlLoading, setMlLoading] = useState(false)
  const [mlError, setMlError] = useState('')
  const [mlSymbol, setMlSymbol] = useState('AAPL')

  async function loadDashboard() {
    setLoading(true)
    setError('')

    try {
      const compareUrl =
        `${API}/compare?symbols=${encodeURIComponent(symbols.join(','))}` +
        `&period=${period}`

      const compareResponse = await fetch(compareUrl)
      const compareData = await compareResponse.json()

      if (!compareResponse.ok) {
        throw new Error(
          compareData.detail || 'Unable to compare stocks'
        )
      }

      setComparison(compareData.results || [])

      const priceEntries = await Promise.all(
        symbols.map(async (symbol) => {
          const response = await fetch(
            `${API}/market-data/${encodeURIComponent(symbol)}?period=${period}`
          )
          const data = await response.json()

          if (!response.ok) {
            throw new Error(
              data.detail || `Unable to load ${symbol}`
            )
          }

          return [symbol, data.prices || []]
        })
      )

      setPrices(Object.fromEntries(priceEntries))
      setUpdatedAt(new Date().toLocaleTimeString())
    } catch (err) {
      setError(err.message || 'Could not connect to the backend.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMlEvaluation(symbol = mlSymbol) {
    const selectedSymbol = symbol.trim().toUpperCase()

    if (!selectedSymbol) {
      setMlError('Enter a valid stock symbol.')
      return
    }

    setMlLoading(true)
    setMlError('')

    try {
      const response = await fetch(
        `${API}/ml/evaluate/${encodeURIComponent(selectedSymbol)}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to evaluate ML models'
        )
      }

      if (!data.models || typeof data.models !== 'object') {
        throw new Error('The API returned an unexpected model evaluation.')
      }

      setMlEvaluation(data)
      setMlSymbol(selectedSymbol)
    } catch (err) {
      setMlError(err.message || 'Could not load ML evaluation.')
      setMlEvaluation(null)
    } finally {
      setMlLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [symbols, period])

  const chartData = (() => {
    const dates = new Set()

    Object.values(prices).forEach((rows) =>
      rows.forEach((row) => dates.add(row.date))
    )

    return [...dates].sort().map((date) => {
      const point = { date }

      Object.entries(prices).forEach(([symbol, rows]) => {
        const row = rows.find((item) => item.date === date)
        point[symbol] = row ? row.close : null
      })

      return point
    })
  })()

  function addSymbol(event) {
    event.preventDefault()

    const symbol = input.trim().toUpperCase()

    if (!symbol) return

    if (symbols.includes(symbol)) {
      setError(`${symbol} is already in your comparison.`)
      return
    }

    if (symbols.length >= 5) {
      setError('Compare up to five stocks at a time.')
      return
    }

    setSymbols((current) => [...current, symbol])
    setInput('')
  }

  function removeSymbol(symbol) {
    if (symbols.length <= 2) {
      setError('Keep at least two stocks to compare.')
      return
    }

    setSymbols((current) =>
      current.filter((item) => item !== symbol)
    )
  }

  const bestPerformer = comparison.reduce(
    (best, item) =>
      !best || item.period_return_pct > best.period_return_pct
        ? item
        : best,
    null
  )

  // Determine the highest accuracy from the returned model metrics.
  const modelEntries = mlEvaluation
    ? Object.entries(mlEvaluation.models).filter(
        ([, metrics]) => Number.isFinite(metrics.accuracy)
      )
    : []

  const bestModel = modelEntries.reduce(
    (best, item) =>
      !best || item[1].accuracy > best[1].accuracy ? item : best,
    null
  )

  const baseline = mlEvaluation?.models?.dummy_baseline
  const beatsBaseline =
    bestModel &&
    baseline &&
    bestModel[1].accuracy > baseline.accuracy

  const panelStyle = {
    background: '#10151f',
    border: '1px solid #232b3a',
    borderRadius: 12,
    padding: 23,
    marginBottom: 20,
  }

  const mutedStyle = {
    color: '#8792a8',
    fontSize: 11,
    lineHeight: 1.7,
  }

  const inputStyle = {
    minWidth: 0,
    width: '100%',
    background: '#111722',
    border: '1px solid #30394a',
    borderRadius: 8,
    color: '#edf1fa',
    padding: '10px 12px',
    outline: 'none',
  }

  const buttonStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#61e7bd',
    border: '1px solid #61e7bd',
    borderRadius: 8,
    color: '#0a1715',
    padding: '10px 14px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-icon">
            <Activity size={22} />
          </span>
          <span>
            CrossMarket<span className="brand-accent"> AI</span>
          </span>
        </a>

        <div className="nav-label">WORKSPACE</div>

        <div className="nav-item active">
          <BarChart3 size={18} />
          Market overview
        </div>

        
<button
  type="button"
  className="nav-item"
  onClick={() => {
    document
      .querySelector('.table-panel')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }}
>
  <TrendingUp size={18} />
  Stock comparison
</button>


        <div className="sidebar-bottom">
          <div className="status-dot" />
          <div>
            <strong>Market data API</strong>
            <span>Connected when requests succeed</span>
          </div>
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <div className="eyebrow">
              MARKET INTELLIGENCE / OVERVIEW
            </div>
            <h1>Market overview</h1>
            <p className="subtitle">
              Compare markets. Understand performance.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? 'spin' : ''}
            />
            Refresh data
          </button>
        </header>

        <section className="toolbar">
          <form className="symbol-form" onSubmit={addSymbol}>
            <Search size={17} />
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Add symbol, e.g. NVDA"
              aria-label="Stock symbol"
            />
            <button type="submit">Add</button>
          </form>

          <div
            className="period-control"
            aria-label="Choose time period"
          >
            {PERIODS.map((item) => (
              <button
                key={item.value}
                className={period === item.value ? 'selected' : ''}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setError('')}>Dismiss</button>
          </div>
        )}

        <section className="metric-grid">
          <article className="metric-card">
            <div className="metric-label">MARKETS TRACKED</div>
            <div className="metric-value">{symbols.length}</div>
            <div className="metric-foot">Up to five symbols</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">BEST PERIOD RETURN</div>
            <div
              className={`metric-value ${
                bestPerformer?.period_return_pct >= 0
                  ? 'positive'
                  : 'negative'
              }`}
            >
              {bestPerformer
                ? `${bestPerformer.period_return_pct > 0 ? '+' : ''}${bestPerformer.period_return_pct}%`
                : '—'}
            </div>
            <div className="metric-foot">
              {bestPerformer?.symbol || 'Waiting for market data'}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">AVERAGE VOLATILITY</div>
            <div className="metric-value">
              {comparison.length
                ? `${money(
                    comparison.reduce(
                      (sum, item) =>
                        sum + item.annualized_volatility_pct,
                      0
                    ) / comparison.length
                  )}%`
                : '—'}
            </div>
            <div className="metric-foot">
              Annualized historical estimate
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">LAST UPDATED</div>
            <div className="metric-value update-value">
              {updatedAt || '—'}
            </div>
            <div className="metric-foot">
              {loading ? 'Updating…' : 'Updated on request'}
            </div>
          </article>
        </section>

        <section className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Price performance</h2>
              <p>
                Daily closing prices · Original trading currencies
              </p>
            </div>
            <span className="live-pill">
              <span />
              {loading ? 'Updating' : 'Historical data'}
            </span>
          </div>

          <div className="chart-legend">
            {symbols.map((symbol, index) => (
              <span key={symbol}>
                <i className={`legend-dot color-${index}`} />
                {symbol}
              </span>
            ))}
          </div>

          <div className="chart-area">
            {loading && chartData.length === 0 ? (
              <div className="empty-state">
                Loading market data…
              </div>
            ) : chartData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{
                    top: 10,
                    right: 12,
                    left: 0,
                    bottom: 0,
                  }}
                >
                  <defs>
                    {symbols.map((symbol, index) => (
                      <linearGradient
                        key={symbol}
                        id={`fill-${index}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor={MODEL_COLORS.concat([
                            '#f18bb7',
                            '#c69bff',
                          ])[index]}
                          stopOpacity={0.2}
                        />
                        <stop
                          offset="95%"
                          stopColor={MODEL_COLORS.concat([
                            '#f18bb7',
                            '#c69bff',
                          ])[index]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>

                  <CartesianGrid
                    stroke="#242b3a"
                    strokeDasharray="4 5"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#818ba1', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={35}
                  />

                  <YAxis
                    tick={{ fill: '#818ba1', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    width={65}
                  />

                  <Tooltip
                    contentStyle={{
                      background: '#111723',
                      border: '1px solid #30394a',
                      borderRadius: 10,
                    }}
                    labelStyle={{ color: '#e8edf7' }}
                  />

                  {symbols.map((symbol, index) => (
                    <Area
                      key={symbol}
                      type="monotone"
                      dataKey={symbol}
                      name={symbol}
                      stroke={
                        [
                          '#61e7bd',
                          '#8a9cff',
                          '#f5bc70',
                          '#f18bb7',
                          '#c69bff',
                        ][index]
                      }
                      strokeWidth={2}
                      fill={`url(#fill-${index})`}
                      connectNulls
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state">
                {error
                  ? 'Market data could not be loaded.'
                  : 'No chart data available yet.'}
              </div>
            )}
          </div>

          <p className="chart-note">
            Share prices may use different currencies and scales. Use
            the comparison table below to compare percentage returns.
          </p>
        </section>

        <section className="panel table-panel">
          <div className="panel-heading">
            <div>
              <h2>Market comparison</h2>
              <p>Historical performance for the selected period</p>
            </div>
            <span className="count-pill">
              {comparison.length} assets
            </span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>ASSET</th>
                  <th>LATEST CLOSE</th>
                  <th>PERIOD RETURN</th>
                  <th>HIGH / LOW</th>
                  <th>AVG. VOLUME</th>
                  <th>VOLATILITY</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {comparison.map((item) => (
                  <tr key={item.symbol}>
                    <td>
                      <strong className="asset-name">
                        {item.symbol}
                      </strong>
                      <span className="asset-subtitle">
                        Market instrument
                      </span>
                    </td>

                    <td className="number-cell">
                      {money(item.latest_close)}
                    </td>

                    <td>
                      <span
                        className={`return-pill ${
                          item.period_return_pct >= 0
                            ? 'return-up'
                            : 'return-down'
                        }`}
                      >
                        {item.period_return_pct >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {item.period_return_pct > 0 ? '+' : ''}
                        {item.period_return_pct}%
                      </span>
                    </td>

                    <td className="number-cell">
                      {money(item.highest_close)} /{' '}
                      {money(item.lowest_close)}
                    </td>

                    <td className="number-cell">
                      {Math.round(
                        item.average_daily_volume
                      ).toLocaleString('en-US')}
                    </td>

                    <td className="number-cell">
                      {money(item.annualized_volatility_pct)}%
                    </td>

                    <td>
                      <button
                        className="remove-button"
                        onClick={() => removeSymbol(item.symbol)}
                        aria-label={`Remove ${item.symbol}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}

                {!comparison.length && !loading && (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      No comparison data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Machine-learning evaluation panel */}
        <section style={panelStyle}>
          <div className="panel-heading">
            <div>
              <h2
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                }}
              >
                <BrainCircuit size={20} color="#61e7bd" />
                ML model evaluation
              </h2>
              <p>
                Compare predictive models on historical stock data
              </p>
            </div>

            <span className="count-pill">Research prototype</span>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              loadMlEvaluation(mlSymbol)
            }}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginTop: 22,
            }}
          >
            <div style={{ flex: '1 1 180px' }}>
              <label
                htmlFor="ml-symbol"
                style={{
                  display: 'block',
                  ...mutedStyle,
                  marginBottom: 7,
                }}
              >
                STOCK SYMBOL
              </label>
              <input
                id="ml-symbol"
                value={mlSymbol}
                onChange={(event) =>
                  setMlSymbol(event.target.value.toUpperCase())
                }
                placeholder="e.g. AAPL"
                style={inputStyle}
              />
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  opacity: mlLoading ? 0.7 : 1,
                }}
                disabled={mlLoading}
              >
                <BrainCircuit size={15} />
                {mlLoading ? 'Evaluating…' : 'Evaluate models'}
              </button>
            </div>
          </form>

          {mlError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                gap: 9,
                alignItems: 'center',
                color: '#ffb2bc',
                background: '#28181f',
                border: '1px solid #613b43',
                borderRadius: 8,
                padding: 12,
                marginTop: 16,
                fontSize: 12,
              }}
            >
              <AlertCircle size={16} />
              {mlError}
            </div>
          )}

          {!mlEvaluation && !mlLoading && !mlError && (
            <div
              style={{
                marginTop: 22,
                border: '1px dashed #30394a',
                borderRadius: 9,
                padding: 25,
                textAlign: 'center',
              }}
            >
              <BrainCircuit
                size={27}
                color="#61e7bd"
                style={{ marginBottom: 10 }}
              />
              <p style={{ color: '#edf1fa', fontSize: 13 }}>
                Evaluate models for a stock
              </p>
              <p style={mutedStyle}>
                The API will train and evaluate its models using
                historical data, then return test-set metrics.
              </p>
            </div>
          )}

          {mlLoading && (
            <div
              className="empty-state"
              style={{ minHeight: 100, marginTop: 12 }}
            >
              Fetching historical data and evaluating models…
            </div>
          )}

          {mlEvaluation && !mlLoading && (
            <>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 12,
                  marginTop: 22,
                }}
              >
                <article className="metric-card">
                  <div className="metric-label">EVALUATED SYMBOL</div>
                  <div className="metric-value">
                    {mlEvaluation.symbol}
                  </div>
                  <div className="metric-foot">
                    Historical daily data
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-label">OBSERVATIONS</div>
                  <div className="metric-value">
                    {Number(
                      mlEvaluation.observations || 0
                    ).toLocaleString('en-US')}
                  </div>
                  <div className="metric-foot">
                    Total usable observations
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-label">TRAINING SAMPLES</div>
                  <div className="metric-value">
                    {Number(
                      mlEvaluation.training_observations || 0
                    ).toLocaleString('en-US')}
                  </div>
                  <div className="metric-foot">
                    Used to fit the models
                  </div>
                </article>

                <article className="metric-card">
                  <div className="metric-label">TEST SAMPLES</div>
                  <div className="metric-value">
                    {Number(
                      mlEvaluation.testing_observations || 0
                    ).toLocaleString('en-US')}
                  </div>
                  <div className="metric-foot">
                    Held-out evaluation data
                  </div>
                </article>
              </div>

              <div style={{ marginTop: 25 }}>
                <div className="panel-heading">
                  <div>
                    <h2>Accuracy comparison</h2>
                    <p>
                      Accuracy on the chronological test set
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {modelEntries.map(([name, metrics], index) => {
                    const isBest =
                      bestModel && name === bestModel[0]
                    const accuracy = Number(metrics.accuracy) * 100

                    return (
                      <article
                        key={name}
                        style={{
                          background: '#111722',
                          border: `1px solid ${
                            isBest ? '#315047' : '#272e3e'
                          }`,
                          borderRadius: 10,
                          padding: 16,
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              color: '#b7c0d2',
                              fontSize: 11,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {name.replaceAll('_', ' ')}
                          </span>

                          {isBest && (
                            <span
                              style={{
                                color: '#61e7bd',
                                fontSize: 9,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              TOP ACCURACY
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: 27,
                            fontWeight: 600,
                            marginTop: 16,
                            color:
                              MODEL_COLORS[index % MODEL_COLORS.length],
                          }}
                        >
                          {accuracy.toFixed(2)}%
                        </div>

                        <div
                          style={{
                            height: 6,
                            background: '#252d3c',
                            borderRadius: 10,
                            overflow: 'hidden',
                            marginTop: 12,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              width: `${Math.max(
                                0,
                                Math.min(100, accuracy)
                              )}%`,
                              background:
                                MODEL_COLORS[
                                  index % MODEL_COLORS.length
                                ],
                              borderRadius: 10,
                            }}
                          />
                        </div>

                        <div
                          style={{
                            ...mutedStyle,
                            marginTop: 13,
                          }}
                        >
                          Precision:{' '}
                          {percent(metrics.precision)}
                          <br />
                          Recall: {percent(metrics.recall)}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              {baseline && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 16,
                    borderRadius: 9,
                    background: '#111722',
                    border: '1px solid #272e3e',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 9,
                      color: beatsBaseline ? '#61e7bd' : '#f5bc70',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <Target size={17} />
                    {beatsBaseline
                      ? 'A model beats the baseline'
                      : 'No model beats the baseline yet'}
                  </div>

                  <p style={{ ...mutedStyle, marginTop: 8 }}>
                    Baseline accuracy:{' '}
                    {percent(baseline.accuracy)}.
                    {bestModel
                      ? ` Best model (${bestModel[0].replaceAll('_', ' ')}) accuracy: ${percent(bestModel[1].accuracy)}.`
                      : ''}
                    {' '}Higher accuracy alone does not guarantee
                    profitable predictions.
                  </p>
                </div>
              )}

              <div style={{ marginTop: 25 }}>
                <div className="panel-heading">
                  <div>
                    <h2>Confusion matrices</h2>
                    <p>
                      Actual outcomes versus model predictions
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(230px, 1fr))',
                    gap: 12,
                    marginTop: 16,
                  }}
                >
                  {modelEntries.map(([name, metrics]) => {
                    const matrix = metrics.confusion_matrix

                    return (
                      <article
                        key={name}
                        style={{
                          background: '#111722',
                          border: '1px solid #272e3e',
                          borderRadius: 10,
                          padding: 14,
                          minWidth: 0,
                        }}
                      >
                        <h3
                          style={{
                            color: '#edf1fa',
                            fontSize: 12,
                            margin: '0 0 12px',
                            overflowWrap: 'anywhere',
                            textTransform: 'capitalize',
                          }}
                        >
                          {name.replaceAll('_', ' ')}
                        </h3>

                        {Array.isArray(matrix) &&
                        matrix.length >= 2 &&
                        matrix[0]?.length >= 2 &&
                        matrix[1]?.length >= 2 ? (
                          <>
                            <p
                              style={{
                                ...mutedStyle,
                                marginBottom: 8,
                              }}
                            >
                              Rows: actual · Columns: predicted
                            </p>

                            <table
                              style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                textAlign: 'center',
                                whiteSpace: 'normal',
                              }}
                            >
                              <thead>
                                <tr>
                                  <th
                                    style={{
                                      padding: 7,
                                      textAlign: 'center',
                                    }}
                                  >
                                    Actual / Pred.
                                  </th>
                                  <th
                                    style={{
                                      padding: 7,
                                      textAlign: 'center',
                                    }}
                                  >
                                    Down (0)
                                  </th>
                                  <th
                                    style={{
                                      padding: 7,
                                      textAlign: 'center',
                                    }}
                                  >
                                    Up (1)
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {matrix.slice(0, 2).map((row, rowIndex) => (
                                  <tr key={rowIndex}>
                                    <td
                                      style={{
                                        borderTop: '1px solid #242b39',
                                        padding: 9,
                                        color: '#aeb8ca',
                                        fontSize: 10,
                                      }}
                                    >
                                      {rowIndex === 0
                                        ? 'Down (0)'
                                        : 'Up (1)'}
                                    </td>
                                    {row.slice(0, 2).map((value, colIndex) => (
                                      <td
                                        key={colIndex}
                                        style={{
                                          borderTop: '1px solid #242b39',
                                          padding: 10,
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color:
                                            rowIndex === colIndex
                                              ? '#61e7bd'
                                              : '#ffb2bc',
                                        }}
                                      >
                                        {value}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </>
                        ) : (
                          <p style={mutedStyle}>
                            Confusion matrix is not available.
                          </p>
                        )}
                      </article>
                    )
                  })}
                </div>
              </div>

              <p
                style={{
                  ...mutedStyle,
                  marginTop: 20,
                  borderTop: '1px solid #242b39',
                  paddingTop: 15,
                }}
              >
                Target definition:{' '}
                {mlEvaluation.target_definition ||
                  'Predict whether the next trading day closes higher.'}
                <br />
                Data split:{' '}
                {mlEvaluation.split ||
                  'Chronological train/test split without shuffling.'}
                <br />
                {mlEvaluation.disclaimer ||
                  'Historical research only; not financial advice.'}
              </p>
            </>
          )}
        </section>

        <footer className="footer">
          <span>
            CrossMarket AI · Educational market analytics
          </span>
          <span>
            Data can be delayed · Not financial advice
          </span>
        </footer>
      </section>
    </main>
  )
}

export default App
