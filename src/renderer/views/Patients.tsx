import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatDate, ageFromDOB, genderLabel, initials } from '../utils/format';

interface PatientsProps {
  navigate: (view: string, filter?: any) => void;
  initialFilter?: any;
}

export function Patients({ navigate, initialFilter }: PatientsProps) {
  const t = useT();
  const [patients, setPatients] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [editing, setEditing] = React.useState<any | null>(null);
  const [showForm, setShowForm] = React.useState(false);
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.api.patient.list(search || undefined);
      setPatients(r || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    if (initialFilter?.openNew) {
      setEditing(null);
      setShowForm(true);
    }
  }, [initialFilter]);

  const handleDelete = async (p: any) => {
    const ok = await confirm({
      title: t('patient_confirm_delete'),
      message: t('patient_confirm_delete_msg'),
      danger: true,
      confirmText: t('common_delete')
    });
    if (!ok) return;
    try {
      await window.api.patient.delete(p.id);
      toast('Patient deleted', 'success');
      load();
    } catch (e) {
      toast('Failed to delete patient', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_patients')}</h1>
          <p className="page-subtitle">{patients.length} {t('common_patient').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => window.api.io.exportPatients().then(p => p && toast(t('msg_export_done') + ': ' + p, 'success'))}>
            <Icon name="download" size={14} /> {t('common_export')}
          </button>
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> {t('patient_new')}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input
          className="search-input"
          placeholder={t('patient_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <Icon name="search" size={14} /> {t('common_search')}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : patients.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="patients"
            title={t('empty_patients_title')}
            description={t('empty_patients_desc')}
            action={
              <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
                <Icon name="plus" size={14} /> {t('patient_new')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('common_patient_code')}</th>
                  <th>{t('common_name')}</th>
                  <th>{t('common_age')}</th>
                  <th>{t('common_gender')}</th>
                  <th>{t('common_phone')}</th>
                  <th>{t('common_registered')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="clickable" onClick={() => navigate('patient-profile', p.id)}>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.code}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--color-primary) 0%, #1aa4a9 100%)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600
                        }}>
                          {initials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.alerts && <div style={{ fontSize: 11, color: 'var(--color-danger)' }}>⚠ {p.alerts}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{p.age || (p.date_of_birth ? ageFromDOB(p.date_of_birth) : '-')}</td>
                    <td>{genderLabel(p.gender, getLangSafe())}</td>
                    <td>{p.phone || '-'}</td>
                    <td>{formatDate(p.registered_at)}</td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => navigate('patient-profile', p.id)} title="View">
                        <Icon name="eye" size={14} />
                      </button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => { setEditing(p); setShowForm(true); }} title="Edit">
                        <Icon name="edit" size={14} />
                      </button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(p)} title="Delete">
                        <Icon name="trash" size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PatientForm
        open={showForm}
        patient={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); load(); }}
      />
      {dialog}
    </div>
  );
}

function getLangSafe() { try { return require('../i18n/i18n').getLang(); } catch { return 'en'; } }

interface PatientFormProps {
  open: boolean;
  patient: any | null;
  onClose: () => void;
  onSaved: () => void;
}

function PatientForm({ open, patient, onClose, onSaved }: PatientFormProps) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});
  const [code, setCode] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    if (patient) {
      setForm({ ...patient });
      setCode(patient.code);
    } else {
      setForm({
        name: '', gender: '', date_of_birth: '', phone: '', alt_phone: '', email: '',
        address: '', emergency_contact: '', medical_history: '', allergies: '',
        current_medications: '', conditions: '', dental_history: '', notes: '',
        alerts: '', blood_group: ''
      });
      window.api.patient.code().then(setCode);
    }
    setErrors({});
  }, [open, patient]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = t('common_required');
    if (form.phone && !/^[\d+\-()\s]{6,}$/.test(form.phone)) e.phone = t('msg_invalid_phone');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      // Auto-compute age from DOB
      const age = form.date_of_birth ? ageFromDOB(form.date_of_birth) : null;
      const payload = { ...form, age, code };
      if (patient) {
        await window.api.patient.update(patient.id, payload);
        toast(t('msg_saved'), 'success');
      } else {
        await window.api.patient.create(payload);
        toast(t('msg_saved'), 'success');
      }
      onSaved();
    } catch (e: any) {
      toast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={patient ? t('patient_edit') : t('patient_new')}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving ? <span className="spinner" /> : <Icon name="save" size={14} />}
            {t('common_save')}
          </button>
        </>
      }
    >
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_patient_code')}</label>
          <input className="form-input" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_name')} <span className="req">*</span></label>
          <input className={`form-input ${errors.name ? 'error' : ''}`} value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('common_gender')}</label>
          <select className="form-select" value={form.gender || ''} onChange={(e) => set('gender', e.target.value)}>
            <option value="">-</option>
            <option value="male">{t('common_gender_male')}</option>
            <option value="female">{t('common_gender_female')}</option>
            <option value="other">{t('common_gender_other')}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_dob')}</label>
          <input type="date" className="form-input" value={form.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_blood_group')}</label>
          <select className="form-select" value={form.blood_group || ''} onChange={(e) => set('blood_group', e.target.value)}>
            <option value="">-</option>
            {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('common_phone')}</label>
          <input className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('setup_alt_phone')}</label>
          <input className="form-input" value={form.alt_phone || ''} onChange={(e) => set('alt_phone', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_email')}</label>
        <input type="email" className="form-input" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_address')}</label>
        <input className="form-input" value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_emergency_contact')}</label>
        <input className="form-input" value={form.emergency_contact || ''} onChange={(e) => set('emergency_contact', e.target.value)} />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary)', marginTop: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>{t('patient_medical')}</h3>
      <div className="form-group">
        <label className="form-label">{t('common_allergies')}</label>
        <textarea className="form-textarea" value={form.allergies || ''} onChange={(e) => set('allergies', e.target.value)} rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_medications')}</label>
        <textarea className="form-textarea" value={form.current_medications || ''} onChange={(e) => set('current_medications', e.target.value)} rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_medical_history')}</label>
        <textarea className="form-textarea" value={form.medical_history || ''} onChange={(e) => set('medical_history', e.target.value)} rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_dental_history')}</label>
        <textarea className="form-textarea" value={form.dental_history || ''} onChange={(e) => set('dental_history', e.target.value)} rows={2} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_alerts')}</label>
        <input className="form-input" value={form.alerts || ''} onChange={(e) => set('alerts', e.target.value)} placeholder="Critical alerts shown on patient profile" />
      </div>
    </Modal>
  );
}

import { getLang } from '../i18n/i18n';