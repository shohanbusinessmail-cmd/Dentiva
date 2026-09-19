import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT, getLang } from '../i18n/i18n';
import { formatMoney, formatDate, formatTime, ageFromDOB } from '../utils/format';

interface DashboardProps {
  navigate: (view: string, filter?: any) => void;
}

export function Dashboard({ navigate }: DashboardProps) {
  const t = useT();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const d = await window.api.reports.dashboard('today');
      setData(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <h1 className="page-title">{t('nav_dashboard')}</h1>
            <p className="page-subtitle">{t('dashboard_today')}</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  const appt = data.appointments || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_dashboard')}</h1>
          <p className="page-subtitle">{formatDate(new Date().toISOString())} • {t('dashboard_today')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={load}>
            <Icon name="refresh" size={14} /> {t('common_refresh')}
          </button>
        </div>
      </div>

      {/* Metric cards — 4 columns */}
      <div className="metric-grid">
        <MetricCard icon="calendar" label={t('dashboard_appointments_today')} value={appt.total || 0} sub={`${appt.completed || 0} ${t('common_completed').toLowerCase()}`} />
        <MetricCard icon="user" label={t('dashboard_checked_in')} value={appt.checked_in || 0} sub={`${appt.waiting || 0} ${t('dashboard_waiting').toLowerCase()}`} accent />
        <MetricCard icon="history" label={t('dashboard_followups_due')} value={data.follow_ups?.length || 0} sub={t('dashboard_overdue') + ': ' + (data.follow_ups?.filter((f: any) => f.follow_up_date < new Date().toISOString().split('T')[0]).length || 0)} />
        <MetricCard icon="patients" label={t('dashboard_new_patients')} value={data.new_patients || 0} sub={t('dashboard_new_today')} />
      </div>

      {/* Main grid: 2/3 + 1/3 */}
      <div className="dash-grid">
        {/* Today's queue */}
        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('dashboard_today_queue')}</h3>
              <p className="card-subtitle">{data.today_queue?.length || 0} {t('dashboard_appointments_today').toLowerCase()}</p>
            </div>
            <button className="btn btn-sm btn-ghost" onClick={() => navigate('appointments')}>
              {t('common_view')} <Icon name="arrow_right" size={12} />
            </button>
          </div>
          {data.today_queue && data.today_queue.length > 0 ? (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 50 }}>{t('appt_serial')}</th>
                    <th>{t('common_patient')}</th>
                    <th>{t('appt_time')}</th>
                    <th>{t('appt_reason')}</th>
                    <th>{t('common_status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.today_queue.map((a: any) => (
                    <tr key={a.id} className="clickable" onClick={() => navigate('patient-profile', a.patient_id)}>
                      <td className="num" style={{ fontWeight: 600 }}>#{a.serial_number}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{a.patient_name}</div>
                        <div style={{ fontSize: 11, color: '#8a8a8a' }}>{a.patient_code}</div>
                      </td>
                      <td>{a.appointment_time || '-'}</td>
                      <td>{a.reason || '-'}</td>
                      <td><span className={`status-pill status-${a.status.replace(/_/g, '-')}`}>{t(apptStatusLabel(a.status))}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyRow icon="calendar" message={t('appt_no_appointments')} />
          )}
        </div>

        {/* Quick actions */}
        <div className="card card-elevated">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard_quick_actions')}</h3>
          </div>
          <div className="quick-actions">
            <button className="quick-action" onClick={() => navigate('patient-new')}>
              <div className="icon"><Icon name="plus" size={16} /></div>
              <span>{t('qa_new_patient')}</span>
            </button>
            <button className="quick-action" onClick={() => navigate('appointment-new')}>
              <div className="icon"><Icon name="calendar" size={16} /></div>
              <span>{t('qa_new_appointment')}</span>
            </button>
            <button className="quick-action" onClick={() => navigate('visit-new')}>
              <div className="icon"><Icon name="visits" size={16} /></div>
              <span>{t('qa_start_visit')}</span>
            </button>
            <button className="quick-action" onClick={() => navigate('invoice-new')}>
              <div className="icon"><Icon name="billing" size={16} /></div>
              <span>{t('qa_create_invoice')}</span>
            </button>
            <button className="quick-action" onClick={() => navigate('payment-new')}>
              <div className="icon"><Icon name="cash" size={16} /></div>
              <span>{t('qa_record_payment')}</span>
            </button>
            <button className="quick-action" onClick={() => navigate('prescription-new')}>
              <div className="icon"><Icon name="prescription" size={16} /></div>
              <span>{t('qa_create_prescription')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Second row: Follow-ups + Recent visits */}
      <div className="dash-grid">
        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('dashboard_followup_widget')}</h3>
              <p className="card-subtitle">{data.follow_ups?.length || 0} upcoming</p>
            </div>
          </div>
          {data.follow_ups && data.follow_ups.length > 0 ? (
            <div className="timeline">
              {data.follow_ups.slice(0, 6).map((f: any) => (
                <div key={f.id} className="timeline-item">
                  <div className="time">{formatDate(f.follow_up_date)}</div>
                  <div className="title">{f.patient_name}</div>
                  <div className="meta">{f.chief_complaint || '-'}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow icon="check" message="No follow-ups scheduled" />
          )}
        </div>

        <div className="card card-elevated">
          <div className="card-header">
            <div>
              <h3 className="card-title">{t('dashboard_recent_completed')}</h3>
              <p className="card-subtitle">Last clinical visits</p>
            </div>
          </div>
          {data.recent_visits && data.recent_visits.length > 0 ? (
            <div className="timeline">
              {data.recent_visits.slice(0, 6).map((v: any) => (
                <div key={v.id} className="timeline-item">
                  <div className="time">{formatDate(v.visit_date)} {formatTime(v.visit_time)}</div>
                  <div className="title">{v.patient_name}</div>
                  <div className="meta">{v.diagnosis || v.chief_complaint || '-'}</div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyRow icon="visits" message="No recent visits" />
          )}
        </div>
      </div>
    </div>
  );
}

function apptStatusLabel(s: string): string {
  return `appt_status_${s}`;
}

function MetricCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className="metric-card">
      <div className={`icon-bg ${accent ? 'accent' : ''}`}><Icon name={icon} size={20} /></div>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

function EmptyRow({ icon, message }: { icon: string; message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 20px', color: '#8a8a8a', fontSize: 13 }}>
      <Icon name={icon} size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div>{message}</div>
    </div>
  );
}