// HTML templates for invoices, receipts, prescriptions, and reports
// These render complete printable HTML documents.

const pdfStyles = `
  @page { size: A4; margin: 0; }
  body { font-family: 'Segoe UI', 'Inter', system-ui, sans-serif; color: #1a1a1a; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
  .doc { padding: 30px 36px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: flex-start; gap: 16px; padding-bottom: 18px; border-bottom: 2px solid #0e6b6f; margin-bottom: 22px; }
  .logo-block { flex-shrink: 0; }
  .logo { width: 72px; height: 72px; object-fit: contain; }
  .clinic-info { flex: 1; }
  .clinic-name { font-size: 22px; font-weight: 600; margin: 0 0 4px; color: #0e6b6f; letter-spacing: 0.3px; }
  .clinic-info .row { font-size: 11px; color: #4a4a4a; line-height: 1.5; }
  .doc-title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; }
  .doc-title { font-size: 24px; font-weight: 700; margin: 0; color: #1a1a1a; letter-spacing: 0.5px; }
  .doc-meta { text-align: right; font-size: 11px; color: #4a4a4a; }
  .doc-meta strong { color: #1a1a1a; font-size: 13px; display: block; margin-bottom: 2px; }
  .parties { display: flex; gap: 30px; margin-bottom: 24px; }
  .party { flex: 1; padding: 14px 16px; background: #fbf9f4; border-left: 3px solid #b58a4a; }
  .party-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #8a8a8a; margin-bottom: 6px; }
  .party-name { font-size: 14px; font-weight: 600; margin: 0 0 4px; color: #1a1a1a; }
  .party-detail { font-size: 11px; color: #4a4a4a; line-height: 1.6; }
  .section { margin-bottom: 22px; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #0e6b6f; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e8e2d5; font-weight: 600; }
  .grid { width: 100%; border-collapse: collapse; font-size: 11px; }
  .grid th { background: #f7f5f1; color: #4a4a4a; font-weight: 600; text-align: left; padding: 9px 10px; border-bottom: 1.5px solid #d9d2bf; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  .grid td { padding: 9px 10px; border-bottom: 1px solid #ece6d6; vertical-align: top; }
  .grid tr:last-child td { border-bottom: none; }
  .grid td.num, .grid th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .totals-section { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals { width: 280px; font-size: 11px; }
  .totals .row { display: flex; justify-content: space-between; padding: 5px 10px; }
  .totals .row.grand { font-size: 14px; font-weight: 700; color: #0e6b6f; border-top: 2px solid #0e6b6f; margin-top: 6px; padding-top: 10px; }
  .totals .row .label { color: #4a4a4a; }
  .totals .row .val { font-variant-numeric: tabular-nums; }
  .notes-box { padding: 12px 16px; background: #fbf9f4; border-left: 3px solid #b58a4a; font-size: 11px; line-height: 1.6; color: #4a4a4a; margin-top: 12px; }
  .notes-box .lbl { font-weight: 600; color: #1a1a1a; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.8px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; }
  .status-paid { background: #d4ead0; color: #2e6b2a; }
  .status-partial { background: #fdf0c8; color: #8a6d10; }
  .status-unpaid { background: #f8d7d7; color: #a02525; }
  .sign-block { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; color: #4a4a4a; }
  .sign-block .col { text-align: center; min-width: 200px; }
  .sign-block .line { border-top: 1px solid #6a6a6a; padding-top: 6px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e2d5; font-size: 10px; color: #6a6a6a; text-align: center; line-height: 1.6; }
  .footer .accent { color: #0e6b6f; font-weight: 600; }
  p { font-size: 11px; color: #6a6a6a; margin: 4px 0; }
  .rx-symbol { font-family: 'Times New Roman', serif; font-size: 28px; color: #0e6b6f; font-weight: 700; }
  .rx-line { height: 1.5px; background: #0e6b6f; margin: 4px 0 16px; }
  .rx-list { padding-left: 0; list-style: none; }
  .rx-item { padding: 10px 0; border-bottom: 1px dashed #e8e2d5; }
  .rx-item:last-child { border-bottom: none; }
  .rx-item .med { font-weight: 600; font-size: 12px; color: #1a1a1a; margin-bottom: 3px; }
  .rx-item .detail { font-size: 11px; color: #4a4a4a; line-height: 1.7; }
  .rx-item .note { font-size: 10px; color: #6a6a6a; font-style: italic; margin-top: 2px; }
  .summary-cards { display: flex; gap: 16px; margin-bottom: 24px; }
  .summary-card { flex: 1; padding: 16px 18px; background: #fbf9f4; border-radius: 6px; border-left: 3px solid #0e6b6f; }
  .summary-card .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #8a8a8a; }
  .summary-card .val { font-size: 22px; font-weight: 700; color: #1a1a1a; margin-top: 4px; font-variant-numeric: tabular-nums; }
  .summary-card .sub { font-size: 11px; color: #4a4a4a; margin-top: 4px; }
`;

function esc(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(d: string): string {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

function formatMoney(n: number, currency = '৳'): string {
  if (n === null || n === undefined || isNaN(n)) return `${currency} 0.00`;
  const num = Number(n).toFixed(2);
  const parts = num.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${parts.join('.')}`;
}

function renderHeader(s: any): string {
  return `<div class="header">
    <div class="logo-block">
      ${s.clinic.logo ? `<img src="${esc(s.clinic.logo)}" class="logo" />` : ''}
    </div>
    <div class="clinic-info">
      <h1 class="clinic-name">${esc(s.clinic.name || 'Clinic Name')}</h1>
      <div class="row">${esc(s.clinic.address || '')}${s.clinic.city ? ', ' + esc(s.clinic.city) : ''}</div>
      <div class="row">${esc(s.clinic.country || '')}${s.clinic.phone ? ' • ' + esc(s.clinic.phone) : ''}</div>
      ${s.clinic.email ? `<div class="row">${esc(s.clinic.email)}</div>` : ''}
    </div>
  </div>`;
}

function renderFooter(s: any): string {
  const footerText = s.clinic.branding?.footerText || `${s.clinic.name || 'Clinic'} • ${s.clinic.phone || ''}`;
  return `<div class="footer">
    <div class="accent">${esc(footerText)}</div>
    ${s.invoice.footerNote ? `<div>${esc(s.invoice.footerNote)}</div>` : ''}
  </div>`;
}

function statusBadge(status: string): string {
  const cls = status === 'paid' ? 'status-paid' : status === 'partial' ? 'status-partial' : 'status-unpaid';
  const txt = status === 'paid' ? 'Paid' : status === 'partial' ? 'Partially Paid' : status === 'unpaid' ? 'Unpaid' : status;
  return `<span class="status-badge ${cls}">${esc(txt)}</span>`;
}

export function renderInvoiceHtml(invoice: any, items: any[], patient: any, s: any): string {
  const currency = s.clinic.currencySymbol || '৳';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Invoice ${esc(invoice.invoice_number)}</title>
<style>${pdfStyles}</style>
</head><body>
<div class="doc">
  ${renderHeader(s)}
  <div class="doc-title-row">
    <h2 class="doc-title">INVOICE</h2>
    <div class="doc-meta">
      <strong>${esc(invoice.invoice_number)}</strong>
      <div>Date: ${formatDate(invoice.invoice_date)}</div>
      ${invoice.due_date ? `<div>Due: ${formatDate(invoice.due_date)}</div>` : ''}
      <div style="margin-top:6px">${statusBadge(invoice.status)}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Bill To</div>
      <div class="party-name">${esc(patient?.name || '')}</div>
      <div class="party-detail">
        ${patient?.code ? `ID: ${esc(patient.code)}<br>` : ''}
        ${patient?.phone ? 'Phone: ' + esc(patient.phone) + '<br>' : ''}
        ${patient?.address ? esc(patient.address) : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">From</div>
      <div class="party-name">${esc(s.clinic.name || '')}</div>
      <div class="party-detail">
        ${s.dentist.name ? esc(s.dentist.title || 'Dr.') + ' ' + esc(s.dentist.name) + '<br>' : ''}
        ${s.dentist.degree ? esc(s.dentist.degree) + '<br>' : ''}
        ${s.dentist.registrationNumber ? 'Reg: ' + esc(s.dentist.registrationNumber) : ''}
      </div>
    </div>
  </div>
  <div class="section">
    <table class="grid">
      <thead>
        <tr><th style="width:50%">Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Total</th></tr>
      </thead>
      <tbody>
        ${items.map(it => `<tr>
          <td>${esc(it.description)}${it.tooth ? `<br><span style="color:#8a8a8a;font-size:10px">Tooth: ${esc(it.tooth)}</span>` : ''}</td>
          <td class="num">${(it.quantity || 1).toFixed(2)}</td>
          <td class="num">${formatMoney(it.unit_price, currency)}</td>
          <td class="num">${formatMoney(it.line_total, currency)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div class="totals-section">
      <div class="totals">
        <div class="row"><span class="label">Subtotal</span><span class="val">${formatMoney(invoice.subtotal, currency)}</span></div>
        ${invoice.discount ? `<div class="row"><span class="label">Discount</span><span class="val">-${formatMoney(invoice.discount, currency)}</span></div>` : ''}
        ${invoice.tax ? `<div class="row"><span class="label">Tax</span><span class="val">${formatMoney(invoice.tax, currency)}</span></div>` : ''}
        <div class="row grand"><span class="label">Total</span><span class="val">${formatMoney(invoice.total, currency)}</span></div>
        ${invoice.paid > 0 ? `<div class="row"><span class="label">Paid</span><span class="val">${formatMoney(invoice.paid, currency)}</span></div>` : ''}
        ${invoice.due > 0 ? `<div class="row"><span class="label">Due</span><span class="val" style="color:#a02525;font-weight:600">${formatMoney(invoice.due, currency)}</span></div>` : ''}
      </div>
    </div>
  </div>
  ${invoice.notes || invoice.terms ? `<div class="section">
    ${invoice.notes ? `<div class="notes-box"><div class="lbl">Notes</div>${esc(invoice.notes)}</div>` : ''}
    ${invoice.terms ? `<div class="notes-box"><div class="lbl">Terms & Conditions</div>${esc(invoice.terms)}</div>` : ''}
  </div>` : ''}
  ${s.invoice.showSignature ? `<div class="sign-block">
    <div class="col"></div>
    <div class="col"><div class="line">${esc(s.dentist.name || 'Authorized Signature')}</div></div>
  </div>` : ''}
  ${renderFooter(s)}
</div>
</body></html>`;
}

export function renderReceiptHtml(payment: any, patient: any, invoice: any, s: any): string {
  const currency = s.clinic.currencySymbol || '৳';
  const totalPaid = s.db?.all ? null : null; // not used
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Receipt ${esc(payment.receipt_number)}</title>
<style>${pdfStyles}</style>
</head><body>
<div class="doc">
  ${renderHeader(s)}
  <div class="doc-title-row">
    <h2 class="doc-title">PAYMENT RECEIPT</h2>
    <div class="doc-meta">
      <strong>${esc(payment.receipt_number)}</strong>
      <div>Date: ${formatDate(payment.payment_date)}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Received From</div>
      <div class="party-name">${esc(patient?.name || '')}</div>
      <div class="party-detail">
        ${patient?.code ? 'Patient ID: ' + esc(patient.code) + '<br>' : ''}
        ${patient?.phone ? 'Phone: ' + esc(patient.phone) : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Payment Method</div>
      <div class="party-name">${esc(payment.method || 'Cash')}</div>
      <div class="party-detail">
        ${payment.transaction_id ? 'Transaction: ' + esc(payment.transaction_id) + '<br>' : ''}
        ${payment.reference ? 'Reference: ' + esc(payment.reference) : ''}
      </div>
    </div>
  </div>
  <div class="summary-cards">
    <div class="summary-card">
      <div class="lbl">Amount Received</div>
      <div class="val">${formatMoney(payment.amount, currency)}</div>
    </div>
    ${invoice ? `<div class="summary-card">
      <div class="lbl">Related Invoice</div>
      <div class="val" style="font-size:18px">${esc(invoice.invoice_number)}</div>
      <div class="sub">${invoice.status === 'paid' ? 'Invoice settled in full' : invoice.status === 'partial' ? 'Partially settled' : ''}</div>
    </div>` : ''}
    ${invoice ? `<div class="summary-card">
      <div class="lbl">${invoice.status === 'paid' ? 'Balance' : 'Remaining Balance'}</div>
      <div class="val" style="color:${invoice.due > 0 ? '#a02525' : '#2e6b2a'}">${formatMoney(invoice.due, currency)}</div>
      <div class="sub">${invoice.status === 'paid' ? 'No outstanding balance' : 'Outstanding on invoice'}</div>
    </div>` : ''}
  </div>
  ${payment.notes ? `<div class="notes-box"><div class="lbl">Notes</div>${esc(payment.notes)}</div>` : ''}
  <div class="sign-block">
    <div class="col"><div class="line">Received By</div></div>
    <div class="col"><div class="line">Authorized Signature</div></div>
  </div>
  ${renderFooter(s)}
</div>
</body></html>`;
}

export function renderPrescriptionHtml(presc: any, items: any[], patient: any, s: any): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Prescription ${esc(presc.prescription_number)}</title>
<style>${pdfStyles}</style>
</head><body>
<div class="doc">
  ${renderHeader(s)}
  <div class="doc-title-row">
    <h2 class="doc-title">PRESCRIPTION</h2>
    <div class="doc-meta">
      <strong>${esc(presc.prescription_number)}</strong>
      <div>Date: ${formatDate(presc.prescription_date)}</div>
    </div>
  </div>
  <div class="parties">
    <div class="party">
      <div class="party-label">Patient</div>
      <div class="party-name">${esc(patient?.name || '')}</div>
      <div class="party-detail">
        ${patient?.code ? 'ID: ' + esc(patient.code) : ''}
        ${patient?.age ? ' • Age: ' + esc(patient.age) : ''}
        ${patient?.gender ? ' • ' + esc(patient.gender) : ''}
        ${patient?.phone ? '<br>Phone: ' + esc(patient.phone) : ''}
      </div>
    </div>
    <div class="party">
      <div class="party-label">Prescribed By</div>
      <div class="party-name">${esc(s.dentist.title || 'Dr.')} ${esc(s.dentist.name || '')}</div>
      <div class="party-detail">
        ${s.dentist.degree ? esc(s.dentist.degree) + '<br>' : ''}
        ${s.dentist.registrationNumber ? 'Reg: ' + esc(s.dentist.registrationNumber) : ''}
      </div>
    </div>
  </div>
  ${presc.diagnosis ? `<div class="section">
    <div class="section-title">Diagnosis</div>
    <div>${esc(presc.diagnosis)}</div>
  </div>` : ''}
  <div class="section">
    <div class="rx-symbol">℞</div>
    <div class="rx-line"></div>
    <ul class="rx-list">
      ${items.map((it, i) => `<li class="rx-item">
        <div class="med">${i + 1}. ${esc(it.medicine)}${it.strength ? ' • ' + esc(it.strength) : ''}</div>
        <div class="detail">
          ${it.dosage ? '<strong>' + esc(it.dosage) + '</strong> ' : ''}
          ${it.frequency ? ' • ' + esc(it.frequency) : ''}
          ${it.duration ? ' • for ' + esc(it.duration) : ''}
          ${it.quantity ? ' • Qty: ' + esc(it.quantity) : ''}
        </div>
        ${it.instructions ? `<div class="detail" style="margin-top:2px">${esc(it.instructions)}</div>` : ''}
        ${it.food_relation && it.food_relation !== 'any_time' ? `<div class="note">Take ${it.food_relation === 'before_food' ? 'before food' : 'after food'}</div>` : ''}
      </div>`).join('')}
    </ul>
  </div>
  ${presc.notes ? `<div class="notes-box"><div class="lbl">Additional Notes</div>${esc(presc.notes)}</div>` : ''}
  <div class="sign-block">
    <div class="col"></div>
    <div class="col"><div class="line">${esc(s.dentist.title || 'Dr.')} ${esc(s.dentist.name || '')}</div></div>
  </div>
  ${renderFooter(s)}
</div>
</body></html>`;
}

export function renderReportHtml(type: string, data: any, s: any, options: any): string {
  const currency = s.clinic.currencySymbol || '৳';
  const from = options?.from || '';
  const to = options?.to || new Date().toISOString().split('T')[0];
  let title = '';
  let body = '';

  if (type === 'patients') {
    title = 'Patient Report';
    body = `<div class="summary-cards">
      <div class="summary-card"><div class="lbl">Total Patients</div><div class="val">${data.total || 0}</div></div>
    </div>
    <table class="grid">
      <thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Gender</th><th>Age</th><th>Registered</th></tr></thead>
      <tbody>${(data.list || []).map((p: any) => `<tr>
        <td>${esc(p.code)}</td><td>${esc(p.name)}</td><td>${esc(p.phone || '-')}</td>
        <td>${esc(p.gender || '-')}</td><td>${esc(p.age || '-')}</td><td>${formatDate(p.registered_at)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } else if (type === 'appointments') {
    title = 'Appointment Report';
    const sm = data.summary || {};
    body = `<div class="summary-cards">
      <div class="summary-card"><div class="lbl">Total</div><div class="val">${sm.total || 0}</div></div>
      <div class="summary-card"><div class="lbl">Completed</div><div class="val">${sm.completed || 0}</div></div>
      <div class="summary-card"><div class="lbl">Cancelled</div><div class="val">${sm.cancelled || 0}</div></div>
      <div class="summary-card"><div class="lbl">No-show</div><div class="val">${sm.no_show || 0}</div></div>
    </div>
    <table class="grid">
      <thead><tr><th>Date</th><th>Serial</th><th>Patient</th><th>Reason</th><th>Status</th></tr></thead>
      <tbody>${(data.list || []).map((a: any) => `<tr>
        <td>${formatDate(a.appointment_date)}</td><td>${a.serial_number || '-'}</td>
        <td>${esc(a.patient_name || '')}</td><td>${esc(a.reason || '-')}</td><td>${esc(a.status)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } else if (type === 'billing') {
    title = 'Billing Report';
    const sm = data.summary || {};
    body = `<div class="summary-cards">
      <div class="summary-card"><div class="lbl">Total Invoices</div><div class="val">${sm.total || 0}</div></div>
      <div class="summary-card"><div class="lbl">Total Billed</div><div class="val">${formatMoney(sm.total_amount || 0, currency)}</div></div>
      <div class="summary-card"><div class="lbl">Total Collected</div><div class="val">${formatMoney(sm.total_paid || 0, currency)}</div></div>
      <div class="summary-card"><div class="lbl">Outstanding</div><div class="val" style="color:#a02525">${formatMoney(sm.total_due || 0, currency)}</div></div>
    </div>
    <table class="grid">
      <thead><tr><th>Number</th><th>Date</th><th>Patient</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th><th>Status</th></tr></thead>
      <tbody>${(data.list || []).map((i: any) => `<tr>
        <td>${esc(i.invoice_number)}</td><td>${formatDate(i.invoice_date)}</td>
        <td>${esc(i.patient_name || '')}</td>
        <td class="num">${formatMoney(i.total || 0, currency)}</td>
        <td class="num">${formatMoney(i.paid || 0, currency)}</td>
        <td class="num">${formatMoney(i.due || 0, currency)}</td>
        <td>${esc(i.status)}</td>
      </tr>`).join('')}</tbody>
    </table>`;
  } else if (type === 'finance') {
    title = 'Financial Report';
    const sm = data.summary || { income: 0, expenses: 0 };
    const net = (sm.income || 0) - (sm.expenses || 0);
    body = `<div class="summary-cards">
      <div class="summary-card"><div class="lbl">Income</div><div class="val" style="color:#2e6b2a">${formatMoney(sm.income || 0, currency)}</div></div>
      <div class="summary-card"><div class="lbl">Expenses</div><div class="val" style="color:#a02525">${formatMoney(sm.expenses || 0, currency)}</div></div>
      <div class="summary-card"><div class="lbl">Net</div><div class="val" style="color:${net >= 0 ? '#2e6b2a' : '#a02525'}">${formatMoney(net, currency)}</div></div>
    </div>
    <div class="section-title" style="margin-top:18px">Income</div>
    <table class="grid">
      <thead><tr><th>Date</th><th>Receipt</th><th>Patient</th><th>Method</th><th class="num">Amount</th></tr></thead>
      <tbody>${(data.payments || []).map((p: any) => `<tr>
        <td>${formatDate(p.payment_date)}</td><td>${esc(p.receipt_number)}</td>
        <td>${esc(p.patient_name || '')}</td><td>${esc(p.method)}</td>
        <td class="num">${formatMoney(p.amount, currency)}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#8a8a8a">No income recorded</td></tr>'}</tbody>
    </table>
    <div class="section-title" style="margin-top:18px">Expenses</div>
    <table class="grid">
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="num">Amount</th></tr></thead>
      <tbody>${(data.expenses || []).map((e: any) => `<tr>
        <td>${formatDate(e.expense_date)}</td><td>${esc(e.category)}</td>
        <td>${esc(e.description || '')}</td>
        <td class="num">${formatMoney(e.amount, currency)}</td>
      </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:#8a8a8a">No expenses recorded</td></tr>'}</tbody>
    </table>`;
  } else if (type === 'staff') {
    title = 'Staff Report';
    body = `<table class="grid">
      <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th>Status</th></tr></thead>
      <tbody>${(data.staff || []).map((s: any) => `<tr>
        <td>${esc(s.staff_id)}</td><td>${esc(s.name)}</td><td>${esc(s.role || '-')}</td>
        <td>${esc(s.phone || '-')}</td><td class="num">${formatMoney(s.salary || 0, currency)}</td>
        <td>${esc(s.status)}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="section-title" style="margin-top:18px">Salary Payments</div>
    <table class="grid">
      <thead><tr><th>Date</th><th>Staff</th><th>Period</th><th>Method</th><th class="num">Amount</th></tr></thead>
      <tbody>${(data.salaries || []).map((s: any) => `<tr>
        <td>${formatDate(s.payment_date)}</td><td>${esc(s.staff_name)}</td>
        <td>${esc(s.period || '-')}</td><td>${esc(s.method)}</td>
        <td class="num">${formatMoney(s.amount, currency)}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#8a8a8a">No salary payments</td></tr>'}</tbody>
    </table>`;
  }

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>${pdfStyles}</style>
</head><body>
<div class="doc">
  ${renderHeader(s)}
  <div class="doc-title-row">
    <h2 class="doc-title">${title.toUpperCase()}</h2>
    <div class="doc-meta">
      <strong>${formatDate(from)} - ${formatDate(to)}</strong>
      <div>Generated: ${new Date().toLocaleString('en-GB')}</div>
    </div>
  </div>
  ${body}
  ${renderFooter(s)}
</div>
</body></html>`;
}