import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, toast } from '../state/toast';
import { formatDate, todayISO } from '../utils/format';

interface Props { navigate: (v: string, f?: any) => void; initialFilter?: any; }

export function Prescriptions({ initialFilter, navigate }: Props) {
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
      const r = await window.api.prescription.list(patientId);
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
          <h1 className="page-title">{t('nav_prescriptions')}</h1>
          <p className="page-subtitle">{selectedPatient ? selectedPatient.name : t('msg_select_patient')}</p>
        </div>
        {patientId && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Icon name="plus" size={14} /> {t('presc_new')}
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
        <div className="card"><EmptyState icon="user" title={t('msg_select_patient')} description="Select a patient to view their prescriptions" /></div>
      ) : loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      : list.length === 0 ? (
        <div className="card"><EmptyState icon="prescription" title="No prescriptions" description="Create a new prescription for this patient" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('presc_new')}</button>} /></div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('presc_number')}</th>
                <th>{t('common_date')}</th>
                <th>{t('visit_diagnosis')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{p.prescription_number}</td>
                  <td>{formatDate(p.prescription_date)}</td>
                  <td>{p.diagnosis || '-'}</td>
                  <td className="actions-cell">
                    <button className="btn-icon btn-sm btn-ghost" onClick={async () => { await window.api.print.prescription(p.id); }} title="Print">
                      <Icon name="print" size={14} />
                    </button>
                    <button className="btn-icon btn-sm btn-ghost" onClick={async () => { await window.api.pdf.prescription(p.id); }} title="Save PDF">
                      <Icon name="pdf" size={14} />
                    </button>
                    <button className="btn-icon btn-sm btn-ghost" onClick={() => { setEditing(p); setShowForm(true); }} title="View">
                      <Icon name="eye" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PrescriptionForm open={showForm} prescription={editing} patientId={patientId!} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
    </div>
  );
}

function PrescriptionForm({ open, prescription, patientId, onClose, onSaved }: { open: boolean; prescription: any | null; patientId: number; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [items, setItems] = React.useState<any[]>([{ medicine: '', strength: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', food_relation: 'any_time', notes: '' }]);
  const [diagnosis, setDiagnosis] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [templates, setTemplates] = React.useState<any[]>([]);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [templateName, setTemplateName] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    if (prescription) {
      setDiagnosis(prescription.diagnosis || '');
      setNotes(prescription.notes || '');
      window.api.prescription.get(prescription.id).then(p => {
        setItems(p.items && p.items.length ? p.items : [{ medicine: '', strength: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', food_relation: 'any_time', notes: '' }]);
      });
    } else {
      setItems([{ medicine: '', strength: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', food_relation: 'any_time', notes: '' }]);
      setDiagnosis('');
      setNotes('');
    }
    window.api.prescription.templates().then(setTemplates);
  }, [open, prescription]);

  const updateItem = (i: number, k: string, v: any) => {
    setItems(prev => prev.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  };

  const addItem = () => setItems([...items, { medicine: '', strength: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '', food_relation: 'any_time', notes: '' }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const applyTemplate = (tpl: any) => {
    try {
      const items = JSON.parse(tpl.items);
      setItems(items);
      setShowTemplates(false);
    } catch {}
  };

  const saveTemplate = async () => {
    if (!templateName) { toast('Please enter template name', 'warning'); return; }
    await window.api.prescription.saveTemplate({ name: templateName, items });
    toast('Template saved', 'success');
    setTemplateName('');
    setShowTemplates(false);
    window.api.prescription.templates().then(setTemplates);
  };

  const save = async () => {
    if (!items.some(i => i.medicine)) { toast('Add at least one medicine', 'warning'); return; }
    try {
      await window.api.prescription.create({
        patient_id: patientId,
        prescription_date: todayISO(),
        diagnosis,
        notes,
        items
      });
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('presc_new')}
      size="lg"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button>
          <button className="btn btn-secondary" onClick={() => setShowTemplates(true)}>
            <Icon name="list" size={14} /> {t('presc_templates')}
          </button>
          <button className="btn btn-primary" onClick={save}>{t('common_save')}</button>
        </>
      }
    >
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('visit_diagnosis')}</label>
          <input className="form-input" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_date')}</label>
          <input type="date" className="form-input" value={todayISO()} disabled />
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Medicines</h3>
          <button className="btn btn-sm btn-secondary" onClick={addItem}><Icon name="plus" size={12} /> Add Medicine</button>
        </div>
        {items.map((item, i) => (
          <div key={i} style={{ padding: 12, background: 'var(--color-surface-soft)', borderRadius: 8, marginBottom: 10, position: 'relative' }}>
            {items.length > 1 && (
              <button className="btn-icon btn-sm btn-ghost" style={{ position: 'absolute', right: 6, top: 6 }} onClick={() => removeItem(i)}>
                <Icon name="trash" size={12} />
              </button>
            )}
            <div className="form-row-3">
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_medicine')}</label>
                <input className="form-input" value={item.medicine} onChange={(e) => updateItem(i, 'medicine', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_strength')}</label>
                <input className="form-input" value={item.strength} onChange={(e) => updateItem(i, 'strength', e.target.value)} placeholder="500 mg" />
              </div>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_dosage')}</label>
                <input className="form-input" value={item.dosage} onChange={(e) => updateItem(i, 'dosage', e.target.value)} placeholder="1+0+1" />
              </div>
            </div>
            <div className="form-row-3">
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_frequency')}</label>
                <input className="form-input" value={item.frequency} onChange={(e) => updateItem(i, 'frequency', e.target.value)} placeholder="Twice daily" />
              </div>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_duration')}</label>
                <input className="form-input" value={item.duration} onChange={(e) => updateItem(i, 'duration', e.target.value)} placeholder="5 days" />
              </div>
              <div className="form-group" style={{ marginBottom: 6 }}>
                <label className="form-label">{t('presc_qty')}</label>
                <input className="form-input" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} placeholder="10 tablets" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('presc_instructions')}</label>
                <input className="form-input" value={item.instructions} onChange={(e) => updateItem(i, 'instructions', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('presc_food_relation')}</label>
                <select className="form-select" value={item.food_relation} onChange={(e) => updateItem(i, 'food_relation', e.target.value)}>
                  <option value="any_time">{t('presc_any_time')}</option>
                  <option value="before_food">{t('presc_before_food')}</option>
                  <option value="after_food">{t('presc_after_food')}</option>
                </select>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Modal
        open={showTemplates}
        onClose={() => setShowTemplates(false)}
        title={t('presc_templates')}
        size="sm"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTemplates(false)}>{t('common_close')}</button>
            <button className="btn btn-primary" onClick={saveTemplate}>
              <Icon name="save" size={14} /> {t('presc_save_template')}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">{t('presc_template_name')}</label>
          <input className="form-input" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
        </div>
        <h4 style={{ fontSize: 12, marginBottom: 8 }}>Saved Templates</h4>
        {templates.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No templates saved</p> :
          templates.map(tpl => (
            <div key={tpl.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 8, border: '1px solid var(--color-border)', borderRadius: 6, marginBottom: 6 }}>
              <span style={{ fontWeight: 500 }}>{tpl.name}</span>
              <button className="btn btn-sm btn-secondary" onClick={() => applyTemplate(tpl)}>{t('presc_use_template')}</button>
            </div>
          ))
        }
      </Modal>
    </Modal>
  );
}