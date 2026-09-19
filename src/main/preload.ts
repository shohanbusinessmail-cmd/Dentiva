import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // Patients
  patient: {
    list: (q?: string) => ipcRenderer.invoke('patient:list', q),
    get: (id: number) => ipcRenderer.invoke('patient:get', id),
    create: (data: any) => ipcRenderer.invoke('patient:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('patient:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('patient:delete', id),
    code: () => ipcRenderer.invoke('patient:next-code'),
    search: (q: string) => ipcRenderer.invoke('patient:search', q),
    timeline: (id: number) => ipcRenderer.invoke('patient:timeline', id),
    chart: (id: number) => ipcRenderer.invoke('patient:chart', id),
    updateTooth: (id: number, tooth: any) => ipcRenderer.invoke('patient:update-tooth', id, tooth)
  },
  // Appointments
  appointment: {
    list: (filter: any) => ipcRenderer.invoke('appointment:list', filter),
    get: (id: number) => ipcRenderer.invoke('appointment:get', id),
    create: (data: any) => ipcRenderer.invoke('appointment:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('appointment:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('appointment:delete', id),
    checkIn: (id: number) => ipcRenderer.invoke('appointment:check-in', id),
    setStatus: (id: number, status: string) => ipcRenderer.invoke('appointment:set-status', id, status),
    today: () => ipcRenderer.invoke('appointment:today'),
    followUps: () => ipcRenderer.invoke('appointment:follow-ups')
  },
  // Visits
  visit: {
    list: (patientId: number) => ipcRenderer.invoke('visit:list', patientId),
    get: (id: number) => ipcRenderer.invoke('visit:get', id),
    create: (data: any) => ipcRenderer.invoke('visit:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('visit:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('visit:delete', id)
  },
  // Treatments
  treatment: {
    list: (patientId: number) => ipcRenderer.invoke('treatment:list', patientId),
    get: (id: number) => ipcRenderer.invoke('treatment:get', id),
    create: (data: any) => ipcRenderer.invoke('treatment:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('treatment:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('treatment:delete', id)
  },
  // Prescriptions
  prescription: {
    list: (patientId: number) => ipcRenderer.invoke('prescription:list', patientId),
    get: (id: number) => ipcRenderer.invoke('prescription:get', id),
    create: (data: any) => ipcRenderer.invoke('prescription:create', data),
    delete: (id: number) => ipcRenderer.invoke('prescription:delete', id),
    templates: () => ipcRenderer.invoke('prescription:templates'),
    saveTemplate: (data: any) => ipcRenderer.invoke('prescription:save-template', data)
  },
  // Invoices
  invoice: {
    list: (filter: any) => ipcRenderer.invoke('invoice:list', filter),
    get: (id: number) => ipcRenderer.invoke('invoice:get', id),
    create: (data: any) => ipcRenderer.invoke('invoice:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('invoice:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('invoice:delete', id),
    nextNumber: () => ipcRenderer.invoke('invoice:next-number')
  },
  // Payments
  payment: {
    list: (filter: any) => ipcRenderer.invoke('payment:list', filter),
    get: (id: number) => ipcRenderer.invoke('payment:get', id),
    create: (data: any) => ipcRenderer.invoke('payment:create', data),
    delete: (id: number) => ipcRenderer.invoke('payment:delete', id),
    nextReceiptNumber: () => ipcRenderer.invoke('payment:next-number')
  },
  // Expenses
  expense: {
    list: (filter: any) => ipcRenderer.invoke('expense:list', filter),
    get: (id: number) => ipcRenderer.invoke('expense:get', id),
    create: (data: any) => ipcRenderer.invoke('expense:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('expense:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('expense:delete', id),
    categories: () => ipcRenderer.invoke('expense:categories')
  },
  // Staff
  staff: {
    list: () => ipcRenderer.invoke('staff:list'),
    get: (id: number) => ipcRenderer.invoke('staff:get', id),
    create: (data: any) => ipcRenderer.invoke('staff:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('staff:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('staff:delete', id),
    salaries: (filter: any) => ipcRenderer.invoke('staff:salaries', filter),
    paySalary: (data: any) => ipcRenderer.invoke('staff:pay-salary', data)
  },
  // Inventory
  inventory: {
    list: () => ipcRenderer.invoke('inventory:list'),
    get: (id: number) => ipcRenderer.invoke('inventory:get', id),
    create: (data: any) => ipcRenderer.invoke('inventory:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('inventory:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('inventory:delete', id),
    adjust: (id: number, qty: number, reason: string) => ipcRenderer.invoke('inventory:adjust', id, qty, reason),
    lowStock: () => ipcRenderer.invoke('inventory:low-stock'),
    expiring: () => ipcRenderer.invoke('inventory:expiring')
  },
  // Reports
  reports: {
    dashboard: (range: string) => ipcRenderer.invoke('reports:dashboard', range),
    patients: (range: any) => ipcRenderer.invoke('reports:patients', range),
    appointments: (range: any) => ipcRenderer.invoke('reports:appointments', range),
    treatments: (range: any) => ipcRenderer.invoke('reports:treatments', range),
    billing: (range: any) => ipcRenderer.invoke('reports:billing', range),
    finance: (range: any) => ipcRenderer.invoke('reports:finance', range),
    staff: (range: any) => ipcRenderer.invoke('reports:staff', range)
  },
  // Documents
  documents: {
    list: (patientId?: number) => ipcRenderer.invoke('documents:list', patientId),
    create: (data: any) => ipcRenderer.invoke('documents:create', data),
    delete: (id: number) => ipcRenderer.invoke('documents:delete', id),
    upload: (patientId: number) => ipcRenderer.invoke('documents:upload', patientId)
  },
  // Notifications
  notifications: {
    list: () => ipcRenderer.invoke('notifications:list'),
    markRead: (id: number) => ipcRenderer.invoke('notifications:mark-read', id),
    dismiss: (id: number) => ipcRenderer.invoke('notifications:dismiss', id)
  },
  // Audit
  audit: {
    list: (filter: any) => ipcRenderer.invoke('audit:list', filter)
  },
  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (data: any) => ipcRenderer.invoke('settings:update', data),
    isFirstRun: () => ipcRenderer.invoke('settings:first-run'),
    completeSetup: (data: any) => ipcRenderer.invoke('settings:complete-setup', data),
    reset: () => ipcRenderer.invoke('settings:reset')
  },
  // Backup
  backup: {
    create: (label?: string) => ipcRenderer.invoke('backup:create', label),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (file: string) => ipcRenderer.invoke('backup:restore', file),
    delete: (file: string) => ipcRenderer.invoke('backup:delete', file),
    verify: (file: string) => ipcRenderer.invoke('backup:verify', file)
  },
  // Print & PDF
  print: {
    invoice: (id: number, options?: any) => ipcRenderer.invoke('print:invoice', id, options),
    receipt: (id: number, options?: any) => ipcRenderer.invoke('print:receipt', id, options),
    prescription: (id: number, options?: any) => ipcRenderer.invoke('print:prescription', id, options),
    report: (type: string, options?: any) => ipcRenderer.invoke('print:report', type, options),
    printers: () => ipcRenderer.invoke('print:list-printers')
  },
  pdf: {
    invoice: (id: number) => ipcRenderer.invoke('pdf:invoice', id),
    receipt: (id: number) => ipcRenderer.invoke('pdf:receipt', id),
    prescription: (id: number) => ipcRenderer.invoke('pdf:prescription', id),
    report: (type: string, options?: any) => ipcRenderer.invoke('pdf:report', type, options),
    patientSummary: (id: number) => ipcRenderer.invoke('pdf:patient-summary', id)
  },
  // Import/Export
  io: {
    exportPatients: () => ipcRenderer.invoke('io:export-patients'),
    exportInvoices: (range: any) => ipcRenderer.invoke('io:export-invoices', range),
    exportFinance: (range: any) => ipcRenderer.invoke('io:export-finance', range),
    importPatients: () => ipcRenderer.invoke('io:import-patients'),
    exportJson: () => ipcRenderer.invoke('io:export-json')
  },
  // Search
  search: (q: string) => ipcRenderer.invoke('search:global', q),
  // I18n
  i18n: {
    set: (lang: string) => ipcRenderer.invoke('i18n:set', lang),
    get: () => ipcRenderer.invoke('i18n:get')
  },
  // App info
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openDataDir: () => ipcRenderer.invoke('app:open-data-dir')
  },
  // Events from main
  on: (channel: string, fn: (...args: any[]) => void) => {
    const validChannels = ['menu:new-patient','menu:new-appointment','menu:search','menu:quick-action','menu:about','menu:print-invoice'];
    if (validChannels.includes(channel)) {
      const handler = (_e: any, ...args: any[]) => fn(...args);
      ipcRenderer.on(channel, handler);
      return () => ipcRenderer.removeListener(channel, handler);
    }
    return () => {};
  }
};

contextBridge.exposeInMainWorld('api', api);

export type DentivaApi = typeof api;