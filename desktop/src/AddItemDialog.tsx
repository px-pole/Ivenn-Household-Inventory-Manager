import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FileText, ImagePlus, Plus, ScanText, ShieldCheck, Trash2, X } from 'lucide-react'
import { AppSelect } from './AppSelect'
import { createItem, extractMedia, uploadAttachment, type Attachment, type FieldSuggestion, type NamedResource, type ReceiptExtraction } from './api'

type Props = {
  rooms: NamedResource[]
  categories: NamedResource[]
  onClose: () => void
  onCreated: () => Promise<void>
}

const initialForm = {
  name: '',
  roomName: '',
  categoryName: '',
  brand: '',
  model: '',
  serialNumber: '',
  estimatedValue: '',
  purchaseDate: '',
}

type StagedMedia = {
  id: string
  file: File
  attachmentType: Attachment['attachment_type']
}

const attachmentTypeOptions = [
  { value: 'item_photo', label: 'Item photo' },
  { value: 'receipt', label: 'Receipt' },
  { value: 'warranty_document', label: 'Warranty document' },
  { value: 'other', label: 'Other document' },
]

export function AddItemDialog({ rooms, categories, onClose, onCreated }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState(initialForm)
  const [media, setMedia] = useState<StagedMedia[]>([])
  const [attachmentType, setAttachmentType] = useState<Attachment['attachment_type']>('receipt')
  const [extraction, setExtraction] = useState<ReceiptExtraction | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function scanReceipt(file: File) {
    if (!file.type.startsWith('image/')) return
    setScanning(true)
    setError(null)
    try {
      setExtraction(await extractMedia(file))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not scan this receipt.')
    } finally {
      setScanning(false)
    }
  }

  function addMedia(files: FileList) {
    const selectedFiles = Array.from(files)
    setMedia((current) => [...current, ...selectedFiles.map((file) => ({ id: crypto.randomUUID(), file, attachmentType }))])
    if (attachmentType === 'receipt') void scanReceipt(selectedFiles.find((file) => file.type.startsWith('image/')) ?? selectedFiles[0])
    if (fileInput.current) fileInput.current.value = ''
  }

  function applySuggestions() {
    if (!extraction) return
    setForm((current) => ({
      ...current,
      model: extraction.model?.value ?? current.model,
      serialNumber: extraction.serial_number?.value ?? current.serialNumber,
      estimatedValue: extraction.estimated_value?.value ?? current.estimatedValue,
      purchaseDate: extraction.purchase_date?.value ?? current.purchaseDate,
    }))
    setExtraction(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const item = await createItem(form, rooms, categories)
      const uploadResults = await Promise.allSettled(media.map((entry) => uploadAttachment(item.id, entry.file, entry.attachmentType)))
      await onCreated()
      if (uploadResults.some((result) => result.status === 'rejected')) {
        setCreated(true)
        setError('The item was added, but one or more media files could not be uploaded. Open the item to retry them.')
        return
      }
      onClose()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not add the item.')
    } finally {
      setSaving(false)
    }
  }

  const suggestions: Array<[string, FieldSuggestion]> = []
  if (extraction?.purchase_date) suggestions.push(['Purchase date', extraction.purchase_date])
  if (extraction?.estimated_value) suggestions.push(['Estimated value', extraction.estimated_value])
  if (extraction?.model) suggestions.push(['Model', extraction.model])
  if (extraction?.serial_number) suggestions.push(['Serial number', extraction.serial_number])

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="add-item-title">
        <header className="dialog-header">
          <div><p className="eyebrow">New inventory record</p><h2 id="add-item-title">Add item</h2></div>
          <button className="icon-button" type="button" title="Close" onClick={onClose}><X size={19} /></button>
        </header>
        <form onSubmit={(event) => void submit(event)}>
          <section className="add-item-media" aria-labelledby="add-item-media-title">
            <div className="add-item-media-heading">
              <div><h3 id="add-item-media-title">Media and documents</h3><p>Attach photos, receipts, or warranty records to this item.</p></div>
              <div className="add-item-media-actions">
                <AppSelect ariaLabel="Media type" value={attachmentType} onChange={(value) => setAttachmentType(value as Attachment['attachment_type'])} options={attachmentTypeOptions} />
                <input ref={fileInput} hidden type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => event.target.files && addMedia(event.target.files)} />
                <button className="small-button" type="button" disabled={created} onClick={() => fileInput.current?.click()}><ImagePlus size={16} />Add media</button>
              </div>
            </div>
            <p className="media-privacy"><ShieldCheck size={16} />Files and receipt scans stay on this device. Useful additions include clear item photos, dated receipts, serial-number labels, and warranty documents. JPEG, PNG, WebP, and PDF files up to 10 MB are supported.</p>
            {media.length > 0 && <div className="staged-media-list">{media.map((entry) => <div className="staged-media-row" key={entry.id}><FileText size={17} /><span>{entry.file.name}</span><small>{attachmentTypeOptions.find((option) => option.value === entry.attachmentType)?.label}</small><button className="icon-button danger-button" type="button" title={`Remove ${entry.file.name}`} disabled={created} onClick={() => setMedia((current) => current.filter((candidate) => candidate.id !== entry.id))}><Trash2 size={15} /></button></div>)}</div>}
            {scanning && <p className="scan-status"><ScanText size={15} />Scanning receipt locally...</p>}
            {extraction && <div className="extraction-review add-item-extraction"><div><strong>Receipt suggestions</strong><span>Review before applying them to this item.</span></div>{suggestions.length ? <dl>{suggestions.map(([label, suggestion]) => <div key={label}><dt>{label}</dt><dd>{suggestion.value}<span>{Math.round(suggestion.confidence * 100)}%</span></dd></div>)}</dl> : <p>No item details were recognised. The receipt can still be attached.</p>}{suggestions.length > 0 && <button className="small-button ai-button" type="button" onClick={applySuggestions}><ScanText size={16} />Apply suggestions</button>}</div>}
          </section>
          <div className="form-grid">
            <label className="full-field">Item name<input autoFocus required disabled={created} maxLength={200} value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
            <label>Room<input required list="room-options" maxLength={100} value={form.roomName} onChange={(event) => update('roomName', event.target.value)} placeholder="Choose or create" /></label>
            <label>Category<input required list="category-options" maxLength={100} value={form.categoryName} onChange={(event) => update('categoryName', event.target.value)} placeholder="Choose or create" /></label>
            <datalist id="room-options">{rooms.map((room) => <option key={room.id} value={room.name} />)}</datalist>
            <datalist id="category-options">{categories.map((category) => <option key={category.id} value={category.name} />)}</datalist>
            <label>Brand<input maxLength={100} value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
            <label>Model<input maxLength={100} value={form.model} onChange={(event) => update('model', event.target.value)} /></label>
            <label>Serial number<input maxLength={100} value={form.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} /></label>
            <label>Estimated value<input min="0" step="0.01" type="number" value={form.estimatedValue} onChange={(event) => update('estimatedValue', event.target.value)} /></label>
            <label>Purchase date<input type="date" value={form.purchaseDate} onChange={(event) => update('purchaseDate', event.target.value)} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>{created ? 'Close' : 'Cancel'}</button>
            <button className="primary-button" type="submit" disabled={saving || created}><Plus size={18} />{saving ? 'Adding...' : created ? 'Item added' : 'Add item'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
