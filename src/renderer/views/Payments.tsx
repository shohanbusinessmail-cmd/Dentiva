import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT, getLang } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO, paymentMethodLabel } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Payments({ initialFilter }: Props) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterRange, setFilterRange] = React.useState('1m');
  const [showForm, setShowForm] = React.useState(false);
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
      const r = await window.api.payment.list(range);
      setList(r || []);
    } finally { setLoading(false); }
  }, [filterRange]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (initialFilter?.openNew) setShowForm(true);
  }, [initialFilter]);

  const handleDelete = async (p: any) => {
    const ok = await confirm({ title: 'Delete payment?', message: `Permanently delete receipt ${p.receipt_number}? This will update the invoice balance.`, danger: true });
    if (!ok) return;
    await window.api.payment.delete(p.id);
    toast('Payment deleted', 'success');
    load();
  };

  const total = list.reduce((s, p) => s + (p.amount || 0), 0);
  const lang = getLang();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_payments')}</h1>
          <p className="page-subtitle">{list.length} {t('common_receipt').toLowerCase()} • {formatMoney(total)}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Icon name="plus" size={14} /> {t('payment_new')}
          </button>
        </div>
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
            <EmptyState icon="cash" title={t('empty_payments_title')} description={t('empty_payments_desc')}
              action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('payment_new')}</button>}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Receipt #</th>
                    <th>{t('common_date')}</th>
                    <th>{t('common_patient')}</th>
                    <th>{t('common_payment_method')}</th>
                    <th>Invoice</th>
                    <th className="num">{t('common_amount')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.receipt_number}</td>
                      <td>{formatDate(p.payment_date)}</td>
                      <td>{p.patient_name} <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({p.patient_code})</span></td>
                      <td><span className="badge badge-neutral">{paymentMethodLabel(p.method, lang)}</span></td>
                      <td>{p.invoice_number || '-'}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{formatMoney(p.amount)}</td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => window.api.print.receipt(p.id)} title="Print"><Icon name="print" size={14} /></button>
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => window.api.pdf.receipt(p.id)} title="PDF"><Icon name="pdf" size={14} /></button>
                        <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(p)} title="Delete"><Icon name="trash" size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <PaymentForm open={showForm} initialPatientId={initialFilter?.patientId} initialInvoiceId={initialFilter?.invoiceId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      {dialog}
    </div>
  );
}

function PaymentForm({ open, initialPatientId, initialInvoiceId, onClose, onSaved }: { open: boolean; initialPatientId?: number; initialInvoiceId?: number; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [patientQuery, setPatientQuery] = React.useState('');
  const [patients, setPatients] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null);
  const [invoices, setInvoices] = React.useState<any[]>([]);
  const [form, setForm] = React.useState<any>({ payment_date: todayISO(), method: 'cash', amount: 0 });

  React.useEffect(() => {
    if (!open) return;
    setForm({ payment_date: todayISO(), method: 'cash', amount: 0, transaction_id: '', reference: '', notes: '' });
    setSelectedPatient(null);
    setSelectedInvoice(null);
    if (initialPatientId) {
      window.api.patient.get(initialPatientId).then(p => {
        if (p) setSelectedPatient({ id: p.id, name: p.name, code: p.code });
      });
    }
    if (initialInvoiceId) {
      window.api.invoice.get(initialInvoiceId).then(inv => {
        if (inv) {
          setSelectedInvoice(inv);
          setForm((f: any) => ({ ...f, amount: inv.due || 0 }));
          setSelectedPatient({ id: inv.patient_id, name: inv.patient?.name, code: inv.patient?.code });
        }
      });
    }
  }, [open, initialPatientId, initialInvoiceId]);

  React.useEffect(() => {
    if (patientQuery.length < 2) { setPatients([]); return; }
    window.api.patient.search(patientQuery).then(setPatients);
  }, [patientQuery]);

  React.useEffect(() => {
    if (!selectedPatient) { setInvoices([]); return; }
    window.api.invoice.list({ patientId: selectedPatient.id }).then(r => {
      setInvoices((r || []).filter((i: any) => i.due > 0));
    });
  }, [selectedPatient]);

  const save = async () => {
    if (!selectedPatient) { toast(t('msg_select_patient'), 'warning'); return; }
    if (!form.amount || form.amount <= 0) { toast(t('msg_invalid_amount'), 'warning'); return; }
    if (selectedInvoice && form.amount > selectedInvoice.due + 0.01) { toast(t('msg_payment_exceeds'), 'error'); return; }
    try {
      await window.api.payment.create({
        patient_id: selectedPatient.id,
        invoice_id: selectedInvoice?.id || null,
        payment_date: form.payment_date,
        amount: form.amount,
        method: form.method,
        transaction_id: form.transaction_id,
        reference: form.reference,
        notes: form.notes
      });
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('payment_new')}
      size="md"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}
    >
      <div className="form-group">
        <label className="form-label">{t('common_patient')} <span className="req">*</span></label>
        {selectedPatient ? (
          <div style={{ padding: '8px 12px', background: 'var(--color-primary-light)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{selectedPatient.name}</strong> ({selectedPatient.code})</span>
            <button className="btn-icon btn-sm btn-ghost" onClick={() => { setSelectedPatient(null); setSelectedInvoice(null); setInvoices([]); }}><Icon name="close" size={14} /></button>
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

      <div className="form-group">
        <label className="form-label">Apply to Invoice (optional)</label>
        <select className="form-select" value={selectedInvoice?.id || ''} onChange={(e) => {
          const inv = invoices.find((x: any) => x.id === parseInt(e.target.value));
          setSelectedInvoice(inv || null);
          if (inv) setForm({ ...form, amount: inv.due || 0 });
        }}>
          <option value="">— No invoice —</option>
          {invoices.map((inv: any) => (
            <option key={inv.id} value={inv.id}>{inv.invoice_number} • Due {formatMoney(inv.due)}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_date')}</label>
          <input type="date" className="form-input" value={form.payment_date || ''} onChange={(e) => setForm({ ...form, payment_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_amount')} <span className="req">*</span></label>
          <input type="number" step="0.01" className="form-input" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_payment_method')}</label>
          <select className="form-select" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="cash">{t('common_cash')}</option>
            <option value="bank">{t('common_bank')}</option>
            <option value="card">{t('common_card')}</option>
            <option value="mfs">{t('common_mfs')}</option>
            <option value="other">{t('common_other')}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('payment_transaction')}</label>
          <input className="form-input" value={form.transaction_id || ''} onChange={(e) => setForm({ ...form, transaction_id: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}