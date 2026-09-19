import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, toast } from '../state/toast';
import { formatDate, formatMoney, formatDateTime, ageFromDOB, genderLabel, initials } from '../utils/format';

interface Props { patientId: number; navigate: (v: string, f?: any) => void; }

export function PatientProfile({ patientId, navigate }: Props) {
  const t = useT();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('overview');
  const [timeline, setTimeline] = React.useState<any[]>([]);
  const [editingTooth, setEditingTooth] = React.useState<any | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [p, tl] = await Promise.all([
        window.api.patient.get(patientId),
        window.api.patient.timeline(patientId)
      ]);
      setData(p);
      setTimeline(tl);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  React.useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner spinner-lg" /></div>;
  }

  const outstanding = (data.invoices?.reduce((s: number, i: any) => s + (i.due || 0), 0)) || 0;
  const age = data.age || (data.date_of_birth ? ageFromDOB(data.date_of_birth) : '-');

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('patients')} style={{ marginBottom: 16 }}>
        <Icon name="back" size={14} /> {t('common_back')} {t('nav_patients').toLowerCase()}
      </button>

      <div className="patient-header">
        <div className="patient-avatar">{initials(data.name)}</div>
        <div className="patient-info" style={{ flex: 1 }}>
          <h2>{data.name}</h2>
          <div className="meta">
            {data.code} • {genderLabel(data.gender)} • {data.date_of_birth ? `${age} yrs` : '-'} {data.phone ? `• ${data.phone}` : ''}
          </div>
          {data.alerts && (
            <div className="alerts">
              <span className="badge badge-danger">⚠ {data.alerts}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('appointment-new', { patientId })}>
            <Icon name="plus" size={14} /> {t('appt_new')}
          </button>
          <button className="btn btn-primary" onClick={() => navigate('visit-new', { patientId })}>
            <Icon name="visits" size={14} /> {t('qa_start_visit')}
          </button>
        </div>
      </div>

      {/* Stat row */}
      <div className="metric-grid" style={{ marginBottom: 20 }}>
        <MetricMini icon="visits" label={t('patient_total_visits')} value={timeline.filter(t => t.label === t('nav_visits')).length || '—'} />
        <MetricMini icon="billing" label={t('patient_outstanding')} value={formatMoney(outstanding)} valueColor={outstanding > 0 ? 'var(--color-danger)' : undefined} />
        <MetricMini icon="prescription" label={t('patient_prescription_history')} value={timeline.filter(t => t.label === t('nav_prescriptions')).length || '0'} />
        <MetricMini icon="payment" label={t('patient_payments')} value={timeline.filter(t => t.label === t('nav_payments')).length || '0'} />
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>{t('patient_overview')}</div>
        <div className={`tab ${tab === 'chart' ? 'active' : ''}`} onClick={() => setTab('chart')}>{t('patient_dental_chart')}</div>
        <div className={`tab ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>{t('patient_timeline')}</div>
        <div className={`tab ${tab === 'invoices' ? 'active' : ''}`} onClick={() => setTab('invoices')}>{t('patient_invoices')}</div>
      </div>

      {tab === 'overview' && <OverviewTab patient={data} />}
      {tab === 'chart' && <DentalChartView patient={data} onEdit={(tooth: any) => setEditingTooth(tooth)} />}
      {tab === 'timeline' && <TimelineView items={timeline} />}
      {tab === 'invoices' && <PatientInvoices patientId={patientId} navigate={navigate} />}

      {editingTooth && (
        <ToothEditor
          patientId={patientId}
          tooth={editingTooth}
          onClose={() => setEditingTooth(null)}
          onSaved={() => { setEditingTooth(null); load(); }}
        />
      )}
    </div>
  );
}

function MetricMini({ icon, label, value, valueColor }: { icon: string; label: string; value: any; valueColor?: string }) {
  return (
    <div className="metric-card">
      <div className="label"><Icon name={icon} size={12} /> {label}</div>
      <div className="value" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
    </div>
  );
}

function OverviewTab({ patient }: { patient: any }) {
  const t = useT();
  return (
    <div className="section-grid">
      <div className="card card-elevated">
        <h3 className="card-title">{t('patient_contact')}</h3>
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Row label={t('common_phone')} value={patient.phone || '-'} />
          <Row label={t('setup_alt_phone')} value={patient.alt_phone || '-'} />
          <Row label={t('common_email')} value={patient.email || '-'} />
          <Row label={t('common_address')} value={patient.address || '-'} />
          <Row label={t('common_emergency_contact')} value={patient.emergency_contact || '-'} />
        </div>
      </div>
      <div className="card card-elevated">
        <h3 className="card-title">{t('patient_medical')}</h3>
        <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
          <Row label={t('common_blood_group')} value={patient.blood_group || '-'} />
          <Row label={t('common_allergies')} value={patient.allergies || 'None reported'} />
          <Row label={t('common_medications')} value={patient.current_medications || 'None'} />
          <Row label={t('common_conditions')} value={patient.conditions || 'None'} />
          <Row label={t('common_medical_history')} value={patient.medical_history || '-'} />
        </div>
        {patient.alerts && (
          <div className="alert-box" style={{ marginTop: 12, padding: 10, background: 'var(--color-danger-bg)', color: 'var(--color-danger)', borderRadius: 6, fontSize: 13 }}>
            ⚠ {patient.alerts}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', padding: '4px 0', borderBottom: '1px solid var(--color-divider)' }}>
      <div style={{ width: 130, fontSize: 12, color: 'var(--color-text-muted)' }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13 }}>{value}</div>
    </div>
  );
}

function DentalChartView({ patient, onEdit }: { patient: any; onEdit: (t: any) => void }) {
  const t = useT();
  // Adult teeth: 1-32 (ISO notation). Upper right 18-11, upper left 21-28, lower left 31-38 etc
  // Show as 4 quadrants: upper-left (patient's right) 18..11, upper-right 21..28
  // Use universal 1-32 for visualization
  const teethData = (patient.dental_chart || []).reduce((acc: any, x: any) => { acc[x.tooth_number] = x; return acc; }, {});
  const getTooth = (n: number) => teethData[n] || { tooth_number: n, status: 'healthy' };

  const upperRow = [...Array(16)].map((_, i) => n => getTooth(i + 1));
  return (
    <div className="card card-elevated">
      <div className="card-header">
        <h3 className="card-title">{t('patient_dental_chart')}</h3>
        <p className="card-subtitle">Universal Numbering System (1-32)</p>
      </div>
      <DentalQuadrant teeth={Array.from({length: 16}, (_, i) => getTooth(18 - i))} side="upper" onClick={onEdit} /> {/* Upper right */}
      <div style={{ height: 16 }} />
      <DentalQuadrant teeth={Array.from({length: 16}, (_, i) => getTooth(17 - i + 16))} side="upper" onClick={onEdit} reversed /> {/* Upper left - need correct numbering */}
      <div style={{ height: 24, borderTop: '1px solid var(--color-border)', margin: '12px 0' }} />
      <DentalQuadrant teeth={Array.from({length: 16}, (_, i) => getTooth(32 - i))} side="lower" onClick={onEdit} /> {/* Lower right */}
      <div style={{ height: 16 }} />
      <DentalQuadrant teeth={Array.from({length: 16}, (_, i) => getTooth(i + 17))} side="lower" onClick={onEdit} reversed /> {/* Lower left */}

      <div style={{ marginTop: 24, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
        <Legend color="healthy" label={t('tooth_status_healthy')} />
        <Legend color="decay" label={t('tooth_status_decay')} />
        <Legend color="filled" label={t('tooth_status_filled')} />
        <Legend color="crown" label={t('tooth_status_crown')} />
        <Legend color="root_canal" label={t('tooth_status_root_canal')} />
        <Legend color="extraction" label={t('tooth_status_extraction')} />
        <Legend color="implant" label={t('tooth_status_implant')} />
        <Legend color="missing" label={t('tooth_status_missing')} />
      </div>
    </div>
  );
}

function DentalQuadrant({ teeth, side, reversed, onClick }: { teeth: any[]; side: 'upper' | 'lower'; reversed?: boolean; onClick: (t: any) => void }) {
  const t = useT();
  const display = reversed ? [...teeth].reverse() : teeth;
  return (
    <div className="dental-chart-row">
      <div className="label">{side === 'upper' ? (reversed ? 'L' : 'R') : (reversed ? 'L' : 'R')}</div>
      {display.map((tooth: any) => (
        <div
          key={tooth.tooth_number}
          className={`tooth ${tooth.status || 'healthy'}`}
          onClick={() => onClick(tooth)}
          title={`Tooth ${tooth.tooth_number} - ${tooth.status || 'healthy'}`}
        >
          {tooth.tooth_number}
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className={`tooth ${color}`} style={{ width: 14, height: 14, fontSize: 0 }} />
      <span>{label}</span>
    </div>
  );
}

function TimelineView({ items }: { items: any[] }) {
  const t = useT();
  if (items.length === 0) return <div className="card"><EmptyState icon="history" title={t('empty_visits_title')} description={t('empty_visits_desc')} /></div>;
  return (
    <div className="card card-elevated">
      <div className="timeline">
        {items.map((it, i) => (
          <div key={i} className="timeline-item">
            <div className="time">{formatDate(it.date || it.created_at)}</div>
            <div className="title">{it.title || it.label}</div>
            <div className="meta">{it.label}{it.amount ? ` • ${formatMoney(it.amount)}` : ''}{it.status ? ` • ${it.status}` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientInvoices({ patientId, navigate }: { patientId: number; navigate: any }) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  React.useEffect(() => {
    window.api.invoice.list({ patientId }).then(setList);
  }, [patientId]);
  return (
    <div className="card card-elevated">
      <div className="card-header">
        <h3 className="card-title">{t('patient_invoices')}</h3>
      </div>
      {list.length === 0 ? <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 40 }}>No invoices yet</p> : (
        <table className="table">
          <thead>
            <tr>
              <th>{t('common_invoice')} #</th>
              <th>{t('common_date')}</th>
              <th className="num">{t('common_total')}</th>
              <th className="num">{t('common_paid')}</th>
              <th className="num">{t('common_due')}</th>
              <th>{t('common_status')}</th>
            </tr>
          </thead>
          <tbody>
            {list.map(i => (
              <tr key={i.id} className="clickable" onClick={() => navigate('billing', { openInvoice: i.id })}>
                <td>{i.invoice_number}</td>
                <td>{formatDate(i.invoice_date)}</td>
                <td className="num">{formatMoney(i.total)}</td>
                <td className="num">{formatMoney(i.paid)}</td>
                <td className="num">{formatMoney(i.due)}</td>
                <td><span className={`status-pill status-${i.status}`}>{i.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ToothEditor({ patientId, tooth, onClose, onSaved }: { patientId: number; tooth: any; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({
    tooth_number: tooth.tooth_number,
    status: tooth.status || 'healthy',
    notes: tooth.notes || ''
  });

  const save = async () => {
    try {
      await window.api.patient.updateTooth(patientId, {
        tooth_number: form.tooth_number,
        status: form.status,
        notes: form.notes
      });
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e) {
      toast('Failed to save', 'error');
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Tooth #${tooth.tooth_number}`}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
          <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">{t('dental_chart_status')}</label>
        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="healthy">{t('tooth_status_healthy')}</option>
          <option value="decay">{t('tooth_status_decay')}</option>
          <option value="filled">{t('tooth_status_filled')}</option>
          <option value="crown">{t('tooth_status_crown')}</option>
          <option value="root_canal">{t('tooth_status_root_canal')}</option>
          <option value="extraction">{t('tooth_status_extraction')}</option>
          <option value="implant">{t('tooth_status_implant')}</option>
          <option value="missing">{t('tooth_status_missing')}</option>
          <option value="other">{t('tooth_status_other')}</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">{t('dental_chart_notes')}</label>
        <textarea className="form-textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
      </div>
    </Modal>
  );
}