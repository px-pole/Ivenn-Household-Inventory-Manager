import { Banknote, CalendarClock, CheckCircle2 } from 'lucide-react'
import type { InstallmentOverview } from './api'

type Props = {
  installments: InstallmentOverview[]
  loading: boolean
  onSelectItem: (itemId: string) => void
}

export function InstallmentsView({ installments, loading, onSelectItem }: Props) {
  const completed = installments.filter((installment) => installment.remaining_installments === 0).length
  const inProgress = installments.length - completed
  const totalRemaining = installments.reduce((sum, installment) => sum + installment.remaining_installments, 0)

  return (
    <section className="installments-view">
      <div className="warranty-stats" aria-label="Installment summary">
        <article><Banknote size={18} /><div><strong>{inProgress}</strong><span>In progress</span></div></article>
        <article><CheckCircle2 size={18} /><div><strong>{completed}</strong><span>Fully paid</span></div></article>
        <article><CalendarClock size={18} /><div><strong>{totalRemaining}</strong><span>Installments remaining</span></div></article>
      </div>

      <div className="warranty-list-panel">
        <div className="section-heading"><div><p className="eyebrow">Payment plans</p><h2>All installments</h2></div><span>{installments.length} {installments.length === 1 ? 'record' : 'records'}</span></div>
        {loading ? <div className="empty-state"><p>Loading installments...</p></div> : installments.length === 0 ? (
          <div className="empty-state"><div className="empty-icon"><Banknote size={27} /></div><h3>No installment plans recorded</h3><p>Open an item to set up how many installments it has and its payment day.</p></div>
        ) : (
          <div className="warranty-list">
            <div className="warranty-list-header" aria-hidden="true">
              <span></span>
              <span>Item / Progress</span>
              <span>Last Payment</span>
              <span>Status</span>
            </div>
            {installments.map((installment) => {
              const done = installment.remaining_installments === 0
              return (
                <button className="warranty-row" type="button" key={installment.id} onClick={() => onSelectItem(installment.item_id)}>
                  <div className={`installment-mark ${done ? 'covered' : ''}`}><Banknote size={19} /></div>
                  <div><strong>{installment.item_name}</strong><span>{installment.paid_installments} of {installment.total_installments} paid</span></div>
                  <div><strong>{new Date(`${installment.last_payment_date}T00:00:00`).toLocaleDateString()}</strong></div>
                  <span className={`warranty-badge ${done ? 'covered' : 'expiring'}`}>{done ? 'Paid off' : `${installment.remaining_installments} left`}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
