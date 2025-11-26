import { useEffect, useMemo, useState } from 'react'
import './App.css'

const defaultCredentials = {
  email: 'bfar.bohol@da.gov.ph',
  password: 'tilapia2025!',
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

const fallbackProduction = [
  { month: 'Jan 2019', fryCount: 65000 },
  { month: 'Feb 2019', fryCount: 69000 },
  { month: 'Mar 2019', fryCount: 71200 },
  { month: 'Apr 2019', fryCount: 77000 },
  { month: 'May 2019', fryCount: 80500 },
  { month: 'Jun 2019', fryCount: 79000 },
]

const formatNumber = (value = 0) =>
  new Intl.NumberFormat('en-PH', { maximumFractionDigits: 0 }).format(value)

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatSpecies = (species) => {
  if (!species) return '—'
  return species.replace(/Excel/gi, 'Tilapia')
}

function App() {
  const [credentials, setCredentials] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [activePanel, setActivePanel] = useState(null)
  const [keyword, setKeyword] = useState('')
  const [classification, setClassification] = useState('individual')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState(null)
  const [production, setProduction] = useState([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [loadingSummary, setLoadingSummary] = useState(false)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)
  const [breakdown, setBreakdown] = useState(null)
  const [toast, setToast] = useState('')

  const handleLogin = (event) => {
    event.preventDefault()
    const isValid =
      credentials.email.trim() === defaultCredentials.email &&
      credentials.password === defaultCredentials.password

    if (!isValid) {
      setError('Incorrect access code. Contact BFAR admin for help.')
      return
    }

    setUser({ email: credentials.email })
    setError('')
    void bootstrapSummary()
  }

  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    const fetchRecords = async () => {
      setLoadingRecords(true)
      try {
        const params = new URLSearchParams({ classification })
        if (selectedYear) params.append('year', selectedYear)
        if (selectedMonth) params.append('month', selectedMonth)

        const response = await fetch(
          `${API_BASE_URL}/beneficiaries?${params.toString()}`,
          { signal: controller.signal }
        )
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load records')
        }
        setRecords(payload.data ?? [])
        setToast('')
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error(err)
        setToast('Live database unavailable. Showing local view only.')
        setRecords([])
      } finally {
        setLoadingRecords(false)
      }
    }

    fetchRecords()
    return () => controller.abort()
  }, [user, classification, selectedYear, selectedMonth])

  const bootstrapSummary = async () => {
    setLoadingSummary(true)
    setLoadingBreakdown(true)
    try {
      const [summaryRes, productionRes, breakdownRes] = await Promise.all([
        fetch(`${API_BASE_URL}/stats/summary`),
        fetch(`${API_BASE_URL}/stats/production`),
        fetch(`${API_BASE_URL}/stats/breakdown`),
      ])

      if (summaryRes.ok) {
        const summaryPayload = await summaryRes.json()
        setSummary(summaryPayload.data?.totals ?? null)
      } else {
        setSummary(null)
      }

      if (productionRes.ok) {
        const productionPayload = await productionRes.json()
        setProduction(productionPayload.data ?? [])
      } else {
        setProduction([])
      }

      if (breakdownRes.ok) {
        const breakdownPayload = await breakdownRes.json()
        setBreakdown(breakdownPayload.data ?? null)
      } else {
        setBreakdown(null)
      }
      setToast('')
    } catch (err) {
      console.error(err)
      setToast('Could not reach analytics API. Using fallback stats.')
      setSummary(null)
      setProduction([])
      setBreakdown(null)
    } finally {
      setLoadingSummary(false)
      setLoadingBreakdown(false)
    }
  }

  useEffect(() => {
    if (user) {
      void bootstrapSummary()
    }
  }, [user])

  const filteredRecords = useMemo(() => {
    const lower = keyword.toLowerCase()
    return records.filter(
      (record) =>
        record.name?.toLowerCase().includes(lower) ||
        record.barangay?.toLowerCase().includes(lower) ||
        record.municipality?.toLowerCase().includes(lower) ||
        record.species?.toLowerCase().includes(lower)
    )
  }, [keyword, records])

  const summaryStats = useMemo(() => {
    if (summary) {
      return {
        totalBeneficiaries: Number(summary.total_beneficiaries ?? 0),
        quantity: Number(summary.quantity ?? 0),
        cost: Number(summary.cost ?? 0),
      }
    }

    const totals = records.reduce(
      (acc, record) => {
        acc.quantity += record.quantity || 0
        acc.cost += record.cost || 0
        return acc
      },
      { quantity: 0, cost: 0 }
    )

    return {
      totalBeneficiaries: records.length,
      ...totals,
    }
  }, [summary, records])

  const timeline = useMemo(() => {
    if (production.length) {
      return production.map((entry) => ({
        month: new Date(entry.month ?? entry.snapshot_month).toLocaleDateString('en-PH', {
          month: 'short',
          year: 'numeric',
        }),
        fryCount: entry.fryCount ?? entry.fry_count ?? 0,
      }))
    }
    return fallbackProduction
  }, [production])

  const maxTimelineValue = useMemo(
    () => Math.max(...timeline.map((entry) => entry.fryCount), 1),
    [timeline]
  )

  const classificationCopy = {
    individual: 'Individuals',
    group: 'Groups/Associations',
  }

  if (!user) {
    return (
      <div className="screen login-screen">
        <section className="login-card">
          <div className="login-hero">
            <p className="eyebrow">Bureau of Fisheries and Aquatic Resources</p>
            <h1>BFAR Bohol Digital Hatchery Console</h1>
            <p>
              Securely monitor broodstock inventory, hatchery releases, and
              projected tilapia fry availability across provincial facilities.
            </p>
            <ul>
              <li>Unified data capture for all hatcheries</li>
              <li>Automated fry production forecasting</li>
              <li>Actionable insights for allocation planning</li>
            </ul>
          </div>

          <form className="login-panel" onSubmit={handleLogin}>
            <div>
              <p className="eyebrow">Authorized Personnel Only</p>
              <h2>Sign in</h2>
              <p className="muted">
                Use your BFAR credentials to continue to the dashboard.
              </p>
            </div>

            <label className="field">
              <span>Email address</span>
              <input
                type="email"
                placeholder="name@bfar.gov.ph"
                value={credentials.email}
                onChange={(event) =>
                  setCredentials((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
                required
              />
            </label>

            <label className="field">
              <span>Access code</span>
              <input
                type="password"
                placeholder="••••••••"
                value={credentials.password}
                onChange={(event) =>
                  setCredentials((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                required
              />
            </label>

            {error && <p className="error">{error}</p>}

            <button type="submit" className="primary">
              Enter dashboard
            </button>

            <p className="muted small">
              Having trouble? Dial (038) 444-1425 or email bfar.bohol@da.gov.ph.
            </p>
          </form>
        </section>
      </div>
    )
  }

  if (user && !activePanel) {
    return (
      <div className="screen selection-screen">
        <div className="selection-container">
          <div className="selection-header">
            <p className="eyebrow">BFAR / Bohol</p>
            <h1>Welcome, {user.email}</h1>
            <p className="muted">Select a module to continue</p>
          </div>

          <div className="selection-grid">
            <button
              className="selection-card"
              onClick={() => setActivePanel('database')}
            >
              <h2>Database</h2>
              <p className="muted small">
                Access and search beneficiary records, filter by year and month
              </p>
            </button>

            <button
              className="selection-card"
              onClick={() => setActivePanel('forecast')}
            >
              <h2>Predictive Analysis</h2>
              <p className="muted small">
                View production forecasts and historical trends
              </p>
            </button>

            <button
              className="selection-card"
              onClick={() => setActivePanel('summary')}
            >
              <h2>Summary</h2>
              <p className="muted small">
                View aggregated statistics and overview metrics
              </p>
            </button>
          </div>

          <button
            className="logout-button"
            onClick={() => {
              setUser(null)
              setActivePanel(null)
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen dashboard-screen">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">BFAR / Bohol</p>
          <h2>Tilapia Fry Ops Center</h2>
          <p className="muted small">
            Logged in as <strong>{user.email}</strong>
          </p>
        </div>

        <nav className="menu">
          <button
            className={activePanel === 'database' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('database')}
          >
            Database Access
          </button>

          <button
            className={activePanel === 'forecast' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('forecast')}
          >
            Predictive Analysis
          </button>

          <button
            className={activePanel === 'summary' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('summary')}
          >
            Summary
          </button>

          <button
            className="menu-item"
            onClick={() => {
              setActivePanel(null)
            }}
            style={{ marginTop: '1rem', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            ← Back to Menu
          </button>
        </nav>

        <div className="sidebar-card">
          <p>November Dispatch Window</p>
          <h3>96,200 fry ready</h3>
          <p className="muted small">
            Coordinate with LGUs for grow-out distribution in core municipalities.
          </p>
        </div>
      </aside>

      <main className="main-area">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Realtime overview</p>
            <h1>
              Tilapia fry production
              <span> • {new Date().toLocaleDateString('en-PH')}</span>
            </h1>
          </div>

          <div className="header-stats">
            <div>
              <p className="muted small">Registered beneficiaries</p>
              <strong>{formatNumber(summaryStats.totalBeneficiaries)}</strong>
            </div>
            <div>
              <p className="muted small">Tilapia fry distributed</p>
              <strong>{formatNumber(summaryStats.quantity)} pcs</strong>
            </div>
          </div>
        </header>

        {activePanel === 'database' && (
          <section className="panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">BFAR Bohol beneficiaries</p>
                <h2>{classificationCopy[classification]}</h2>
              </div>
              <div className="panel-actions">
                <div className="toggle">
                  <button
                    type="button"
                    className={classification === 'individual' ? 'menu-item active' : 'menu-item'}
                    onClick={() => setClassification('individual')}
                  >
                    Individuals
                  </button>
                  <button
                    type="button"
                    className={classification === 'group' ? 'menu-item active' : 'menu-item'}
                    onClick={() => setClassification('group')}
                  >
                    Groups
                  </button>
                </div>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Years</option>
                  <option value="2019">2019</option>
                  <option value="2020">2020</option>
                  <option value="2021">2021</option>
                  <option value="2022">2022</option>
                  <option value="2023">2023</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Months</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <input
                  type="search"
                  placeholder="Search name, barangay, or municipality"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                />
              </div>
            </header>

            {toast && <p className="warning-banner">{toast}</p>}

            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Beneficiary</th>
                    <th>Gender</th>
                    <th>Barangay</th>
                    <th>Municipality</th>
                    <th>Species</th>
                    <th>Quantity (pcs)</th>
                    <th>Implementation</th>
                    <th>Satisfaction</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRecords ? (
                    <tr>
                      <td colSpan={9} className="muted small">
                        Loading latest entries…
                      </td>
                    </tr>
                  ) : filteredRecords.length ? (
                    filteredRecords.map((record, index) => (
                      <tr key={`${record.id ?? record.excel_id ?? index}`}>
                        <td>{record.name}</td>
                        <td>{record.gender}</td>
                        <td>{record.barangay}</td>
                        <td>{record.municipality}</td>
                        <td>{formatSpecies(record.species)}</td>
                        <td>{formatNumber(record.quantity)}</td>
                        <td>{record.implementationType || record.implementation_type}</td>
                        <td>{record.satisfaction}</td>
                        <td>
                          {formatDate(record.dateImplemented ?? record.date_implemented)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="muted small">
                        No records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activePanel === 'forecast' && (
          <section className="panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">Predictive analytics</p>
                <h2>Tilapia fry production outlook</h2>
              </div>
            </header>

            <div className="stats-grid">
              <article className="stat-card">
                <p className="muted small">Machine learning forecast</p>
                <h3>{loadingSummary ? 'Loading…' : 'Coming soon'}</h3>
                <p className="muted small">
                  Placeholder while the BFAR analytics team connects the model pipeline.
                </p>
              </article>
              <article className="stat-card">
                <p className="muted small">Historical coverage</p>
                <h3>6 years</h3>
                <p className="muted small">Monthly issuance records from Excel archive</p>
              </article>
              <article className="stat-card">
                <p className="muted small">Required inputs</p>
                <h3>Quantity + species mix</h3>
                <p className="muted small">Per municipality, per production cycle</p>
              </article>
            </div>

            <div className="chart-card">
              <h3>Production Trend Chart</h3>
              {timeline.length > 0 ? (
                <div className="trend-chart-container">
                  <svg className="trend-chart" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#1A3D64" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#1A3D64" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <g transform="translate(60, 20)">
                      {timeline.length > 1 && (() => {
                        const points = timeline.map((entry, index) => {
                          const x = (index / (timeline.length - 1)) * 700
                          const y = 260 - (entry.fryCount / maxTimelineValue) * 240
                          return { x, y, value: entry.fryCount, label: entry.month }
                        })
                        const pathData = points
                          .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
                          .join(' ')

                        return (
                          <>
                            <path
                              d={`${pathData} L ${points[points.length - 1].x} 260 L ${points[0].x} 260 Z`}
                              fill="url(#lineGradient)"
                            />
                            <path
                              d={pathData}
                              fill="none"
                              stroke="#1A3D64"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {points.map((point, i) => (
                              <g key={i}>
                                <circle cx={point.x} cy={point.y} r="4" fill="#1A3D64" />
                                {i % Math.ceil(timeline.length / 8) === 0 && (
                                  <text
                                    x={point.x}
                                    y={280}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fill="#1A3D64"
                                    transform={`rotate(-45 ${point.x} 280)`}
                                  >
                                    {point.label.split(' ')[0]}
                                  </text>
                                )}
                              </g>
                            ))}
                          </>
                        )
                      })()}
                      <line x1="0" y1="260" x2="700" y2="260" stroke="#1D546C" strokeWidth="1" strokeOpacity="0.3" />
                      <line x1="0" y1="260" x2="0" y2="20" stroke="#1D546C" strokeWidth="1" strokeOpacity="0.3" />
                    </g>
                  </svg>
                </div>
              ) : (
                <p className="muted small">No trend data available</p>
              )}
            </div>

            <div className="timeline">
              {timeline.map((entry) => (
                <div className="timeline-row" key={entry.month}>
                  <div>
                    <p className="muted small">{entry.month}</p>
                    <strong>{formatNumber(entry.fryCount)} fry issued</strong>
                  </div>
                  <div className="timeline-bar">
                    <span style={{ width: `${(entry.fryCount / maxTimelineValue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePanel === 'summary' && (
          <section className="panel">
            <header className="panel-header">
              <div>
                <p className="eyebrow">System overview</p>
                <h2>Summary Statistics</h2>
              </div>
            </header>

            <div className="stats-grid">
              <article className="stat-card">
                <p className="muted small">Total beneficiaries</p>
                <h3>{formatNumber(summaryStats.totalBeneficiaries)}</h3>
                <p className="muted small">Registered individuals and groups</p>
              </article>
              <article className="stat-card">
                <p className="muted small">Tilapia fry distributed</p>
                <h3>{formatNumber(summaryStats.quantity)} pcs</h3>
                <p className="muted small">Total quantity issued</p>
              </article>
            </div>

            {loadingBreakdown ? (
              <div className="chart-card">
                <p className="muted">Loading breakdown data...</p>
              </div>
            ) : breakdown ? (
              <>
                <div className="chart-card">
                  <h3>Yearly Breakdown</h3>
                  <div className="breakdown-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Beneficiaries</th>
                          <th>Fry Distributed (pcs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.yearly.map((year) => (
                          <tr key={year.year}>
                            <td><strong>{year.year}</strong></td>
                            <td>{formatNumber(year.beneficiaryCount)}</td>
                            <td>{formatNumber(year.totalQuantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="chart-card">
                  <h3>Monthly Breakdown (Last 12 Months)</h3>
                  <div className="breakdown-table">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Month</th>
                          <th>Beneficiaries</th>
                          <th>Fry Distributed (pcs)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {breakdown.monthly
                          .slice(-12)
                          .map((month, index) => (
                            <tr key={`${month.year}-${month.month}-${index}`}>
                              <td>{month.year}</td>
                              <td>
                                {new Date(2000, month.month - 1).toLocaleDateString('en-PH', {
                                  month: 'long',
                                })}
                              </td>
                              <td>{formatNumber(month.beneficiaryCount)}</td>
                              <td>{formatNumber(month.totalQuantity)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="chart-card">
                <p className="muted small">Breakdown data unavailable</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
