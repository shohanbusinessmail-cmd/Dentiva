import { DatabaseService } from '../db/database';

export class AuditService {
  constructor(private db: DatabaseService) {}

  log(action: string, entityType: string, entityId?: number, details?: string) {
    try {
      this.db.run(
        'INSERT INTO audit_log (action, entity_type, entity_id, details, user) VALUES (?, ?, ?, ?, ?)',
        [action, entityType, entityId ?? null, details ?? null, 'system']
      );
    } catch {}
  }

  list(filter: { from?: string; to?: string; entityType?: string; limit?: number } = {}) {
    const limit = filter.limit ?? 500;
    const where: string[] = [];
    const params: any[] = [];
    if (filter.from) { where.push('created_at >= ?'); params.push(filter.from); }
    if (filter.to) { where.push('created_at <= ?'); params.push(filter.to); }
    if (filter.entityType) { where.push('entity_type = ?'); params.push(filter.entityType); }
    const sql = `SELECT * FROM audit_log ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`;
    params.push(limit);
    return this.db.all(sql, params);
  }
}