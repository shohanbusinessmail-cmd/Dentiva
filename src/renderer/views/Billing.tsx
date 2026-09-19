import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Billing({ initialFilter, navigate }: Props) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterRange, setFilterRange] = React.useState('1m');
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [viewing, setViewing] = React.useState<any | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const range = filterRange === 'today' ? { from: todayISO(), to: todayISO() }
        : filterRange === '7d' ? { from: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], to: todayISO() }
        : filterRange === '1m' ? { from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], to: todayISO() }
        : filterRange === '3m' ? { from: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], to: todayISO() }
        : filterRange === '1y' ? { from: new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0], to: todayISO() }
        : { from: '1970-01-01', to: todayISO() };
      const r = await window.api.invoice.list(range);
      setList(r || []);
    } finally { setLoading(false); }
  }, [filterRange]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (initialFilter?.openNew) {
      setEditing(null);
      setShowForm(true);
    }
    if (initialFilter?.openInvoice) {
      window.api.invoice.get(initialFilter.openInvoice).then(setViewing);
    }
  }, [initialFilter]);

  const handleDelete = async (inv: any) => {
    const ok = await confirm({
      title: 'Delete invoice?',
      message: `Permanently delete invoice ${inv.invoice_number}?`,
      danger: true
    });
    if (!ok) return;
    await window.api.invoice.delete(inv.id);
    toast('Invoice deleted', 'success');
    load();
  };

  const totalBilled = list.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid = list.reduce((s, i) => s + (i.paid || 0), 0);
  const totalDue = list.reduce((s, i) => s + (i.due || 0), 0);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_billing')}</h1>
          <p className="page-subtitle">{list.length} {t('common_invoice').toLowerCase()} • {formatMoney(totalBilled)}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={async () => {
            const p = await window.api.io.exportInvoices({ from: '1970-01-01', to: todayISO() });
            if (p) toast(t('msg_export_done') + ': ' + p, 'success');
          }}>
            <Icon name="download" size={14} /> {t('common_export')}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> {t('invoice_new')}
          </button>
        </div>
      </div>

      <div className="metric-grid">
        <MetricMini icon="billing" label={t('common_total')} value={formatMoney(totalBilled)} />
        <MetricMini icon="check" label={t('common_paid')} value={formatMoney(totalPaid)} valueColor="var(--color-success)" />
        <MetricMini icon="warning" label={t('common_due')} value={formatMoney(totalDue)} valueColor="var(--color-danger)" />
        <MetricMini icon="list" label="Count" value={list.length} />
      </div>

      <div className="filter-bar">
        <div className="range-tabs">
          {['today', '7d', '1m', '3m', '1y'].map(r => (
            <button key={r} className={filterRange === r ? 'active' : ''} onClick={() => setFilterRange(r)}>{t('range_' + r)}</button>
          ))}
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : list.length === 0 ? (
          <div className="card">
            <EmptyState icon="billing" title={t('empty_invoices_title')} description={t('empty_invoices_desc')}
              action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('invoice_new')}</button>}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('invoice_number')}</th>
                    <th>{t('common_date')}</th>
                    <th>{t('common_patient')}</th>
                    <th className="num">{t('common_total')}</th>
                    <th className="num">{t('common_paid')}</th>
                    <th className="num">{t('common_due')}</th>
                    <th>{t('common_status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(inv => (
                    <tr key={inv.id} className="clickable" onClick={() => window.api.invoice.get(inv.id).then(setViewing)}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{inv.invoice_number}</td>
                      <td>{formatDate(inv.invoice_date)}</td>
                      <td>{inv.patient_name} <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({inv.patient_code})</span></td>
                      <td className="num">{formatMoney(inv.total)}</td>
                      <td className="num">{formatMoney(inv.paid)}</td>
                      <td className="num">{formatMoney(inv.due)}</td>
                      <td><span className={`status-pill status-${inv.status}`}>{inv.status}</span></td>
                      <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => window.api.print.invoice(inv.id)} title="Print"><Icon name="print" size={14} /></button>
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => window.api.pdf.invoice(inv.id)} title="PDF"><Icon name="pdf" size={14} /></button>
                        {inv.due > 0 && (
                          <button className="btn-icon btn-sm btn-ghost" onClick={() => navigate('payment-new', { invoiceId: inv.id, patientId: inv.patient_id })} title="Record Payment">
                            <Icon name="cash" size={14} />
                          </button>
                        )}
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(inv)} title="Delete"><Icon name="trash" size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {showForm && <InvoiceForm open={showForm} invoice={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {viewing && <InvoiceViewer invoice={viewing} onClose={() => setViewing(null)} />}
      {dialog}
    </div>
  );
}

function MetricMini({ icon, label, value, valueColor }: { icon: string; label: string; value: any; valueColor?: string }) {
  return (
    <div className="metric-card">
      <div className="label"><Icon name={icon} size={12} /> {label}</div>
      <div className="value" style={valueColor ? { color: valueColor, fontSize: 22 } : { fontSize: 22 }}>{value}</div>
    </div>
  );
}

function InvoiceForm({ open, invoice, onClose, onSaved }: { open: boolean; invoice: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [items, setItems] = React.useState<any[]>([{ description: '', quantity: 1, unit_price: 0, discount: 0, tax: 0 }]);
  const [patientQuery, setPatientQuery] = React.useState('');
  const [patients, setPatients] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (!open) return;
    if (invoice) {
      setForm({ ...invoice });
      window.api.invoice.get(invoice.id).then(inv => {
        setItems(inv.items || []);
        setSelectedPatient({ id: inv.patient_id, name: inv.patient?.name, code: inv.patient?.code });
      });
    } else {
      setForm({ invoice_date: todayISO(), due_date: '', notes: '', terms: '' });
      setItems([{ description: '', quantity: 1, unit_price: 0, discount: 0, tax: 0 }]);
      setSelectedPatient(null);
    }
  }, [open, invoice]);

  React.useEffect(() => {
    if (patientQuery.length < 2) { setPatients([]); return; }
    window.api.patient.search(patientQuery).then(setPatients);
  }, [patientQuery]);

  const updateItem = (i: number, k: string, v: any) => setItems(prev => prev.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addItem = () => setItems([...items, { description: '', quantity: 1, unit_price: 0, discount: 0, tax: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, i) => s + (i.quantity || 1) * (i.unit_price || 0), 0);
  const discount = items.reduce((s, i) => s + (i.discount || 0), 0);
  const tax = items.reduce((s, i) => s + (i.tax || 0), 0);
  const total = subtotal - discount + tax;

  const save = async () => {
    if (!selectedPatient) { toast(t('msg_select_patient'), 'warning'); return; }
    try {
      const payload = {
        ...form,
        patient_id: selectedPatient.id,
        items
      };
      if (invoice) await window.api.invoice.update(invoice.id, payload);
      else await window.api.invoice.create(payload);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invoice ? t('invoice_edit') : t('invoice_new')}
      size="xl"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}
    >
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">{t('common_patient')} <span className="req">*</span></label>
          {selectedPatient ? (
            <div style={{ padding: '8px 12px', background: 'var(--color-primary-light)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span><strong>{selectedPatient.name}</strong> ({selectedPatient.code})</span>
              <button className="btn-icon btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}><Icon name="close" size={14} /></button>
            </div>
          ) : (
            <>
              <input className="form-input" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} placeholder="Search patient" />
              {patients.length > 0 && (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {patients.map(p => (
                    <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setSelectedPatient(p); setPatientQuery(''); setPatients([]); }}>
                      <strong>{p.name}</strong> ({p.code})
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('invoice_date')}</label>
            <input type="date" className="form-input" value={form.invoice_date || ''} onChange={(e) => setForm({ ...form, invoice_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('invoice_due_date')}</label>
            <input type="date" className="form-input" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, marginTop: 20, marginBottom: 10 }}>{t('invoice_services')}</h3>
      <div className="line-item-row header">
        <div>Description</div>
        <div className="num">Qty</div>
        <div className="num">Unit Price</div>
        <div className="num">Total</div>
      </div>
      {items.map((item, i) => (
        <div key={i} className="line-item-row">
          <div>
            <input className="form-input" placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
          </div>
          <div><input type="number" step="0.01" className="form-input" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', parseFloat(e.target.value) || 1)} /></div>
          <div><input type="number" step="0.01" className="form-input" value={item.unit_price} onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} /></div>
          <div style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatMoney((item.quantity || 1) * (item.unit_price || 0) - (item.discount || 0))}</div>
        </div>
      ))}
      <button className="btn btn-sm btn-secondary mt-2" onClick={addItem}><Icon name="plus" size={12} /> {t('invoice_add_item')}</button>

      <div className="totals-section" style={{ marginTop: 20 }}>
        <div className="totals">
          <div className="row"><span className="label">{t('common_subtotal')}</span><span className="val">{formatMoney(subtotal)}</span></div>
          {discount > 0 && <div className="row"><span className="label">{t('common_discount')}</span><span className="val">-{formatMoney(discount)}</span></div>}
          {tax > 0 && <div className="row"><span className="label">{t('common_tax')}</span><span className="val">{formatMoney(tax)}</span></div>}
          <div className="row grand"><span className="label">{t('common_total')}</span><span className="val">{formatMoney(total)}</span></div>
        </div>
      </div>

      <div className="form-group mt-4">
        <label className="form-label">{t('invoice_terms')}</label>
        <textarea className="form-textarea" rows={2} value={form.terms || ''} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

function InvoiceViewer({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const t = useT();
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Invoice ${invoice.invoice_number}`}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_close')}</button>
          <button className="btn btn-secondary" onClick={() => window.api.print.invoice(invoice.id)}>
            <Icon name="print" size={14} /> {t('common_print')}
          </button>
          <button className="btn btn-primary" onClick={() => window.api.pdf.invoice(invoice.id)}>
            <Icon name="pdf" size={14} /> {t('common_pdf')}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <div><strong>Patient:</strong> {invoice.patient?.name} ({invoice.patient?.code})</div>
        <div><strong>Date:</strong> {formatDate(invoice.invoice_date)}</div>
        <div><strong>Status:</strong> <span className={`status-pill status-${invoice.status}`}>{invoice.status}</span></div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Description</th>
            <th className="num">Qty</th>
            <th className="num">Unit</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((it: any) => (
            <tr key={it.id}>
              <td>{it.description}</td>
              <td className="num">{it.quantity}</td>
              <td className="num">{formatMoney(it.unit_price)}</td>
              <td className="num">{formatMoney(it.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="totals-section" style={{ marginTop: 16 }}>
        <div className="totals">
          <div className="row"><span className="label">{t('common_subtotal')}</span><span className="val">{formatMoney(invoice.subtotal)}</span></div>
          {invoice.discount > 0 && <div className="row"><span className="label">{t('common_discount')}</span><span className="val">-{formatMoney(invoice.discount)}</span></div>}
          {invoice.tax > 0 && <div className="row"><span className="label">{t('common_tax')}</span><span className="val">{formatMoney(invoice.tax)}</span></div>}
          <div className="row grand"><span className="label">{t('common_total')}</span><span className="val">{formatMoney(invoice.total)}</span></div>
          {invoice.paid > 0 && <div className="row"><span className="label">{t('common_paid')}</span><span className="val">{formatMoney(invoice.paid)}</span></div>}
          {invoice.due > 0 && <div className="row"><span className="label">{t('common_due')}</span><span className="val" style={{ color: 'var(--color-danger)' }}>{formatMoney(invoice.due)}</span></div>}
        </div>
      </div>
    </Modal>
  );
}