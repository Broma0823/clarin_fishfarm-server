import { memo, useCallback, useEffect, useRef, useState } from 'react'

const emptyNewRecord = () => ({
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

const emptyNewBeneficiary = () => ({
  name: '',
  gender: '',
  barangay: '',
  municipality: '',
})

function AddRecordModalInner({
  open,
  onClose,
  apiBaseUrl,
  classification,
  selectedYear,
  selectedMonth,
  onAdded,
}) {
  const [newRecord, setNewRecord] = useState(emptyNewRecord)
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null)
  const [newBeneficiary, setNewBeneficiary] = useState(emptyNewBeneficiary)
  const [isCreatingBeneficiary, setIsCreatingBeneficiary] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState([])
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const nameInputFocusedRef = useRef(false)
  const nameSearchTimeoutRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setNewRecord(emptyNewRecord())
    setSelectedBeneficiary(null)
    setNewBeneficiary(emptyNewBeneficiary())
    setNameSuggestions([])
    setShowNameSuggestions(false)
    setIsCreatingBeneficiary(false)
    setIsSubmitting(false)
  }, [open])

  useEffect(() => {
    return () => {
      if (nameSearchTimeoutRef.current) {
        clearTimeout(nameSearchTimeoutRef.current)
      }
    }
  }, [])

  const searchSimilarNames = useCallback(
    async (name) => {
      if (!name || name.trim().length < 2) {
        setNameSuggestions([])
        setShowNameSuggestions(false)
        return
      }

      try {
        const params = new URLSearchParams({
          name: name.trim(),
          classification: classification || 'individual',
        })
        const response = await fetch(
          `${apiBaseUrl}/beneficiaries/search-similar?${params.toString()}`
        )
        if (response.ok) {
          const payload = await response.json()
          const data = payload.data || []
          setNameSuggestions(data)
          setShowNameSuggestions(data.length > 0 && nameInputFocusedRef.current)
        }
      } catch (err) {
        console.error('Error searching similar names:', err)
        setNameSuggestions([])
      }
    },
    [apiBaseUrl, classification]
  )

  const handleNameChange = useCallback(
    (value) => {
      setSelectedBeneficiary(null)
      setNewRecord((prev) => ({ ...prev, name: value }))
      if (nameSearchTimeoutRef.current) {
        clearTimeout(nameSearchTimeoutRef.current)
      }
      nameSearchTimeoutRef.current = setTimeout(() => {
        searchSimilarNames(value)
      }, 350)
    },
    [searchSimilarNames]
  )

  const selectSuggestedName = useCallback(
    async (suggestion) => {
      const nameToUse = suggestion.name || suggestion
      setNewRecord((prev) => ({ ...prev, name: nameToUse }))
      setNameSuggestions([])
      setShowNameSuggestions(false)

      if (suggestion.beneficiary) {
        const beneficiary = suggestion.beneficiary
        setSelectedBeneficiary(beneficiary)
        setNewRecord((prev) => ({
          ...prev,
          name: beneficiary.name || prev.name,
          gender: beneficiary.gender || prev.gender,
          barangay: beneficiary.barangay || prev.barangay,
          municipality: beneficiary.municipality || prev.municipality,
        }))
        return
      }

      try {
        const params = new URLSearchParams({
          name: nameToUse,
          classification: classification || 'individual',
        })
        const response = await fetch(
          `${apiBaseUrl}/beneficiaries/by-name?${params.toString()}`
        )
        if (response.ok) {
          const payload = await response.json()
          const beneficiary = payload.data
          if (beneficiary) {
            setSelectedBeneficiary(beneficiary)
            setNewRecord((prev) => ({
              ...prev,
              name: beneficiary.name || prev.name,
              gender: beneficiary.gender || prev.gender,
              barangay: beneficiary.barangay || prev.barangay,
              municipality: beneficiary.municipality || prev.municipality,
            }))
          }
        }
      } catch (err) {
        console.error('Error fetching beneficiary info:', err)
        setNewRecord((prev) => ({ ...prev, name: nameToUse }))
      }
    },
    [apiBaseUrl, classification]
  )

  const clearSelectedBeneficiary = useCallback(() => {
    setSelectedBeneficiary(null)
    setNewRecord((prev) => ({
      ...prev,
      name: '',
      gender: '',
      barangay: '',
      municipality: '',
    }))
  }, [])

  const handleCreateBeneficiary = useCallback(
    async (event) => {
      event.preventDefault()
      if (!newBeneficiary.name.trim()) {
        onAdded({ type: 'toast', message: 'Please enter a beneficiary name before saving.' })
        return
      }

      setIsCreatingBeneficiary(true)
      try {
        const payload = {
          excelId: `BEN-${Date.now()}`,
          classification,
          name: newBeneficiary.name.trim(),
          gender: newBeneficiary.gender || null,
          barangay: newBeneficiary.barangay || null,
          municipality: newBeneficiary.municipality || null,
        }

        const response = await fetch(`${apiBaseUrl}/beneficiaries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const resultBody = await response.json()
        if (!response.ok) {
          throw new Error(resultBody.error || 'Failed to save beneficiary')
        }

        const saved = resultBody.data
        setSelectedBeneficiary(saved)
        setNewRecord((prev) => ({
          ...prev,
          name: saved?.name || prev.name,
          gender: saved?.gender || '',
          barangay: saved?.barangay || '',
          municipality: saved?.municipality || '',
        }))
        setNewBeneficiary(emptyNewBeneficiary())
        setNameSuggestions([])
        setShowNameSuggestions(false)
        onAdded({
          type: 'toast',
          message: 'Beneficiary saved. Now add distribution details.',
        })
      } catch (err) {
        console.error(err)
        onAdded({ type: 'toast', message: `Error: ${err.message}` })
      } finally {
        setIsCreatingBeneficiary(false)
      }
    },
    [apiBaseUrl, classification, newBeneficiary, onAdded]
  )

  const handleAddRecord = useCallback(
    async (event) => {
      event.preventDefault()
      if (!selectedBeneficiary?.id) {
        onAdded({
          type: 'toast',
          message: 'Select an existing beneficiary or add one before saving the distribution.',
        })
        return
      }
      setIsSubmitting(true)
      try {
        const recordData = {
          excelId: `MANUAL-${Date.now()}`,
          beneficiaryId: selectedBeneficiary.id,
          species: newRecord.species || null,
          quantity: newRecord.quantity ? Number(newRecord.quantity) : null,
          cost: newRecord.cost ? Number(newRecord.cost) : null,
          implementationType: newRecord.implementationType || null,
          satisfaction: newRecord.satisfaction || null,
          dateImplemented: newRecord.dateImplemented || null,
        }

        const response = await fetch(`${apiBaseUrl}/distributions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(recordData),
        })

        if (!response.ok) {
          const payload = await response.json()
          throw new Error(payload.error || 'Failed to add record')
        }

        const payload = await response.json()
        let successMessage = 'Record added successfully!'
        if (payload.normalized) {
          successMessage = `Record added successfully! Name normalized from "${payload.normalized.original}" to "${payload.normalized.normalized}" to match existing records.`
        }

        await onAdded({
          type: 'saved',
          message: successMessage,
          classification,
          selectedYear,
          selectedMonth,
        })
        onClose()
      } catch (err) {
        console.error(err)
        onAdded({ type: 'toast', message: `Error: ${err.message}` })
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      apiBaseUrl,
      classification,
      newRecord,
      onAdded,
      onClose,
      selectedBeneficiary,
      selectedMonth,
      selectedYear,
    ]
  )

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={() => !isSubmitting && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Record</h2>
          <button
            type="button"
            className="modal-close"
            onClick={() => !isSubmitting && onClose()}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleAddRecord} className="add-record-form">
          <div className="form-row">
            <label className="field" style={{ position: 'relative' }}>
              <span>Name / Beneficiary *</span>
              <input
                type="text"
                value={selectedBeneficiary ? selectedBeneficiary.name : newRecord.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => {
                  nameInputFocusedRef.current = true
                  if (nameSuggestions.length > 0) {
                    setShowNameSuggestions(true)
                  }
                }}
                onBlur={() => {
                  nameInputFocusedRef.current = false
                  setTimeout(() => setShowNameSuggestions(false), 200)
                }}
                required
                disabled={isSubmitting}
                placeholder="Search existing beneficiary..."
              />
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem' }}>
                Select an existing beneficiary. If not found, add them below, then continue with the
                distribution details.
              </div>
              {showNameSuggestions && nameSuggestions.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '4px',
                  }}
                >
                  <div
                    style={{
                      padding: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                      borderBottom: '1px solid #e5e7eb',
                      background: '#f8f9fa',
                    }}
                  >
                    Similar names found (click to use):
                  </div>
                  {nameSuggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      role="button"
                      tabIndex={0}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectSuggestedName(suggestion)}
                      style={{
                        padding: '0.75rem',
                        cursor: 'pointer',
                        borderBottom:
                          idx < nameSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f8f9fa'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#1a202c' }}>{suggestion.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {Math.round(suggestion.similarity * 100)}% match
                        {suggestion.beneficiary && (
                          <span
                            style={{ marginLeft: '0.5rem', color: '#059669', fontWeight: '500' }}
                          >
                            • Will auto-fill info
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </label>
            <label className="field">
              <span>Gender</span>
              <select
                value={selectedBeneficiary?.gender ?? newRecord.gender}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, gender: e.target.value }))
                }
                disabled={isSubmitting || !!selectedBeneficiary}
              >
                <option value="">Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </label>
          </div>

          {selectedBeneficiary && (
            <div
              style={{
                margin: '0.5rem 0 1rem',
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{selectedBeneficiary.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                  {selectedBeneficiary.gender || '—'} · {selectedBeneficiary.barangay || '—'} ·{' '}
                  {selectedBeneficiary.municipality || '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={clearSelectedBeneficiary}
                disabled={isSubmitting}
                className="cancel-button"
                style={{ padding: '0.5rem 0.75rem' }}
              >
                Change beneficiary
              </button>
            </div>
          )}

          <div
            style={{
              marginBottom: '1rem',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '0.75rem',
              background: '#f8fafc',
            }}
          >
            <div style={{ fontWeight: 600, color: '#1f2937', marginBottom: '0.5rem' }}>
              Add beneficiary (if not found)
            </div>
            <div className="form-row">
              <label className="field">
                <span>Name *</span>
                <input
                  type="text"
                  value={newBeneficiary.name}
                  onChange={(e) =>
                    setNewBeneficiary((prev) => ({ ...prev, name: e.target.value }))
                  }
                  disabled={isCreatingBeneficiary}
                  placeholder="Full name"
                />
              </label>
              <label className="field">
                <span>Gender</span>
                <select
                  value={newBeneficiary.gender}
                  onChange={(e) =>
                    setNewBeneficiary((prev) => ({ ...prev, gender: e.target.value }))
                  }
                  disabled={isCreatingBeneficiary}
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
                  value={newBeneficiary.barangay}
                  onChange={(e) =>
                    setNewBeneficiary((prev) => ({ ...prev, barangay: e.target.value }))
                  }
                  disabled={isCreatingBeneficiary}
                />
              </label>
              <label className="field">
                <span>Municipality</span>
                <input
                  type="text"
                  value={newBeneficiary.municipality}
                  onChange={(e) =>
                    setNewBeneficiary((prev) => ({ ...prev, municipality: e.target.value }))
                  }
                  disabled={isCreatingBeneficiary}
                />
              </label>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="submit-button"
                onClick={handleCreateBeneficiary}
                disabled={isCreatingBeneficiary}
                style={{ padding: '0.5rem 1rem' }}
              >
                {isCreatingBeneficiary ? 'Saving...' : 'Save Beneficiary'}
              </button>
            </div>
          </div>

          <div className="form-row">
            <label className="field">
              <span>Barangay</span>
              <input
                type="text"
                value={selectedBeneficiary?.barangay ?? newRecord.barangay}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, barangay: e.target.value }))
                }
                disabled={isSubmitting || !!selectedBeneficiary}
              />
            </label>
            <label className="field">
              <span>Municipality</span>
              <input
                type="text"
                value={selectedBeneficiary?.municipality ?? newRecord.municipality}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, municipality: e.target.value }))
                }
                disabled={isSubmitting || !!selectedBeneficiary}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Species</span>
              <input
                type="text"
                value={newRecord.species}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, species: e.target.value }))
                }
                placeholder="e.g., Tilapia"
                disabled={isSubmitting}
              />
            </label>
            <label className="field">
              <span>Quantity (pcs)</span>
              <input
                type="number"
                value={newRecord.quantity}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, quantity: e.target.value }))
                }
                min="0"
                disabled={isSubmitting}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Cost (PHP)</span>
              <input
                type="number"
                value={newRecord.cost}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, cost: e.target.value }))
                }
                min="0"
                step="0.01"
                disabled={isSubmitting}
              />
            </label>
            <label className="field">
              <span>Implementation Type</span>
              <input
                type="text"
                value={newRecord.implementationType}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, implementationType: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              <span>Satisfaction</span>
              <select
                value={newRecord.satisfaction}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, satisfaction: e.target.value }))
                }
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
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, dateImplemented: e.target.value }))
                }
                disabled={isSubmitting}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={() => onClose()}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export const AddRecordModal = memo(AddRecordModalInner)
