import * as React from 'react';
import { Icon } from '../components/Icon';

type ToastType = 'info' | 'success' | 'error' | 'warning';
interface Toast { id: number; type: ToastType; title?: string; message: string; }

type Listener = (toasts: Toast[]) => void;
const listeners: Listener[] = [];
let toasts: Toast[] = [];
let nextId = 1;

export function toast(message: string, type: ToastType = 'info', title?: string) {
  const t: Toast = { id: nextId++, type, title, message };
  toasts = [...toasts, t];
  listeners.forEach(l => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter(x => x.id !== t.id);
    listeners.forEach(l => l(toasts));
  }, 4500);
}

export function ToastContainer() {
  const [list, setList] = React.useState<Toast[]>(toasts);
  React.useEffect(() => {
    const fn: Listener = (t) => setList([...t]);
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  if (list.length === 0) return null;

  return (
    <div className="toast-container">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <Icon
            name={t.type === 'success' ? 'success' : t.type === 'error' ? 'warning' : t.type === 'warning' ? 'warning' : 'info'}
            size={18}
            className="toast-icon"
          />
          <div className="toast-body">
            {t.title && <div className="toast-title">{t.title}</div>}
            <div className="toast-msg">{t.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Modal component
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, size = 'md', children, footer }: ModalProps) {
  React.useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'lg' ? 'modal-lg' : size === 'xl' ? 'modal-xl' : '';

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${sizeClass}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmText, cancelText, danger, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel}>{cancelText || 'Cancel'}</button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmText || 'Confirm'}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon name={icon} size={32} />
      </div>
      <div className="empty-title">{title}</div>
      <div className="empty-desc">{description}</div>
      {action}
    </div>
  );
}

// Confirm hook
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    message: string;
    danger?: boolean;
    confirmText?: string;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const confirm = React.useCallback((opts: { title: string; message: string; danger?: boolean; confirmText?: string }) => {
    return new Promise<boolean>((resolve) => {
      setState({
        ...opts,
        open: true,
        onConfirm: () => { setState(s => ({ ...s, open: false })); resolve(true); }
      });
    });
  }, []);

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      message={state.message}
      danger={state.danger}
      confirmText={state.confirmText}
      onConfirm={state.onConfirm}
      onCancel={() => setState(s => ({ ...s, open: false }))}
    />
  );

  return { confirm, dialog };
}