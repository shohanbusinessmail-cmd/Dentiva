import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, toast } from '../state/toast';
import { formatDate, todayISO } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Visits({ initialFilter, navigate }: Props) {
  const t = useT();
  const [patients, setPatients] = React.useState<any[]>([]);
  const [patientId, setPatientId] = React.useState<number | null>(null);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [patientQuery, setPatientQuery] = React.useState('');

  React.useEffect(() => {
    if (initialFilter?.patientId) {
      setPatientId(initialFilter.patientId);
      setShowForm(true);
    }
  }, [initialFilter]);

  const load = React.useCallback(async () => {
    if (!patientId) { setList([]); return; }
    setLoading(true);
    try {
      const r = await window.api.visit.list(patientId);
      setList(r || []);
    } finally { setLoading(false); }
  }, [patientId]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (patientQuery.length < 2) return;
    window.api.patient.search(patientQuery).then(setPatients);
  }, [patientQuery]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_visits')}</h1>
          <p className="page-subtitle">{patientId ? `${list.length} ${t('nav_visits').toLowerCase()}` : t('common_select') + ' ' + t('common_patient').toLowerCase()}</p>
        </div>
        {patientId && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Icon name="plus" size={14} /> {t('visit_new')}
            </button>
          </div>
        )}
      </div>

      <div className="card card-elevated" style={{ marginBottom: 16 }}>
        <div className="form-row">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{t('common_patient')}</label>
            <input className="form-input" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
            {patients.length > 0 && !patientId && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                {patients.map(p => (
                  <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setPatientId(p.id); setPatientQuery(''); setPatients([]); }}>
                    <strong>{p.name}</strong> ({p.code})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!patientId ? (
        <div className="card"><EmptyState icon="user" title={t('msg_select_patient')} description="Search for a patient above to view their visit history" /></div>
      ) : loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      : list.length === 0 ? (
        <div className="card"><EmptyState icon="visits" title={t('empty_visits_title')} description={t('empty_visits_desc')} action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('visit_new')}</button>} /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('common_date')}</th>
                <th>{t('visit_chief_complaint')}</th>
                <th>{t('visit_diagnosis')}</th>
                <th>{t('visit_treatment')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(v => (
                <tr key={v.id} className="clickable" onClick={() => { setEditing(v); setShowForm(true); }}>
                  <td>{formatDate(v.visit_date)}</td>
                  <td>{v.chief_complaint || '-'}</td>
                  <td>{v.diagnosis || '-'}</td>
                  <td>{v.treatment_performed || '-'}</td>
                  <td><Icon name="chevron_right" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VisitForm open={showForm} visit={editing} patientId={patientId!} appointmentId={initialFilter?.appointmentId} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
    </div>
  );
}

function VisitForm({ open, visit, patientId, appointmentId, onClose, onSaved }: { open: boolean; visit: any | null; patientId: number; appointmentId?: number; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (!open) return;
    if (visit) {
      setForm({ ...visit });
    } else {
      setForm({
        patient_id: patientId,
        appointment_id: appointmentId,
        visit_date: todayISO(),
        visit_time: '',
        chief_complaint: '',
        reason: '',
        symptoms: '',
        findings: '',
        diagnosis: '',
        teeth_involved: '',
        treatment_performed: '',
        notes: '',
        materials: '',
        duration_minutes: '',
        follow_up_date: '',
        follow_up_notes: ''
      });
    }
  }, [open, visit, patientId, appointmentId]);

  const save = async () => {
    try {
      if (visit) await window.api.visit.update(visit.id, form);
      else await window.api.visit.create(form);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={visit ? t('visit_edit') : t('visit_new')}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
          <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
        </>
      }
    >
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('common_date')}</label>
          <input type="date" className="form-input" value={form.visit_date || ''} onChange={(e) => setForm({ ...form, visit_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_time')}</label>
          <input type="time" className="form-input" value={form.visit_time || ''} onChange={(e) => setForm({ ...form, visit_time: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('visit_duration')}</label>
          <input type="number" className="form-input" value={form.duration_minutes || ''} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('visit_chief_complaint')}</label>
        <input className="form-input" value={form.chief_complaint || ''} onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Symptoms</label>
          <textarea className="form-textarea" rows={2} value={form.symptoms || ''} onChange={(e) => setForm({ ...form, symptoms: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('visit_findings')}</label>
          <textarea className="form-textarea" rows={2} value={form.findings || ''} onChange={(e) => setForm({ ...form, findings: e.target.value })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('visit_diagnosis')}</label>
          <textarea className="form-textarea" rows={2} value={form.diagnosis || ''} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('visit_teeth')}</label>
          <input className="form-input" placeholder="e.g. 16, 26, 36-38" value={form.teeth_involved || ''} onChange={(e) => setForm({ ...form, teeth_involved: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('visit_treatment')}</label>
        <textarea className="form-textarea" rows={2} value={form.treatment_performed || ''} onChange={(e) => setForm({ ...form, treatment_performed: e.target.value })} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('visit_materials')}</label>
        <input className="form-input" value={form.materials || ''} onChange={(e) => setForm({ ...form, materials: e.target.value })} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('visit_followup_date')}</label>
          <input type="date" className="form-input" value={form.follow_up_date || ''} onChange={(e) => setForm({ ...form, follow_up_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('visit_followup_notes')}</label>
          <input className="form-input" value={form.follow_up_notes || ''} onChange={(e) => setForm({ ...form, follow_up_notes: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}