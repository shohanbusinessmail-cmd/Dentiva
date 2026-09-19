import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO } from '../utils/format';

export function Finance({ initialFilter }: { navigate: any; initialFilter?: any }) {
  const t = useT();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState('1m');
  const [showExpenseForm, setShowExpenseForm] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<any | null>(null);
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = (window.api.reports as any).finance(getRange(range));
      setData(await r);
    } finally { setLoading(false); }
  }, [range]);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (initialFilter?.openNew) { setEditingExpense(null); setShowExpenseForm(true); } }, [initialFilter]);

  const handleDeleteExpense = async (e: any) => {
    const ok = await confirm({ title: 'Delete expense?', message: `Permanently delete this ${formatMoney(e.amount)} expense?`, danger: true });
    if (!ok) return;
    await window.api.expense.delete(e.id);
    load();
  };

  if (loading || !data) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_finance')}</h1>
          <p className="page-subtitle">Income, expenses, and net operating position</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={async () => {
            const p = await window.api.io.exportFinance(getRange(range));
            if (p) toast(t('msg_export_done') + ': ' + p, 'success');
          }}><Icon name="download" size={14} /> Export</button>
          <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setShowExpenseForm(true); }}>
            <Icon name="plus" size={14} /> {t('expense_new')}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <div className="range-tabs">
          {['today', '7d', '1m', '3m', '6m', '1y'].map(r => (
            <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{t('range_' + r)}</button>
          ))}
        </div>
      </div>

      <div className="metric-grid">
        <MetricMini icon="money" label="Income" value={formatMoney(data.income || 0)} valueColor="var(--color-success)" />
        <MetricMini icon="warning" label="Expenses" value={formatMoney(data.expenses || 0)} valueColor="var(--color-danger)" />
        <MetricMini icon="chart" label="Net" value={formatMoney(data.net || 0)} valueColor={(data.net || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
        <MetricMini icon="cash" label="Outstanding" value={formatMoney(data.outstanding || 0)} valueColor="var(--color-warning)" />
      </div>

      <div className="section-grid">
        <div className="card card-elevated">
          <h3 className="card-title">Income by Payment Method</h3>
          <table className="table">
            <thead><tr><th>Method</th><th className="num">Amount</th></tr></thead>
            <tbody>{(data.by_payment_method || []).length === 0 ? <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No income</td></tr> : (data.by_payment_method || []).map((m: any, i: number) => (
              <tr key={i}><td><span className="badge badge-neutral">{m.method}</span></td><td className="num">{formatMoney(m.total)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div className="card card-elevated">
          <h3 className="card-title">Expenses by Category</h3>
          <table className="table">
            <thead><tr><th>Category</th><th className="num">Amount</th></tr></thead>
            <tbody>{(data.by_expense_category || []).length === 0 ? <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No expenses</td></tr> : (data.by_expense_category || []).map((c: any, i: number) => (
              <tr key={i}><td>{c.category}</td><td className="num">{formatMoney(c.total)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="section-grid">
        <div className="card card-elevated">
          <h3 className="card-title">Income</h3>
          {(data.payments || []).length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>No income</p> : (
            <table className="table">
              <thead><tr><th>Date</th><th>Receipt</th><th>Patient</th><th className="num">Amount</th></tr></thead>
              <tbody>{data.payments.slice(0, 30).map((p: any) => (
                <tr key={p.id}><td>{formatDate(p.payment_date)}</td><td>{p.receipt_number}</td><td>{p.patient_name}</td><td className="num">{formatMoney(p.amount)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
        <div className="card card-elevated">
          <h3 className="card-title">Expenses</h3>
          {(data.expense_list || []).length === 0 ? <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 20 }}>No expenses</p> : (
            <table className="table">
              <thead><tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th><th></th></tr></thead>
              <tbody>{data.expense_list.slice(0, 30).map((e: any) => (
                <tr key={e.id}>
                  <td>{formatDate(e.expense_date)}</td>
                  <td>{e.category}</td>
                  <td>{e.description || '-'}</td>
                  <td className="num">{formatMoney(e.amount)}</td>
                  <td className="actions-cell">
                    <button className="btn-icon btn-sm btn-ghost" onClick={() => { setEditingExpense(e); setShowExpenseForm(true); }}><Icon name="edit" size={12} /></button>
                    <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDeleteExpense(e)}><Icon name="trash" size={12} /></button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      </div>

      <ExpenseForm open={showExpenseForm} expense={editingExpense} onClose={() => setShowExpenseForm(false)} onSaved={() => { setShowExpenseForm(false); load(); }} />
      {dialog}
    </div>
  );
}

function getRange(r: string) {
  const now = new Date();
  let from = new Date();
  if (r === 'today') from.setHours(0, 0, 0, 0);
  else if (r === '7d') from.setDate(now.getDate() - 7);
  else if (r === '1m') from.setMonth(now.getMonth() - 1);
  else if (r === '3m') from.setMonth(now.getMonth() - 3);
  else if (r === '6m') from.setMonth(now.getMonth() - 6);
  else if (r === '1y') from.setFullYear(now.getFullYear() - 1);
  return { from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
}

function MetricMini({ icon, label, value, valueColor }: { icon: string; label: string; value: any; valueColor?: string }) {
  return (
    <div className="metric-card">
      <div className="label"><Icon name={icon} size={12} /> {label}</div>
      <div className="value" style={valueColor ? { color: valueColor, fontSize: 22 } : { fontSize: 22 }}>{value}</div>
    </div>
  );
}

function ExpenseForm({ open, expense, onClose, onSaved }: { open: boolean; expense: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});
  React.useEffect(() => {
    if (!open) return;
    if (expense) setForm({ ...expense });
    else setForm({ expense_date: todayISO(), category: '', description: '', amount: 0, payment_method: 'cash', reference: '', notes: '' });
  }, [open, expense]);

  const save = async () => {
    if (!form.category || !form.amount) { toast('Category and amount required', 'warning'); return; }
    try {
      if (expense) await window.api.expense.update(expense.id, form);
      else await window.api.expense.create(form);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('expense_new')} size="md"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_date')}</label>
          <input type="date" className="form-input" value={form.expense_date || ''} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_category')} <span className="req">*</span></label>
          <select className="form-select" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option value="">-</option>
            <option value="Clinic Rent">{t('expense_category_rent')}</option>
            <option value="Electricity">{t('expense_category_electricity')}</option>
            <option value="Water">{t('expense_category_water')}</option>
            <option value="Internet">{t('expense_category_internet')}</option>
            <option value="Staff Salaries">{t('expense_category_salaries')}</option>
            <option value="Supplies">{t('expense_category_supplies')}</option>
            <option value="Dental Materials">{t('expense_category_materials')}</option>
            <option value="Laboratory">{t('expense_category_lab')}</option>
            <option value="Equipment">{t('expense_category_equipment')}</option>
            <option value="Maintenance">{t('expense_category_maintenance')}</option>
            <option value="Marketing">{t('expense_category_marketing')}</option>
            <option value="Transportation">{t('expense_category_transport')}</option>
            <option value="Other">{t('expense_category_other')}</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <input className="form-input" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_amount')} <span className="req">*</span></label>
          <input type="number" step="0.01" className="form-input" value={form.amount || 0} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_payment_method')}</label>
          <select className="form-select" value={form.payment_method || 'cash'} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            <option value="cash">{t('common_cash')}</option>
            <option value="bank">{t('common_bank')}</option>
            <option value="card">{t('common_card')}</option>
            <option value="mfs">{t('common_mfs')}</option>
            <option value="other">{t('common_other')}</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Reference</label>
        <input className="form-input" value={form.reference || ''} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}