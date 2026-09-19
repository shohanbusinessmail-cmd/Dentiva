import * as React from 'react';
import { Icon } from '../components/Icon';
import { useT } from '../i18n/i18n';
import { Modal, EmptyState, useConfirm, toast } from '../state/toast';
import { formatDate, formatMoney } from '../utils/format';

export function Inventory({ initialFilter }: { navigate: any; initialFilter?: any }) {
  const t = useT();
  const [list, setList] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [adjusting, setAdjusting] = React.useState<any | null>(null);
  const [filter, setFilter] = React.useState('');
  const { confirm, dialog } = useConfirm();

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const r = await window.api.inventory.list();
      setList(r || []);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load]);
  React.useEffect(() => { if (initialFilter?.openNew) { setEditing(null); setShowForm(true); } }, [initialFilter]);

  const handleDelete = async (item: any) => {
    const ok = await confirm({ title: 'Delete item?', message: `Permanently delete ${item.item_name}?`, danger: true });
    if (!ok) return;
    await window.api.inventory.delete(item.id);
    load();
  };

  const filtered = filter ? list.filter(i => i.item_name.toLowerCase().includes(filter.toLowerCase()) || i.category?.toLowerCase().includes(filter.toLowerCase())) : list;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('nav_inventory')}</h1>
          <p className="page-subtitle">{list.length} {t('nav_inventory').toLowerCase()}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Icon name="plus" size={14} /> {t('inv_new')}
          </button>
        </div>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search items..." value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
        : filtered.length === 0 ? (
          <div className="card"><EmptyState icon="inventory" title={t('empty_inventory_title')} description={t('empty_inventory_desc')} action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> {t('inv_new')}</button>} /></div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>{t('common_category')}</th>
                  <th>{t('inv_sku')}</th>
                  <th className="num">{t('inv_stock')}</th>
                  <th className="num">{t('inv_min_stock')}</th>
                  <th className="num">Cost</th>
                  <th>{t('inv_expiry')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 500 }}>{i.item_name}</td>
                    <td>{i.category || '-'}</td>
                    <td>{i.sku || '-'}</td>
                    <td className="num">
                      <span style={{ color: i.min_stock > 0 && i.current_stock <= i.min_stock ? 'var(--color-danger)' : undefined, fontWeight: 600 }}>{i.current_stock} {i.unit}</span>
                    </td>
                    <td className="num">{i.min_stock || '-'}</td>
                    <td className="num">{formatMoney(i.purchase_price)}</td>
                    <td>{formatDate(i.expiry_date)}</td>
                    <td className="actions-cell">
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => setAdjusting(i)} title="Adjust Stock"><Icon name="refresh" size={14} /></button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => { setEditing(i); setShowForm(true); }} title="Edit"><Icon name="edit" size={14} /></button>
                      <button className="btn-icon btn-sm btn-ghost" onClick={() => handleDelete(i)} title="Delete"><Icon name="trash" size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      <InventoryForm open={showForm} item={editing} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      {adjusting && <AdjustStock item={adjusting} onClose={() => setAdjusting(null)} onSaved={() => { setAdjusting(null); load(); }} />}
      {dialog}
    </div>
  );
}

function InventoryForm({ open, item, onClose, onSaved }: { open: boolean; item: any | null; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [form, setForm] = React.useState<any>({});
  React.useEffect(() => {
    if (!open) return;
    if (item) setForm({ ...item });
    else setForm({ item_name: '', category: '', sku: '', unit: 'pcs', current_stock: 0, min_stock: 0, purchase_price: 0, sale_price: 0, supplier: '', expiry_date: '', batch_number: '', notes: '' });
  }, [open, item]);

  const save = async () => {
    if (!form.item_name) { toast('Item name required', 'warning'); return; }
    try {
      if (item) await window.api.inventory.update(item.id, form);
      else await window.api.inventory.create(form);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal open={open} onClose={onClose} title={item ? t('inv_edit') : t('inv_new')} size="lg"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Item Name <span className="req">*</span></label>
          <input className="form-input" value={form.item_name || ''} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('common_category')}</label>
          <input className="form-input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Consumables, Materials, etc." />
        </div>
      </div>
      <div className="form-row-3">
        <div className="form-group">
          <label className="form-label">{t('inv_sku')}</label>
          <input className="form-input" value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('inv_unit')}</label>
          <input className="form-input" value={form.unit || 'pcs'} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('inv_supplier')}</label>
          <input className="form-input" value={form.supplier || ''} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        </div>
      </div>
      {!item && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Initial Stock</label>
            <input type="number" step="0.01" className="form-input" value={form.current_stock || 0} onChange={(e) => setForm({ ...form, current_stock: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('inv_min_stock')}</label>
            <input type="number" step="0.01" className="form-input" value={form.min_stock || 0} onChange={(e) => setForm({ ...form, min_stock: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
      )}
      {item && (
        <div className="form-group">
          <label className="form-label">{t('inv_min_stock')}</label>
          <input type="number" step="0.01" className="form-input" value={form.min_stock || 0} onChange={(e) => setForm({ ...form, min_stock: parseFloat(e.target.value) || 0 })} />
        </div>
      )}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Purchase Price</label>
          <input type="number" step="0.01" className="form-input" value={form.purchase_price || 0} onChange={(e) => setForm({ ...form, purchase_price: parseFloat(e.target.value) || 0 })} />
        </div>
        <div className="form-group">
          <label className="form-label">Sale Price</label>
          <input type="number" step="0.01" className="form-input" value={form.sale_price || 0} onChange={(e) => setForm({ ...form, sale_price: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('inv_expiry')}</label>
          <input type="date" className="form-input" value={form.expiry_date || ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('inv_batch')}</label>
          <input className="form-input" value={form.batch_number || ''} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('common_notes')}</label>
        <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
    </Modal>
  );
}

function AdjustStock({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: () => void }) {
  const t = useT();
  const [qty, setQty] = React.useState(0);
  const [reason, setReason] = React.useState('');

  const save = async () => {
    if (!qty) { toast('Enter quantity', 'warning'); return; }
    if (!reason) { toast('Reason required', 'warning'); return; }
    try {
      await window.api.inventory.adjust(item.id, qty, reason);
      toast(t('msg_saved'), 'success');
      onSaved();
    } catch (e: any) { toast(e.message || 'Failed', 'error'); }
  };

  return (
    <Modal open={true} onClose={onClose} title={`Adjust Stock: ${item.item_name}`} size="sm"
      footer={<><button className="btn btn-secondary" onClick={onClose}>{t('common_cancel')}</button><button className="btn btn-primary" onClick={save}>{t('common_save')}</button></>}>
      <div className="form-group">
        <label>Current Stock: <strong>{item.current_stock} {item.unit}</strong></label>
      </div>
      <div className="form-group">
        <label className="form-label">{t('inv_adjust_qty')} (use negative for out)</label>
        <input type="number" step="0.01" className="form-input" value={qty} onChange={(e) => setQty(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="form-group">
        <label className="form-label">{t('inv_adjust_reason')}</label>
        <input className="form-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Purchase, used, damaged..." />
      </div>
    </Modal>
  );
}