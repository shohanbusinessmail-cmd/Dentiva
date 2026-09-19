import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, toast } from '../state/toast';
import { formatMoney, formatDate, todayISO } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Treatments({ initialFilter, navigate }: Props) {
  const t = useT();
  const [patientId, setPatientId] = React.useState<number | null>(null);
  const [patientQuery, setPatientQuery] = React.useState('');
  const [patients, setPatients] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);

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
      const r = await window.api.treatment.list(patientId);
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
          <h1 className="page-title">{t('nav_treatments')}</h1>
          <p className="page-subtitle">{selectedPatient ? selectedPatient.name : t('msg_select_patient')}</p>
        </div>
        {patientId && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Icon name="plus" size={14} /> {t('treatment_new')}
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
                  <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setPatientId(p.id); setSelectedPatient(p); setPatientQuery(''); setPatients([]); }}>
                    <strong>{p.name}</strong> ({p.code})
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {!patientId ? (
        <div className="card"><EmptyState icon="user" title={t('msg_select_patient')} description="Select a patient to view their treatment plan" /></div>
      ) : loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      : list.length === 0 ? (
        <div className="card"><EmptyState icon="treatments" title="No treatments yet" description="Add a treatment plan for this patient" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('treatment_new')}</button>} /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('common_name')}</th>
                <th>{t('common_category')}</th>
                <th>{t('treatment_teeth')}</th>
                <th className="num">{t('treatment_estimated')}</th>
                <th className="num">{t('treatment_actual')}</th>
                <th>{t('treatment_status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(tr => (
                <tr key={tr.id} className="clickable" onClick={() => { setEditing(tr); setShowForm(true); }}>
                  <td style={{ fontWeight: 500 }}>{tr.name}</td>
                  <td>{tr.category || '-'}</td>
                  <td>{tr.teeth || '-'}</td>
                  <td className="num">{formatMoney(tr.estimated_cost)}</td>
                  <td className="num">{formatMoney(tr.actual_cost)}</td>
                  <td><span className={`badge ${statusClass(tr.status)}`}>{tr.status}</span></td>
                  <td><Icon name="chevron_right" size={14} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TreatmentForm open={showForm} treatment={editing} patientId={patientId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
    </div>
  );
}

function statusClass(s: string): string {
  if (s === 'completed') return 'badge-success';
  if (s === 'in_progress') return 'badge-info';
  if (s === 'cancelled') return 'badge-neutral';
  if (s === 'on_hold') return 'badge-warning';
  return 'badge-neutral';
}

function TreatmentForm({ open, treatment, patientId, onClose, onSaved }: { open: boolean; treatment: any | null; patientId: number; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});

  React.useEffect(() => {
    if (!open) return;
    if (treatment) {
      setForm({ ...treatment });
    } else {
      setForm({
        patient_id: patientId,
        name: '', category: '', description: '', teeth: '',
        estimated_cost: 0, actual_cost: 0, status: 'planned',
        start_date: todayISO(), completion_date: '', notes: ''
      });
    }
  }, [open, treatment, patientId]);

  const save = async () => {
    try {
      if (treatment) await window.api.treatment.update(treatment.id, form);
      else await window.api.treatment.create(form);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={treatment ? t('treatment_edit') : t('treatment_new')}
      size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}
    >
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Name <span className="req">*</span></label>
          <input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_category')}</label>
          <input className="form-input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Restorative, Surgical, etc." />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('treatment_teeth')}</label>
          <input className="form-input" value={form.teeth || ''} onChange={(e) => setForm({ ...form, teeth: e.target.value })} placeholder="e.g. 16, 26" />
        </div>
        <div className="form-group">
          <label className="form-label">{t('treatment_estimated')}</label>
          <input type="number" step="0.01" className="form-input" value={form.estimated_cost || 0} onChange={(e) => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('treatment_actual')}</label>
          <input type="number" step="0.01" className="form-input" value={form.actual_cost || 0} onChange={(e) => setForm({ ...form, actual_cost: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('treatment_status')}</label>
          <select className="form-select" value={form.status || 'planned'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planned">{t('common_planned')}</option>
            <option value="in_progress">{t('common_in_progress')}</option>
            <option value="completed">{t('common_completed')}</option>
            <option value="on_hold">{t('common_on_hold')}</option>
            <option value="cancelled">{t('common_cancelled')}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Start Date</label>
          <input type="date" className="form-input" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Completion Date</label>
          <input type="date" className="form-input" value={form.completion_date || ''} onChange={(e) => setForm({ ...form, completion_date: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}