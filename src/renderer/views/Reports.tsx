import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO } from '../utils/format';

export function Reports() {
  const t = useT();
  const [activeTab, setActiveTab] = React.useState('patients');
  const [range, setRange] = React.useState('1m');
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const tabs = [
    { id: 'patients', label: t('reports_patients'), icon: 'patients' },
    { id: 'appointments', label: t('reports_appointments'), icon: 'calendar' },
    { id: 'treatments', label: t('reports_treatments'), icon: 'treatments' },
    { id: 'billing', label: t('reports_billing'), icon: 'billing' },
    { id: 'finance', label: t('reports_finance'), icon: 'finance' },
    { id: 'staff', label: t('reports_staff'), icon: 'staff' }
  ];

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = (window.api.reports as any)[activeTab](range);
      const result = await r;
      setData(result);
    } finally { setLoading(false); }
  }, [activeTab, range]);

  React.useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    if (!data) return;
    let csv = '';
    let filename = `${activeTab}-report.csv`;
    if (activeTab === 'billing' || activeTab === 'finance') {
      window.api.io.exportInvoices({ from: '1970-01-01', to: todayISO() }).then(p => p && toast(t('msg_export_done'), 'success'));
      return;
    }
    if (activeTab === 'patients') {
      window.api.io.exportPatients().then(p => p && toast(t('msg_export_done'), 'success'));
      return;
    }
    toast('Report generated', 'success');
  };

  const printReport = async () => {
    await window.api.print.report(activeTab, getDateRange(range));
    toast('Sent to printer', 'success');
  };

  const savePdf = async () => {
    await window.api.pdf.report(activeTab, getDateRange(range));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_reports')}</h1>
          <p className="page-subtitle">{tabs.find(x => x.id === activeTab)?.label}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={exportCsv}><Icon name="download" size={14} /> {t('common_export')}</button>
          <button className="btn btn-secondary" onClick={printReport}><Icon name="print" size={14} /> {t('common_print')}</button>
          <button className="btn btn-primary" onClick={savePdf}><Icon name="pdf" size={14} /> {t('common_pdf')}</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map(tab => (
          <div key={tab.id} className={`tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
            <Icon name={tab.icon} size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {tab.label}
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <div className="range-tabs">
          {['today', '7d', '1m', '3m', '6m', '1y'].map(r => (
            <button key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{t('range_' + r)}</button>
          ))}
        </div>
      </div>

      {loading || !data ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : <ReportContent type={activeTab} data={data} />}
    </div>
  );
}

function getDateRange(r: string): { from: string; to: string } {
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

function ReportContent({ type, data }: { type: string; data: any }) {
  const t = useT();
  if (type === 'patients') {
    return (
      <div>
        <div className="metric-grid">
          <MetricMini icon="patients" label="Total Patients" value={data.total_count || 0} />
          <MetricMini icon="user" label="New" value={(data.new_patients || []).length} />
          <MetricMini icon="refresh" label="Returning" value={(data.returning || []).length} />
        </div>
        <div className="card card-elevated">
          <h3 className="card-title">New Patients</h3>
          <table className="table">
            <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Registered</th></tr></thead>
            <tbody>{(data.new_patients || []).slice(0, 50).map((p: any) => (
              <tr key={p.id}><td>{p.code}</td><td>{p.name}</td><td>{p.phone || '-'}</td><td>{formatDate(p.registered_at)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }
  if (type === 'appointments') {
    const sm = data.summary || {};
    return (
      <div>
        <div className="metric-grid">
          <MetricMini icon="calendar" label="Total" value={sm.total || 0} />
          <MetricMini icon="check" label="Completed" value={sm.completed || 0} />
          <MetricMini icon="close" label="Cancelled" value={sm.cancelled || 0} />
          <MetricMini icon="warning" label="No-show" value={sm.no_show || 0} />
        </div>
        <div className="card card-elevated">
          <table className="table">
            <thead><tr><th>Date</th><th>Serial</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
            <tbody>{(data.list || []).slice(0, 100).map((a: any) => (
              <tr key={a.id}><td>{formatDate(a.appointment_date)}</td><td>{a.serial_number}</td><td>{a.patient_name}</td><td>{a.reason || '-'}</td><td><span className={`status-pill status-${a.status}`}>{a.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }
  if (type === 'billing') {
    const sm = data.summary || {};
    return (
      <div>
        <div className="metric-grid">
          <MetricMini icon="list" label="Total" value={sm.total_invoices || 0} />
          <MetricMini icon="money" label="Billed" value={formatMoney(sm.total_amount || 0)} />
          <MetricMini icon="check" label="Paid" value={formatMoney(sm.total_paid || 0)} />
          <MetricMini icon="warning" label="Due" value={formatMoney(sm.total_due || 0)} />
        </div>
        <div className="card card-elevated">
          <table className="table">
            <thead><tr><th>Number</th><th>Date</th><th>Patient</th><th className="num">Total</th><th className="num">Paid</th><th>Status</th></tr></thead>
            <tbody>{(data.list || []).slice(0, 100).map((i: any) => (
              <tr key={i.id}><td>{i.invoice_number}</td><td>{formatDate(i.invoice_date)}</td><td>{i.patient_name}</td><td className="num">{formatMoney(i.total)}</td><td className="num">{formatMoney(i.paid)}</td><td><span className={`status-pill status-${i.status}`}>{i.status}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }
  if (type === 'finance') {
    return (
      <div>
        <div className="metric-grid">
          <MetricMini icon="money" label="Income" value={formatMoney(data.income || 0)} valueColor="var(--color-success)" />
          <MetricMini icon="warning" label="Expenses" value={formatMoney(data.expenses || 0)} valueColor="var(--color-danger)" />
          <MetricMini icon="chart" label="Net" value={formatMoney(data.net || 0)} valueColor={(data.net || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'} />
          <MetricMini icon="cash" label="Outstanding" value={formatMoney(data.outstanding || 0)} />
        </div>
        <div className="section-grid">
          <div className="card card-elevated">
            <h3 className="card-title">By Payment Method</h3>
            <table className="table">
              <thead><tr><th>Method</th><th className="num">Amount</th></tr></thead>
              <tbody>{(data.by_payment_method || []).map((m: any, i: number) => (
                <tr key={i}><td>{m.method}</td><td className="num">{formatMoney(m.total)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="card card-elevated">
            <h3 className="card-title">By Expense Category</h3>
            <table className="table">
              <thead><tr><th>Category</th><th className="num">Amount</th></tr></thead>
              <tbody>{(data.by_expense_category || []).map((c: any, i: number) => (
                <tr key={i}><td>{c.category}</td><td className="num">{formatMoney(c.total)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  if (type === 'staff') {
    return (
      <div>
        <div className="card card-elevated">
          <h3 className="card-title">Staff</h3>
          <table className="table">
            <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Phone</th><th className="num">Salary</th></tr></thead>
            <tbody>{(data.list || []).map((s: any) => (
              <tr key={s.id}><td>{s.staff_id}</td><td>{s.name}</td><td>{s.role || '-'}</td><td>{s.phone || '-'}</td><td className="num">{formatMoney(s.salary)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );
  }
  return null;
}

function MetricMini({ icon, label, value, valueColor }: { icon: string; label: string; value: any; valueColor?: string }) {
  return (
    <div className="metric-card">
      <div className="label"><Icon name={icon} size={12} /> {label}</div>
      <div className="value" style={valueColor ? { color: valueColor, fontSize: 22 } : { fontSize: 22 }}>{value}</div>
    </div>
  );
}