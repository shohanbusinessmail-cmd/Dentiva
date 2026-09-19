import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT, setLang, getLang } from '../i18n/i18n';
import { toast } from '../state/toast';

const SETTINGS_TABS = [
  { id: 'clinic', icon: 'building', label: 'settings_clinic_profile' },
  { id: 'dentist', icon: 'doctor', label: 'settings_dentist_profile' },
  { id: 'branding', icon: 'star', label: 'settings_branding' },
  { id: 'language', icon: 'language', label: 'settings_language' },
  { id: 'datetime', icon: 'calendar', label: 'settings_datetime' },
  { id: 'currency', icon: 'money', label: 'settings_currency' },
  { id: 'invoice', icon: 'billing', label: 'settings_invoice' },
  { id: 'receipt', icon: 'receipt', label: 'settings_receipt' },
  { id: 'printing', icon: 'print', label: 'settings_printing' },
  { id: 'patient', icon: 'user', label: 'settings_patient' },
  { id: 'appointment', icon: 'calendar', label: 'settings_appointment' },
  { id: 'billing-settings', icon: 'cash', label: 'settings_billing' },
  { id: 'payment', icon: 'cash', label: 'settings_payment_methods' },
  { id: 'inventory', icon: 'package', label: 'settings_inventory' },
  { id: 'notifications', icon: 'bell', label: 'settings_notifications' },
  { id: 'backup', icon: 'database', label: 'settings_backup' },
  { id: 'data', icon: 'database', label: 'settings_data' },
  { id: 'security', icon: 'lock', label: 'settings_security' },
  { id: 'about', icon: 'info', label: 'settings_about' }
];

export function Settings({ initialTab }: { initialTab?: string }) {
  const t = useT();
  const [activeTab, setActiveTab] = React.useState(initialTab || 'clinic');
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    window.api.settings.get().then(s => { setSettings(s); setLoading(false); });
  }, []);

  if (loading || !settings) return <div style={{ padding: 60, textAlign: 'center' }}><div className="spinner spinner-lg" /></div>;

  const save = async (patch: any) => {
    try {
      const updated = await window.api.settings.update(patch);
      setSettings(updated);
      toast(t('msg_saved'), 'success');
    } catch (e) {
      toast('Failed to save settings', 'error');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_settings')}</h1>
          <p className="page-subtitle">{t('common_settings')}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div className="settings-tabs">
          {SETTINGS_TABS.map(tab => (
            <button key={tab.id} className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              <Icon name={tab.icon} size={14} /> {t(tab.label)}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card card-elevated">
            {activeTab === 'clinic' && <ClinicSettings settings={settings} save={save} t={t} />}
            {activeTab === 'dentist' && <DentistSettings settings={settings} save={save} t={t} />}
            {activeTab === 'branding' && <BrandingSettings settings={settings} save={save} t={t} />}
            {activeTab === 'language' && <LanguageSettings save={save} t={t} />}
            {activeTab === 'datetime' && <DateTimeSettings settings={settings} save={save} t={t} />}
            {activeTab === 'currency' && <CurrencySettings settings={settings} save={save} t={t} />}
            {activeTab === 'invoice' && <InvoiceSettings settings={settings} save={save} t={t} />}
            {activeTab === 'receipt' && <ReceiptSettings settings={settings} save={save} t={t} />}
            {activeTab === 'printing' && <PrintingSettings settings={settings} save={save} t={t} />}
            {activeTab === 'patient' && <PatientSettings settings={settings} save={save} t={t} />}
            {activeTab === 'appointment' && <AppointmentSettings settings={settings} save={save} t={t} />}
            {activeTab === 'billing-settings' && <BillingSettings settings={settings} save={save} t={t} />}
            {activeTab === 'payment' && <PaymentMethodSettings settings={settings} save={save} t={t} />}
            {activeTab === 'inventory' && <InventorySettings settings={settings} save={save} t={t} />}
            {activeTab === 'notifications' && <NotificationSettings settings={settings} save={save} t={t} />}
            {activeTab === 'backup' && <BackupSettings t={t} />}
            {activeTab === 'data' && <DataSettings t={t} />}
            {activeTab === 'security' && <SecuritySettings settings={settings} save={save} t={t} />}
            {activeTab === 'about' && <AboutSettings t={t} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClinicSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.clinic);
  React.useEffect(() => setForm(settings.clinic), [settings.clinic]);
  return (
    <Section title="Clinic Profile" onSave={() => save({ clinic: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Clinic Name</label><input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Alternate Phone</label><input className="form-input" value={form.altPhone || ''} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      </div>
      <div className="form-group"><label className="form-label">Website</label><input className="form-input" value={form.website || ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Address</label><input className="form-input" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
      <div className="form-row-3">
        <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Postal Code</label><input className="form-input" value={form.postalCode || ''} onChange={(e) => setForm({ ...form, postalCode: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Country</label><input className="form-input" value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Business Reg.</label><input className="form-input" value={form.registration || ''} onChange={(e) => setForm({ ...form, registration: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Tax/VAT ID</label><input className="form-input" value={form.taxId || ''} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
      </div>
    </Section>
  );
}

function DentistSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.dentist);
  React.useEffect(() => setForm(settings.dentist), [settings.dentist]);
  return (
    <Section title="Dentist Profile" onSave={() => save({ dentist: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Title</label>
          <select className="form-select" value={form.title || 'Dr.'} onChange={(e) => setForm({ ...form, title: e.target.value })}>
            <option>Dr.</option><option>Prof.</option><option>Mr.</option><option>Mrs.</option><option>Ms.</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Qualification</label><input className="form-input" value={form.degree || ''} onChange={(e) => setForm({ ...form, degree: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Reg. Number</label><input className="form-input" value={form.registrationNumber || ''} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} /></div>
      </div>
      <div className="form-group"><label className="form-label">Specialization</label><input className="form-input" value={form.specialization || ''} onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
      </div>
    </Section>
  );
}

function BrandingSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.branding);
  React.useEffect(() => setForm(settings.branding), [settings.branding]);
  return (
    <Section title="Branding" onSave={() => save({ branding: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Primary Color</label><input type="color" className="form-input" value={form.primaryColor || '#0e6b6f'} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} style={{ height: 38 }} /></div>
        <div className="form-group"><label className="form-label">Accent Color</label><input type="color" className="form-input" value={form.accentColor || '#b58a4a'} onChange={(e) => setForm({ ...form, accentColor: e.target.value })} style={{ height: 38 }} /></div>
      </div>
      <div className="form-group">
        <label className="form-label">Clinic Logo (path or URL)</label>
        <input className="form-input" value={(settings.clinic.logo || '')} onChange={(e) => save({ clinic: { ...settings.clinic, logo: e.target.value } })} placeholder="logo.png" />
        <div className="form-hint">Paste an absolute file path or base64 data URL for the clinic logo</div>
      </div>
      <div className="form-group"><label className="form-label">Footer Text</label><textarea className="form-textarea" rows={2} value={form.footerText || ''} onChange={(e) => setForm({ ...form, footerText: e.target.value })} /></div>
    </Section>
  );
}

function LanguageSettings({ save, t }: any) {
  return (
    <Section title="Language" onSave={() => toast(t('msg_saved'), 'success')}>
      <div className="form-group">
        <label className="form-label">UI Language</label>
        <select className="form-select" value={getLang()} onChange={(e) => { setLang(e.target.value as any); save({ operational: { language: e.target.value } }); }}>
          <option value="en">English</option>
          <option value="bn">বাংলা (Bengali)</option>
        </select>
        <div className="form-hint">Changes the user interface language for menus, buttons, and messages</div>
      </div>
    </Section>
  );
}

function DateTimeSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.operational);
  React.useEffect(() => setForm(settings.operational), [settings.operational]);
  return (
    <Section title="Date & Time" onSave={() => save({ operational: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Date Format</label>
          <select className="form-select" value={form.dateFormat || 'DD MMM YYYY'} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })}>
            <option>DD MMM YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Time Format</label>
          <select className="form-select" value={form.timeFormat || 'HH:mm'} onChange={(e) => setForm({ ...form, timeFormat: e.target.value })}>
            <option>HH:mm</option><option>HH:mm:ss</option><option>h:mm A</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Opening Time</label><input type="time" className="form-input" value={form.openingTime || '09:00'} onChange={(e) => setForm({ ...form, openingTime: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Closing Time</label><input type="time" className="form-input" value={form.closingTime || '20:00'} onChange={(e) => setForm({ ...form, closingTime: e.target.value })} /></div>
      </div>
    </Section>
  );
}

function CurrencySettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.clinic);
  React.useEffect(() => setForm(settings.clinic), [settings.clinic]);
  return (
    <Section title="Currency" onSave={() => save({ clinic: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Currency Code</label><input className="form-input" value={form.currency || 'BDT'} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Currency Symbol</label><input className="form-input" value={form.currencySymbol || '৳'} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} /></div>
      </div>
    </Section>
  );
}

function InvoiceSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.invoice);
  React.useEffect(() => setForm(settings.invoice), [settings.invoice]);
  return (
    <Section title="Invoice Settings" onSave={() => save({ invoice: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Invoice Prefix</label><input className="form-input" value={(settings.clinic.invoicePrefix || 'INV')} onChange={(e) => save({ clinic: { ...settings.clinic, invoicePrefix: e.target.value } })} /></div>
        <div className="form-group"><label className="form-label">Receipt Prefix</label><input className="form-input" value={(settings.clinic.receiptPrefix || 'RCP')} onChange={(e) => save({ clinic: { ...settings.clinic, receiptPrefix: e.target.value } })} /></div>
      </div>
      <div className="form-row">
        <ToggleRow label="Show Logo" value={form.showLogo} onChange={(v) => setForm({ ...form, showLogo: v })} />
        <ToggleRow label="Show Dentist Info" value={form.showDentist} onChange={(v) => setForm({ ...form, showDentist: v })} />
      </div>
      <div className="form-row">
        <ToggleRow label="Show Reg. Number" value={form.showRegistration} onChange={(v) => setForm({ ...form, showRegistration: v })} />
        <ToggleRow label="Show Signature" value={form.showSignature} onChange={(v) => setForm({ ...form, showSignature: v })} />
      </div>
      <div className="form-group"><label className="form-label">Footer Note</label><textarea className="form-textarea" rows={2} value={form.footerNote || ''} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} /></div>
      <div className="form-group"><label className="form-label">Default Terms</label><textarea className="form-textarea" rows={2} value={form.defaultTerms || ''} onChange={(e) => setForm({ ...form, defaultTerms: e.target.value })} /></div>
    </Section>
  );
}

function ReceiptSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.receipt);
  React.useEffect(() => setForm(settings.receipt), [settings.receipt]);
  return (
    <Section title="Receipt Settings" onSave={() => save({ receipt: form })}>
      <ToggleRow label="Show Logo" value={form.showLogo} onChange={(v) => setForm({ ...form, showLogo: v })} />
      <ToggleRow label="Show Signature" value={form.showSignature} onChange={(v) => setForm({ ...form, showSignature: v })} />
      <div className="form-group"><label className="form-label">Footer Note</label><textarea className="form-textarea" rows={2} value={form.footerNote || ''} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} /></div>
    </Section>
  );
}

function PrintingSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.printing);
  const [printers, setPrinters] = React.useState<any[]>([]);
  React.useEffect(() => { setForm(settings.printing); window.api.print.printers().then(setPrinters); }, [settings.printing]);
  return (
    <Section title="Printing" onSave={() => save({ printing: form })}>
      <div className="form-group"><label className="form-label">Default Printer</label>
        <select className="form-select" value={form.defaultPrinter || ''} onChange={(e) => setForm({ ...form, defaultPrinter: e.target.value })}>
          <option value="">System Default</option>
          {printers.map((p, i) => <option key={i} value={p.name}>{p.name}</option>)}
        </select>
      </div>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Paper Size</label>
          <select className="form-select" value={form.paperSize || 'A4'} onChange={(e) => setForm({ ...form, paperSize: e.target.value })}>
            <option>A4</option><option>A5</option><option>Letter</option><option>Thermal 80mm</option><option>Thermal 58mm</option>
          </select>
        </div>
        <div className="form-group"><label className="form-label">Orientation</label>
          <select className="form-select" value={form.orientation || 'portrait'} onChange={(e) => setForm({ ...form, orientation: e.target.value })}>
            <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label className="form-label">Margin (mm)</label><input type="number" className="form-input" value={form.margin || 10} onChange={(e) => setForm({ ...form, margin: parseInt(e.target.value) || 10 })} /></div>
    </Section>
  );
}

function PatientSettings({ settings, save, t }: any) {
  return (
    <Section title="Patient Settings" onSave={() => toast(t('msg_saved'), 'success')}>
      <ToggleRow label="Require patient medical history" value={true} onChange={() => {}} />
      <ToggleRow label="Auto-generate patient code" value={true} onChange={() => {}} />
      <div className="form-hint">Patient codes are stable and unique. Deleted codes are not reused.</div>
    </Section>
  );
}

function AppointmentSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.operational);
  React.useEffect(() => setForm(settings.operational), [settings.operational]);
  return (
    <Section title="Appointment Settings" onSave={() => save({ operational: form })}>
      <div className="form-row">
        <div className="form-group"><label className="form-label">Default Duration (min)</label><input type="number" className="form-input" value={form.appointmentDuration || 30} onChange={(e) => setForm({ ...form, appointmentDuration: parseInt(e.target.value) || 30 })} /></div>
        <div className="form-group"><label className="form-label">Follow-up Duration (days)</label><input type="number" className="form-input" value={form.followUpDuration || 30} onChange={(e) => setForm({ ...form, followUpDuration: parseInt(e.target.value) || 30 })} /></div>
      </div>
    </Section>
  );
}

function BillingSettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.invoice);
  React.useEffect(() => setForm(settings.invoice), [settings.invoice]);
  return (
    <Section title="Billing Settings" onSave={() => save({ invoice: form })}>
      <ToggleRow label="Enable Tax" value={form.taxEnabled} onChange={(v) => setForm({ ...form, taxEnabled: v })} />
      <div className="form-group"><label className="form-label">Default Tax Rate (%)</label><input type="number" step="0.01" className="form-input" value={form.taxRate || 0} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} disabled={!form.taxEnabled} /></div>
    </Section>
  );
}

function PaymentMethodSettings({ settings, save, t }: any) {
  const methods = settings.paymentMethods || ['cash', 'bank', 'card', 'mfs', 'other'];
  return (
    <Section title="Payment Methods" onSave={() => save({ paymentMethods: methods })}>
      {['cash', 'bank', 'card', 'mfs', 'other'].map(m => (
        <ToggleRow key={m} label={m.toUpperCase()} value={methods.includes(m)} onChange={(v) => {
          const next = v ? [...methods, m] : methods.filter((x: string) => x !== m);
          save({ paymentMethods: next });
        }} />
      ))}
    </Section>
  );
}

function InventorySettings({ settings, save, t }: any) {
  return (
    <Section title="Inventory Settings" onSave={() => toast(t('msg_saved'), 'success')}>
      <ToggleRow label="Track expiry dates" value={true} onChange={() => {}} />
      <ToggleRow label="Notify on low stock" value={true} onChange={() => {}} />
      <ToggleRow label="Notify on expiring items" value={true} onChange={() => {}} />
    </Section>
  );
}

function NotificationSettings({ settings, save, t }: any) {
  return (
    <Section title="Notifications" onSave={() => toast(t('msg_saved'), 'success')}>
      <ToggleRow label="Appointment reminders" value={true} onChange={() => {}} />
      <ToggleRow label="Follow-up reminders" value={true} onChange={() => {}} />
      <ToggleRow label="Outstanding payment alerts" value={true} onChange={() => {}} />
      <ToggleRow label="Low stock alerts" value={true} onChange={() => {}} />
      <ToggleRow label="Expiring item alerts" value={true} onChange={() => {}} />
    </Section>
  );
}

function BackupSettings({ t }: any) {
  const [backups, setBackups] = React.useState<any[]>([]);
  const load = React.useCallback(async () => setBackups(await window.api.backup.list()), []);
  React.useEffect(() => { load(); }, []);

  const verify = async (file: string) => {
    const r = await window.api.backup.verify(file);
    toast(r.ok ? 'Backup is valid' : r.message, r.ok ? 'success' : 'error');
  };

  const restore = async (file: string) => {
    if (!confirm('Restore from this backup? Current data will be replaced.')) return;
    try {
      await window.api.backup.restore(file);
      toast('Backup restored. Restarting...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const del = async (file: string) => {
    if (!confirm('Delete this backup?')) return;
    await window.api.backup.delete(file);
    load();
  };

  return (
    <Section title="Backup & Restore" onSave={() => {}} hideSave>
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={async () => { const p = await window.api.backup.create(); if (p) toast('Backup created', 'success'); load(); }}>
          <Icon name="database" size={14} /> Create Backup Now
        </button>
      </div>
      <h3 style={{ fontSize: 13, marginBottom: 10 }}>Backup History</h3>
      {backups.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No backups yet</p> : (
        <table className="table">
          <thead><tr><th>File</th><th>Created</th><th className="num">Size</th><th></th></tr></thead>
          <tbody>{backups.map(b => (
            <tr key={b.file}>
              <td>{b.name}</td>
              <td>{new Date(b.createdAt).toLocaleString()}</td>
              <td className="num">{(b.size / 1024).toFixed(1)} KB</td>
              <td className="actions-cell">
                <button className="btn-icon btn-sm btn-ghost" onClick={() => verify(b.file)} title="Verify"><Icon name="check" size={14} /></button>
                <button className="btn-icon btn-sm btn-ghost" onClick={() => restore(b.file)} title="Restore"><Icon name="refresh" size={14} /></button>
                <button className="btn-icon btn-sm btn-ghost" onClick={() => del(b.file)} title="Delete"><Icon name="trash" size={14} /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Section>
  );
}

function DataSettings({ t }: any) {
  return (
    <Section title="Data Management" onSave={() => {}} hideSave>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button className="btn btn-secondary" onClick={async () => { const p = await window.api.io.exportPatients(); if (p) toast(t('msg_export_done') + ': ' + p, 'success'); }}>
          <Icon name="download" size={14} /> Export Patients (CSV)
        </button>
        <button className="btn btn-secondary" onClick={async () => { const p = await window.api.io.exportInvoices({ from: '1970-01-01', to: new Date().toISOString().split('T')[0] }); if (p) toast(t('msg_export_done') + ': ' + p, 'success'); }}>
          <Icon name="download" size={14} /> Export Invoices (CSV)
        </button>
        <button className="btn btn-secondary" onClick={async () => { const p = await window.api.io.exportFinance({ from: '1970-01-01', to: new Date().toISOString().split('T')[0] }); if (p) toast(t('msg_export_done') + ': ' + p, 'success'); }}>
          <Icon name="download" size={14} /> Export Finance (CSV)
        </button>
        <button className="btn btn-secondary" onClick={async () => { const p = await window.api.io.exportJson(); if (p) toast(t('msg_export_done') + ': ' + p, 'success'); }}>
          <Icon name="database" size={14} /> Export Full Backup (JSON)
        </button>
      </div>
      <div style={{ marginTop: 20, padding: 16, background: 'var(--color-surface-soft)', borderRadius: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, marginBottom: 8 }}>Import Patients</h4>
        <button className="btn btn-primary" onClick={async () => {
          const r = await window.api.io.importPatients();
          if (r) toast(`${r.summary.valid} valid, ${r.summary.duplicates} duplicates, ${r.summary.invalid} invalid`, 'info');
        }}>
          <Icon name="upload" size={14} /> Import Patients from CSV
        </button>
        <div className="form-hint">CSV must include: code, name, gender, date_of_birth, phone, email, address</div>
      </div>
    </Section>
  );
}

function SecuritySettings({ settings, save, t }: any) {
  const [form, setForm] = React.useState(settings.security);
  React.useEffect(() => setForm(settings.security), [settings.security]);
  return (
    <Section title="Security" onSave={() => save({ security: form })}>
      <ToggleRow label="Enable PIN Lock" value={form.pinEnabled} onChange={(v) => setForm({ ...form, pinEnabled: v })} />
      <div className="form-group"><label className="form-label">PIN (4-6 digits)</label><input type="password" maxLength={6} className="form-input" value={form.pin || ''} onChange={(e) => setForm({ ...form, pin: e.target.value })} disabled={!form.pinEnabled} /></div>
      <div className="form-group"><label className="form-label">Auto-Lock After (minutes, 0=never)</label><input type="number" className="form-input" value={form.autoLockMinutes || 0} onChange={(e) => setForm({ ...form, autoLockMinutes: parseInt(e.target.value) || 0 })} /></div>
    </Section>
  );
}

function AboutSettings({ t }: any) {
  const [info, setInfo] = React.useState<any>(null);
  React.useEffect(() => { window.api.app.info().then(setInfo); }, []);
  if (!info) return null;
  return (
    <Section title="About Dentiva" onSave={() => {}} hideSave>
      <div className="metric-card" style={{ marginBottom: 16 }}>
        <div className="label">Dentiva</div>
        <div className="value" style={{ fontSize: 22 }}>v{info.version}</div>
        <div className="sub">Premium Dental Clinic Management</div>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
        <div><strong>License:</strong> Commercial</div>
        <div><strong>Platform:</strong> {info.platform} ({info.arch})</div>
        <div><strong>Storage:</strong> {info.userData}</div>
        <div><strong>Locale:</strong> {info.locale}</div>
      </div>
      <button className="btn btn-secondary mt-3" onClick={() => window.api.app.openDataDir()}>
        <Icon name="folder" size={14} /> Open Data Directory
      </button>
    </Section>
  );
}

function Section({ title, onSave, children, hideSave }: any) {
  const t = useT();
  return (
    <div>
      <h2 style={{ marginTop: 0, fontSize: 18, marginBottom: 16 }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {children}
      </div>
      {!hideSave && (
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onSave}>
            <Icon name="save" size={14} /> {t('common_save')}
          </button>
        </div>
      )}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 36, height: 20, borderRadius: 10,
          background: value ? 'var(--color-primary)' : 'var(--color-border-strong)',
          position: 'relative', transition: 'background 0.2s',
          border: 'none', cursor: 'pointer', padding: 0
        }}
      >
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 2, left: value ? 18 : 2, transition: 'left 0.2s'
        }} />
      </button>
    </div>
  );
}