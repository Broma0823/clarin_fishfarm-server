import { memo, useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 80
const SEARCH_DEBOUNCE_MS = 220

function BeneficiaryRecordsPanelInner({
  records,
  loadingRecords,
  classification,
  onClassificationChange,
  selectedYear,
  onSelectedYearChange,
  selectedMonth,
  onSelectedMonthChange,
  onEditRecord,
  onDeleteRecord,
  formatNumber,
  formatDate,
  formatSpecies,
}) {
  const [keyword, setKeyword] = useState('')
  const [debouncedKeyword, setDebouncedKeyword] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [keyword])

  useEffect(() => {
    setPage(1)
  }, [debouncedKeyword, records, classification, selectedYear, selectedMonth])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('.action-dropdown') &&
        !event.target.closest('button[title="Actions"]')
      ) {
        setOpenDropdownId(null)
      }
    }
    if (openDropdownId !== null) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdownId])

  const filteredRecords = useMemo(() => {
    const q = debouncedKeyword.toLowerCase()
    if (!q) return records
    return records.filter(
      (record) =>
        record.name?.toLowerCase().includes(q) ||
        record.barangay?.toLowerCase().includes(q) ||
        record.municipality?.toLowerCase().includes(q) ||
        record.species?.toLowerCase().includes(q)
    )
  }, [records, debouncedKeyword])

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))

  const pagedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, page])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const onEdit = useCallback(
    (record) => {
      setOpenDropdownId(null)
      onEditRecord(record)
    },
    [onEditRecord]
  )

  const onDelete = useCallback(
    (id) => {
      setOpenDropdownId(null)
      onDeleteRecord(id)
    },
    [onDeleteRecord]
  )

  return (
    <div className="database-table-view">
      <div className="filter-section">
        <div className="toggle">
          <button
            type="button"
            className={classification === 'individual' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => onClassificationChange('individual')}
          >
            Individuals
          </button>
          <button
            type="button"
            className={classification === 'group' ? 'toggle-btn active' : 'toggle-btn'}
            onClick={() => onClassificationChange('group')}
          >
            Groups
          </button>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => onSelectedYearChange(e.target.value)}
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
          onChange={(e) => onSelectedMonthChange(e.target.value)}
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
          className="search-input"
        />
      </div>

      {filteredRecords.length > PAGE_SIZE && (
        <div
          className="records-pagination"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: '0.75rem',
            fontSize: '0.9rem',
            color: '#495057',
          }}
        >
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
            {debouncedKeyword ? ' (filtered)' : ''}
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="view-toggle-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span className="muted small">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="view-toggle-btn"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}

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
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingRecords ? (
              <tr>
                <td colSpan={10} className="muted small">
                  Loading latest entries…
                </td>
              </tr>
            ) : pagedRecords.length ? (
              pagedRecords.map((record, index) => (
                <tr key={record.id ?? `${record.excel_id ?? 'row'}-${index}`}>
                  <td>{record.name}</td>
                  <td>{record.gender}</td>
                  <td>{record.barangay}</td>
                  <td>{record.municipality}</td>
                  <td>{formatSpecies(record.species)}</td>
                  <td>{formatNumber(record.quantity)}</td>
                  <td>{record.implementationType || record.implementation_type}</td>
                  <td>{record.satisfaction}</td>
                  <td>{formatDate(record.dateImplemented ?? record.date_implemented)}</td>
                  <td style={{ textAlign: 'center', position: 'relative' }}>
                    {record.id && (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenDropdownId(openDropdownId === record.id ? null : record.id)
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '0.5rem',
                            borderRadius: '4px',
                            fontSize: '1rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s',
                            width: '32px',
                            height: '32px',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f5f5f5'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          title="Actions"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                          </svg>
                        </button>
                        {openDropdownId === record.id && (
                          <div className="action-dropdown">
                            <button type="button" className="dropdown-item" onClick={() => onEdit(record)}>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit
                            </button>
                            <button
                              type="button"
                              className="dropdown-item delete-item"
                              onClick={() => onDelete(record.id)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="muted small">
                  No records found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const BeneficiaryRecordsPanel = memo(BeneficiaryRecordsPanelInner)
