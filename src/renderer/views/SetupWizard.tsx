import * as React from 'react';
import { Icon } from '../components/Icon';
import { setLang } from '../i18n/i18n';

interface SetupWizardProps {
  onComplete: () => void;
}

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = React.useState(0);
  const [data, setData] = React.useState<any>({
    clinic: {
      name: '',
      logo: '',
      phone: '',
      altPhone: '',
      email: '',
      website: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      registration: '',
      taxId: '',
      currency: 'BDT',
      currencySymbol: '৳',
      invoicePrefix: 'INV',
      receiptPrefix: 'RCP'
    },
    dentist: {
      name: '',
      title: 'Dr.',
      degree: '',
      registrationNumber: '',
      specialization: '',
      phone: '',
      email: '',
      signature: ''
    },
    operational: {
      workingDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'],
      openingTime: '09:00',
      closingTime: '20:00',
      appointmentDuration: 30,
      followUpDuration: 30,
      language: 'en',
      dateFormat: 'DD MMM YYYY',
      timeFormat: 'HH:mm',
      numberFormat: 'en-IN'
    }
  });

  const updateClinic = (k: string, v: any) => setData((d: any) => ({ ...d, clinic: { ...d.clinic, [k]: v } }));
  const updateDentist = (k: string, v: any) => setData((d: any) => ({ ...d, dentist: { ...d.dentist, [k]: v } }));
  const updateOperational = (k: string, v: any) => setData((d: any) => ({ ...d, operational: { ...d.operational, [k]: v } }));

  const next = () => setStep(s => Math.min(2, s + 1));
  const prev = () => setStep(s => Math.max(0, s - 1));

  const submit = async () => {
    try {
      await window.api.settings.completeSetup(data);
      if (data.operational.language) setLang(data.operational.language);
      onComplete();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard">
        <div className="wizard-header">
          <h1>Welcome to Dentiva</h1>
          <p>Let us set up your clinic in just a few steps</p>
          <div className="wizard-steps">
            <div className={`wizard-step ${step >= 0 ? 'active' : ''}`} />
            <div className={`wizard-step ${step >= 1 ? 'active' : ''}`} />
            <div className={`wizard-step ${step >= 2 ? 'active' : ''}`} />
          </div>
        </div>

        <div className="wizard-body">
          {step === 0 && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Clinic Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Clinic Name <span className="req">*</span></label>
                  <input
                    className="form-input"
                    value={data.clinic.name}
                    onChange={(e) => updateClinic('name', e.target.value)}
                    placeholder="e.g. Smile Dental Care"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <input
                    className="form-input"
                    value={data.clinic.currency}
                    onChange={(e) => updateClinic('currency', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Currency Symbol</label>
                  <input
                    className="form-input"
                    value={data.clinic.currencySymbol}
                    onChange={(e) => updateClinic('currencySymbol', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={data.clinic.phone}
                    onChange={(e) => updateClinic('phone', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={data.clinic.email}
                    onChange={(e) => updateClinic('email', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    className="form-input"
                    value={data.clinic.website}
                    onChange={(e) => updateClinic('website', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  value={data.clinic.address}
                  onChange={(e) => updateClinic('address', e.target.value)}
                />
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input
                    className="form-input"
                    value={data.clinic.city}
                    onChange={(e) => updateClinic('city', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Postal Code</label>
                  <input
                    className="form-input"
                    value={data.clinic.postalCode}
                    onChange={(e) => updateClinic('postalCode', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <input
                    className="form-input"
                    value={data.clinic.country}
                    onChange={(e) => updateClinic('country', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Business Reg.</label>
                  <input
                    className="form-input"
                    value={data.clinic.registration}
                    onChange={(e) => updateClinic('registration', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Tax / VAT ID</label>
                  <input
                    className="form-input"
                    value={data.clinic.taxId}
                    onChange={(e) => updateClinic('taxId', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Dentist Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <select className="form-select" value={data.dentist.title} onChange={(e) => updateDentist('title', e.target.value)}>
                    <option>Dr.</option>
                    <option>Prof.</option>
                    <option>Mr.</option>
                    <option>Mrs.</option>
                    <option>Ms.</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Dentist Name <span className="req">*</span></label>
                  <input
                    className="form-input"
                    value={data.dentist.name}
                    onChange={(e) => updateDentist('name', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Qualification</label>
                  <input
                    className="form-input"
                    value={data.dentist.degree}
                    onChange={(e) => updateDentist('degree', e.target.value)}
                    placeholder="BDS, MDS"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reg. Number</label>
                  <input
                    className="form-input"
                    value={data.dentist.registrationNumber}
                    onChange={(e) => updateDentist('registrationNumber', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Specialization</label>
                <input
                  className="form-input"
                  value={data.dentist.specialization}
                  onChange={(e) => updateDentist('specialization', e.target.value)}
                  placeholder="Orthodontics, Endodontics, etc."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={data.dentist.phone}
                    onChange={(e) => updateDentist('phone', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={data.dentist.email}
                    onChange={(e) => updateDentist('email', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Operational Settings</h2>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Opening Time</label>
                  <input
                    className="form-input"
                    type="time"
                    value={data.operational.openingTime}
                    onChange={(e) => updateOperational('openingTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Closing Time</label>
                  <input
                    className="form-input"
                    type="time"
                    value={data.operational.closingTime}
                    onChange={(e) => updateOperational('closingTime', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Default Appointment Duration (min)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={data.operational.appointmentDuration}
                    onChange={(e) => updateOperational('appointmentDuration', parseInt(e.target.value) || 30)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Follow-up Duration (days)</label>
                  <input
                    className="form-input"
                    type="number"
                    value={data.operational.followUpDuration}
                    onChange={(e) => updateOperational('followUpDuration', parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Invoice Prefix</label>
                  <input
                    className="form-input"
                    value={data.clinic.invoicePrefix}
                    onChange={(e) => updateClinic('invoicePrefix', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Receipt Prefix</label>
                  <input
                    className="form-input"
                    value={data.clinic.receiptPrefix}
                    onChange={(e) => updateClinic('receiptPrefix', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <select className="form-select" value={data.operational.language} onChange={(e) => updateOperational('language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="bn">বাংলা (Bengali)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <span className="step-label">Step {step + 1} of 3</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button className="btn btn-secondary" onClick={prev}>
                <Icon name="arrow_left" size={14} /> Back
              </button>
            )}
            {step < 2 ? (
              <button
                className="btn btn-primary"
                onClick={next}
                disabled={step === 0 && !data.clinic.name}
              >
                Next <Icon name="arrow_right" size={14} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={!data.dentist.name || !data.clinic.name}
              >
                Complete Setup <Icon name="check" size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}