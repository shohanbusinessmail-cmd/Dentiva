import { DatabaseService } from '../db/database';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class BackupService {
  constructor(private db: DatabaseService, private backupsDir: string) {}

  create(targetPath?: string, label?: string): string {
    this.db.flushSync();
    const data = this.db.raw().export();
    const buf = Buffer.from(data);
    const filename = `dentiva-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.db`;
    const target = targetPath || path.join(this.backupsDir, filename);
    // Write to a temp file first, then rename for atomicity
    const tmp = target + '.tmp';
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, target);

    // Record backup metadata in DB
    const meta = {
      file: target,
      label: label || '',
      size: buf.length,
      createdAt: new Date().toISOString(),
      host: os.hostname()
    };
    this.db.run(
      'INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)',
      ['Backup Created', 'backup', null, JSON.stringify(meta)]
    );
    return target;
  }

  list(): any[] {
    const files = fs.existsSync(this.backupsDir)
      ? fs.readdirSync(this.backupsDir).filter(f => f.endsWith('.db') || f.endsWith('.bak'))
      : [];
    return files.map(f => {
      const full = path.join(this.backupsDir, f);
      const stat = fs.statSync(full);
      return { file: full, name: f, size: stat.size, createdAt: stat.mtime.toISOString() };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  restore(file: string): boolean {
    if (!fs.existsSync(file)) throw new Error('Backup file not found');
    // Pre-restore safety backup
    this.create(path.join(this.backupsDir, `pre-restore-${Date.now()}.db`), 'auto-pre-restore');
    // Read backup file
    const data = fs.readFileSync(file);
    // Close current DB
    this.db.close();
    // Write backup over current database
    fs.writeFileSync(this.db['dbPath'], data);
    // Reinitialize
    return this.db.init().then(() => true) as any;
  }

  delete(file: string): boolean {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      this.db.run(
        'INSERT INTO audit_log (action, entity_type, entity_id, details) VALUES (?, ?, ?, ?)',
        ['Backup Deleted', 'backup', null, file]
      );
      return true;
    }
    return false;
  }

  verify(file: string): { ok: boolean; message: string; size: number } {
    if (!fs.existsSync(file)) return { ok: false, message: 'File not found', size: 0 };
    const stat = fs.statSync(file);
    if (stat.size < 100) return { ok: false, message: 'File too small', size: stat.size };
    // Try reading first 16 bytes — sql.js header is 'SQLite format 3\0'
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(16);
    fs.readSync(fd, buf, 0, 16, 0);
    fs.closeSync(fd);
    const ok = buf.toString('utf-8', 0, 15) === 'SQLite format 3';
    return { ok, message: ok ? 'Valid backup' : 'Invalid backup file', size: stat.size };
  }
}