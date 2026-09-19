import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { EmptyState, toast } from '../state/toast';
import { formatDateTime } from '../utils/format';

export function NotificationsView() {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.api.notifications.list();
      setList(r || []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const markRead = async (id: number) => {
    await window.api.notifications.markRead(id);
    load();
  };

  const dismiss = async (id: number) => {
    await window.api.notifications.dismiss(id);
    toast('Notification dismissed', 'success');
    load();
  };

  if (loading) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner spinner-lg" /></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('notifications_center')}</h1>
          <p className="page-subtitle">{list.length} active notifications</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={load}>
            <Icon name="refresh" size={14} /> {t('common_refresh')}
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card"><EmptyState icon="check" title={t('empty_notifications_title')} description={t('empty_notifications_desc')} /></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {list.map((n, i) => (
            <div key={n.id} style={{
              padding: '14px 20px',
              borderBottom: i < list.length - 1 ? '1px solid var(--color-divider)' : 'none',
              background: n.is_read ? 'transparent' : 'rgba(14, 107, 111, 0.03)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: severityColor(n.severity),
                color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <Icon name={severityIcon(n.severity)} size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.title}</div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 2 }}>{n.message}</div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 11, marginTop: 4 }}>{formatDateTime(n.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {!n.is_read && (
                  <button className="btn btn-sm btn-secondary" onClick={() => markRead(n.id)}>{t('notifications_mark_read')}</button>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => dismiss(n.id)}>
                  <Icon name="close" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function severityColor(s: string): string {
  if (s === 'critical') return 'var(--color-danger)';
  if (s === 'warning') return 'var(--color-warning)';
  if (s === 'success') return 'var(--color-success)';
  return 'var(--color-info)';
}

function severityIcon(s: string): string {
  if (s === 'critical') return 'warning';
  if (s === 'warning') return 'warning';
  if (s === 'success') return 'check';
  return 'info';
}