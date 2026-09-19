import { BrowserWindow, webContents, dialog, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../db/database';
import { SettingsService } from '../services/settings';
import { PdfService } from '../pdf/pdf';
import * as os from 'os';

export class PrinterService {
  async listPrinters(): Promise<Electron.PrinterInfo[]> {
    try {
      if (webContents.getAllWebContents().length === 0) return [];
      const wc = webContents.getAllWebContents()[0];
      return await wc.getPrintersAsync();
    } catch {
      return [];
    }
  }

  async printInvoice(id: number, db: DatabaseService, settings: SettingsService, options?: any): Promise<boolean> {
    return this.printHtml(`invoice-${id}`, async () => {
      const s = settings.get();
      const invoice = db.one('SELECT * FROM invoices WHERE id = ?', [id]);
      if (!invoice) throw new Error('Invoice not found');
      const items = db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
      const patient = db.one('SELECT * FROM patients WHERE id = ?', [invoice.patient_id]);
      const { renderInvoiceHtml } = require('../pdf/templates');
      return renderInvoiceHtml(invoice, items, patient, s);
    }, options);
  }

  async printReceipt(id: number, db: DatabaseService, settings: SettingsService, options?: any): Promise<boolean> {
    return this.printHtml(`receipt-${id}`, async () => {
      const s = settings.get();
      const payment = db.one('SELECT * FROM payments WHERE id = ?', [id]);
      if (!payment) throw new Error('Payment not found');
      const patient = db.one('SELECT * FROM patients WHERE id = ?', [payment.patient_id]);
      let invoice = null;
      if (payment.invoice_id) {
        invoice = db.one('SELECT * FROM invoices WHERE id = ?', [payment.invoice_id]);
      }
      const { renderReceiptHtml } = require('../pdf/templates');
      return renderReceiptHtml(payment, patient, invoice, s);
    }, options);
  }

  async printPrescription(id: number, db: DatabaseService, settings: SettingsService, options?: any): Promise<boolean> {
    return this.printHtml(`prescription-${id}`, async () => {
      const s = settings.get();
      const presc = db.one('SELECT * FROM prescriptions WHERE id = ?', [id]);
      if (!presc) throw new Error('Prescription not found');
      const items = db.all('SELECT * FROM prescription_items WHERE prescription_id = ?', [id]);
      const patient = db.one('SELECT * FROM patients WHERE id = ?', [presc.patient_id]);
      const { renderPrescriptionHtml } = require('../pdf/templates');
      return renderPrescriptionHtml(presc, items, patient, s);
    }, options);
  }

  async printReport(type: string, db: DatabaseService, settings: SettingsService, options?: any): Promise<boolean> {
    return this.printHtml(`report-${type}`, async () => {
      const s = settings.get();
      const { renderReportHtml } = require('../pdf/templates');
      const data = this.gatherReportData(type, db, options);
      return renderReportHtml(type, data, s, options);
    }, options);
  }

  gatherReportData(type: string, db: DatabaseService, options: any): any {
    const from = options?.from || '1970-01-01';
    const to = options?.to || new Date().toISOString().split('T')[0];
    if (type === 'patients') {
      return {
        list: db.all('SELECT * FROM patients WHERE deleted = 0 ORDER BY name'),
        total: db.one('SELECT COUNT(*) as c FROM patients WHERE deleted = 0')?.c || 0
      };
    }
    if (type === 'appointments') {
      return {
        list: db.all(
          `SELECT a.*, p.name as patient_name, p.code as patient_code FROM appointments a
           JOIN patients p ON p.id = a.patient_id WHERE appointment_date BETWEEN ? AND ? ORDER BY appointment_date DESC`,
          [from, to]
        ),
        summary: db.one(
          `SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) as cancelled,
           SUM(CASE WHEN status='no_show' THEN 1 ELSE 0 END) as no_show
           FROM appointments WHERE appointment_date BETWEEN ? AND ?`,
          [from, to]
        )
      };
    }
    if (type === 'billing') {
      return {
        list: db.all(
          `SELECT i.*, p.name as patient_name FROM invoices i JOIN patients p ON p.id = i.patient_id
           WHERE invoice_date BETWEEN ? AND ? ORDER BY invoice_date DESC`,
          [from, to]
        ),
        summary: db.one(
          `SELECT COUNT(*) as total, COALESCE(SUM(total),0) as total_amount, COALESCE(SUM(paid),0) as total_paid,
           COALESCE(SUM(due),0) as total_due FROM invoices WHERE invoice_date BETWEEN ? AND ?`,
          [from, to]
        )
      };
    }
    if (type === 'finance') {
      return {
        payments: db.all(
          `SELECT pa.*, p.name as patient_name FROM payments pa JOIN patients p ON p.id = pa.patient_id
           WHERE payment_date BETWEEN ? AND ? ORDER BY payment_date DESC`,
          [from, to]
        ),
        expenses: db.all('SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC', [from, to]),
        summary: {
          income: db.one('SELECT COALESCE(SUM(amount),0) as t FROM payments WHERE payment_date BETWEEN ? AND ?', [from, to])?.t || 0,
          expenses: db.one('SELECT COALESCE(SUM(amount),0) as t FROM expenses WHERE expense_date BETWEEN ? AND ?', [from, to])?.t || 0
        }
      };
    }
    if (type === 'staff') {
      return {
        staff: db.all('SELECT * FROM staff ORDER BY name'),
        salaries: db.all(
          `SELECT ss.*, s.name as staff_name FROM staff_salaries ss JOIN staff s ON s.id = ss.staff_id
           WHERE ss.payment_date BETWEEN ? AND ? ORDER BY ss.payment_date DESC`,
          [from, to]
        )
      };
    }
    return {};
  }

  async printHtml(name: string, htmlProvider: () => Promise<string>, options?: any): Promise<boolean> {
    const html = await htmlProvider();
    // Create a hidden BrowserWindow for printing
    const win = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });
    // Use data URL
    await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return new Promise<boolean>((resolve) => {
      win.webContents.print({
        silent: !!options?.silent,
        printBackground: true,
        deviceName: options?.printer || '',
        copies: options?.copies || 1,
        pageSize: options?.paperSize as any || 'A4',
        margins: { marginType: options?.margins || 'default' },
        landscape: options?.orientation === 'landscape'
      }, (success, failureReason) => {
        win.close();
        resolve(success);
      });
    });
  }
}