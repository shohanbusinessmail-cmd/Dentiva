import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { EmptyState, toast } from '../state/toast';
import { formatDate } from '../utils/format';

export function Documents({ navigate }: { navigate: any }) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [patientQuery, setPatientQuery] = React.useState('');
  const [patients, setPatients] = React.useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = React.useState<any | null>(null);

  React.useEffect(() => { window.api.documents.list().then(r => { setList(r || []); setLoading(false); }); }, []);

  React.useEffect(() => {
    if (patientQuery.length < 2) return;
    window.api.patient.search(patientQuery).then(setPatients);
  }, [patientQuery]);

  const filtered = selectedPatient ? list.filter(d => d.patient_id === selectedPatient.id) : list;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_documents')}</h1>
          <p className="page-subtitle">{filtered.length} {t('nav_documents').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={async () => {
            if (!selectedPatient) { toast('Select a patient first', 'warning'); return; }
            const r = await window.api.documents.upload(selectedPatient.id);
            if (r) { toast('Document uploaded', 'success'); window.api.documents.list().then(setList); }
          }}>
            <Icon name="upload" size={14} /> Upload Document
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        {patients.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 16, right: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, maxHeight: 200, overflowY: 'auto', zIndex: 10 }}>
            {patients.map(p => (
              <div key={p.id} style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }} onClick={() => { setSelectedPatient(p); setPatientQuery(''); setPatients([]); }}>
                <strong>{p.name}</strong> ({p.code})
              </div>
            ))}
          </div>
        )}
        {selectedPatient && (
          <div style={{ padding: '4px 10px', background: 'var(--color-primary-light)', borderRadius: 6, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {selectedPatient.name}
            <button className="btn-icon btn-sm btn-ghost" onClick={() => setSelectedPatient(null)}><Icon name="close" size={12} /></button>
          </div>
        )}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : filtered.length === 0 ? (
          <div className="card"><EmptyState icon="folder" title="No documents" description="Upload X-rays, treatment photos, or referral letters for your patients." /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Patient</th>
                  <th>{t('common_date')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}>
                    <td><Icon name="folder" size={14} style={{ marginRight: 6 }} /> {d.title}</td>
                    <td><span className="badge badge-neutral">{d.document_type || '-'}</span></td>
                    <td>{d.patient_id ? `#${d.patient_id}` : '-'}</td>
                    <td>{formatDate(d.created_at)}</td>
                    <td className="actions-cell">
                      <button className="btn-icon btn-sm btn-ghost" onClick={async () => {
                        await window.api.documents.delete(d.id);
                        window.api.documents.list().then(setList);
                      }}><Icon name="trash" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}