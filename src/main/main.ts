import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from './db/database';
import { registerIpcHandlers } from './ipc/handlers';
import { I18nMain } from './i18n/i18n';
import { BackupService } from './backup/backup';
import { PrinterService } from './print/printer';
import { PdfService } from './pdf/pdf';
import { AuditService } from './services/audit';
import { SettingsService } from './services/settings';

const isDev = !app.isPackaged;
const userDataDir = app.getPath('userData');

// Ensure user data dir exists
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}

const dbPath = path.join(userDataDir, 'dentiva.db');
const backupsDir = path.join(userDataDir, 'backups');
const exportsDir = path.join(userDataDir, 'exports');
const documentsDir = path.join(userDataDir, 'documents');

for (const dir of [backupsDir, exportsDir, documentsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

let mainWindow: BrowserWindow | null = null;
let db: DatabaseService;
let i18n: I18nMain;
let audit: AuditService;
let settings: SettingsService;
let backup: BackupService;
let printer: PrinterService;
let pdfSvc: PdfService;

async function createWindow() {
  const windowStateFile = path.join(userDataDir, 'window-state.json');
  let windowState = { width: 1440, height: 900, x: undefined as number | undefined, y: undefined as number | undefined };
  try {
    if (fs.existsSync(windowStateFile)) {
      windowState = { ...windowState, ...JSON.parse(fs.readFileSync(windowStateFile, 'utf-8')) };
    }
  } catch {}

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    backgroundColor: '#f7f5f1',
    title: 'Dentiva',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  // Save window state on close
  mainWindow.on('close', () => {
    try {
      const bounds = mainWindow!.getBounds();
      fs.writeFileSync(windowStateFile, JSON.stringify(bounds));
    } catch {}
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show();
  });

  // External links open in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load renderer
  const indexHtml = path.join(__dirname, '../renderer/index.html');
  if (fs.existsSync(indexHtml)) {
    await mainWindow.loadFile(indexHtml);
  } else if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  }

  // Build app menu
  buildMenu();
}

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Patient', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new-patient') },
        { label: 'New Appointment', accelerator: 'CmdOrCtrl+Shift+A', click: () => mainWindow?.webContents.send('menu:new-appointment') },
        { type: 'separator' },
        { label: 'Print Invoice', click: () => mainWindow?.webContents.send('menu:print-invoice') },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' }, { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tools',
      submenu: [
        { label: 'Search', accelerator: 'CmdOrCtrl+K', click: () => mainWindow?.webContents.send('menu:search') },
        { label: 'Quick Action', accelerator: 'CmdOrCtrl+P', click: () => mainWindow?.webContents.send('menu:quick-action') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About Dentiva', click: () => mainWindow?.webContents.send('menu:about') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  // Initialize services
  db = new DatabaseService(dbPath);
  await db.init();
  i18n = new I18nMain();
  audit = new AuditService(db);
  settings = new SettingsService(db);
  backup = new BackupService(db, backupsDir);
  printer = new PrinterService();
  pdfSvc = new PdfService();

  registerIpcHandlers({ db, i18n, audit, settings, backup, printer, pdf: pdfSvc, getWindow: () => mainWindow });

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  try { db?.close(); } catch {}
});

// Block navigation away from app
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (e, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    if (parsedUrl.origin !== 'file://' && !navigationUrl.startsWith('http://localhost')) {
      e.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});