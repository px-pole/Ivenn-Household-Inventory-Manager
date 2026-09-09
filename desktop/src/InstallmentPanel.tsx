import { useEffect, useState } from 'react'
import { Banknote, Check, Plus, Trash2, X } from 'lucide-react'
import { createInstallment, deleteInstallment, fetchInstallment, updateInstallment, type Installment } from './api'

type Props = {
  itemId: string
  onChanged: () => Promise<void>
}

const emptyForm = { totalInstallments: '', paymentDay: '', startDate: '', amountPerInstallment: '', notes: '' }

export function InstallmentPanel({ itemId, onChanged }: Props) {
  const [installment, setInstallment] = useState<Installment | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchInstallment(itemId, controller.signal)
      .then((result) => {
        setInstallment(result)
        if (result) {
          setForm({
            totalInstallments: String(result.total_installments),
            paymentDay: String(result.payment_day),
            startDate: result.start_date,
            amountPerInstallment: result.amount_per_installment ?? '',
            notes: result.notes ?? '',
          })
        }
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : 'Could not load installment details.')
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [itemId])

  async function save() {
    setBusy(true)
    setError(null)
    const payload = {
      total_installments: Number(form.totalInstallments),
      payment_day: Number(form.paymentDay),
      start_date: form.startDate,
      amount_per_installment: form.amountPerInstallment.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      const saved = installment ? await updateInstallment(itemId, payload) : await createInstallment(itemId, payload)
      setInstallment(saved)
      setEditing(false)
      await onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save this installment plan.')
    } finally {
      setBusy(false)
    }
  }

  async function markPaid() {
    if (!installment) return
    setBusy(true)
    setError(null)
    try {
      const saved = await updateInstallment(itemId, { paid_installments: Math.min(installment.paid_installments + 1, installment.total_installments) })
      setInstallment(saved)
      await onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update the paid installments.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      await deleteInstallment(itemId)
      setInstallment(null)
      setForm(emptyForm)
      setConfirmDelete(false)
      await onChanged()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not remove this installment plan.')
    } finally {
      setBusy(false)
    }
  }

  const valid = form.totalInstallments !== '' && form.paymentDay !== '' && form.startDate !== ''

  return (
    <section className="installment-panel" aria-labelledby="installment-title">
      <div className="installment-heading">
        <div><h3 id="installment-title">Installments</h3><p>Payment plan and progress</p></div>
        {!installment && !editing && <button className="small-button" type="button" onClick={() => setEditing(true)}><Plus size={16} />Add installment plan</button>}
      </div>

      {loading ? <p className="panel-message">Loading installment plan...</p> : editing ? (
        <div className="installment-form">
          <div className="form-grid">
            <label>Number of installments<input required min={1} type="number" value={form.totalInstallments} onChange={(event) => setForm((current) => ({ ...current, totalInstallments: event.target.value }))} /></label>
            <label>Payment day of month<input required min={1} max={31} type="number" value={form.paymentDay} onChange={(event) => setForm((current) => ({ ...current, paymentDay: event.target.value }))} /></label>
            <label>First payment date<input required type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
            <label>Amount per installment<input min="0" step="0.01" type="number" value={form.amountPerInstallment} onChange={(event) => setForm((current) => ({ ...current, amountPerInstallment: event.target.value }))} /></label>
            <label className="full-field">Notes<textarea maxLength={1000} rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          </div>
          <div className="inline-actions"><button className="small-button" type="button" disabled={busy || !valid} onClick={() => void save()}><Check size={16} />{busy ? 'Saving...' : 'Save installment plan'}</button><button className="icon-button" type="button" title="Cancel installment edit" onClick={() => setEditing(false)}><X size={17} /></button></div>
        </div>
      ) : installment ? (
        <div className="installment-summary">
          <div className="installment-mark"><Banknote size={20} /></div>
          <div>
            <strong>{installment.paid_installments} of {installment.total_installments} paid</strong>
            <span>Last payment {new Date(`${installment.last_payment_date}T00:00:00`).toLocaleDateString()}</span>
            {installment.amount_per_installment && <small>{installment.amount_per_installment} per installment, due day {installment.payment_day}</small>}
          </div>
          {installment.paid_installments < installment.total_installments && <button className="small-button" type="button" disabled={busy} onClick={() => void markPaid()}>Mark paid</button>}
          <button className="small-button" type="button" onClick={() => setEditing(true)}>Edit</button>
          {confirmDelete ? <><button className="icon-button danger-button confirm-delete" type="button" title="Confirm remove installment plan" disabled={busy} onClick={() => void remove()}><Trash2 size={16} /></button><button className="icon-button" type="button" title="Cancel removal" onClick={() => setConfirmDelete(false)}><X size={16} /></button></> : <button className="icon-button danger-button" type="button" title="Remove installment plan" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /></button>}
        </div>
      ) : <div className="panel-message"><Banknote size={17} />No installment plan recorded</div>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </section>
  )
}
