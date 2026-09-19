import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO } from '../utils/format';

export function Staff({ initialFilter }: { navigate: any; initialFilter?: any }) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [payingFor, setPayingFor] = React.useState<any | null>(null);
  const [historyFor, setHistoryFor] = React.useState<any | null>(null);
  const [history, setHistory] = React.useState<any[]>([]);
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.api.staff.list();
      setList(r || []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (initialFilter?.openNew) { setEditing(null); setShowForm(true); } }, [initialFilter]);

  React.useEffect(() => {
    if (!historyFor) { setHistory([]); return; }
    window.api.staff.salaries({ staffId: historyFor.id }).then(setHistory);
  }, [historyFor]);

  const handleDelete = async (s: any) => {
    const ok = await confirm({ title: 'Delete staff member?', message: `Permanently delete ${s.name}?`, danger: true });
    if (!ok) return;
    await window.api.staff.delete(s.id);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_staff')}</h1>
          <p className="page-subtitle">{list.length} {t('nav_staff').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> {t('staff_new')}
          </button>
        </div>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : list.length === 0 ? (
          <div className="card"><EmptyState icon="staff" title={t('empty_staff_title')} description={t('empty_staff_desc')} action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('staff_new')}</button>} /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Phone</th>
                  <th>{t('staff_join_date')}</th>
                  <th className="num">{t('staff_salary')}</th>
                  <th>{t('common_status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.staff_id}</td>
                    <td>{s.name}</td>
                    <td>{s.role || '-'}</td>
                    <td>{s.phone || '-'}</td>
                    <td>{formatDate(s.joining_date)}</td>
                    <td className="num">{formatMoney(s.salary)}</td>
                    <td><span className={`badge ${s.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{s.status}</span></td>
                    <td className="actions-cell">
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => setPayingFor(s)} title="Pay Salary"><Icon name="cash" size={14} /></button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => setHistoryFor(s)} title="History"><Icon name="history" size={14} /></button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => { setEditing(s); setShowForm(true); }} title="Edit"><Icon name="edit" size={14} /></button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(s)} title="Delete"><Icon name="trash" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <StaffForm open={showForm} staff={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      {payingFor && <PaySalaryModal staff={payingFor} onClose={() => setPayingFor(null)} onSaved={() => { setPayingFor(null); }} />}
      {historyFor && (
        <Modal open={true} onClose={() => setHistoryFor(null)} title={`${historyFor.name} - Salary History`} size="md" footer={<button className="btn btn-secondary" onClick={() => setHistoryFor(null)}>{t('common_close')}</button>}>
          {history.length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No salary payments</p> : (
            <table className="table">
              <thead><tr><th>Date</th><th>Period</th><th>Method</th><th className="num">Amount</th></tr></thead>
              <tbody>{history.map(h => (
                <tr key={h.id}><td>{formatDate(h.payment_date)}</td><td>{h.period || '-'}</td><td>{h.method}</td><td className="num">{formatMoney(h.amount)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Modal>
      )}
      {dialog}
    </div>
  );
}

function StaffForm({ open, staff, onClose, onSaved }: { open: boolean; staff: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});
  React.useEffect(() => {
    if (!open) return;
    if (staff) setForm({ ...staff });
    else setForm({ name: '', role: '', phone: '', email: '', address: '', joining_date: todayISO(), salary: 0, salary_frequency: 'monthly', status: 'active', responsibilities: '', notes: '' });
  }, [open, staff]);

  const save = async () => {
    if (!form.name) { toast('Name required', 'warning'); return; }
    try {
      if (staff) await window.api.staff.update(staff.id, form);
      else await window.api.staff.create(form);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={staff ? t('staff_edit') : t('staff_new')} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_name')} <span className="req">*</span></label>
          <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('staff_role')}</label>
          <select className="form-select" value={form.role || ''} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="">-</option>
            <option value="Receptionist">{t('staff_role_receptionist')}</option>
            <option value="Dental Assistant">{t('staff_role_assistant')}</option>
            <option value="Hygienist">{t('staff_role_hygienist')}</option>
            <option value="Cleaner">{t('staff_role_cleaner')}</option>
            <option value="Manager">{t('staff_role_manager')}</option>
            <option value="Accountant">{t('staff_role_accountant')}</option>
            <option value="Other">{t('staff_role_other')}</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_phone')}</label>
          <input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_email')}</label>
          <input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_address')}</label>
        <input className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">Responsibilities</label>
        <textarea className="form-textarea" rows={2} value={form.responsibilities || ''} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} />
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('staff_join_date')}</label>
          <input type="date" className="form-input" value={form.joining_date || ''} onChange={(e) => setForm({ ...form, joining_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('staff_salary')}</label>
          <input type="number" step="0.01" className="form-input" value={form.salary || 0} onChange={(e) => setForm({ ...form, salary: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('staff_frequency')}</label>
          <select className="form-select" value={form.salary_frequency} onChange={(e) => setForm({ ...form, salary_frequency: e.target.value })}>
            <option value="monthly">{t('staff_freq_monthly')}</option>
            <option value="weekly">{t('staff_freq_weekly')}</option>
            <option value="daily">{t('staff_freq_daily')}</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_status')}</label>
        <select className="form-select" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">{t('staff_status_active')}</option>
          <option value="inactive">{t('staff_status_inactive')}</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

function PaySalaryModal({ staff, onClose, onSaved }: { staff: any; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({ amount: staff.salary || 0, method: 'cash', period: '' });

  const save = async () => {
    try {
      await window.api.staff.paySalary({ staff_id: staff.id, amount: form.amount, method: form.method, period: form.period, reference: form.reference, payment_date: todayISO() });
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Pay Salary: ${staff.name}`} size="md"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_amount')}</label>
          <input type="number" step="0.01" className="form-input" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
        </div>
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
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Period (e.g. Jan 2026)</label>
          <input className="form-input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Reference</label>
          <input className="form-input" value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}