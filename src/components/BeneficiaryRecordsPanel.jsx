import { memo, useCallback, useEffect, useMemo, useState } from 'react'

const PAGE_SIZE = 80
const SEARCH_DEBOUNCE_MS = 220

export const MONTH_BUTTONS = [
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
]

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

  /** Always 2019 … current calendar year — not derived from filtered `records` (that would hide years). */
  const endYear = new Date().getFullYear()
  const yearButtonRange = []
  for (let y = 2019; y <= endYear; y += 1) {
    yearButtonRange.push(y)
  }

  const colCount = classification === 'group' ? 9 : 10

  return (
    <div className="database-table-view">
      <div className="filter-section filter-section--records">
        <div className="classification-switch-wrap">
          <span className="classification-switch-label" id="classification-switch-label">
            Record type
          </span>
          <div
            className="classification-switch"
            role="group"
            aria-labelledby="classification-switch-label"
          >
            <button
              type="button"
              className={
                classification === 'individual'
                  ? 'classification-switch__btn classification-switch__btn--active'
                  : 'classification-switch__btn'
              }
              onClick={() => onClassificationChange('individual')}
            >
              Individuals
            </button>
            <button
              type="button"
              className={
                classification === 'group'
                  ? 'classification-switch__btn classification-switch__btn--active'
                  : 'classification-switch__btn'
              }
              onClick={() => onClassificationChange('group')}
            >
              Groups
            </button>
          </div>
        </div>
        <div className="filter-section-filters">
          <div className="year-filter-row">
            <span className="year-filter-label" id="year-filter-label">
              Year
            </span>
            <div
              className="year-filter-buttons"
              role="group"
              aria-labelledby="year-filter-label"
            >
              <button
                type="button"
                className={
                  selectedYear === '' || selectedYear === undefined
                    ? 'year-filter-btn year-filter-btn--active'
                    : 'year-filter-btn'
                }
                onClick={() => onSelectedYearChange('')}
              >
                All
              </button>
              {yearButtonRange.map((y) => (
                <button
                  key={y}
                  type="button"
                  className={
                    String(selectedYear) === String(y)
                      ? 'year-filter-btn year-filter-btn--active'
                      : 'year-filter-btn'
                  }
                  onClick={() => onSelectedYearChange(String(y))}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="month-filter-row">
            <span className="year-filter-label" id="month-filter-label">
              Month
            </span>
            <div
              className="year-filter-buttons month-filter-buttons"
              role="group"
              aria-labelledby="month-filter-label"
            >
              <button
                type="button"
                className={
                  selectedMonth === '' || selectedMonth === undefined
                    ? 'year-filter-btn year-filter-btn--active'
                    : 'year-filter-btn'
                }
                onClick={() => onSelectedMonthChange('')}
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
                  onClick={() => onSelectedMonthChange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <input
            type="search"
            placeholder={
              classification === 'group'
                ? 'Search organization, barangay, municipality, contact…'
                : 'Search name, barangay, or municipality…'
            }
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="search-input search-input--records"
          />
        </div>
      </div>

      {filteredRecords.length > PAGE_SIZE && (
        <div className="records-pagination">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length}
            {debouncedKeyword ? ' (filtered)' : ''}
          </span>
          <div className="records-pagination__controls">
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

      <div className="table-wrapper table-wrapper--records">
        <table className="data-table data-table--records">
          <thead>
            <tr>
              <th>{classification === 'group' ? 'Organization' : 'Beneficiary'}</th>
              {classification === 'individual' ? <th>Gender</th> : null}
              <th>Barangay</th>
              <th>Municipality</th>
              <th>Species</th>
              <th>Quantity</th>
              <th>Implementation</th>
              <th>Satisfaction</th>
              <th>Date</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loadingRecords ? (
              <tr>
                <td colSpan={colCount} className="muted small">
                  Loading latest entries…
                </td>
              </tr>
            ) : pagedRecords.length ? (
              pagedRecords.map((record, index) => (
                <tr key={record.id ?? `${record.excel_id ?? 'row'}-${index}`}>
                  <td className="data-table__cell-name">{record.name}</td>
                  {classification === 'individual' ? (
                    <td>{record.gender && record.gender !== 'N/A' ? record.gender : record.gender || '—'}</td>
                  ) : null}
                  <td>{record.barangay}</td>
                  <td>{record.municipality}</td>
                  <td>{formatSpecies(record.species)}</td>
                  <td>{`${formatNumber(record.quantity)} ${record.quantity_unit || record.quantityUnit || (formatSpecies(record.species).toLowerCase().includes('culled') ? 'kls' : 'pcs')}`}</td>
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
                <td colSpan={colCount} className="muted small">
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
