import * as fs from 'fs';
import { DatabaseService } from '../db/database';
import { SettingsService } from '../services/settings';
import { renderInvoiceHtml, renderReceiptHtml, renderPrescriptionHtml, renderReportHtml } from './templates';

export class PdfService {
  async generateInvoice(id: number, targetPath: string, db: DatabaseService, settings: SettingsService): Promise<string> {
    const s = settings.get();
    const invoice = db.one('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoice) throw new Error('Invoice not found');
    const items = db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    const patient = db.one('SELECT * FROM patients WHERE id = ?', [invoice.patient_id]);
    const html = renderInvoiceHtml(invoice, items, patient, s);
    return this.writePdf(html, targetPath, s);
  }

  async generateReceipt(id: number, targetPath: string, db: DatabaseService, settings: SettingsService): Promise<string> {
    const s = settings.get();
    const payment = db.one('SELECT * FROM payments WHERE id = ?', [id]);
    if (!payment) throw new Error('Payment not found');
    const patient = db.one('SELECT * FROM patients WHERE id = ?', [payment.patient_id]);
    let invoice = null;
    if (payment.invoice_id) invoice = db.one('SELECT * FROM invoices WHERE id = ?', [payment.invoice_id]);
    const html = renderReceiptHtml(payment, patient, invoice, s);
    return this.writePdf(html, targetPath, s);
  }

  async generatePrescription(id: number, targetPath: string, db: DatabaseService, settings: SettingsService): Promise<string> {
    const s = settings.get();
    const presc = db.one('SELECT * FROM prescriptions WHERE id = ?', [id]);
    if (!presc) throw new Error('Prescription not found');
    const items = db.all('SELECT * FROM prescription_items WHERE prescription_id = ?', [id]);
    const patient = db.one('SELECT * FROM patients WHERE id = ?', [presc.patient_id]);
    const html = renderPrescriptionHtml(presc, items, patient, s);
    return this.writePdf(html, targetPath, s);
  }

  async generateReport(type: string, targetPath: string, db: DatabaseService, settings: SettingsService, options?: any): Promise<string> {
    const s = settings.get();
    const { PrinterService } = require('../print/printer');
    const printer = new PrinterService();
    const data = printer.gatherReportData(type, db, options || {});
    const html = renderReportHtml(type, data, s, options || {});
    return this.writePdf(html, targetPath, s);
  }

  async generatePatientSummary(id: number, targetPath: string, db: DatabaseService, settings: SettingsService): Promise<string> {
    const s = settings.get();
    const patient = db.one('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) throw new Error('Patient not found');
    const visits = db.all('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC', [id]);
    const invoices = db.all('SELECT * FROM invoices WHERE patient_id = ? ORDER BY invoice_date DESC', [id]);
    const prescriptions = db.all('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC', [id]);
    const html = renderPatientSummaryHtml(patient, visits, invoices, prescriptions, s);
    return this.writePdf(html, targetPath, s);
  }

  private async writePdf(html: string, targetPath: string, settings: any): Promise<string> {
    // We use the BrowserWindow printToPDF API for high-fidelity PDF generation
    const { BrowserWindow } = require('electron');
    const win = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    const data = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: (settings?.printing?.paperSize || 'A4') as any,
      landscape: settings?.printing?.orientation === 'landscape',
      margins: { top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
    });
    fs.writeFileSync(targetPath, data);
    win.close();
    return targetPath;
  }
}

function renderPatientSummaryHtml(patient: any, visits: any[], invoices: any[], prescriptions: any[], settings: any): string {
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Patient Summary</title>
<style>${pdfStyles}</style>
</head><body>
<div class="doc">
  ${renderHeader(settings)}
  <h2 class="doc-title">Patient Summary</h2>
  <div class="section">
    <h3>Patient Information</h3>
    <table class="kv"><tr><td>Name</td><td>${esc(patient.name)}</td></tr>
      <tr><td>Code</td><td>${esc(patient.code)}</td></tr>
      <tr><td>Gender</td><td>${esc(patient.gender || '-')}</td></tr>
      <tr><td>Date of Birth</td><td>${formatDate(patient.date_of_birth)}</td></tr>
      <tr><td>Phone</td><td>${esc(patient.phone || '-')}</td></tr>
      <tr><td>Address</td><td>${esc(patient.address || '-')}</td></tr>
    </table>
  </div>
  <div class="section">
    <h3>Visit History (${visits.length})</h3>
    ${visits.length ? `<table class="grid"><thead><tr><th>Date</th><th>Chief Complaint</th><th>Diagnosis</th></tr></thead>
      <tbody>${visits.map(v => `<tr><td>${formatDate(v.visit_date)}</td><td>${esc(v.chief_complaint || '-')}</td><td>${esc(v.diagnosis || '-')}</td></tr>`).join('')}</tbody></table>` : '<p>No visits recorded.</p>'}
  </div>
  <div class="section">
    <h3>Invoices (${invoices.length})</h3>
    ${invoices.length ? `<table class="grid"><thead><tr><th>Number</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
      <tbody>${invoices.map(i => `<tr><td>${esc(i.invoice_number)}</td><td>${formatDate(i.invoice_date)}</td><td>${(i.total || 0).toFixed(2)}</td><td>${(i.paid || 0).toFixed(2)}</td><td>${esc(i.status)}</td></tr>`).join('')}</tbody></table>` : '<p>No invoices.</p>'}
  </div>
  <div class="section">
    <h3>Prescriptions (${prescriptions.length})</h3>
    ${prescriptions.length ? `<table class="grid"><thead><tr><th>Number</th><th>Date</th><th>Diagnosis</th></tr></thead>
      <tbody>${prescriptions.map(p => `<tr><td>${esc(p.prescription_number)}</td><td>${formatDate(p.prescription_date)}</td><td>${esc(p.diagnosis || '-')}</td></tr>`).join('')}</tbody></table>` : '<p>No prescriptions.</p>'}
  </div>
  ${renderFooter(settings)}
</div>
</body></html>`;
}

function esc(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderHeader(s: any): string {
  return `<div class="header">
    <div class="logo-block">
      ${s.clinic.logo ? `<img src="${esc(s.clinic.logo)}" class="logo" />` : ''}
    </div>
    <div class="clinic-info">
      <h1 class="clinic-name">${esc(s.clinic.name || 'Clinic Name')}</h1>
      <div>${esc(s.clinic.address || '')}${s.clinic.city ? ', ' + esc(s.clinic.city) : ''}</div>
      <div>${esc(s.clinic.country || '')}${s.clinic.phone ? ' • ' + esc(s.clinic.phone) : ''}</div>
    </div>
  </div>`;
}

function renderFooter(s: any): string {
  return `<div class="footer">
    <div>${esc(s.clinic.name || '')}${s.clinic.phone ? ' • ' + esc(s.clinic.phone) : ''}</div>
    ${s.invoice.footerNote ? `<div class="muted">${esc(s.invoice.footerNote)}</div>` : ''}
  </div>`;
}

const pdfStyles = `
  @page { size: A4; margin: 0; }
  body { font-family: 'Segoe UI', 'Inter', system-ui, sans-serif; color: #1a1a1a; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
  .doc { padding: 30px 36px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 2px solid #0e6b6f; margin-bottom: 24px; }
  .logo { width: 64px; height: 64px; object-fit: contain; }
  .clinic-name { font-size: 22px; font-weight: 600; margin: 0; color: #0e6b6f; letter-spacing: 0.5px; }
  .clinic-info { font-size: 11px; color: #4a4a4a; line-height: 1.5; }
  .doc-title { font-size: 18px; font-weight: 600; margin: 0 0 20px; color: #1a1a1a; }
  .section { margin-bottom: 22px; }
  .section h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #0e6b6f; margin: 0 0 10px; padding-bottom: 6px; border-bottom: 1px solid #e8e2d5; }
  .grid { width: 100%; border-collapse: collapse; font-size: 11px; }
  .grid th { background: #f7f5f1; color: #4a4a4a; font-weight: 600; text-align: left; padding: 8px 10px; border-bottom: 1px solid #d9d2bf; }
  .grid td { padding: 7px 10px; border-bottom: 1px solid #ece6d6; }
  .grid tr:last-child td { border-bottom: none; }
  .kv { width: 100%; font-size: 11px; }
  .kv td { padding: 5px 10px; vertical-align: top; }
  .kv td:first-child { width: 35%; font-weight: 600; color: #6a6a6a; }
  .totals { margin-top: 16px; }
  .totals td { padding: 5px 10px; font-size: 11px; }
  .totals .grand { font-size: 14px; font-weight: 700; color: #0e6b6f; border-top: 2px solid #0e6b6f; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e2d5; font-size: 10px; color: #6a6a6a; text-align: center; }
  .footer .muted { color: #8a8a8a; margin-top: 4px; font-style: italic; }
  p { font-size: 11px; color: #6a6a6a; margin: 6px 0; }
`;