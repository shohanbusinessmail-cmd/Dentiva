import * as React from 'react';
import { Icon } from './Icon';
import { useT } from '../i18n/i18n';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: string, filter?: any) => void;
}

export function GlobalSearch({ open, onClose, onNavigate }: GlobalSearchProps) {
  const t = useT();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setResults(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!query || query.length < 2) { setResults(null); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await window.api.search(query);
        if (!cancelled) setResults(r);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  if (!open) return null;

  const sections = [
    { key: 'patients', title: t('search_patients'), items: results?.patients || [], action: (p: any) => onNavigate('patient-profile', p.id) },
    { key: 'invoices', title: t('search_invoices'), items: results?.invoices || [], action: (i: any) => onNavigate('billing', { openInvoice: i.id }) },
    { key: 'payments', title: t('search_payments'), items: results?.payments || [], action: (p: any) => onNavigate('payments', { openReceipt: p.id }) },
    { key: 'appointments', title: t('search_appointments'), items: results?.appointments || [], action: (a: any) => onNavigate('appointments', { filterAppointment: a.id }) }
  ];

  return (
    <div className="search-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="search-panel">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
        />
        <div className="search-results">
          {!query && (
            <div style={{ padding: 32, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
              Start typing to search across patients, invoices, payments, and appointments.
            </div>
          )}
          {loading && query.length >= 2 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#8a8a8a' }}>
              <div className="spinner" style={{ margin: '0 auto 8px' }} />
            </div>
          )}
          {results && !loading && sections.every(s => s.items.length === 0) && (
            <div style={{ padding: 24, textAlign: 'center', color: '#8a8a8a', fontSize: 13 }}>
              No results found for "{query}"
            </div>
          )}
          {results && sections.map(s => s.items.length > 0 && (
            <div key={s.key} className="search-section">
              <div className="search-section-title">{s.title}</div>
              {s.items.map((it: any) => (
                <div key={`${s.key}-${it.id}`} className="search-result" onClick={() => s.action(it)}>
                  <Icon name={s.key === 'patients' ? 'user' : s.key === 'invoices' ? 'billing' : s.key === 'payments' ? 'cash' : 'calendar'} size={16} />
                  <span>{it.name || it.patient_name || it.invoice_number || it.receipt_number}</span>
                  <span className="meta">{it.code || it.invoice_number || it.receipt_number || it.appointment_date}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}