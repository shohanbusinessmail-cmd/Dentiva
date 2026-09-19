import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatDate, todayISO } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Appointments({ navigate, initialFilter }: Props) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [filterDate, setFilterDate] = React.useState<string>(todayISO());
  const [filterStatus, setFilterStatus] = React.useState<string>('');
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.api.appointment.list({ from: filterDate, to: filterDate, status: filterStatus || undefined });
      setList(r || []);
    } finally { setLoading(false); }
  }, [filterDate, filterStatus]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (initialFilter?.openNew) {
      setEditing(null);
      setShowForm(true);
    }
  }, [initialFilter]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await window.api.appointment.setStatus(id, status);
      toast(t('msg_saved'), 'success');
      load();
    } catch (e) { toast('Failed', 'error'); }
  };

  const checkIn = async (id: number) => {
    try {
      await window.api.appointment.checkIn(id);
      toast('Checked in', 'success');
      load();
    } catch (e) { toast('Failed', 'error'); }
  };

  const handleDelete = async (a: any) => {
    const ok = await confirm({
      title: 'Cancel this appointment?',
      message: `Remove the appointment for ${a.patient_name}?`,
      danger: true,
      confirmText: 'Remove'
    });
    if (!ok) return;
    try {
      await window.api.appointment.delete(a.id);
      load();
    } catch { toast('Failed', 'error'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_appointments')}</h1>
          <p className="page-subtitle">{formatDate(filterDate)} • {list.length} {t('common_status').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> {t('appt_new')}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="date"
          className="form-input"
          style={{ width: 180 }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <select className="form-select" style={{ width: 180 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="scheduled">{t('appt_status_scheduled')}</option>
          <option value="waiting">{t('appt_status_waiting')}</option>
          <option value="checked_in">{t('appt_status_checked_in')}</option>
          <option value="in_treatment">{t('appt_status_in_treatment')}</option>
          <option value="completed">{t('appt_status_completed')}</option>
          <option value="cancelled">{t('appt_status_cancelled')}</option>
          <option value="no_show">{t('appt_status_no_show')}</option>
        </select>
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : list.length === 0 ? (
          <div className="card">
            <EmptyState
              icon="calendar"
              title={t('empty_appointments_title')}
              description={t('empty_appointments_desc')}
              action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('appt_new')}</button>}
            />
          </div>
        ) : (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>{t('appt_serial')}</th>
                    <th>{t('appt_time')}</th>
                    <th>{t('common_patient')}</th>
                    <th>{t('common_phone')}</th>
                    <th>{t('appt_reason')}</th>
                    <th>{t('common_status')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(a => (
                    <tr key={a.id}>
                      <td className="num" style={{ fontWeight: 600 }}>#{a.serial_number}</td>
                      <td>{a.appointment_time || '-'}</td>
                      <td className="clickable" onClick={() => navigate('patient-profile', a.patient_id)}>
                        <div style={{ fontWeight: 500 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{a.patient_code}</div>
                      </td>
                      <td>{a.patient_phone || '-'}</td>
                      <td>{a.reason || '-'}</td>
                      <td><span className={`status-pill status-${a.status.replace(/_/g, '-')}`}>{t(`appt_status_${a.status}`)}</span></td>
                      <td className="actions-cell">
                        {a.status === 'scheduled' && (
                          <button className="btn btn-sm btn-secondary" onClick={() => checkIn(a.id)}>
                            <Icon name="check" size={12} /> {t('appt_check_in')}
                          </button>
                        )}
                        {a.status === 'checked_in' && (
                          <button className="btn btn-sm btn-primary" onClick={() => updateStatus(a.id, 'in_treatment')}>
                            <Icon name="play" size={12} /> {t('appt_start_treatment')}
                          </button>
                        )}
                        {(a.status === 'checked_in' || a.status === 'in_treatment' || a.status === 'waiting') && (
                          <button className="btn btn-sm btn-secondary" onClick={() => navigate('visit-new', { patientId: a.patient_id, appointmentId: a.id })}>
                            {t('qa_start_visit')}
                          </button>
                        )}
                        {a.status !== 'completed' && a.status !== 'cancelled' && (
                          <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(a)} title="Cancel">
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      <AppointmentForm open={showForm} appt={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      {dialog}
    </div>
  );
}

function AppointmentForm({ open, appt, onClose, onSaved }: { open: boolean; appt: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});
  const [patientQuery, setPatientQuery] = React.useState('');
  const [patientResults, setPatientResults] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    if (appt) {
      setForm({ ...appt });
      setSelectedPatient({ id: appt.patient_id, name: appt.patient_name, code: appt.patient_code });
    } else {
      setForm({
        appointment_date: todayISO(),
        appointment_time: '',
        duration: 30,
        reason: '',
        status: 'scheduled',
        notes: ''
      });
      setSelectedPatient(null);
      setPatientQuery('');
    }
  }, [open, appt]);

  React.useEffect(() => {
    if (patientQuery.length < 2) { setPatientResults([]); return; }
    let cancelled = false;
    window.api.patient.search(patientQuery).then(r => { if (!cancelled) setPatientResults(r || []); });
    return () => { cancelled = true; };
  }, [patientQuery]);

  const save = async () => {
    if (!selectedPatient) { toast(t('msg_select_patient'), 'warning'); return; }
    setSaving(true);
    try {
      await window.api.appointment.create({
        patient_id: selectedPatient.id,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration: form.duration,
        reason: form.reason,
        status: form.status,
        notes: form.notes
      });
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('appt_new')}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{t('common_save')}</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">{t('common_patient')} <span className="req">*</span></label>
        {selectedPatient ? (
          <div style={{ padding: '8px 12px', background: 'var(--color-primary-light)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span><strong>{selectedPatient.name}</strong> ({selectedPatient.code})</span>
            <button className="btn-icon btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}><Icon name="close" size={14} /></button>
          </div>
        ) : (
          <>
            <input
              className="form-input"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              placeholder="Search by name, code, or phone"
            />
            {patientResults.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                {patientResults.map(p => (
                  <div key={p.id}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--color-divider)' }}
                    onClick={() => { setSelectedPatient(p); setPatientQuery(''); setPatientResults([]); }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-soft)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <strong>{p.name}</strong> <span style={{ color: 'var(--color-text-muted)' }}>({p.code})</span>
                    {p.phone && <span style={{ color: 'var(--color-text-muted)', marginLeft: 8 }}>{p.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('common_date')}</label>
          <input type="date" className="form-input" value={form.appointment_date || ''} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_time')}</label>
          <input type="time" className="form-input" value={form.appointment_time || ''} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Duration (min)</label>
          <input type="number" className="form-input" value={form.duration || 30} onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('appt_reason')}</label>
        <input className="form-input" value={form.reason || ''} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>
    </Modal>
  );
}