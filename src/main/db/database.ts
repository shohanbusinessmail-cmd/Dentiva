import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');

export class DatabaseService {
  private db: Database;
  private dbPath: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async init(): Promise<void> {
    if (!SQL) {
      SQL = await initSqlJs({
        locateFile: () => wasmPath
      });
    }
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }
    this.db.run('PRAGMA foreign_keys = ON');
    this.applySchema();
    this.flush();
  }

  close(): void {
    try {
      this.flushSync();
    } catch {}
    try { this.db.close(); } catch {}
  }

  raw(): Database {
    return this.db;
  }

  // Run SQL and persist
  exec(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const result: any[] = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    this.markDirty();
    return result;
  }

  run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    const changes = this.db.getRowsModified();
    this.markDirty();
    return { changes, lastInsertRowid: this.lastInsertRowid() };
  }

  one<T = any>(sql: string, params: any[] = []): T | null {
    const rows = this.exec(sql, params);
    return rows.length ? (rows[0] as T) : null;
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    return this.exec(sql, params) as T[];
  }

  private lastInsertRowid(): number {
    const rows = this.exec('SELECT last_insert_rowid() as id');
    return rows[0]?.id || 0;
  }

  private markDirty() {
    this.dirty = true;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 500);
  }

  flush(): void {
    this.writeQueue = this.writeQueue.then(() => this.flushAsync()).catch(() => {});
  }

  private async flushAsync(): Promise<void> {
    if (!this.dirty) return;
    const data = this.db.export();
    const tmpPath = this.dbPath + '.tmp';
    await fs.promises.writeFile(tmpPath, Buffer.from(data));
    await fs.promises.rename(tmpPath, this.dbPath);
    this.dirty = false;
  }

  flushSync(): void {
    if (!this.dirty) return;
    const data = this.db.export();
    const tmpPath = this.dbPath + '.tmp';
    fs.writeFileSync(tmpPath, Buffer.from(data));
    fs.renameSync(tmpPath, this.dbPath);
    this.dirty = false;
  }

  transaction<T>(fn: () => T): T {
    this.db.run('BEGIN TRANSACTION');
    try {
      const result = fn();
      this.db.run('COMMIT');
      this.markDirty();
      return result;
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
  }

  private applySchema() {
    const schema = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        gender TEXT,
        date_of_birth TEXT,
        age INTEGER,
        phone TEXT,
        alt_phone TEXT,
        email TEXT,
        address TEXT,
        emergency_contact TEXT,
        medical_history TEXT,
        allergies TEXT,
        current_medications TEXT,
        conditions TEXT,
        dental_history TEXT,
        notes TEXT,
        alerts TEXT,
        blood_group TEXT,
        registered_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        deleted INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_patients_code ON patients(code);
      CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
      CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);

      CREATE TABLE IF NOT EXISTS patient_codes_used (
        code TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS dental_chart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        tooth_number INTEGER NOT NULL,
        tooth_type TEXT NOT NULL,
        status TEXT,
        condition TEXT,
        notes TEXT,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        UNIQUE(patient_id, tooth_number)
      );
      CREATE INDEX IF NOT EXISTS idx_chart_patient ON dental_chart(patient_id);

      CREATE TABLE IF NOT EXISTS appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT,
        serial_number INTEGER,
        duration INTEGER DEFAULT 30,
        reason TEXT,
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
      CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_appt_serial ON appointments(appointment_date, serial_number);

      CREATE TABLE IF NOT EXISTS visits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        appointment_id INTEGER,
        visit_date TEXT NOT NULL,
        visit_time TEXT,
        chief_complaint TEXT,
        reason TEXT,
        symptoms TEXT,
        findings TEXT,
        diagnosis TEXT,
        teeth_involved TEXT,
        treatment_performed TEXT,
        notes TEXT,
        materials TEXT,
        duration_minutes INTEGER,
        follow_up_date TEXT,
        follow_up_notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_visit_patient ON visits(patient_id);

      CREATE TABLE IF NOT EXISTS treatments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        teeth TEXT,
        estimated_cost REAL DEFAULT 0,
        actual_cost REAL DEFAULT 0,
        status TEXT DEFAULT 'planned',
        start_date TEXT,
        completion_date TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_treat_patient ON treatments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_treat_status ON treatments(status);

      CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER NOT NULL,
        visit_id INTEGER,
        prescription_number TEXT UNIQUE NOT NULL,
        prescription_date TEXT NOT NULL,
        diagnosis TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(visit_id) REFERENCES visits(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_presc_patient ON prescriptions(patient_id);

      CREATE TABLE IF NOT EXISTS prescription_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id INTEGER NOT NULL,
        medicine TEXT NOT NULL,
        strength TEXT,
        dosage TEXT,
        frequency TEXT,
        duration TEXT,
        quantity TEXT,
        instructions TEXT,
        food_relation TEXT,
        notes TEXT,
        FOREIGN KEY(prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS prescription_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        items TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        patient_id INTEGER NOT NULL,
        visit_id INTEGER,
        invoice_date TEXT NOT NULL,
        due_date TEXT,
        subtotal REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        total REAL DEFAULT 0,
        paid REAL DEFAULT 0,
        due REAL DEFAULT 0,
        status TEXT DEFAULT 'unpaid',
        payment_method TEXT,
        notes TEXT,
        terms TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY(visit_id) REFERENCES visits(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_invoice_patient ON invoices(patient_id);
      CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(invoice_date);
      CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        tooth TEXT,
        quantity REAL DEFAULT 1,
        unit_price REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        line_total REAL DEFAULT 0,
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS invoice_numbers_used (
        number TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT UNIQUE NOT NULL,
        invoice_id INTEGER,
        patient_id INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL,
        transaction_id TEXT,
        reference TEXT,
        notes TEXT,
        received_by TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_payment_patient ON payments(patient_id);
      CREATE INDEX IF NOT EXISTS idx_payment_invoice ON payments(invoice_id);

      CREATE TABLE IF NOT EXISTS receipt_numbers_used (
        number TEXT PRIMARY KEY
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        expense_date TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL NOT NULL,
        payment_method TEXT,
        reference TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_expense_date ON expenses(expense_date);
      CREATE INDEX IF NOT EXISTS idx_expense_category ON expenses(category);

      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        responsibilities TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        joining_date TEXT,
        salary REAL DEFAULT 0,
        salary_frequency TEXT DEFAULT 'monthly',
        status TEXT DEFAULT 'active',
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS staff_salaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER NOT NULL,
        payment_date TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT,
        method TEXT,
        reference TEXT,
        notes TEXT,
        FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_name TEXT NOT NULL,
        category TEXT,
        sku TEXT,
        unit TEXT DEFAULT 'pcs',
        current_stock REAL DEFAULT 0,
        min_stock REAL DEFAULT 0,
        purchase_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        supplier TEXT,
        expiry_date TEXT,
        batch_number TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_inv_category ON inventory(category);

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        movement_type TEXT NOT NULL,
        quantity REAL NOT NULL,
        reason TEXT,
        movement_date TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(item_id) REFERENCES inventory(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        severity TEXT DEFAULT 'info',
        related_type TEXT,
        related_id INTEGER,
        is_read INTEGER DEFAULT 0,
        dismissed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_notif_read ON notifications(is_read);

      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER,
        title TEXT,
        document_type TEXT,
        file_path TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details TEXT,
        user TEXT DEFAULT 'system',
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);

      CREATE TABLE IF NOT EXISTS counters (
        name TEXT PRIMARY KEY,
        value INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS expense_categories_used (
        category TEXT PRIMARY KEY
      );
    `;
    this.db.exec(schema);
    this.markDirty();
  }
}