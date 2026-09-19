import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from '../db/database';
import { I18nMain } from '../i18n/i18n';
import { AuditService } from '../services/audit';
import { SettingsService } from '../services/settings';
import { BackupService } from '../backup/backup';
import { PrinterService } from '../print/printer';
import { PdfService } from '../pdf/pdf';

interface Services {
  db: DatabaseService;
  i18n: I18nMain;
  audit: AuditService;
  settings: SettingsService;
  backup: BackupService;
  printer: PrinterService;
  pdf: PdfService;
  getWindow: () => BrowserWindow | null;
}

let services: Services;

export function registerIpcHandlers(s: Services) {
  services = s;
  registerPatientHandlers();
  registerAppointmentHandlers();
  registerVisitHandlers();
  registerTreatmentHandlers();
  registerPrescriptionHandlers();
  registerInvoiceHandlers();
  registerPaymentHandlers();
  registerExpenseHandlers();
  registerStaffHandlers();
  registerInventoryHandlers();
  registerReportHandlers();
  registerDocumentHandlers();
  registerNotificationHandlers();
  registerAuditHandlers();
  registerSettingsHandlers();
  registerBackupHandlers();
  registerPrintHandlers();
  registerPdfHandlers();
  registerIoHandlers();
  registerMiscHandlers();
}

// =================== HELPERS ===================

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function nowISO(): string {
  return new Date().toISOString();
}

function nextSequential(db: DatabaseService, table: string, column: string, prefix: string): string {
  // Get next value from counter
  const result = db.transaction(() => {
    db.run('INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)', [`${table}_${column}`]);
    db.run(`UPDATE counters SET value = value + 1 WHERE name = ?`, [`${table}_${column}`]);
    const r = db.one<{value: number}>(`SELECT value FROM counters WHERE name = ?`, [`${table}_${column}`]);
    return r?.value || 1;
  });
  const num = String(result).padStart(5, '0');
  return `${prefix}-${num}`;
}

function nextPatientCode(db: DatabaseService): string {
  return nextSequential(db, 'patients', 'code', 'P');
}

function nextInvoiceNumber(db: DatabaseService, prefix: string): string {
  return nextSequential(db, 'invoices', 'number', prefix);
}

function nextReceiptNumber(db: DatabaseService, prefix: string): string {
  return nextSequential(db, 'payments', 'receipt', prefix);
}

function nextPrescriptionNumber(db: DatabaseService): string {
  return nextSequential(db, 'prescriptions', 'number', 'RX');
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// =================== PATIENTS ===================

function registerPatientHandlers() {
  ipcMain.handle('patient:list', (_e, q?: string) => {
    if (q) {
      const like = `%${q}%`;
      return services.db.all(
        `SELECT * FROM patients WHERE deleted = 0 AND (name LIKE ? OR code LIKE ? OR phone LIKE ?) ORDER BY id DESC LIMIT 500`,
        [like, like, like]
      );
    }
    return services.db.all('SELECT * FROM patients WHERE deleted = 0 ORDER BY id DESC LIMIT 500');
  });

  ipcMain.handle('patient:search', (_e, q: string) => {
    if (!q) return [];
    const like = `%${q}%`;
    return services.db.all(
      `SELECT id, code, name, phone, date_of_birth, age FROM patients WHERE deleted = 0 AND (name LIKE ? OR code LIKE ? OR phone LIKE ?) ORDER BY name LIMIT 25`,
      [like, like, like]
    );
  });

  ipcMain.handle('patient:get', (_e, id: number) => {
    const patient = services.db.one('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) return null;
    const chart = services.db.all('SELECT * FROM dental_chart WHERE patient_id = ? ORDER BY tooth_number', [id]);
    return { ...patient, dental_chart: chart };
  });

  ipcMain.handle('patient:create', (_e, data: any) => {
    const code = data.code || nextPatientCode(services.db);
    const result = services.db.transaction(() => {
      const r = services.db.run(
        `INSERT INTO patients (code, name, gender, date_of_birth, age, phone, alt_phone, email, address, emergency_contact, medical_history, allergies, current_medications, conditions, dental_history, notes, alerts, blood_group)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          code, data.name, data.gender || null, data.date_of_birth || null, data.age || null,
          data.phone || null, data.alt_phone || null, data.email || null, data.address || null,
          data.emergency_contact || null, data.medical_history || null, data.allergies || null,
          data.current_medications || null, data.conditions || null, data.dental_history || null,
          data.notes || null, data.alerts || null, data.blood_group || null
        ]
      );
      services.db.run('INSERT OR IGNORE INTO patient_codes_used (code) VALUES (?)', [code]);
      services.audit.log('Created', 'patient', r.lastInsertRowid, code);
      return r.lastInsertRowid;
    });
    return services.db.one('SELECT * FROM patients WHERE id = ?', [result]);
  });

  ipcMain.handle('patient:update', (_e, id: number, data: any) => {
    services.db.transaction(() => {
      services.db.run(
        `UPDATE patients SET name=?, gender=?, date_of_birth=?, age=?, phone=?, alt_phone=?, email=?, address=?, emergency_contact=?, medical_history=?, allergies=?, current_medications=?, conditions=?, dental_history=?, notes=?, alerts=?, blood_group=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.name, data.gender || null, data.date_of_birth || null, data.age || null,
          data.phone || null, data.alt_phone || null, data.email || null, data.address || null,
          data.emergency_contact || null, data.medical_history || null, data.allergies || null,
          data.current_medications || null, data.conditions || null, data.dental_history || null,
          data.notes || null, data.alerts || null, data.blood_group || null, id
        ]
      );
      services.audit.log('Updated', 'patient', id, data.name);
    });
    return services.db.one('SELECT * FROM patients WHERE id = ?', [id]);
  });

  ipcMain.handle('patient:delete', (_e, id: number) => {
    const p = services.db.one<{code: string, name: string}>('SELECT code, name FROM patients WHERE id = ?', [id]);
    if (!p) throw new Error('Patient not found');
    services.db.transaction(() => {
      services.db.run('UPDATE patients SET deleted = 1 WHERE id = ?', [id]);
      services.audit.log('Deleted', 'patient', id, `${p.code} - ${p.name}`);
    });
    return true;
  });

  ipcMain.handle('patient:next-code', () => nextPatientCode(services.db));

  ipcMain.handle('patient:timeline', (_e, id: number) => {
    const items: any[] = [];
    services.db.all(`SELECT id, 'appointment' as type, appointment_date as date, reason as title, status, created_at FROM appointments WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('nav_appointments') }));
    services.db.all(`SELECT id, 'visit' as type, visit_date as date, chief_complaint as title, created_at FROM visits WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('nav_visits') }));
    services.db.all(`SELECT id, 'prescription' as type, prescription_date as date, diagnosis as title, created_at FROM prescriptions WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('nav_prescriptions') }));
    services.db.all(`SELECT id, 'invoice' as type, invoice_date as date, invoice_number as title, status, total, created_at FROM invoices WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('common_invoice') }));
    services.db.all(`SELECT id, 'payment' as type, payment_date as date, receipt_number as title, amount, created_at FROM payments WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('nav_payments') }));
    services.db.all(`SELECT id, 'treatment' as type, COALESCE(start_date, created_at) as date, name as title, status, created_at FROM treatments WHERE patient_id = ?`, [id])
      .forEach(r => items.push({ ...r, label: services.i18n.t('nav_treatments') }));
    items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return items;
  });

  ipcMain.handle('patient:chart', (_e, id: number) => {
    return services.db.all('SELECT * FROM dental_chart WHERE patient_id = ? ORDER BY tooth_number', [id]);
  });

  ipcMain.handle('patient:update-tooth', (_e, patientId: number, tooth: any) => {
    services.db.run(
      `INSERT INTO dental_chart (patient_id, tooth_number, tooth_type, status, condition, notes, updated_at)
       VALUES (?, ?, 'permanent', ?, ?, ?, datetime('now'))
       ON CONFLICT(patient_id, tooth_number) DO UPDATE SET status=excluded.status, condition=excluded.condition, notes=excluded.notes, updated_at=datetime('now')`,
      [patientId, tooth.tooth_number, tooth.status || 'healthy', tooth.condition || null, tooth.notes || null]
    );
    services.audit.log('Updated', 'dental_chart', patientId, `Tooth ${tooth.tooth_number}: ${tooth.status}`);
    return true;
  });
}

// =================== APPOINTMENTS ===================

function registerAppointmentHandlers() {
  ipcMain.handle('appointment:list', (_e, filter: any = {}) => {
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (filter.from) { where.push('appointment_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('appointment_date <= ?'); params.push(filter.to); }
    if (filter.patientId) { where.push('a.patient_id = ?'); params.push(filter.patientId); }
    if (filter.status) { where.push('a.status = ?'); params.push(filter.status); }
    return services.db.all(
      `SELECT a.*, p.code as patient_code, p.name as patient_name, p.phone as patient_phone
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE ${where.join(' AND ')} ORDER BY a.appointment_date DESC, a.serial_number ASC LIMIT 1000`,
      params
    );
  });

  ipcMain.handle('appointment:get', (_e, id: number) => {
    return services.db.one('SELECT * FROM appointments WHERE id = ?', [id]);
  });

  ipcMain.handle('appointment:create', (_e, data: any) => {
    return services.db.transaction(() => {
      // Compute next serial for the date
      const date = data.appointment_date || todayISO();
      const maxSerial = services.db.one<{max_serial: number}>(
        `SELECT COALESCE(MAX(serial_number), 0) as max_serial FROM appointments WHERE appointment_date = ?`,
        [date]
      );
      const serial = data.serial_number || ((maxSerial?.max_serial || 0) + 1);

      const r = services.db.run(
        `INSERT INTO appointments (patient_id, appointment_date, appointment_time, serial_number, duration, reason, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.patient_id, date, data.appointment_time || null, serial,
          data.duration || 30, data.reason || null, data.status || 'scheduled', data.notes || null
        ]
      );
      services.audit.log('Created', 'appointment', r.lastInsertRowid, `${date} #${serial}`);
      return services.db.one('SELECT * FROM appointments WHERE id = ?', [r.lastInsertRowid]);
    });
  });

  ipcMain.handle('appointment:update', (_e, id: number, data: any) => {
    services.db.transaction(() => {
      services.db.run(
        `UPDATE appointments SET patient_id=?, appointment_date=?, appointment_time=?, serial_number=?, duration=?, reason=?, status=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.patient_id, data.appointment_date, data.appointment_time || null,
          data.serial_number, data.duration || 30, data.reason || null,
          data.status || 'scheduled', data.notes || null, id
        ]
      );
      services.audit.log('Updated', 'appointment', id);
    });
    return services.db.one('SELECT * FROM appointments WHERE id = ?', [id]);
  });

  ipcMain.handle('appointment:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM appointments WHERE id = ?', [id]);
      services.audit.log('Deleted', 'appointment', id);
    });
    return true;
  });

  ipcMain.handle('appointment:check-in', (_e, id: number) => {
    services.db.run(`UPDATE appointments SET status = 'checked_in', updated_at = datetime('now') WHERE id = ?`, [id]);
    services.audit.log('Checked-in', 'appointment', id);
    return services.db.one('SELECT * FROM appointments WHERE id = ?', [id]);
  });

  ipcMain.handle('appointment:set-status', (_e, id: number, status: string) => {
    services.db.run(`UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, id]);
    services.audit.log(`Status:${status}`, 'appointment', id);
    return services.db.one('SELECT * FROM appointments WHERE id = ?', [id]);
  });

  ipcMain.handle('appointment:today', () => {
    return services.db.all(
      `SELECT a.*, p.code as patient_code, p.name as patient_name, p.phone as patient_phone
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.appointment_date = ?
       ORDER BY a.serial_number ASC`,
      [todayISO()]
    );
  });

  ipcMain.handle('appointment:follow-ups', () => {
    // Follow-ups from visits where follow_up_date is in the future
    return services.db.all(
      `SELECT v.id, v.follow_up_date, v.follow_up_notes, v.chief_complaint, p.id as patient_id, p.code as patient_code, p.name as patient_name, p.phone as patient_phone
       FROM visits v JOIN patients p ON p.id = v.patient_id
       WHERE v.follow_up_date IS NOT NULL AND v.follow_up_date >= ?
       ORDER BY v.follow_up_date ASC LIMIT 50`,
      [todayISO()]
    );
  });
}

// =================== VISITS ===================

function registerVisitHandlers() {
  ipcMain.handle('visit:list', (_e, patientId: number) => {
    return services.db.all('SELECT * FROM visits WHERE patient_id = ? ORDER BY visit_date DESC, id DESC', [patientId]);
  });

  ipcMain.handle('visit:get', (_e, id: number) => services.db.one('SELECT * FROM visits WHERE id = ?', [id]));

  ipcMain.handle('visit:create', (_e, data: any) => {
    return services.db.transaction(() => {
      const r = services.db.run(
        `INSERT INTO visits (patient_id, appointment_id, visit_date, visit_time, chief_complaint, reason, symptoms, findings, diagnosis, teeth_involved, treatment_performed, notes, materials, duration_minutes, follow_up_date, follow_up_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.patient_id, data.appointment_id || null,
          data.visit_date || todayISO(), data.visit_time || null,
          data.chief_complaint || null, data.reason || null, data.symptoms || null,
          data.findings || null, data.diagnosis || null, data.teeth_involved || null,
          data.treatment_performed || null, data.notes || null, data.materials || null,
          data.duration_minutes || null, data.follow_up_date || null, data.follow_up_notes || null
        ]
      );
      // If linked to appointment, mark completed
      if (data.appointment_id) {
        services.db.run(`UPDATE appointments SET status = 'completed' WHERE id = ?`, [data.appointment_id]);
      }
      services.audit.log('Created', 'visit', r.lastInsertRowid);
      return services.db.one('SELECT * FROM visits WHERE id = ?', [r.lastInsertRowid]);
    });
  });

  ipcMain.handle('visit:update', (_e, id: number, data: any) => {
    services.db.transaction(() => {
      services.db.run(
        `UPDATE visits SET visit_date=?, visit_time=?, chief_complaint=?, reason=?, symptoms=?, findings=?, diagnosis=?, teeth_involved=?, treatment_performed=?, notes=?, materials=?, duration_minutes=?, follow_up_date=?, follow_up_notes=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.visit_date, data.visit_time || null, data.chief_complaint || null, data.reason || null,
          data.symptoms || null, data.findings || null, data.diagnosis || null,
          data.teeth_involved || null, data.treatment_performed || null, data.notes || null,
          data.materials || null, data.duration_minutes || null, data.follow_up_date || null,
          data.follow_up_notes || null, id
        ]
      );
      services.audit.log('Updated', 'visit', id);
    });
    return services.db.one('SELECT * FROM visits WHERE id = ?', [id]);
  });

  ipcMain.handle('visit:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM visits WHERE id = ?', [id]);
      services.audit.log('Deleted', 'visit', id);
    });
    return true;
  });
}

// =================== TREATMENTS ===================

function registerTreatmentHandlers() {
  ipcMain.handle('treatment:list', (_e, patientId: number) => {
    return services.db.all('SELECT * FROM treatments WHERE patient_id = ? ORDER BY id DESC', [patientId]);
  });
  ipcMain.handle('treatment:get', (_e, id: number) => services.db.one('SELECT * FROM treatments WHERE id = ?', [id]));
  ipcMain.handle('treatment:create', (_e, data: any) => {
    const r = services.db.run(
      `INSERT INTO treatments (patient_id, name, category, description, teeth, estimated_cost, actual_cost, status, start_date, completion_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.patient_id, data.name, data.category || null, data.description || null,
        data.teeth || null, data.estimated_cost || 0, data.actual_cost || 0,
        data.status || 'planned', data.start_date || null, data.completion_date || null,
        data.notes || null
      ]
    );
    services.audit.log('Created', 'treatment', r.lastInsertRowid, data.name);
    return services.db.one('SELECT * FROM treatments WHERE id = ?', [r.lastInsertRowid]);
  });
  ipcMain.handle('treatment:update', (_e, id: number, data: any) => {
    services.db.run(
      `UPDATE treatments SET name=?, category=?, description=?, teeth=?, estimated_cost=?, actual_cost=?, status=?, start_date=?, completion_date=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [
        data.name, data.category || null, data.description || null, data.teeth || null,
        data.estimated_cost || 0, data.actual_cost || 0, data.status || 'planned',
        data.start_date || null, data.completion_date || null, data.notes || null, id
      ]
    );
    services.audit.log('Updated', 'treatment', id);
    return services.db.one('SELECT * FROM treatments WHERE id = ?', [id]);
  });
  ipcMain.handle('treatment:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM treatments WHERE id = ?', [id]);
      services.audit.log('Deleted', 'treatment', id);
    });
    return true;
  });
}

// =================== PRESCRIPTIONS ===================

function registerPrescriptionHandlers() {
  ipcMain.handle('prescription:list', (_e, patientId: number) => {
    return services.db.all('SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC', [patientId]);
  });
  ipcMain.handle('prescription:get', (_e, id: number) => {
    const presc = services.db.one('SELECT * FROM prescriptions WHERE id = ?', [id]);
    if (!presc) return null;
    const items = services.db.all('SELECT * FROM prescription_items WHERE prescription_id = ?', [id]);
    return { ...presc, items };
  });
  ipcMain.handle('prescription:create', (_e, data: any) => {
    return services.db.transaction(() => {
      const prescNum = nextPrescriptionNumber(services.db);
      const r = services.db.run(
        `INSERT INTO prescriptions (patient_id, visit_id, prescription_number, prescription_date, diagnosis, notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.patient_id, data.visit_id || null, prescNum, data.prescription_date || todayISO(),
         data.diagnosis || null, data.notes || null]
      );
      const pid = r.lastInsertRowid;
      for (const item of (data.items || [])) {
        services.db.run(
          `INSERT INTO prescription_items (prescription_id, medicine, strength, dosage, frequency, duration, quantity, instructions, food_relation, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pid, item.medicine, item.strength || null, item.dosage || null, item.frequency || null,
           item.duration || null, item.quantity || null, item.instructions || null,
           item.food_relation || null, item.notes || null]
        );
      }
      services.audit.log('Created', 'prescription', pid, prescNum);
      return services.db.one('SELECT * FROM prescriptions WHERE id = ?', [pid]);
    });
  });
  ipcMain.handle('prescription:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM prescriptions WHERE id = ?', [id]);
      services.audit.log('Deleted', 'prescription', id);
    });
    return true;
  });
  ipcMain.handle('prescription:templates', () => {
    return services.db.all('SELECT * FROM prescription_templates ORDER BY id DESC');
  });
  ipcMain.handle('prescription:save-template', (_e, data: any) => {
    const r = services.db.run(
      'INSERT INTO prescription_templates (name, items) VALUES (?, ?)',
      [data.name, JSON.stringify(data.items || [])]
    );
    return r.lastInsertRowid;
  });
}

// =================== INVOICES ===================

function registerInvoiceHandlers() {
  ipcMain.handle('invoice:list', (_e, filter: any = {}) => {
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (filter.from) { where.push('invoice_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('invoice_date <= ?'); params.push(filter.to); }
    if (filter.patientId) { where.push('i.patient_id = ?'); params.push(filter.patientId); }
    if (filter.status) { where.push('i.status = ?'); params.push(filter.status); }
    return services.db.all(
      `SELECT i.*, p.code as patient_code, p.name as patient_name
       FROM invoices i JOIN patients p ON p.id = i.patient_id
       WHERE ${where.join(' AND ')} ORDER BY i.invoice_date DESC, i.id DESC LIMIT 1000`,
      params
    );
  });

  ipcMain.handle('invoice:get', (_e, id: number) => {
    const inv = services.db.one('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!inv) return null;
    const items = services.db.all('SELECT * FROM invoice_items WHERE invoice_id = ?', [id]);
    const patient = services.db.one('SELECT * FROM patients WHERE id = ?', [inv.patient_id]);
    return { ...inv, items, patient };
  });

  ipcMain.handle('invoice:create', (_e, data: any) => {
    const settings = services.settings.get();
    const prefix = settings.invoicePrefix || 'INV';
    return services.db.transaction(() => {
      const invNum = nextInvoiceNumber(services.db, prefix);
      const totals = computeInvoiceTotals(data.items || []);
      const r = services.db.run(
        `INSERT INTO invoices (invoice_number, patient_id, visit_id, invoice_date, due_date, subtotal, discount, tax, total, paid, due, status, payment_method, notes, terms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invNum, data.patient_id, data.visit_id || null,
          data.invoice_date || todayISO(), data.due_date || null,
          totals.subtotal, totals.discount, totals.tax, totals.total,
          0, totals.total, 'unpaid', data.payment_method || null,
          data.notes || null, data.terms || settings.invoice.defaultTerms || null
        ]
      );
      const invId = r.lastInsertRowid;
      for (const item of (data.items || [])) {
        const lineTotal = round2((item.quantity || 1) * (item.unit_price || 0) - (item.discount || 0) + (item.tax || 0));
        services.db.run(
          `INSERT INTO invoice_items (invoice_id, description, category, tooth, quantity, unit_price, discount, tax, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [invId, item.description, item.category || null, item.tooth || null,
           item.quantity || 1, item.unit_price || 0, item.discount || 0, item.tax || 0, lineTotal]
        );
      }
      services.audit.log('Created', 'invoice', invId, invNum);
      return services.db.one('SELECT * FROM invoices WHERE id = ?', [invId]);
    });
  });

  ipcMain.handle('invoice:update', (_e, id: number, data: any) => {
    return services.db.transaction(() => {
      const totals = computeInvoiceTotals(data.items || []);
      services.db.run(
        `UPDATE invoices SET patient_id=?, invoice_date=?, due_date=?, subtotal=?, discount=?, tax=?, total=?, due=?, notes=?, terms=?, updated_at=datetime('now') WHERE id=?`,
        [
          data.patient_id, data.invoice_date, data.due_date || null,
          totals.subtotal, totals.discount, totals.tax, totals.total,
          Math.max(0, totals.total - (data.paid || 0)),
          data.notes || null, data.terms || null, id
        ]
      );
      services.db.run('DELETE FROM invoice_items WHERE invoice_id = ?', [id]);
      for (const item of (data.items || [])) {
        const lineTotal = round2((item.quantity || 1) * (item.unit_price || 0) - (item.discount || 0) + (item.tax || 0));
        services.db.run(
          `INSERT INTO invoice_items (invoice_id, description, category, tooth, quantity, unit_price, discount, tax, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, item.description, item.category || null, item.tooth || null,
           item.quantity || 1, item.unit_price || 0, item.discount || 0, item.tax || 0, lineTotal]
        );
      }
      services.audit.log('Updated', 'invoice', id);
      return services.db.one('SELECT * FROM invoices WHERE id = ?', [id]);
    });
  });

  ipcMain.handle('invoice:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM invoices WHERE id = ?', [id]);
      services.audit.log('Deleted', 'invoice', id);
    });
    return true;
  });

  ipcMain.handle('invoice:next-number', () => {
    const s = services.settings.get();
    return nextSequentialPreview(services.db, 'invoices', s.invoicePrefix || 'INV');
  });
}

function computeInvoiceTotals(items: any[]) {
  let subtotal = 0;
  let discount = 0;
  let tax = 0;
  for (const item of items) {
    const lineSub = (item.quantity || 1) * (item.unit_price || 0);
    const lineDisc = item.discount || 0;
    const lineTax = item.tax || 0;
    subtotal += lineSub;
    discount += lineDisc;
    tax += lineTax;
  }
  const total = subtotal - discount + tax;
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total)
  };
}

function nextSequentialPreview(db: DatabaseService, table: string, prefix: string): string {
  const counterName = `${table}_number`;
  db.run('INSERT OR IGNORE INTO counters (name, value) VALUES (?, 0)', [counterName]);
  const r = db.one<{value: number}>(`SELECT value FROM counters WHERE name = ?`, [counterName]);
  return `${prefix}-${String((r?.value || 0) + 1).padStart(5, '0')}`;
}

// =================== PAYMENTS ===================

function registerPaymentHandlers() {
  ipcMain.handle('payment:list', (_e, filter: any = {}) => {
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (filter.from) { where.push('payment_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('payment_date <= ?'); params.push(filter.to); }
    if (filter.patientId) { where.push('pa.patient_id = ?'); params.push(filter.patientId); }
    if (filter.invoiceId) { where.push('pa.invoice_id = ?'); params.push(filter.invoiceId); }
    return services.db.all(
      `SELECT pa.*, p.code as patient_code, p.name as patient_name, i.invoice_number
       FROM payments pa JOIN patients p ON p.id = pa.patient_id
       LEFT JOIN invoices i ON i.id = pa.invoice_id
       WHERE ${where.join(' AND ')} ORDER BY pa.payment_date DESC, pa.id DESC LIMIT 1000`,
      params
    );
  });

  ipcMain.handle('payment:get', (_e, id: number) => {
    return services.db.one('SELECT * FROM payments WHERE id = ?', [id]);
  });

  ipcMain.handle('payment:create', (_e, data: any) => {
    const settings = services.settings.get();
    const prefix = settings.receiptPrefix || 'RCP';
    return services.db.transaction(() => {
      const receiptNum = nextReceiptNumber(services.db, prefix);
      const r = services.db.run(
        `INSERT INTO payments (receipt_number, invoice_id, patient_id, payment_date, amount, method, transaction_id, reference, notes, received_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          receiptNum, data.invoice_id || null, data.patient_id,
          data.payment_date || todayISO(), data.amount, data.method || 'cash',
          data.transaction_id || null, data.reference || null, data.notes || null,
          data.received_by || settings.dentist.name || null
        ]
      );
      const pid = r.lastInsertRowid;

      // Update invoice paid/due/status
      if (data.invoice_id) {
        const inv = services.db.one<{total: number, paid: number}>('SELECT total, paid FROM invoices WHERE id = ?', [data.invoice_id]);
        if (inv) {
          const newPaid = round2((inv.paid || 0) + (data.amount || 0));
          const newDue = round2(Math.max(0, (inv.total || 0) - newPaid));
          let status = 'unpaid';
          if (newPaid >= inv.total - 0.005) status = 'paid';
          else if (newPaid > 0) status = 'partial';
          services.db.run(
            `UPDATE invoices SET paid = ?, due = ?, status = ?, payment_method = ?, updated_at = datetime('now') WHERE id = ?`,
            [newPaid, newDue, status, data.method || null, data.invoice_id]
          );
        }
      }
      services.audit.log('Payment Recorded', 'payment', pid, receiptNum);
      return services.db.one('SELECT * FROM payments WHERE id = ?', [pid]);
    });
  });

  ipcMain.handle('payment:delete', (_e, id: number) => {
    return services.db.transaction(() => {
      const p = services.db.one<{invoice_id: number, amount: number}>('SELECT invoice_id, amount FROM payments WHERE id = ?', [id]);
      services.db.run('DELETE FROM payments WHERE id = ?', [id]);
      if (p?.invoice_id) {
        const inv = services.db.one<{total: number, paid: number}>('SELECT total, paid FROM invoices WHERE id = ?', [p.invoice_id]);
        if (inv) {
          const newPaid = round2(Math.max(0, (inv.paid || 0) - p.amount));
          const newDue = round2(Math.max(0, (inv.total || 0) - newPaid));
          let status = 'unpaid';
          if (newPaid >= inv.total - 0.005) status = 'paid';
          else if (newPaid > 0) status = 'partial';
          services.db.run(
            `UPDATE invoices SET paid = ?, due = ?, status = ?, updated_at = datetime('now') WHERE id = ?`,
            [newPaid, newDue, status, p.invoice_id]
          );
        }
      }
      services.audit.log('Deleted', 'payment', id);
      return true;
    });
  });

  ipcMain.handle('payment:next-number', () => {
    const s = services.settings.get();
    return nextSequentialPreview(services.db, 'payments', s.receiptPrefix || 'RCP');
  });
}

// =================== EXPENSES ===================

function registerExpenseHandlers() {
  ipcMain.handle('expense:list', (_e, filter: any = {}) => {
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (filter.from) { where.push('expense_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('expense_date <= ?'); params.push(filter.to); }
    if (filter.category) { where.push('category = ?'); params.push(filter.category); }
    return services.db.all(`SELECT * FROM expenses WHERE ${where.join(' AND ')} ORDER BY expense_date DESC, id DESC LIMIT 1000`, params);
  });
  ipcMain.handle('expense:get', (_e, id: number) => services.db.one('SELECT * FROM expenses WHERE id = ?', [id]));
  ipcMain.handle('expense:create', (_e, data: any) => {
    const r = services.db.run(
      `INSERT INTO expenses (expense_date, category, description, amount, payment_method, reference, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.expense_date || todayISO(), data.category, data.description || null,
       data.amount, data.payment_method || null, data.reference || null, data.notes || null]
    );
    services.db.run('INSERT OR IGNORE INTO expense_categories_used (category) VALUES (?)', [data.category]);
    services.audit.log('Created', 'expense', r.lastInsertRowid, `${data.category}: ${data.amount}`);
    return services.db.one('SELECT * FROM expenses WHERE id = ?', [r.lastInsertRowid]);
  });
  ipcMain.handle('expense:update', (_e, id: number, data: any) => {
    services.db.run(
      `UPDATE expenses SET expense_date=?, category=?, description=?, amount=?, payment_method=?, reference=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [data.expense_date, data.category, data.description || null, data.amount,
       data.payment_method || null, data.reference || null, data.notes || null, id]
    );
    services.audit.log('Updated', 'expense', id);
    return services.db.one('SELECT * FROM expenses WHERE id = ?', [id]);
  });
  ipcMain.handle('expense:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM expenses WHERE id = ?', [id]);
      services.audit.log('Deleted', 'expense', id);
    });
    return true;
  });
  ipcMain.handle('expense:categories', () => {
    const list = services.db.all<{category: string}>('SELECT DISTINCT category FROM expenses');
    return list.map(r => r.category).sort();
  });
}

// =================== STAFF ===================

function registerStaffHandlers() {
  ipcMain.handle('staff:list', () => services.db.all('SELECT * FROM staff ORDER BY name ASC'));
  ipcMain.handle('staff:get', (_e, id: number) => services.db.one('SELECT * FROM staff WHERE id = ?', [id]));
  ipcMain.handle('staff:create', (_e, data: any) => {
    return services.db.transaction(() => {
      const code = data.staff_id || `S${String(Date.now()).slice(-5)}`;
      const r = services.db.run(
        `INSERT INTO staff (staff_id, name, role, responsibilities, phone, email, address, joining_date, salary, salary_frequency, status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, data.name, data.role || null, data.responsibilities || null,
         data.phone || null, data.email || null, data.address || null,
         data.joining_date || todayISO(), data.salary || 0,
         data.salary_frequency || 'monthly', data.status || 'active', data.notes || null]
      );
      services.audit.log('Created', 'staff', r.lastInsertRowid, data.name);
      return services.db.one('SELECT * FROM staff WHERE id = ?', [r.lastInsertRowid]);
    });
  });
  ipcMain.handle('staff:update', (_e, id: number, data: any) => {
    services.db.run(
      `UPDATE staff SET name=?, role=?, responsibilities=?, phone=?, email=?, address=?, joining_date=?, salary=?, salary_frequency=?, status=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [data.name, data.role || null, data.responsibilities || null, data.phone || null,
       data.email || null, data.address || null, data.joining_date || todayISO(),
       data.salary || 0, data.salary_frequency || 'monthly', data.status || 'active',
       data.notes || null, id]
    );
    services.audit.log('Updated', 'staff', id);
    return services.db.one('SELECT * FROM staff WHERE id = ?', [id]);
  });
  ipcMain.handle('staff:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM staff WHERE id = ?', [id]);
      services.audit.log('Deleted', 'staff', id);
    });
    return true;
  });
  ipcMain.handle('staff:salaries', (_e, filter: any = {}) => {
    const where: string[] = ['1=1'];
    const params: any[] = [];
    if (filter.staffId) { where.push('staff_id = ?'); params.push(filter.staffId); }
    if (filter.from) { where.push('payment_date >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('payment_date <= ?'); params.push(filter.to); }
    return services.db.all(`SELECT * FROM staff_salaries WHERE ${where.join(' AND ')} ORDER BY payment_date DESC LIMIT 500`, params);
  });
  ipcMain.handle('staff:pay-salary', (_e, data: any) => {
    return services.db.transaction(() => {
      const r = services.db.run(
        `INSERT INTO staff_salaries (staff_id, payment_date, amount, period, method, reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.staff_id, data.payment_date || todayISO(), data.amount, data.period || null,
         data.method || 'cash', data.reference || null, data.notes || null]
      );
      // Record as expense too
      const staff = services.db.one<{name: string}>('SELECT name FROM staff WHERE id = ?', [data.staff_id]);
      services.db.run(
        `INSERT INTO expenses (expense_date, category, description, amount, payment_method, reference, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [data.payment_date || todayISO(), 'Staff Salaries', `Salary: ${staff?.name || ''}`,
         data.amount, data.method || 'cash', data.reference || null, data.notes || null]
      );
      services.audit.log('Salary Paid', 'staff', data.staff_id, String(data.amount));
      return services.db.one('SELECT * FROM staff_salaries WHERE id = ?', [r.lastInsertRowid]);
    });
  });
}

// =================== INVENTORY ===================

function registerInventoryHandlers() {
  ipcMain.handle('inventory:list', () => services.db.all('SELECT * FROM inventory ORDER BY item_name ASC'));
  ipcMain.handle('inventory:get', (_e, id: number) => services.db.one('SELECT * FROM inventory WHERE id = ?', [id]));
  ipcMain.handle('inventory:create', (_e, data: any) => {
    const r = services.db.run(
      `INSERT INTO inventory (item_name, category, sku, unit, current_stock, min_stock, purchase_price, sale_price, supplier, expiry_date, batch_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.item_name, data.category || null, data.sku || null, data.unit || 'pcs',
       data.current_stock || 0, data.min_stock || 0, data.purchase_price || 0,
       data.sale_price || 0, data.supplier || null, data.expiry_date || null,
       data.batch_number || null, data.notes || null]
    );
    if (data.current_stock) {
      services.db.run('INSERT INTO inventory_movements (item_id, movement_type, quantity, reason) VALUES (?, ?, ?, ?)',
        [r.lastInsertRowid, 'in', data.current_stock, 'Initial stock']);
    }
    services.audit.log('Created', 'inventory', r.lastInsertRowid, data.item_name);
    return services.db.one('SELECT * FROM inventory WHERE id = ?', [r.lastInsertRowid]);
  });
  ipcMain.handle('inventory:update', (_e, id: number, data: any) => {
    services.db.run(
      `UPDATE inventory SET item_name=?, category=?, sku=?, unit=?, min_stock=?, purchase_price=?, sale_price=?, supplier=?, expiry_date=?, batch_number=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [data.item_name, data.category || null, data.sku || null, data.unit || 'pcs',
       data.min_stock || 0, data.purchase_price || 0, data.sale_price || 0,
       data.supplier || null, data.expiry_date || null, data.batch_number || null,
       data.notes || null, id]
    );
    services.audit.log('Updated', 'inventory', id);
    return services.db.one('SELECT * FROM inventory WHERE id = ?', [id]);
  });
  ipcMain.handle('inventory:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM inventory WHERE id = ?', [id]);
      services.audit.log('Deleted', 'inventory', id);
    });
    return true;
  });
  ipcMain.handle('inventory:adjust', (_e, id: number, qty: number, reason: string) => {
    return services.db.transaction(() => {
      const type = qty >= 0 ? 'in' : 'out';
      services.db.run('UPDATE inventory SET current_stock = current_stock + ?, updated_at = datetime(\'now\') WHERE id = ?', [qty, id]);
      services.db.run('INSERT INTO inventory_movements (item_id, movement_type, quantity, reason) VALUES (?, ?, ?, ?)', [id, type, Math.abs(qty), reason]);
      services.audit.log('Stock Adjusted', 'inventory', id, `${type} ${Math.abs(qty)}: ${reason}`);
      return services.db.one('SELECT * FROM inventory WHERE id = ?', [id]);
    });
  });
  ipcMain.handle('inventory:low-stock', () => {
    return services.db.all('SELECT * FROM inventory WHERE min_stock > 0 AND current_stock <= min_stock ORDER BY (current_stock - min_stock) ASC');
  });
  ipcMain.handle('inventory:expiring', () => {
    const future = new Date();
    future.setDate(future.getDate() + 90);
    return services.db.all('SELECT * FROM inventory WHERE expiry_date IS NOT NULL AND expiry_date <= ? ORDER BY expiry_date ASC',
      [future.toISOString().split('T')[0]]);
  });
}

// =================== REPORTS ===================

function registerReportHandlers() {
  function rangeDates(range: any): { from: string; to: string } {
    const now = new Date();
    let from = new Date();
    if (range === 'today') from.setHours(0, 0, 0, 0);
    else if (range === '7d') from.setDate(now.getDate() - 7);
    else if (range === '1m') from.setMonth(now.getMonth() - 1);
    else if (range === '3m') from.setMonth(now.getMonth() - 3);
    else if (range === '6m') from.setMonth(now.getMonth() - 6);
    else if (range === '1y') from.setFullYear(now.getFullYear() - 1);
    else if (range?.from && range?.to) return { from: range.from, to: range.to };
    else from.setHours(0, 0, 0, 0);
    return {
      from: from.toISOString().split('T')[0],
      to: now.toISOString().split('T')[0]
    };
  }

  ipcMain.handle('reports:dashboard', (_e, range: string) => {
    const { from, to } = rangeDates(range || 'today');
    const today = todayISO();
    const appointments = services.db.one(`SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'checked_in' THEN 1 ELSE 0 END) as checked_in,
      SUM(CASE WHEN status = 'waiting' THEN 1 ELSE 0 END) as waiting,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
      SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
      FROM appointments WHERE appointment_date = ?`, [today]);

    const newPatients = services.db.one(`SELECT COUNT(*) as count FROM patients WHERE deleted = 0 AND DATE(registered_at) = ?`, [today]);
    const followUps = services.db.all(`SELECT v.*, p.name as patient_name, p.code as patient_code
      FROM visits v JOIN patients p ON p.id = v.patient_id
      WHERE v.follow_up_date >= ? AND v.follow_up_date <= date(?, '+30 days')
      ORDER BY v.follow_up_date ASC LIMIT 20`, [today, today]);

    const todayQueue = services.db.all(
      `SELECT a.*, p.code as patient_code, p.name as patient_name, p.phone as patient_phone
       FROM appointments a JOIN patients p ON p.id = a.patient_id
       WHERE a.appointment_date = ? ORDER BY a.serial_number ASC`,
      [today]
    );

    const recentVisits = services.db.all(
      `SELECT v.*, p.name as patient_name, p.code as patient_code
       FROM visits v JOIN patients p ON p.id = v.patient_id
       ORDER BY v.visit_date DESC, v.id DESC LIMIT 10`
    );

    return {
      appointments: appointments || {},
      new_patients: newPatients?.count || 0,
      follow_ups: followUps,
      today_queue: todayQueue,
      recent_visits: recentVisits
    };
  });

  ipcMain.handle('reports:patients', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    return {
      new_patients: services.db.all(`SELECT * FROM patients WHERE DATE(registered_at) BETWEEN ? AND ? ORDER BY registered_at DESC`, [from, to]),
      returning: services.db.all(`SELECT p.*, COUNT(v.id) as visit_count FROM patients p
        JOIN visits v ON v.patient_id = p.id WHERE p.deleted = 0 GROUP BY p.id HAVING visit_count > 1 ORDER BY visit_count DESC LIMIT 50`),
      total_count: services.db.one(`SELECT COUNT(*) as c FROM patients WHERE deleted = 0`)?.c || 0,
      demographics: services.db.all(`SELECT
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) as male,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) as female,
        SUM(CASE WHEN gender NOT IN ('male','female') OR gender IS NULL THEN 1 ELSE 0 END) as other
        FROM patients WHERE deleted = 0`)[0] || {}
    };
  });

  ipcMain.handle('reports:appointments', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    return {
      summary: services.db.one(`SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
        FROM appointments WHERE appointment_date BETWEEN ? AND ?`, [from, to]),
      list: services.db.all(
        `SELECT a.*, p.code as patient_code, p.name as patient_name
         FROM appointments a JOIN patients p ON p.id = a.patient_id
         WHERE a.appointment_date BETWEEN ? AND ? ORDER BY a.appointment_date DESC, a.serial_number ASC`,
        [from, to]
      )
    };
  });

  ipcMain.handle('reports:treatments', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    return {
      by_category: services.db.all(`SELECT category, COUNT(*) as count FROM treatments
        WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY category`, [from, to]),
      by_status: services.db.all(`SELECT status, COUNT(*) as count FROM treatments
        WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY status`, [from, to]),
      list: services.db.all(`SELECT t.*, p.name as patient_name, p.code as patient_code
        FROM treatments t JOIN patients p ON p.id = t.patient_id
        WHERE DATE(t.created_at) BETWEEN ? AND ? ORDER BY t.id DESC`, [from, to])
    };
  });

  ipcMain.handle('reports:billing', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    return {
      summary: services.db.one(`SELECT
        COUNT(*) as total_invoices,
        SUM(total) as total_amount,
        SUM(paid) as total_paid,
        SUM(due) as total_due,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'partial' THEN 1 ELSE 0 END) as partial_count,
        SUM(CASE WHEN status = 'unpaid' THEN 1 ELSE 0 END) as unpaid_count
        FROM invoices WHERE invoice_date BETWEEN ? AND ?`, [from, to]),
      list: services.db.all(
        `SELECT i.*, p.code as patient_code, p.name as patient_name
         FROM invoices i JOIN patients p ON p.id = i.patient_id
         WHERE i.invoice_date BETWEEN ? AND ? ORDER BY i.invoice_date DESC`, [from, to]
      )
    };
  });

  ipcMain.handle('reports:finance', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    const income = services.db.one(`SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date BETWEEN ? AND ?`, [from, to]);
    const expenses = services.db.one(`SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date BETWEEN ? AND ?`, [from, to]);
    const byPaymentMethod = services.db.all(`SELECT method, COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_date BETWEEN ? AND ? GROUP BY method`, [from, to]);
    const byExpenseCategory = services.db.all(`SELECT category, COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC`, [from, to]);
    const outstanding = services.db.one(`SELECT COALESCE(SUM(due), 0) as total FROM invoices WHERE due > 0 AND invoice_date BETWEEN ? AND ?`, [from, to]);
    return {
      income: income?.total || 0,
      expenses: expenses?.total || 0,
      net: (income?.total || 0) - (expenses?.total || 0),
      outstanding: outstanding?.total || 0,
      by_payment_method: byPaymentMethod,
      by_expense_category: byExpenseCategory,
      payments: services.db.all(`SELECT pa.*, p.name as patient_name FROM payments pa JOIN patients p ON p.id = pa.patient_id WHERE pa.payment_date BETWEEN ? AND ? ORDER BY pa.payment_date DESC`, [from, to]),
      expense_list: services.db.all(`SELECT * FROM expenses WHERE expense_date BETWEEN ? AND ? ORDER BY expense_date DESC`, [from, to])
    };
  });

  ipcMain.handle('reports:staff', (_e, range: any) => {
    const { from, to } = rangeDates(range);
    return {
      list: services.db.all('SELECT * FROM staff ORDER BY name'),
      salaries: services.db.all(
        `SELECT ss.*, s.name as staff_name FROM staff_salaries ss JOIN staff s ON s.id = ss.staff_id
         WHERE ss.payment_date BETWEEN ? AND ? ORDER BY ss.payment_date DESC`,
        [from, to]
      ),
      total_paid: services.db.one(`SELECT COALESCE(SUM(amount), 0) as total FROM staff_salaries WHERE payment_date BETWEEN ? AND ?`, [from, to])
    };
  });
}

// =================== DOCUMENTS ===================

function registerDocumentHandlers() {
  ipcMain.handle('documents:list', (_e, patientId?: number) => {
    const where = patientId ? 'WHERE patient_id = ?' : '';
    const params = patientId ? [patientId] : [];
    return services.db.all(`SELECT * FROM documents ${where} ORDER BY created_at DESC`, params);
  });

  ipcMain.handle('documents:create', (_e, data: any) => {
    const r = services.db.run(
      `INSERT INTO documents (patient_id, title, document_type, file_path, notes) VALUES (?, ?, ?, ?, ?)`,
      [data.patient_id || null, data.title || null, data.document_type || null, data.file_path || null, data.notes || null]
    );
    services.audit.log('Created', 'document', r.lastInsertRowid, data.title);
    return services.db.one('SELECT * FROM documents WHERE id = ?', [r.lastInsertRowid]);
  });

  ipcMain.handle('documents:delete', (_e, id: number) => {
    services.db.transaction(() => {
      services.db.run('DELETE FROM documents WHERE id = ?', [id]);
      services.audit.log('Deleted', 'document', id);
    });
    return true;
  });

  ipcMain.handle('documents:upload', async (_e, patientId: number) => {
    const win = services.getWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      title: 'Upload Document',
      filters: [
        { name: 'Documents', extensions: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] }
      ],
      properties: ['openFile']
    });
    if (result.canceled || !result.filePaths.length) return null;

    const docsDir = path.join(app.getPath('userData'), 'documents');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    const src = result.filePaths[0];
    const ext = path.extname(src);
    const dest = path.join(docsDir, `p${patientId}_${Date.now()}${ext}`);
    fs.copyFileSync(src, dest);

    const r = services.db.run(
      `INSERT INTO documents (patient_id, title, document_type, file_path, notes) VALUES (?, ?, ?, ?, ?)`,
      [patientId, path.basename(src), ext.replace('.', '').toUpperCase(), dest, null]
    );
    services.audit.log('Uploaded', 'document', r.lastInsertRowid);
    return services.db.one('SELECT * FROM documents WHERE id = ?', [r.lastInsertRowid]);
  });
}

// =================== NOTIFICATIONS ===================

function registerNotificationHandlers() {
  ipcMain.handle('notifications:list', () => {
    return services.db.all('SELECT * FROM notifications WHERE dismissed = 0 ORDER BY id DESC LIMIT 100');
  });

  ipcMain.handle('notifications:mark-read', (_e, id: number) => {
    services.db.run('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    return true;
  });

  ipcMain.handle('notifications:dismiss', (_e, id: number) => {
    services.db.run('UPDATE notifications SET dismissed = 1 WHERE id = ?', [id]);
    return true;
  });
}

// =================== AUDIT ===================

function registerAuditHandlers() {
  ipcMain.handle('audit:list', (_e, filter: any = {}) => services.audit.list(filter));
}

// =================== SETTINGS ===================

function registerSettingsHandlers() {
  ipcMain.handle('settings:get', () => services.settings.get());
  ipcMain.handle('settings:update', (_e, data: any) => {
    services.audit.log('Settings Changed', 'settings');
    return services.settings.update(data);
  });
  ipcMain.handle('settings:first-run', () => services.settings.isFirstRun());
  ipcMain.handle('settings:complete-setup', (_e, data: any) => {
    services.settings.completeSetup(data);
    services.audit.log('Setup Completed', 'settings');
    return services.settings.get();
  });
  ipcMain.handle('settings:reset', () => {
    return services.settings.reset();
  });
}

// =================== BACKUP ===================

function registerBackupHandlers() {
  ipcMain.handle('backup:create', async (_e, label?: string) => {
    const win = services.getWindow();
    const result = await dialog.showSaveDialog(win!, {
      title: 'Create Backup',
      defaultPath: `dentiva-backup-${todayISO()}.db`,
      filters: [{ name: 'Dentiva Backup', extensions: ['db'] }]
    });
    if (result.canceled || !result.filePath) return null;
    return services.backup.create(result.filePath, label);
  });

  ipcMain.handle('backup:list', () => services.backup.list());

  ipcMain.handle('backup:restore', async (_e, file: string) => {
    return services.backup.restore(file);
  });

  ipcMain.handle('backup:delete', (_e, file: string) => services.backup.delete(file));

  ipcMain.handle('backup:verify', (_e, file: string) => services.backup.verify(file));
}

// =================== PRINT ===================

function registerPrintHandlers() {
  ipcMain.handle('print:invoice', async (_e, id: number, options?: any) => {
    return services.printer.printInvoice(id, services.db, services.settings, options);
  });
  ipcMain.handle('print:receipt', async (_e, id: number, options?: any) => {
    return services.printer.printReceipt(id, services.db, services.settings, options);
  });
  ipcMain.handle('print:prescription', async (_e, id: number, options?: any) => {
    return services.printer.printPrescription(id, services.db, services.settings, options);
  });
  ipcMain.handle('print:report', async (_e, type: string, options?: any) => {
    return services.printer.printReport(type, services.db, services.settings, options);
  });
  ipcMain.handle('print:list-printers', () => services.printer.listPrinters());
}

// =================== PDF ===================

function registerPdfHandlers() {
  ipcMain.handle('pdf:invoice', async (_e, id: number) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Save Invoice as PDF',
      defaultPath: `Invoice-${todayISO()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return null;
    return services.pdf.generateInvoice(id, r.filePath, services.db, services.settings);
  });
  ipcMain.handle('pdf:receipt', async (_e, id: number) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Save Receipt as PDF',
      defaultPath: `Receipt-${todayISO()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return null;
    return services.pdf.generateReceipt(id, r.filePath, services.db, services.settings);
  });
  ipcMain.handle('pdf:prescription', async (_e, id: number) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Save Prescription as PDF',
      defaultPath: `Prescription-${todayISO()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return null;
    return services.pdf.generatePrescription(id, r.filePath, services.db, services.settings);
  });
  ipcMain.handle('pdf:report', async (_e, type: string, options?: any) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Save Report as PDF',
      defaultPath: `${type}-Report-${todayISO()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return null;
    return services.pdf.generateReport(type, r.filePath, services.db, services.settings, options);
  });
  ipcMain.handle('pdf:patient-summary', async (_e, id: number) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Save Patient Summary',
      defaultPath: `Patient-Summary-${todayISO()}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    });
    if (r.canceled || !r.filePath) return null;
    return services.pdf.generatePatientSummary(id, r.filePath, services.db, services.settings);
  });
}

// =================== IMPORT/EXPORT ===================

function registerIoHandlers() {
  ipcMain.handle('io:export-patients', async () => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Export Patients',
      defaultPath: `patients-${todayISO()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (r.canceled || !r.filePath) return null;
    const rows = services.db.all('SELECT * FROM patients WHERE deleted = 0');
    const csv = toCsv(rows, ['code','name','gender','date_of_birth','age','phone','alt_phone','email','address','emergency_contact','allergies','blood_group']);
    fs.writeFileSync(r.filePath, csv);
    return r.filePath;
  });

  ipcMain.handle('io:export-invoices', async (_e, range: any) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Export Invoices',
      defaultPath: `invoices-${todayISO()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (r.canceled || !r.filePath) return null;
    const from = range?.from || '1970-01-01';
    const to = range?.to || todayISO();
    const rows = services.db.all(
      `SELECT i.*, p.code as patient_code, p.name as patient_name FROM invoices i
       JOIN patients p ON p.id = i.patient_id WHERE i.invoice_date BETWEEN ? AND ?`,
      [from, to]
    );
    const csv = toCsv(rows, ['invoice_number','invoice_date','patient_code','patient_name','subtotal','discount','tax','total','paid','due','status']);
    fs.writeFileSync(r.filePath, csv);
    return r.filePath;
  });

  ipcMain.handle('io:export-finance', async (_e, range: any) => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Export Finance Data',
      defaultPath: `finance-${todayISO()}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    });
    if (r.canceled || !r.filePath) return null;
    const from = range?.from || '1970-01-01';
    const to = range?.to || todayISO();
    const payments = services.db.all(`SELECT payment_date as date, 'Income' as type, method as category, amount, '' as notes FROM payments WHERE payment_date BETWEEN ? AND ?`, [from, to]);
    const expenses = services.db.all(`SELECT expense_date as date, 'Expense' as type, category, amount, notes FROM expenses WHERE expense_date BETWEEN ? AND ?`, [from, to]);
    const csv = toCsv([...payments, ...expenses], ['date','type','category','amount','notes']);
    fs.writeFileSync(r.filePath, csv);
    return r.filePath;
  });

  ipcMain.handle('io:export-json', async () => {
    const win = services.getWindow();
    const r = await dialog.showSaveDialog(win!, {
      title: 'Export Full Backup',
      defaultPath: `dentiva-full-${todayISO()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (r.canceled || !r.filePath) return null;
    const tables = ['settings','patients','dental_chart','appointments','visits','treatments','prescriptions','prescription_items','invoices','invoice_items','payments','expenses','staff','staff_salaries','inventory','inventory_movements','notifications','audit_log'];
    const data: any = { exportedAt: nowISO(), version: '1.0', tables: {} };
    for (const t of tables) {
      data.tables[t] = services.db.all(`SELECT * FROM ${t}`);
    }
    fs.writeFileSync(r.filePath, JSON.stringify(data, null, 2));
    return r.filePath;
  });

  ipcMain.handle('io:import-patients', async () => {
    const win = services.getWindow();
    const r = await dialog.showOpenDialog(win!, {
      title: 'Import Patients',
      filters: [{ name: 'CSV', extensions: ['csv'] }],
      properties: ['openFile']
    });
    if (r.canceled || !r.filePaths.length) return null;
    const content = fs.readFileSync(r.filePaths[0], 'utf-8');
    const parsed = parseCsv(content);
    const existingCodes = new Set(services.db.all<{code: string}>('SELECT DISTINCT code FROM patients').map(r => r.code));
    const existingPhones = new Set(services.db.all<{phone: string}>('SELECT DISTINCT phone FROM patients WHERE phone IS NOT NULL').map(r => r.phone));
    const preview: any[] = [];
    let valid = 0, duplicates = 0, invalid = 0;
    for (const row of parsed) {
      const code = row.code || nextPatientCode(services.db);
      if (!row.name) { invalid++; preview.push({ ...row, _status: 'invalid', _reason: 'Missing name' }); continue; }
      if (existingCodes.has(code) || existingPhones.has(row.phone)) {
        duplicates++;
        preview.push({ ...row, _status: 'duplicate' });
      } else {
        valid++;
        preview.push({ ...row, _status: 'new' });
      }
    }
    return { file: r.filePaths[0], rows: preview, summary: { valid, duplicates, invalid, total: parsed.length } };
  });
}

function toCsv(rows: any[], cols: string[]): string {
  const header = cols.join(',');
  const lines = rows.map(row => cols.map(c => {
    let v = row[c];
    if (v === null || v === undefined) v = '';
    v = String(v).replace(/"/g, '""');
    if (v.includes(',') || v.includes('"') || v.includes('\n')) v = `"${v}"`;
    return v;
  }).join(','));
  return [header, ...lines].join('\n');
}

function parseCsv(content: string): any[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj: any = {};
    header.forEach((h, i) => obj[h] = values[i] || '');
    return obj;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else current += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { result.push(current); current = ''; }
      else current += c;
    }
  }
  result.push(current);
  return result;
}

// =================== MISC ===================

function registerMiscHandlers() {
  ipcMain.handle('search:global', (_e, q: string) => {
    if (!q || q.length < 2) return { patients: [], invoices: [], payments: [], appointments: [] };
    const like = `%${q}%`;
    return {
      patients: services.db.all(`SELECT id, code, name, phone FROM patients WHERE deleted = 0 AND (name LIKE ? OR code LIKE ? OR phone LIKE ?) LIMIT 8`, [like, q, like]),
      invoices: services.db.all(`SELECT i.id, i.invoice_number, i.total, i.status, p.name as patient_name FROM invoices i JOIN patients p ON p.id = i.patient_id WHERE i.invoice_number LIKE ? LIMIT 8`, [like]),
      payments: services.db.all(`SELECT pa.id, pa.receipt_number, pa.amount, p.name as patient_name FROM payments pa JOIN patients p ON p.id = pa.patient_id WHERE pa.receipt_number LIKE ? LIMIT 8`, [like]),
      appointments: services.db.all(`SELECT a.id, a.appointment_date, a.appointment_time, p.name as patient_name FROM appointments a JOIN patients p ON p.id = a.patient_id WHERE p.name LIKE ? LIMIT 8`, [like])
    };
  });

  ipcMain.handle('i18n:set', (_e, lang: string) => {
    services.i18n.setLang(lang as any);
    return lang;
  });

  ipcMain.handle('i18n:get', () => services.i18n.getLang());

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    name: app.getName(),
    userData: app.getPath('userData'),
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale()
  }));

  ipcMain.handle('app:open-data-dir', () => {
    shell.openPath(app.getPath('userData'));
  });
}