import { memo, useCallback, useEffect, useRef, useState } from 'react'

const emptyNewRecord = () => ({
  name: '',
  gender: '',
  contact: '',
  barangay: '',
  municipality: '',
  species: '',
  quantity: '',
  quantityUnit: 'pcs',
  cost: '',
  implementationType: '',
  satisfaction: '',
  dateImplemented: '',
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nameSuggestions, setNameSuggestions] = useState([])
  const [showNameSuggestions, setShowNameSuggestions] = useState(false)
  const nameInputFocusedRef = useRef(false)
  const nameSearchTimeoutRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setNewRecord(emptyNewRecord())
    setSelectedBeneficiary(null)
    setNameSuggestions([])
    setShowNameSuggestions(false)
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
          contact: beneficiary.contact || prev.contact,
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
              contact: beneficiary.contact || prev.contact,
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
      contact: '',
      barangay: '',
      municipality: '',
    }))
  }, [])

  const findOrCreateBeneficiary = useCallback(
    async (name, gender, contact, barangay, municipality) => {
      const trimmedName = name.trim()
      const params = new URLSearchParams({
        name: trimmedName,
        classification: classification || 'individual',
      })
      const searchRes = await fetch(
        `${apiBaseUrl}/beneficiaries/by-name?${params.toString()}`
      )
      if (searchRes.ok) {
        const payload = await searchRes.json()
        if (payload.data) return payload.data
      }

      const createRes = await fetch(`${apiBaseUrl}/beneficiaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          excelId: `BEN-${Date.now()}`,
          classification: classification || 'individual',
          name: trimmedName,
          gender: gender || null,
          contact: contact || null,
          barangay: barangay || null,
          municipality: municipality || null,
        }),
      })
      const createBody = await createRes.json()
      if (!createRes.ok) {
        throw new Error(createBody.error || 'Failed to create beneficiary')
      }
      return createBody.data
    },
    [apiBaseUrl, classification]
  )

  const handleAddRecord = useCallback(
    async (event) => {
      event.preventDefault()

      if (!newRecord.name.trim()) {
        onAdded({ type: 'toast', message: 'Please enter a beneficiary name.' })
        return
      }

      setIsSubmitting(true)
      try {
        let beneficiary = selectedBeneficiary

        if (!beneficiary?.id) {
          beneficiary = await findOrCreateBeneficiary(
            newRecord.name,
            newRecord.gender,
            newRecord.contact,
            newRecord.barangay,
            newRecord.municipality
          )
        }

        const recordData = {
          excelId: `MANUAL-${Date.now()}`,
          beneficiaryId: beneficiary.id,
          species: newRecord.species || null,
          quantity: newRecord.quantity ? Number(newRecord.quantity) : null,
          quantityUnit: newRecord.quantityUnit || 'pcs',
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
      findOrCreateBeneficiary,
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
                placeholder="Type name to search or add new..."
              />
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
                border: '1px solid #d1fae5',
                borderRadius: '8px',
                background: '#ecfdf5',
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600, marginBottom: '0.25rem' }}>
                  ✓ Existing beneficiary matched
                </div>
                <div style={{ fontWeight: 700, color: '#111827' }}>{selectedBeneficiary.name}</div>
                <div style={{ fontSize: '0.9rem', color: '#374151' }}>
                  {selectedBeneficiary.gender || '—'} · {selectedBeneficiary.contact || '—'} ·{' '}
                  {selectedBeneficiary.barangay || '—'} ·{' '}
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
                Change
              </button>
            </div>
          )}

          <div className="form-row">
            <label className="field">
              <span>Phone Number</span>
              <input
                type="text"
                value={selectedBeneficiary?.contact ?? newRecord.contact}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, contact: e.target.value }))
                }
                disabled={isSubmitting || !!selectedBeneficiary}
              />
            </label>
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
              <span>Quantity</span>
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
            <label className="field">
              <span>Unit</span>
              <select
                value={newRecord.quantityUnit}
                onChange={(e) =>
                  setNewRecord((prev) => ({ ...prev, quantityUnit: e.target.value }))
                }
                disabled={isSubmitting}
              >
                <option value="pcs">pcs</option>
                <option value="kls">kls</option>
              </select>
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
