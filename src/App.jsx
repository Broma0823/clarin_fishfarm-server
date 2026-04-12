import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { AddRecordModal } from './components/AddRecordModal.jsx'
import { BeneficiaryRecordsPanel, MONTH_BUTTONS } from './components/BeneficiaryRecordsPanel.jsx'
import { MonitoringDashboardContent } from './components/MonitoringDashboard.jsx'
import { CycleSummaryContent } from './components/CycleSummary.jsx'
import { CyclesListContent } from './components/CyclesList.jsx'

/**
 * Client-side login only (visible in the bundle). For stronger security, use server auth.
 * `login` is either an email address or a short username shown in the first field.
 */
const ALLOWED_USERS = [
  { login: 'bfar.bohol@da.gov.ph', password: 'tilapia2025!' },
  { login: 'admin', password: 'password' },
]

const normalizeLogin = (value) => String(value ?? '').trim().toLowerCase()

const findAllowedUser = (login, password) =>
  ALLOWED_USERS.find(
    (u) => normalizeLogin(u.login) === normalizeLogin(login) && u.password === password
  )

const resolveKnownLogin = (login) =>
  ALLOWED_USERS.find((u) => normalizeLogin(u.login) === normalizeLogin(login))?.login ?? null

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api'

const SESSION_STORAGE_KEY = 'bfar_fishfarm_session'

const readPersistedSession = () => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const stored = typeof parsed?.email === 'string' ? parsed.email.trim() : ''
    const canonical = resolveKnownLogin(stored)
    if (canonical) {
      return { email: canonical }
    }
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
  return null
}

const persistSession = (sessionUser) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser))
  } catch {
    /* ignore quota / private mode */
  }
}

const clearPersistedSession = () => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

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
  const [user, setUser] = useState(() => readPersistedSession())
  const [postLoginFx, setPostLoginFx] = useState(false)
  const [activePanel, setActivePanel] = useState('monitoring')
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [newRecord, setNewRecord] = useState({
    name: '',
    gender: '',
    barangay: '',
    municipality: '',
    species: '',
    quantity: '',
    cost: '',
    implementationType: '',
    satisfaction: '',
    dateImplemented: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  // Monitoring Dashboard State
  const [monitoringParameters, setMonitoringParameters] = useState([])
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)
  const [showMonitoringModal, setShowMonitoringModal] = useState(false)
  const [editingMonitoring, setEditingMonitoring] = useState(null)
  const [currentCycleId, setCurrentCycleId] = useState('')
  const [weatherData, setWeatherData] = useState(null)
  const [loadingWeather, setLoadingWeather] = useState(false)
  const [deviceReadings, setDeviceReadings] = useState(null) // Auto-collected water quality parameters
  const [loadingDeviceReadings, setLoadingDeviceReadings] = useState(false)

  // Cycle Summary State
  const [showCycleSummary, setShowCycleSummary] = useState(false)
  const [showCyclesList, setShowCyclesList] = useState(false)
  const [selectedCycleForSummary, setSelectedCycleForSummary] = useState(null)
  const [cyclesListRefreshTrigger, setCyclesListRefreshTrigger] = useState(0)

  const [newMonitoringRecord, setNewMonitoringRecord] = useState({
    cycleId: '',
    cycleStartDate: '',
    waterTemperature: '',
    dissolvedOxygen: '',
    phLevel: '',
    numberOfBreeders: '',
    breederRatio: '',
    feedAllocation: '',
    notes: '',
  })

  const handleLogin = (event) => {
    event.preventDefault()
    const match = findAllowedUser(credentials.email, credentials.password)

    if (!match) {
      setError('Incorrect access code. Contact BFAR admin for help.')
      return
    }

    const sessionUser = { email: match.login }
    setUser(sessionUser)
    setPostLoginFx(true)
    setActivePanel('monitoring')
    persistSession(sessionUser)
    setError('')
  }

  useEffect(() => {
    if (!postLoginFx) return
    const t = setTimeout(() => setPostLoginFx(false), 1100)
    return () => clearTimeout(t)
  }, [postLoginFx])

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
          `${API_BASE_URL}/distributions?${params.toString()}`,
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
        const apiProduction = productionPayload.data ?? []

        // Create a set of existing dates from API data (normalize to YYYY-MM format)
        const existingDates = new Set()
        apiProduction.forEach(entry => {
          const d = new Date(entry.month ?? entry.snapshot_month)
          if (!Number.isNaN(d.getTime())) {
            const year = d.getFullYear()
            const month = d.getMonth()
            existingDates.add(`${year}-${month}`)
          }
        })

        // Generate placeholder actual production data for 2024-2027
        // These will be used to compare with predicted values
        const placeholderActual = []

        // Calculate base values from actual data pattern (2019-2023)
        // Analyze historical data to extract monthly patterns
        const sortedApiProduction = [...apiProduction].sort((a, b) => {
          const dateA = new Date(a.month ?? a.snapshot_month)
          const dateB = new Date(b.month ?? b.snapshot_month)
          return dateA - dateB
        })

        // Extract data from 2019-2023 only for pattern analysis
        const historicalData = sortedApiProduction.filter(entry => {
          const date = new Date(entry.month ?? entry.snapshot_month)
          const year = date.getFullYear()
          return year >= 2019 && year <= 2023
        })

        // Calculate monthly averages from 2019-2023 to understand seasonal pattern
        const monthlyTotals = Array(12).fill(0)
        const monthlyCounts = Array(12).fill(0)

        historicalData.forEach(entry => {
          const date = new Date(entry.month ?? entry.snapshot_month)
          const monthIndex = date.getMonth()
          const value = entry.fryCount ?? entry.fry_count ?? 0
          if (value > 0) {
            monthlyTotals[monthIndex] += value
            monthlyCounts[monthIndex] += 1
          }
        })

        // Calculate average per month
        const monthlyAverages = monthlyTotals.map((total, idx) =>
          monthlyCounts[idx] > 0 ? total / monthlyCounts[idx] : 0
        )

        // Calculate overall average from historical data
        const historicalValues = historicalData.map(e => e.fryCount ?? e.fry_count ?? 0).filter(v => v > 0)
        const avgValue = historicalValues.length > 0
          ? historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length
          : 80000 // Fallback average

        // Calculate seasonal factors based on actual monthly averages
        // Normalize monthly averages to create seasonal pattern
        const seasonalFactors = monthlyAverages.map(avg =>
          avg > 0 ? avg / avgValue : 1.0
        )

        // If no historical data, use fallback pattern
        if (historicalValues.length === 0) {
          seasonalFactors.splice(0, seasonalFactors.length, ...[0.95, 0.97, 1.0, 1.05, 1.08, 1.06, 1.04, 1.02, 1.0, 0.98, 0.96, 0.94])
        }

        // Add placeholder for 2024 (actual only, no forecast)
        // Always add all 12 months of 2024 as placeholder values
        for (let month = 0; month < 12; month++) {
          const dateKey = `2024-${month}`
          // Calculate value based on average and seasonal pattern
          const value = Math.round(avgValue * seasonalFactors[month] * 0.95) // 5% lower than average for 2024
          const date = new Date(2024, month, 1)
          placeholderActual.push({
            month: date.toISOString().split('T')[0],
            snapshot_month: date.toISOString().split('T')[0],
            fryCount: value,
            fry_count: value,
          })
        }

        // Add placeholder for 2025-2027
        for (let year = 2025; year <= 2027; year++) {
          for (let month = 0; month < 12; month++) {
            const dateKey = `${year}-${month}`
            // Always add placeholder for 2025-2027 if no actual data exists for this month
            if (!existingDates.has(dateKey)) {
              const yearGrowth = 1 + ((year - 2025) * 0.03) // 3% growth per year (more conservative)
              const value = Math.round(avgValue * seasonalFactors[month] * yearGrowth)
              const date = new Date(year, month, 1)
              placeholderActual.push({
                month: date.toISOString().split('T')[0],
                snapshot_month: date.toISOString().split('T')[0],
                fryCount: value,
                fry_count: value,
              })
            }
          }
        }

        // Combine API data with placeholder actual data
        // Use a Map to ensure API data takes precedence over placeholders
        const productionMap = new Map()

        // First add placeholders (ensures all 2024 months are present)
        placeholderActual.forEach(entry => {
          const dateKey = entry.month ?? entry.snapshot_month
          productionMap.set(dateKey, entry)
        })

        // Then add API data (will overwrite placeholders if they exist)
        apiProduction.forEach(entry => {
          const dateKey = entry.month ?? entry.snapshot_month
          productionMap.set(dateKey, entry)
        })

        // Convert back to array and sort
        setProduction(Array.from(productionMap.values()).sort((a, b) => {
          const dateA = new Date(a.month ?? a.snapshot_month)
          const dateB = new Date(b.month ?? b.snapshot_month)
          return dateA - dateB
        }))
      } else {
        // If API fails, still add placeholders for 2024-2027
        const placeholderActual = []
        // Use fallbackProduction to calculate pattern
        const fallbackValues = fallbackProduction.map(e => e.fryCount)
        const avgValue = fallbackValues.length > 0
          ? fallbackValues.reduce((sum, v) => sum + v, 0) / fallbackValues.length
          : 80000

        // Calculate seasonal factors from fallback data
        // Fallback data: Jan: 65000, Feb: 69000, Mar: 71200, Apr: 77000, May: 80500, Jun: 79000
        const fallbackFactors = [
          65000 / avgValue, 69000 / avgValue, 71200 / avgValue, 77000 / avgValue,
          80500 / avgValue, 79000 / avgValue,
          // Extrapolate for remaining months based on pattern
          0.98, 0.96, 0.94, 0.92, 0.90
        ]
        const seasonalFactors = fallbackFactors.length === 12
          ? fallbackFactors
          : [0.95, 0.97, 1.0, 1.05, 1.08, 1.06, 1.04, 1.02, 1.0, 0.98, 0.96, 0.94]

        // Add placeholder for 2024 (actual only)
        // Always add all 12 months of 2024 as placeholder values
        for (let month = 0; month < 12; month++) {
          const value = Math.round(avgValue * seasonalFactors[month] * 0.95) // 5% lower than average for 2024
          const date = new Date(2024, month, 1)
          placeholderActual.push({
            month: date.toISOString().split('T')[0],
            snapshot_month: date.toISOString().split('T')[0],
            fryCount: value,
            fry_count: value,
          })
        }

        // Add placeholder for 2025-2027
        for (let year = 2025; year <= 2027; year++) {
          for (let month = 0; month < 12; month++) {
            const yearGrowth = 1 + ((year - 2025) * 0.03) // 3% growth per year
            const value = Math.round(avgValue * seasonalFactors[month] * yearGrowth)
            const date = new Date(year, month, 1)
            placeholderActual.push({
              month: date.toISOString().split('T')[0],
              snapshot_month: date.toISOString().split('T')[0],
              fryCount: value,
              fry_count: value,
            })
          }
        }
        setProduction(placeholderActual)
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

  const baseSummaryStats = useMemo(() => {
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

  /** Full yearly rows for Summary — do not filter by `selectedYear` (that hid other years in the table). */
  const fullYearlyBreakdown = useMemo(() => {
    if (!breakdown || !breakdown.yearly) return []
    return breakdown.yearly
  }, [breakdown])

  const summaryYearButtonRange = useMemo(() => {
    const endY = new Date().getFullYear()
    const years = []
    for (let y = 2019; y <= endY; y += 1) {
      years.push(y)
    }
    return years
  }, [])

  const filteredMonthlyBreakdown = useMemo(() => {
    if (!breakdown || !breakdown.monthly) return []
    let filtered = breakdown.monthly
    if (selectedYear) {
      filtered = filtered.filter((month) => month.year.toString() === selectedYear)
    }
    if (selectedMonth) {
      filtered = filtered.filter((month) => month.month.toString() === selectedMonth)
    }
    return filtered
  }, [breakdown, selectedYear, selectedMonth])

  const selectedYearBreakdown = useMemo(() => {
    if (!selectedYear) return null
    return (
      fullYearlyBreakdown.find((year) => String(year.year) === String(selectedYear)) ?? {
        year: Number(selectedYear),
        beneficiaryCount: 0,
        totalQuantity: 0,
        totalCost: 0,
      }
    )
  }, [fullYearlyBreakdown, selectedYear])

  const scopedSummaryStats = useMemo(() => {
    if (selectedMonth) {
      const monthlyTotals = filteredMonthlyBreakdown.reduce(
        (acc, month) => {
          acc.totalBeneficiaries += Number(month.beneficiaryCount ?? 0)
          acc.quantity += Number(month.totalQuantity ?? 0)
          acc.cost += Number(month.totalCost ?? 0)
          return acc
        },
        { totalBeneficiaries: 0, quantity: 0, cost: 0 }
      )
      return monthlyTotals
    }

    if (selectedYearBreakdown) {
      return {
        totalBeneficiaries: Number(selectedYearBreakdown.beneficiaryCount ?? 0),
        quantity: Number(selectedYearBreakdown.totalQuantity ?? 0),
        cost: Number(selectedYearBreakdown.totalCost ?? 0),
      }
    }

    return baseSummaryStats
  }, [baseSummaryStats, filteredMonthlyBreakdown, selectedMonth, selectedYearBreakdown])

  const selectedMonthLabel = useMemo(() => {
    if (!selectedMonth) return null
    return MONTH_BUTTONS.find((month) => String(month.value) === String(selectedMonth))?.label ?? selectedMonth
  }, [selectedMonth])

  const hasSummaryFilters = Boolean(selectedYear || selectedMonth)
  const summaryScopeLabel = selectedMonth
    ? `${selectedMonthLabel}${selectedYear ? ` ${selectedYear}` : ''}`
    : selectedYear || 'All years'
  const summaryScopeDescription = `Scope: ${summaryScopeLabel}`

  // Fetch monitoring parameters
  useEffect(() => {
    if (!user || activePanel !== 'monitoring') return

    const fetchMonitoringParameters = async () => {
      setLoadingMonitoring(true)
      try {
        const params = new URLSearchParams()
        if (currentCycleId) params.append('cycleId', currentCycleId)

        const response = await fetch(`${API_BASE_URL}/monitoring?${params.toString()}`)
        const payload = await response.json()
        if (response.ok) {
          setMonitoringParameters(payload.data ?? [])
        }
      } catch (err) {
        console.error('Failed to fetch monitoring parameters:', err)
        setToast('Failed to load monitoring parameters')
      } finally {
        setLoadingMonitoring(false)
      }
    }

    fetchMonitoringParameters()
  }, [user, activePanel, currentCycleId])

  // Fetch weather data
  useEffect(() => {
    if (!user || activePanel !== 'monitoring') return

    const fetchWeather = async () => {
      setLoadingWeather(true)
      try {
        // Using OpenWeatherMap API (free tier)
        // Note: You'll need to get an API key from openweathermap.org
        // For now, using a mock/demo approach
        const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || ''
        // Clarin, Bohol coordinates approximately: 9.95°N, 123.95°E
        const lat = 9.95
        const lon = 123.95

        if (API_KEY) {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
          )
          if (response.ok) {
            const data = await response.json()
            setWeatherData({
              temperature: data.main.temp,
              humidity: data.main.humidity,
              condition: data.weather[0].main,
              windSpeed: data.wind?.speed || 0,
            })
          }
        } else {
          // Mock data for development
          setWeatherData({
            temperature: 28.5,
            humidity: 75,
            condition: 'Clear',
            windSpeed: 12.5,
          })
        }
      } catch (err) {
        console.error('Failed to fetch weather:', err)
        // Set mock data on error
        setWeatherData({
          temperature: 28.5,
          humidity: 75,
          condition: 'Clear',
          windSpeed: 12.5,
        })
      } finally {
        setLoadingWeather(false)
      }
    }

    fetchWeather()
    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [user, activePanel])

  // Fetch water quality parameters from monitoring device
  useEffect(() => {
    if (!user || activePanel !== 'monitoring') return

    const fetchDeviceReadings = async () => {
      setLoadingDeviceReadings(true)
      try {
        const response = await fetch(`${API_BASE_URL}/monitoring/latest`)
        if (!response.ok) {
          throw new Error(`Failed to fetch latest monitoring data: ${response.status}`)
        }

        const payload = await response.json()
        const latest = payload?.data

        if (!latest) {
          setDeviceReadings(null)
          return
        }

        setDeviceReadings({
          waterTemperature: latest.waterTemperature ?? null,
          dissolvedOxygen: latest.dissolvedOxygen ?? null,
          phLevel: latest.phLevel ?? null,
          timestamp: latest.recordedAt ?? new Date().toISOString(),
        })
      } catch (err) {
        console.error('Failed to fetch device readings:', err)
        setDeviceReadings(null)
      } finally {
        setLoadingDeviceReadings(false)
      }
    }

    fetchDeviceReadings()
    // Refresh device readings every 30 seconds (typical for monitoring devices)
    const interval = setInterval(fetchDeviceReadings, 30000)
    return () => clearInterval(interval)
  }, [user, activePanel])

  const classificationCopy = {
    individual: 'Individuals',
    group: 'Groups/Associations',
  }

  // Monitoring Dashboard Handlers
  const handleAddMonitoringRecord = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    try {
      // Use auto-collected device readings for water quality parameters
      const recordData = {
        cycleId: newMonitoringRecord.cycleId || `CYCLE-${Date.now()}`,
        cycleStartDate: newMonitoringRecord.cycleStartDate,
        waterTemperature: deviceReadings?.waterTemperature || null, // Auto-collected from device
        dissolvedOxygen: deviceReadings?.dissolvedOxygen || null, // Auto-collected from device
        phLevel: deviceReadings?.phLevel || null, // Auto-collected from device
        numberOfBreeders: newMonitoringRecord.numberOfBreeders ? Number(newMonitoringRecord.numberOfBreeders) : null,
        breederRatio: newMonitoringRecord.breederRatio || null,
        feedAllocation: newMonitoringRecord.feedAllocation ? Number(newMonitoringRecord.feedAllocation) : null,
        weatherTemperature: weatherData?.temperature || null,
        weatherHumidity: weatherData?.humidity || null,
        weatherCondition: weatherData?.condition || null,
        weatherWindSpeed: weatherData?.windSpeed || null,
        notes: newMonitoringRecord.notes || null,
      }

      const response = await fetch(`${API_BASE_URL}/monitoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || 'Failed to add monitoring record')
      }

      setShowMonitoringModal(false)
      setNewMonitoringRecord({
        cycleId: '',
        cycleStartDate: '',
        waterTemperature: '',
        dissolvedOxygen: '',
        phLevel: '',
        numberOfBreeders: '',
        breederRatio: '',
        feedAllocation: '',
        notes: '',
      })
      setToast('Monitoring record added successfully')

      // Refresh monitoring parameters
      const refreshResponse = await fetch(`${API_BASE_URL}/monitoring`)
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json()
        setMonitoringParameters(refreshPayload.data ?? [])
        // Trigger refresh of cycles list if it's open
        setCyclesListRefreshTrigger(prev => prev + 1)
      }
    } catch (err) {
      console.error(err)
      setToast(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditMonitoringRecord = (record) => {
    if (!record) {
      setEditingMonitoring(null)
      return
    }
    setEditingMonitoring(record)
    setNewMonitoringRecord({
      cycleId: record.cycleId,
      cycleStartDate: record.cycleStartDate,
      waterTemperature: '', // Not editable - auto-collected
      dissolvedOxygen: '', // Not editable - auto-collected
      phLevel: '', // Not editable - auto-collected
      numberOfBreeders: record.numberOfBreeders?.toString() || '',
      breederRatio: record.breederRatio || '',
      feedAllocation: record.feedAllocation?.toString() || '',
      notes: record.notes || '',
    })
    setShowMonitoringModal(true)
  }

  const handleUpdateMonitoringRecord = async (event) => {
    event.preventDefault()
    if (!editingMonitoring) return

    setIsSubmitting(true)
    try {
      // Keep existing auto-collected values, only update user-inputted fields
      const recordData = {
        cycleId: newMonitoringRecord.cycleId,
        cycleStartDate: newMonitoringRecord.cycleStartDate,
        waterTemperature: editingMonitoring.waterTemperature || deviceReadings?.waterTemperature || null, // Keep existing or use current device reading
        dissolvedOxygen: editingMonitoring.dissolvedOxygen || deviceReadings?.dissolvedOxygen || null, // Keep existing or use current device reading
        phLevel: editingMonitoring.phLevel || deviceReadings?.phLevel || null, // Keep existing or use current device reading
        numberOfBreeders: newMonitoringRecord.numberOfBreeders ? Number(newMonitoringRecord.numberOfBreeders) : null,
        breederRatio: newMonitoringRecord.breederRatio || null,
        feedAllocation: newMonitoringRecord.feedAllocation ? Number(newMonitoringRecord.feedAllocation) : null,
        weatherTemperature: weatherData?.temperature || null,
        weatherHumidity: weatherData?.humidity || null,
        weatherCondition: weatherData?.condition || null,
        weatherWindSpeed: weatherData?.windSpeed || null,
        notes: newMonitoringRecord.notes || null,
      }

      const response = await fetch(`${API_BASE_URL}/monitoring/${editingMonitoring.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordData),
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || 'Failed to update monitoring record')
      }

      setShowMonitoringModal(false)
      setEditingMonitoring(null)
      setNewMonitoringRecord({
        cycleId: '',
        cycleStartDate: '',
        waterTemperature: '',
        dissolvedOxygen: '',
        phLevel: '',
        numberOfBreeders: '',
        breederRatio: '',
        feedAllocation: '',
        notes: '',
      })
      setToast('Monitoring record updated successfully')

      // Refresh monitoring parameters
      const refreshResponse = await fetch(`${API_BASE_URL}/monitoring`)
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json()
        setMonitoringParameters(refreshPayload.data ?? [])
        // Trigger refresh of cycles list if it's open
        setCyclesListRefreshTrigger(prev => prev + 1)
      }
    } catch (err) {
      console.error(err)
      setToast(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteMonitoringRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this monitoring record?')) return

    try {
      const response = await fetch(`${API_BASE_URL}/monitoring/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const payload = await response.json()
        throw new Error(payload.error || 'Failed to delete monitoring record')
      }

      setToast('Monitoring record deleted successfully')
      setMonitoringParameters(monitoringParameters.filter((p) => p.id !== id))
      // Trigger refresh of cycles list if it's open
      setCyclesListRefreshTrigger(prev => prev + 1)
    } catch (err) {
      console.error(err)
      setToast(`Error: ${err.message}`)
    }
  }

  const handleLogout = () => {
    clearPersistedSession()
    setUser(null)
    setActivePanel('monitoring')
    setToast('')
    setSelectedYear('')
    setSelectedMonth('')
    setClassification('individual')
    setMonitoringParameters([])
    setCurrentCycleId('')
    setWeatherData(null)
  }

  const handleAddModalFeedback = useCallback(async (payload) => {
    if (payload.type === 'toast') {
      setToast(payload.message)
      return
    }
    if (payload.type === 'saved') {
      setToast(payload.message)
      const params = new URLSearchParams({ classification: payload.classification })
      if (payload.selectedYear) params.append('year', payload.selectedYear)
      if (payload.selectedMonth) params.append('month', payload.selectedMonth)
      const refreshResponse = await fetch(`${API_BASE_URL}/distributions?${params.toString()}`)
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json()
        setRecords(refreshPayload.data ?? [])
      }
    }
  }, [])

  const closeAddModal = useCallback(() => setShowAddModal(false), [])

  const handleDeleteRecord = useCallback(
    async (recordId) => {
      if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) {
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/distributions/${recordId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const payload = await response.json()
          throw new Error(payload.error || 'Failed to delete record')
        }

        setToast('Record deleted successfully!')

        const params = new URLSearchParams({ classification })
        if (selectedYear) params.append('year', selectedYear)
        if (selectedMonth) params.append('month', selectedMonth)
        const refreshResponse = await fetch(`${API_BASE_URL}/distributions?${params.toString()}`)
        if (refreshResponse.ok) {
          const refreshPayload = await refreshResponse.json()
          setRecords(refreshPayload.data ?? [])
        }

        void bootstrapSummary()
      } catch (err) {
        console.error(err)
        setToast(`Error: ${err.message}`)
      }
    },
    [classification, selectedYear, selectedMonth]
  )

  const handleEditRecord = useCallback((record) => {
    setEditingRecord(record)
    setNewRecord({
      name: record.name || '',
      gender: record.gender || '',
      barangay: record.barangay || '',
      municipality: record.municipality || '',
      species: record.species || '',
      quantity: record.quantity?.toString() || '',
      cost: record.cost?.toString() || '',
      implementationType: record.implementationType || record.implementation_type || '',
      satisfaction: record.satisfaction || '',
      dateImplemented: record.dateImplemented || record.date_implemented || '',
    })
    setShowEditModal(true)
  }, [])

  const handleUpdateRecord = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        species: newRecord.species || null,
        quantity: newRecord.quantity ? Number(newRecord.quantity) : null,
        cost: newRecord.cost ? Number(newRecord.cost) : null,
        implementationType: newRecord.implementationType || null,
        satisfaction: newRecord.satisfaction || null,
        dateImplemented: newRecord.dateImplemented || null,
      }

      const response = await fetch(`${API_BASE_URL}/distributions/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorPayload = await response.json()
        throw new Error(errorPayload.error || 'Failed to update record')
      }

      setShowEditModal(false)
      setEditingRecord(null)
      setToast('Record updated successfully!')

      // Refresh records
      const params = new URLSearchParams({ classification })
      if (selectedYear) params.append('year', selectedYear)
      if (selectedMonth) params.append('month', selectedMonth)
      const refreshResponse = await fetch(`${API_BASE_URL}/distributions?${params.toString()}`)
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json()
        setRecords(refreshPayload.data ?? [])
      }

      // Refresh summary
      void bootstrapSummary()
    } catch (err) {
      console.error(err)
      setToast(`Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) {
    return (
      <div className="screen login-screen">
        <div className="login-container">
          <div className="login-welcome">
            <div className="welcome-header">
              <div className="logo-placeholder">
                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                  <path d="M2 17l10 5 10-5"></path>
                  <path d="M2 12l10 5 10-5"></path>
                </svg>
              </div>
              <h1>Clarin Freshwater Fish Farm</h1>
              <p className="subtitle">Database Management & Monitoring System</p>
            </div>

            <div className="welcome-content">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                    <line x1="9" y1="3" x2="9" y2="21"></line>
                    <line x1="3" y1="9" x2="21" y2="9"></line>
                  </svg>
                </div>
                <div>
                  <h3>Comprehensive Database</h3>
                  <p>Manage beneficiary records, track distributions, and maintain detailed information about freshwater fish farm operations across municipalities.</p>
                </div>
              </div>

              <div className="feature-item">
                <div className="feature-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                </div>
                <div>
                  <h3>Operations Monitoring</h3>
                  <p>Track water quality readings, breeding cycles, feed allocation, and pond-side observations so field teams can respond quickly and keep production records aligned with actual farm conditions.</p>
                </div>
              </div>
            </div>

            <div className="welcome-footer">
              <p className="muted small">
                <strong>Bureau of Fisheries and Aquatic Resources</strong><br />
                Bohol Provincial Office
              </p>
            </div>
          </div>
          <form className="login-form" onSubmit={handleLogin}>
            <label className="field">
              <span>Email or username</span>
              <input
                type="text"
                name="login"
                autoComplete="username"
                placeholder="e.g. bfar.bohol@da.gov.ph or admin"
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
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter your password"
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
            <button type="submit" className="login-button">
              Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className={`screen dashboard-screen${postLoginFx ? ' dashboard-screen--enter' : ''}`}>
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand__icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <div className="sidebar-brand__text">
              <span className="sidebar-brand__title">Clarin Fish Farm</span>
              <span className="sidebar-brand__sub">BFAR Bohol</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => {
              setActivePanel('monitoring')
              setShowCycleSummary(false)
              setShowCyclesList(false)
            }}
            title="Go to monitoring"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>

        <p className="sidebar-nav-label">Navigation</p>
        <nav className="menu" aria-label="Main navigation">
          <button
            type="button"
            className={activePanel === 'monitoring' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('monitoring')}
            title="Monitoring Dashboard"
          >
            <span className="menu-item__icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </span>
            <span className="menu-item__label">Monitoring</span>
          </button>
          <button
            type="button"
            className={activePanel === 'summary' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('summary')}
          >
            <span className="menu-item__icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="9"></rect>
                <rect x="14" y="3" width="7" height="5"></rect>
                <rect x="14" y="12" width="7" height="9"></rect>
                <rect x="3" y="16" width="7" height="5"></rect>
              </svg>
            </span>
            <span className="menu-item__label">Summary</span>
          </button>
          <button
            type="button"
            className={activePanel === 'records' ? 'menu-item active' : 'menu-item'}
            onClick={() => setActivePanel('records')}
          >
            <span className="menu-item__icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            <span className="menu-item__label">Records</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="logout-button" onClick={handleLogout}>
            <span className="logout-button__icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="main-area">
        {activePanel === 'summary' && (
          <section className="panel">
            <header className="panel-header">
              <h2>Summary</h2>
            </header>

            {toast && <p className={`toast ${toast.includes('Error') ? 'error-toast' : 'success-toast'}`}>{toast}</p>}

            <div className="database-summary">
              <div className="filter-section filter-section--records filter-section--summary" style={{ marginBottom: '2rem' }}>
                <div className="summary-filter-header">
                  <p className="summary-filter-subtitle">{summaryScopeDescription}</p>
                  {hasSummaryFilters && (
                    <button
                      type="button"
                      className="summary-filter-reset-btn"
                      onClick={() => {
                        setSelectedYear('')
                        setSelectedMonth('')
                      }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>
                <div className="filter-section-filters">
                  <div className="year-filter-row">
                    <span className="year-filter-label" id="summary-year-filter-label">
                      Year
                    </span>
                    <div
                      className="year-filter-buttons"
                      role="group"
                      aria-labelledby="summary-year-filter-label"
                    >
                      <button
                        type="button"
                        className={
                          selectedYear === '' || selectedYear === undefined
                            ? 'year-filter-btn year-filter-btn--active'
                            : 'year-filter-btn'
                        }
                        onClick={() => setSelectedYear('')}
                      >
                        All
                      </button>
                      {summaryYearButtonRange.map((y) => (
                        <button
                          key={y}
                          type="button"
                          className={
                            String(selectedYear) === String(y)
                              ? 'year-filter-btn year-filter-btn--active'
                              : 'year-filter-btn'
                          }
                          onClick={() => setSelectedYear(String(y))}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="month-filter-row">
                    <span className="year-filter-label" id="summary-month-filter-label">
                      Month
                    </span>
                    <div
                      className="year-filter-buttons month-filter-buttons"
                      role="group"
                      aria-labelledby="summary-month-filter-label"
                    >
                      <button
                        type="button"
                        className={
                          selectedMonth === '' || selectedMonth === undefined
                            ? 'year-filter-btn year-filter-btn--active'
                            : 'year-filter-btn'
                        }
                        onClick={() => setSelectedMonth('')}
                      >
                        All
                      </button>
                      {MONTH_BUTTONS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            String(selectedMonth) === String(value)
                              ? 'year-filter-btn year-filter-btn--active'
                              : 'year-filter-btn'
                          }
                          onClick={() => setSelectedMonth(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="stats-grid">
                <article className={`stat-card ${hasSummaryFilters ? 'stat-card--scoped' : ''}`}>
                  <p className="muted small">Beneficiaries</p>
                  <h3>{formatNumber(scopedSummaryStats.totalBeneficiaries)}</h3>
                </article>
                <article className={`stat-card ${hasSummaryFilters ? 'stat-card--scoped' : ''}`}>
                  <p className="muted small">Distribution</p>
                  <h3>{formatNumber(scopedSummaryStats.quantity)} pcs</h3>
                </article>
                <article className={`stat-card ${hasSummaryFilters ? 'stat-card--scoped' : ''}`}>
                  <p className="muted small">Cost</p>
                  <h3>{formatCurrency(scopedSummaryStats.cost)}</h3>
                </article>
              </div>

              {breakdown && fullYearlyBreakdown.length > 0 && (
                <div className="chart-card">
                  <h3>Yearly Summary</h3>
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
                        {fullYearlyBreakdown.map((year) => (
                          <tr
                            key={year.year}
                            className={
                              selectedYear && String(year.year) === String(selectedYear)
                                ? 'data-table__row--year-highlight'
                                : undefined
                            }
                          >
                            <td><strong>{year.year}</strong></td>
                            <td>{formatNumber(year.beneficiaryCount)}</td>
                            <td>{formatNumber(year.totalQuantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="chart-card">
                <h3>{selectedYear || selectedMonth ? 'Monthly Activity' : 'Recent Activity (Last 12 Months)'}</h3>
                {breakdown && filteredMonthlyBreakdown.length > 0 ? (
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
                        {(selectedYear || selectedMonth ? filteredMonthlyBreakdown : filteredMonthlyBreakdown.slice(-12)).map((month, index) => (
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
                ) : (
                  <p className="muted small">No monthly data available</p>
                )}
              </div>
            </div>
          </section>
        )}

        {activePanel === 'records' && (
          <section className="panel">
            <header className="panel-header">
              <h2>Records</h2>
              <div className="panel-actions">
                <button className="add-record-button" onClick={() => setShowAddModal(true)}>
                  + Add Record
                </button>
              </div>
            </header>

            {toast && <p className={`toast ${toast.includes('Error') ? 'error-toast' : 'success-toast'}`}>{toast}</p>}

            <BeneficiaryRecordsPanel
              records={records}
              loadingRecords={loadingRecords}
              classification={classification}
              onClassificationChange={setClassification}
              selectedYear={selectedYear}
              onSelectedYearChange={setSelectedYear}
              selectedMonth={selectedMonth}
              onSelectedMonthChange={setSelectedMonth}
              onEditRecord={handleEditRecord}
              onDeleteRecord={handleDeleteRecord}
              formatNumber={formatNumber}
              formatDate={formatDate}
              formatSpecies={formatSpecies}
            />
          </section>
        )}

        {activePanel === 'monitoring' && !showCycleSummary && !showCyclesList && (
          <MonitoringDashboardContent
            monitoringParameters={monitoringParameters}
            loadingMonitoring={loadingMonitoring}
            weatherData={weatherData}
            loadingWeather={loadingWeather}
            showMonitoringModal={showMonitoringModal}
            setShowMonitoringModal={setShowMonitoringModal}
            newMonitoringRecord={newMonitoringRecord}
            setNewMonitoringRecord={setNewMonitoringRecord}
            editingMonitoring={editingMonitoring}
            handleAddMonitoringRecord={handleAddMonitoringRecord}
            handleUpdateMonitoringRecord={handleUpdateMonitoringRecord}
            handleDeleteMonitoringRecord={handleDeleteMonitoringRecord}
            handleEditMonitoringRecord={handleEditMonitoringRecord}
            setEditingMonitoring={setEditingMonitoring}
            isSubmitting={isSubmitting}
            currentCycleId={currentCycleId}
            setCurrentCycleId={setCurrentCycleId}
            formatDate={formatDate}
            deviceReadings={deviceReadings}
            loadingDeviceReadings={loadingDeviceReadings}
            onViewCycleSummary={(cycleId) => {
              if (cycleId === 'all') {
                setShowCyclesList(true)
              } else {
                setSelectedCycleForSummary(cycleId)
                setShowCycleSummary(true)
              }
            }}
          />
        )}

        {activePanel === 'monitoring' && showCyclesList && (
          <CyclesListContent
            onBack={() => {
              setShowCyclesList(false)
            }}
            onViewCycle={(cycleId) => {
              if (cycleId) {
                setSelectedCycleForSummary(cycleId)
                setShowCyclesList(false)
                setShowCycleSummary(true)
              }
            }}
            refreshTrigger={cyclesListRefreshTrigger}
          />
        )}

        {activePanel === 'monitoring' && showCycleSummary && !showCyclesList && (
          <CycleSummaryContent
            cycleId={selectedCycleForSummary}
            onBack={() => {
              setShowCycleSummary(false)
              setSelectedCycleForSummary(null)
            }}
          />
        )}

        {activePanel === 'forecast' && false && (
          <section className="panel">
            <header className="panel-header">
              <h2>Production Statistics</h2>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="forecast-view-buttons">
                  <button
                    className={forecastView === 'quarterly' ? 'forecast-btn active' : 'forecast-btn'}
                    onClick={() => setForecastView('quarterly')}
                  >
                    Quarterly Statistics
                  </button>
                  <button
                    className={forecastView === 'monthly' ? 'forecast-btn active' : 'forecast-btn'}
                    onClick={() => setForecastView('monthly')}
                  >
                    Monthly Statistics
                  </button>
                  <button
                    className={forecastView === 'annual' ? 'forecast-btn active' : 'forecast-btn'}
                    onClick={() => setForecastView('annual')}
                  >
                    Annual Statistics
                  </button>
                </div>
                {(forecastView === 'quarterly' || forecastView === 'monthly' || forecastView === 'annual') && (
                  <div className="forecast-year-selector">
                    <label htmlFor="forecast-year-select">Year:</label>
                    <select
                      id="forecast-year-select"
                      value={forecastYear}
                      onChange={(e) => setForecastYear(e.target.value)}
                    >
                      <option value="">All Years</option>
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </header>

            {forecastView === 'quarterly' && (
              <>
                <div className="chart-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Quarterly Production Statistics</h3>
                    <div style={{
                      display: 'flex',
                      gap: '2.5rem',
                      padding: '1.25rem 2rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#1A3D64', borderRadius: '2px' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Actual</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#4CAF50', borderRadius: '2px', borderTop: '3px dashed #4CAF50' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Predicted</span>
                      </div>
                    </div>
                  </div>
                  {quarterlyWithPredictions.length > 0 ? (
                    <>
                      {(() => {
                        const actualData = quarterlyWithPredictions.filter((e) => e.actual !== null)
                        const predictedData = quarterlyWithPredictions.filter((e) => e.predicted !== null)
                        const totalActual = actualData.reduce((sum, e) => sum + (e.actual || 0), 0)
                        const totalPredicted = predictedData.reduce((sum, e) => sum + (e.predicted || 0), 0)
                        const avgActual = actualData.length > 0 ? totalActual / actualData.length : 0
                        const avgPredicted = predictedData.length > 0 ? totalPredicted / predictedData.length : 0
                        const growthRate = avgActual > 0 ? ((avgPredicted - avgActual) / avgActual * 100).toFixed(1) : 0

                        return (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            padding: '0.875rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                          }}>
                            <div>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Actual</p>
                              <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#1A3D64' }}>
                                {formatNumber(totalActual)}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                {actualData.length} quarter{actualData.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {predictedData.length > 0 && (
                              <>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Predicted</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#4CAF50' }}>
                                    {formatNumber(totalPredicted)}
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    {predictedData.length} quarter{predictedData.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Projected Growth</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: growthRate >= 0 ? '#4CAF50' : '#dc3545' }}>
                                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    vs. average actual
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })()}
                      <div style={{ marginBottom: '2rem' }}>
                        {/* Combined Chart */}
                        <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#495057' }}>
                            Production Overview
                          </h4>
                          <div className="trend-chart-container" style={{ height: '600px', overflow: 'visible' }}>
                            <svg className="trend-chart" viewBox="0 0 2400 620" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="quarterlyActualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#1A3D64" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#1A3D64" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="quarterlyPredictedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <g transform="translate(60, 50)">
                                {(() => {
                                  // Create a combined sorted list of all quarters
                                  const allQuarters = [...quarterlyWithPredictions].sort((a, b) => {
                                    const aMatch = a.label.match(/Q(\d) (\d{4})/)
                                    const bMatch = b.label.match(/Q(\d) (\d{4})/)
                                    if (!aMatch || !bMatch) return 0
                                    const aDate = new Date(parseInt(aMatch[2]), (parseInt(aMatch[1]) - 1) * 3)
                                    const bDate = new Date(parseInt(bMatch[2]), (parseInt(bMatch[1]) - 1) * 3)
                                    return aDate - bDate
                                  })

                                  // Create a map for x positions based on quarter index in chronological order
                                  const quarterIndexMap = new Map()
                                  allQuarters.forEach((entry, index) => {
                                    quarterIndexMap.set(entry.label, index)
                                  })

                                  // Map points with consistent x positions based on chronological order
                                  const actualPoints = allQuarters
                                    .filter((entry) => entry.actual !== null)
                                    .map((entry) => {
                                      const index = quarterIndexMap.get(entry.label)
                                      const x = (index / Math.max(allQuarters.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.actual || 0) / maxQuarterlyValue) * 420
                                      return { x, y, value: entry.actual, label: entry.label }
                                    })

                                  const predictedPoints = allQuarters
                                    .filter((entry) => entry.predicted !== null)
                                    .map((entry) => {
                                      const index = quarterIndexMap.get(entry.label)
                                      const x = (index / Math.max(allQuarters.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.predicted || 0) / maxQuarterlyValue) * 420
                                      return { x, y, value: entry.predicted, label: entry.label }
                                    })

                                  // Sort points by x position to ensure proper line connection
                                  const sortedActualPoints = [...actualPoints].sort((a, b) => a.x - b.x)
                                  const sortedPredictedPoints = [...predictedPoints].sort((a, b) => a.x - b.x)

                                  const actualPathData = sortedActualPoints.length > 1
                                    ? sortedActualPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  const predictedPathData = sortedPredictedPoints.length > 1
                                    ? sortedPredictedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  return (
                                    <>
                                      {/* Actual line */}
                                      {actualPathData && (
                                        <>
                                          <path
                                            d={`${actualPathData} L ${sortedActualPoints[sortedActualPoints.length - 1].x} 500 L ${sortedActualPoints[0].x} 500 Z`}
                                            fill="url(#quarterlyActualGradient)"
                                          />
                                          <path
                                            d={actualPathData}
                                            fill="none"
                                            stroke="#1A3D64"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Predicted line */}
                                      {predictedPathData && (
                                        <>
                                          <path
                                            d={`${predictedPathData} L ${sortedPredictedPoints[sortedPredictedPoints.length - 1].x} 500 L ${sortedPredictedPoints[0].x} 500 Z`}
                                            fill="url(#quarterlyPredictedGradient)"
                                          />
                                          <path
                                            d={predictedPathData}
                                            fill="none"
                                            stroke="#4CAF50"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Actual data points */}
                                      {actualPoints.map((point, i) => (
                                        <g key={`actual-${i}`}>
                                          <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill="#1A3D64"
                                          />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#1A3D64"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Predicted data points */}
                                      {predictedPoints.map((point, i) => (
                                        <g key={`predicted-${i}`}>
                                          <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill="#4CAF50"
                                          />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#4CAF50"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Quarter labels */}
                                      {allQuarters.map((entry, i) => {
                                        const x = (i / Math.max(allQuarters.length - 1, 1)) * 2280
                                        return (
                                          <text
                                            key={`label-${i}`}
                                            x={x}
                                            y={550}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fill="#495057"
                                            fontWeight="500"
                                          >
                                            {entry.label.match(/Q(\d) (\d{4})/)?.[0] || entry.label}
                                          </text>
                                        )
                                      })}
                                    </>
                                  )
                                })()}
                                <line x1="0" y1="500" x2="2280" y2="500" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                                <line x1="0" y1="500" x2="0" y2="5" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '2.5rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#495057' }}>
                          Detailed Breakdown
                        </h4>
                        <div style={{
                          borderTop: '2px solid #e9ecef',
                          paddingTop: '0.75rem',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Period</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Actual</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Predicted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quarterlyWithPredictions.map((quarter, index) => {
                                const hasBoth = quarter.actual !== null && quarter.predicted !== null
                                // Create a unique key that includes both actual and predicted to prevent duplicates
                                const uniqueKey = `${quarter.label}-${quarter.actual || 'null'}-${quarter.predicted || 'null'}`
                                return (
                                  <tr
                                    key={uniqueKey}
                                    style={{
                                      borderBottom: '1px solid #e9ecef',
                                      backgroundColor: 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '0.625rem 0.5rem', fontSize: '1.15rem', fontWeight: '600', color: '#495057' }}>
                                      {quarter.label}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: quarter.actual !== null ? '#1A3D64' : '#adb5bd', fontWeight: '600' }}>
                                      {quarter.actual !== null ? formatNumber(quarter.actual) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: quarter.predicted !== null ? '#4CAF50' : '#adb5bd', fontWeight: '600' }}>
                                      {quarter.predicted !== null ? formatNumber(quarter.predicted) : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="muted small">No quarterly data available</p>
                  )}
                </div>
              </>
            )}

            {forecastView === 'monthly' && (
              <>
                <div className="chart-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Monthly Production Statistics</h3>
                    <div style={{
                      display: 'flex',
                      gap: '2.5rem',
                      padding: '1.25rem 2rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#1A3D64', borderRadius: '2px' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Actual</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#4CAF50', borderRadius: '2px', borderTop: '3px dashed #4CAF50' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Predicted</span>
                      </div>
                    </div>
                  </div>
                  {monthlyWithPredictions.length > 0 ? (
                    <>
                      {(() => {
                        const actualData = monthlyWithPredictions.filter((e) => e.actual !== null)
                        const predictedData = monthlyWithPredictions.filter((e) => e.predicted !== null)
                        const totalActual = actualData.reduce((sum, e) => sum + (e.actual || 0), 0)
                        const totalPredicted = predictedData.reduce((sum, e) => sum + (e.predicted || 0), 0)
                        const avgActual = actualData.length > 0 ? totalActual / actualData.length : 0
                        const avgPredicted = predictedData.length > 0 ? totalPredicted / predictedData.length : 0
                        const growthRate = avgActual > 0 ? ((avgPredicted - avgActual) / avgActual * 100).toFixed(1) : 0

                        return (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            padding: '0.875rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                          }}>
                            <div>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Actual</p>
                              <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#1A3D64' }}>
                                {formatNumber(totalActual)}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                {actualData.length} month{actualData.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {predictedData.length > 0 && (
                              <>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Predicted</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#4CAF50' }}>
                                    {formatNumber(totalPredicted)}
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    {predictedData.length} month{predictedData.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Projected Growth</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: growthRate >= 0 ? '#4CAF50' : '#dc3545' }}>
                                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    vs. average actual
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })()}
                      <div style={{ marginBottom: '2rem' }}>
                        {/* Combined Chart */}
                        <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#495057' }}>
                            Production Overview
                          </h4>
                          <div className="trend-chart-container" style={{ height: '600px', overflow: 'visible' }}>
                            <svg className="trend-chart" viewBox="0 0 2400 620" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="monthlyActualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#1A3D64" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#1A3D64" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="monthlyPredictedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <g transform="translate(60, 50)">
                                {(() => {
                                  // Sort all months chronologically
                                  const allMonths = [...monthlyWithPredictions].sort((a, b) => {
                                    const dateA = a.date || new Date(`01 ${a.month}`)
                                    const dateB = b.date || new Date(`01 ${b.month}`)
                                    return dateA - dateB
                                  })

                                  // Create a map for x positions based on month index
                                  const monthIndexMap = new Map()
                                  allMonths.forEach((entry, index) => {
                                    monthIndexMap.set(entry.month, index)
                                  })

                                  // Map points with consistent x positions based on chronological order
                                  const actualPoints = allMonths
                                    .filter((entry) => entry.actual !== null)
                                    .map((entry) => {
                                      const index = monthIndexMap.get(entry.month)
                                      const x = (index / Math.max(allMonths.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.actual || 0) / maxMonthlyValue) * 420
                                      return { x, y, value: entry.actual, label: entry.month }
                                    })

                                  const predictedPoints = allMonths
                                    .filter((entry) => entry.predicted !== null)
                                    .map((entry) => {
                                      const index = monthIndexMap.get(entry.month)
                                      const x = (index / Math.max(allMonths.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.predicted || 0) / maxMonthlyValue) * 420
                                      return { x, y, value: entry.predicted, label: entry.month }
                                    })

                                  // Sort points by x position to ensure proper line connection
                                  const sortedActualPoints = [...actualPoints].sort((a, b) => a.x - b.x)
                                  const sortedPredictedPoints = [...predictedPoints].sort((a, b) => a.x - b.x)

                                  const actualPathData = sortedActualPoints.length > 1
                                    ? sortedActualPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  const predictedPathData = sortedPredictedPoints.length > 1
                                    ? sortedPredictedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  return (
                                    <>
                                      {/* Actual line */}
                                      {actualPathData && (
                                        <>
                                          <path
                                            d={`${actualPathData} L ${sortedActualPoints[sortedActualPoints.length - 1].x} 500 L ${sortedActualPoints[0].x} 500 Z`}
                                            fill="url(#monthlyActualGradient)"
                                          />
                                          <path
                                            d={actualPathData}
                                            fill="none"
                                            stroke="#1A3D64"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Predicted line */}
                                      {predictedPathData && (
                                        <>
                                          <path
                                            d={`${predictedPathData} L ${sortedPredictedPoints[sortedPredictedPoints.length - 1].x} 500 L ${sortedPredictedPoints[0].x} 500 Z`}
                                            fill="url(#monthlyPredictedGradient)"
                                          />
                                          <path
                                            d={predictedPathData}
                                            fill="none"
                                            stroke="#4CAF50"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Actual data points */}
                                      {actualPoints.map((point, i) => (
                                        <g key={`actual-${i}`}>
                                          <circle cx={point.x} cy={point.y} r="4" fill="#1A3D64" />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#1A3D64"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Predicted data points */}
                                      {predictedPoints.map((point, i) => (
                                        <g key={`predicted-${i}`}>
                                          <circle cx={point.x} cy={point.y} r="4" fill="#4CAF50" />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#4CAF50"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Month labels */}
                                      {allMonths.map((entry, i) => {
                                        const x = (i / Math.max(allMonths.length - 1, 1)) * 2280
                                        const monthLabel = entry.month.split(' ')[0]
                                        return (
                                          <text
                                            key={`label-${i}`}
                                            x={x}
                                            y={550}
                                            textAnchor="middle"
                                            fontSize="12"
                                            fill="#495057"
                                            fontWeight="500"
                                            transform={`rotate(-45 ${x} 550)`}
                                          >
                                            {monthLabel}
                                          </text>
                                        )
                                      })}
                                    </>
                                  )
                                })()}
                                <line x1="0" y1="500" x2="2280" y2="500" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                                <line x1="0" y1="500" x2="0" y2="5" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '2.5rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#495057' }}>
                          Detailed Breakdown
                        </h4>
                        <div style={{
                          borderTop: '2px solid #e9ecef',
                          paddingTop: '0.75rem',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Month</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Actual</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Predicted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyWithPredictions.map((entry, index) => {
                                const hasBoth = entry.actual !== null && entry.predicted !== null
                                const uniqueKey = `${entry.month}-${entry.actual || 'null'}-${entry.predicted || 'null'}`
                                return (
                                  <tr
                                    key={uniqueKey}
                                    style={{
                                      borderBottom: '1px solid #e9ecef',
                                      backgroundColor: 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '0.625rem 0.5rem', fontSize: '1.15rem', fontWeight: '600', color: '#495057' }}>
                                      {entry.month}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: entry.actual !== null ? '#1A3D64' : '#adb5bd', fontWeight: '600' }}>
                                      {entry.actual !== null ? formatNumber(entry.actual) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: entry.predicted !== null ? '#4CAF50' : '#adb5bd', fontWeight: '600' }}>
                                      {entry.predicted !== null ? formatNumber(entry.predicted) : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="muted small">No monthly data available</p>
                  )}
                </div>
              </>
            )}

            {forecastView === 'annual' && (
              <>
                <div className="chart-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>Annual Production Statistics</h3>
                    <div style={{
                      display: 'flex',
                      gap: '2.5rem',
                      padding: '1.25rem 2rem',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      fontSize: '1.25rem',
                      fontWeight: '600'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#1A3D64', borderRadius: '2px' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Actual</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '32px', height: '4px', backgroundColor: '#4CAF50', borderRadius: '2px', borderTop: '3px dashed #4CAF50' }}></div>
                        <span style={{ color: '#495057', fontSize: '1.25rem', fontWeight: '600' }}>Predicted</span>
                      </div>
                    </div>
                  </div>
                  {annualWithPredictions.length > 0 ? (
                    <>
                      {(() => {
                        const actualData = annualWithPredictions.filter((e) => e.actual !== null)
                        const predictedData = annualWithPredictions.filter((e) => e.predicted !== null)
                        const totalActual = actualData.reduce((sum, e) => sum + (e.actual || 0), 0)
                        const totalPredicted = predictedData.reduce((sum, e) => sum + (e.predicted || 0), 0)
                        const avgActual = actualData.length > 0 ? totalActual / actualData.length : 0
                        const avgPredicted = predictedData.length > 0 ? totalPredicted / predictedData.length : 0
                        const growthRate = avgActual > 0 ? ((avgPredicted - avgActual) / avgActual * 100).toFixed(1) : 0

                        return (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            padding: '0.875rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                          }}>
                            <div>
                              <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Actual</p>
                              <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#1A3D64' }}>
                                {formatNumber(totalActual)}
                              </p>
                              <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                {actualData.length} year{actualData.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            {predictedData.length > 0 && (
                              <>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Total Predicted</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: '#4CAF50' }}>
                                    {formatNumber(totalPredicted)}
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    {predictedData.length} year{predictedData.length !== 1 ? 's' : ''}
                                  </p>
                                </div>
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#6c757d', fontWeight: '600' }}>Projected Growth</p>
                                  <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: '600', color: growthRate >= 0 ? '#4CAF50' : '#dc3545' }}>
                                    {growthRate >= 0 ? '+' : ''}{growthRate}%
                                  </p>
                                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.15rem', color: '#6c757d' }}>
                                    vs. average actual
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })()}
                      <div style={{ marginBottom: '2rem' }}>
                        {/* Combined Chart */}
                        <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '600', color: '#495057' }}>
                            Production Overview
                          </h4>
                          <div className="trend-chart-container" style={{ height: '600px', overflow: 'visible' }}>
                            <svg className="trend-chart" viewBox="0 0 2400 620" preserveAspectRatio="xMidYMid meet">
                              <defs>
                                <linearGradient id="annualActualGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#1A3D64" stopOpacity="0.3" />
                                  <stop offset="100%" stopColor="#1A3D64" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="annualPredictedGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                  <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.2" />
                                  <stop offset="100%" stopColor="#4CAF50" stopOpacity="0" />
                                </linearGradient>
                              </defs>
                              <g transform="translate(60, 50)">
                                {(() => {
                                  // Sort all years chronologically
                                  const allYears = [...annualWithPredictions].sort((a, b) => {
                                    return parseInt(a.label) - parseInt(b.label)
                                  })

                                  // Create a map for x positions based on year index
                                  const yearIndexMap = new Map()
                                  allYears.forEach((entry, index) => {
                                    yearIndexMap.set(entry.label, index)
                                  })

                                  // Map points with consistent x positions based on chronological order
                                  const actualPoints = allYears
                                    .filter((entry) => entry.actual !== null)
                                    .map((entry) => {
                                      const index = yearIndexMap.get(entry.label)
                                      const x = (index / Math.max(allYears.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.actual || 0) / maxAnnualValue) * 420
                                      return { x, y, value: entry.actual, label: entry.label }
                                    })

                                  const predictedPoints = allYears
                                    .filter((entry) => entry.predicted !== null)
                                    .map((entry) => {
                                      const index = yearIndexMap.get(entry.label)
                                      const x = (index / Math.max(allYears.length - 1, 1)) * 2280
                                      const y = 500 - ((entry.predicted || 0) / maxAnnualValue) * 420
                                      return { x, y, value: entry.predicted, label: entry.label }
                                    })

                                  // Sort points by x position to ensure proper line connection
                                  const sortedActualPoints = [...actualPoints].sort((a, b) => a.x - b.x)
                                  const sortedPredictedPoints = [...predictedPoints].sort((a, b) => a.x - b.x)

                                  const actualPathData = sortedActualPoints.length > 1
                                    ? sortedActualPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  const predictedPathData = sortedPredictedPoints.length > 1
                                    ? sortedPredictedPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
                                    : ''

                                  return (
                                    <>
                                      {/* Actual line */}
                                      {actualPathData && (
                                        <>
                                          <path
                                            d={`${actualPathData} L ${sortedActualPoints[sortedActualPoints.length - 1].x} 500 L ${sortedActualPoints[0].x} 500 Z`}
                                            fill="url(#annualActualGradient)"
                                          />
                                          <path
                                            d={actualPathData}
                                            fill="none"
                                            stroke="#1A3D64"
                                            strokeWidth="3"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Predicted line */}
                                      {predictedPathData && (
                                        <>
                                          <path
                                            d={`${predictedPathData} L ${sortedPredictedPoints[sortedPredictedPoints.length - 1].x} 500 L ${sortedPredictedPoints[0].x} 500 Z`}
                                            fill="url(#annualPredictedGradient)"
                                          />
                                          <path
                                            d={predictedPathData}
                                            fill="none"
                                            stroke="#4CAF50"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </>
                                      )}
                                      {/* Actual data points */}
                                      {actualPoints.map((point, i) => (
                                        <g key={`actual-${i}`}>
                                          <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill="#1A3D64"
                                          />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#1A3D64"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Predicted data points */}
                                      {predictedPoints.map((point, i) => (
                                        <g key={`predicted-${i}`}>
                                          <circle
                                            cx={point.x}
                                            cy={point.y}
                                            r="4"
                                            fill="#4CAF50"
                                          />
                                          <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fontSize="13"
                                            fill="#4CAF50"
                                            fontWeight="600"
                                          >
                                            {formatNumber(point.value)}
                                          </text>
                                        </g>
                                      ))}
                                      {/* Year labels */}
                                      {allYears.map((entry, i) => {
                                        const x = (i / Math.max(allYears.length - 1, 1)) * 2280
                                        return (
                                          <text
                                            key={`label-${i}`}
                                            x={x}
                                            y={550}
                                            textAnchor="middle"
                                            fontSize="14"
                                            fill="#495057"
                                            fontWeight="500"
                                          >
                                            {entry.label}
                                          </text>
                                        )
                                      })}
                                    </>
                                  )
                                })()}
                                <line x1="0" y1="500" x2="2280" y2="500" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                                <line x1="0" y1="500" x2="0" y2="5" stroke="#1D546C" strokeWidth="2.5" strokeOpacity="0.3" />
                              </g>
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: '2.5rem' }}>
                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.2rem', fontWeight: '600', color: '#495057' }}>
                          Detailed Breakdown
                        </h4>
                        <div style={{
                          borderTop: '2px solid #e9ecef',
                          paddingTop: '0.75rem',
                          maxHeight: '400px',
                          overflowY: 'auto'
                        }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                                <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Year</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Actual</th>
                                <th style={{ textAlign: 'right', padding: '0.5rem', fontSize: '1.1rem', fontWeight: '600', color: '#495057' }}>Predicted</th>
                              </tr>
                            </thead>
                            <tbody>
                              {annualWithPredictions.map((year, index) => {
                                const hasBoth = year.actual !== null && year.predicted !== null
                                const uniqueKey = `${year.label}-${year.actual || 'null'}-${year.predicted || 'null'}`
                                return (
                                  <tr
                                    key={uniqueKey}
                                    style={{
                                      borderBottom: '1px solid #e9ecef',
                                      backgroundColor: 'transparent'
                                    }}
                                  >
                                    <td style={{ padding: '0.625rem 0.5rem', fontSize: '1.15rem', fontWeight: '600', color: '#495057' }}>
                                      {year.label}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: year.actual !== null ? '#1A3D64' : '#adb5bd', fontWeight: '600' }}>
                                      {year.actual !== null ? formatNumber(year.actual) : '—'}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '0.625rem 0.5rem', fontSize: '1.15rem', color: year.predicted !== null ? '#4CAF50' : '#adb5bd', fontWeight: '600' }}>
                                      {year.predicted !== null ? formatNumber(year.predicted) : '—'}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="muted small">No annual data available</p>
                  )}
                </div>
              </>
            )}
          </section>
        )}


        <AddRecordModal
          open={showAddModal}
          onClose={closeAddModal}
          apiBaseUrl={API_BASE_URL}
          classification={classification}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onAdded={handleAddModalFeedback}
        />

        {showEditModal && editingRecord && (
          <div className="modal-overlay" onClick={() => !isSubmitting && setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Record</h2>
                <button
                  className="modal-close"
                  onClick={() => !isSubmitting && setShowEditModal(false)}
                  disabled={isSubmitting}
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleUpdateRecord} className="add-record-form">
                <div className="form-row">
                  <label className="field">
                    <span>Name *</span>
                    <input
                      type="text"
                      value={newRecord.name}
                      onChange={(e) => setNewRecord({ ...newRecord, name: e.target.value })}
                      required
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className="field">
                    <span>Gender</span>
                    <select
                      value={newRecord.gender}
                      onChange={(e) => setNewRecord({ ...newRecord, gender: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select...</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Barangay</span>
                    <input
                      type="text"
                      value={newRecord.barangay}
                      onChange={(e) => setNewRecord({ ...newRecord, barangay: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className="field">
                    <span>Municipality</span>
                    <input
                      type="text"
                      value={newRecord.municipality}
                      onChange={(e) => setNewRecord({ ...newRecord, municipality: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Species</span>
                    <input
                      type="text"
                      value={newRecord.species}
                      onChange={(e) => setNewRecord({ ...newRecord, species: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className="field">
                    <span>Quantity (pcs) *</span>
                    <input
                      type="number"
                      value={newRecord.quantity}
                      onChange={(e) => setNewRecord({ ...newRecord, quantity: e.target.value })}
                      required
                      min="0"
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Cost (₱)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={newRecord.cost}
                      onChange={(e) => setNewRecord({ ...newRecord, cost: e.target.value })}
                      min="0"
                      disabled={isSubmitting}
                    />
                  </label>
                  <label className="field">
                    <span>Implementation Type</span>
                    <select
                      value={newRecord.implementationType}
                      onChange={(e) => setNewRecord({ ...newRecord, implementationType: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select...</option>
                      <option value="Direct Distribution">Direct Distribution</option>
                      <option value="Community-Based">Community-Based</option>
                      <option value="Institutional">Institutional</option>
                    </select>
                  </label>
                </div>
                <div className="form-row">
                  <label className="field">
                    <span>Satisfaction</span>
                    <select
                      value={newRecord.satisfaction}
                      onChange={(e) => setNewRecord({ ...newRecord, satisfaction: e.target.value })}
                      disabled={isSubmitting}
                    >
                      <option value="">Select...</option>
                      <option value="Satisfied">Satisfied</option>
                      <option value="Very Satisfied">Very Satisfied</option>
                      <option value="Neutral">Neutral</option>
                      <option value="Dissatisfied">Dissatisfied</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Date Implemented</span>
                    <input
                      type="date"
                      value={newRecord.dateImplemented}
                      onChange={(e) => setNewRecord({ ...newRecord, dateImplemented: e.target.value })}
                      disabled={isSubmitting}
                    />
                  </label>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-button"
                    onClick={() => setShowEditModal(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-button"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
