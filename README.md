# Dentiva

**Premium Dental Clinic Management System for Windows**

Dentiva is a sophisticated, production-grade desktop application designed for professional dental clinics. It provides complete patient management, clinical workflow, billing, finance, and reporting — all in a beautifully crafted, locally-stored desktop application.

---

## Highlights

- **Patient Management** — Full patient records with medical history, dental charting, alerts
- **Appointments & Queue** — Today's schedule, serial numbers, check-in, status tracking
- **Clinical Workflow** — Visits, diagnoses, treatments, prescriptions, follow-ups
- **Billing & Payments** — Invoices, partial payments, receipts, multiple payment methods
- **Finance Module** — Income, expenses, expense categories, financial reports
- **Prescriptions** — Professional Rx with templates, print, and PDF
- **Inventory** — Stock tracking, low-stock alerts, expiring items
- **Staff Management** — Roles, salaries, salary payments
- **Reports** — Patient, appointment, treatment, billing, finance, staff reports
- **Printing & PDF** — Local print and PDF generation for all documents
- **Backup & Restore** — Local backup with safety features
- **Bilingual** — Full English and Bengali (বাংলা) UI
- **Light Mode Only** — Premium medical aesthetic, never switches to dark
- **Local-First** — All data stored locally; no cloud, no paid APIs, no telemetry
- **Offline** — Works without internet after install

---

## Technology Stack

- **Electron 32** — Cross-platform desktop runtime
- **sql.js** — Pure WASM SQLite (no native compilation needed)
- **React 18** — UI framework
- **TypeScript** — Type safety for main process
- **Vite** — Renderer build tooling
- **PDFKit** — PDF generation
- **electron-builder** — Windows installer and portable packaging

---

## Requirements

- **Windows 10 / 11** (64-bit)
- **Node.js 18+** (only for development / building)
- Approximately **200 MB** disk space

---

## Quick Start (for End Users)

1. Download the latest `Dentiva-Setup-1.0.0.exe` from the Releases page.
2. Run the installer.
3. Launch **Dentiva** from the Start Menu or Desktop shortcut.
4. Follow the first-run setup wizard to enter your clinic and dentist details.
5. Begin adding patients.

A portable `.exe` (no installation required) is also provided.

---

## Development

### Install Dependencies

```bash
npm install
```

### Build the Application

```bash
npm run build
```

This produces:
- `dist/main/` — Compiled main process (Node.js / Electron)
- `dist/renderer/` — Compiled renderer (HTML / CSS / JS)

### Run in Development

```bash
npm start
```

The application will launch via Electron.

### Build the Windows Release

To build a Windows installer and portable executable, run on a **Windows machine** with internet access:

```bash
npm run dist
```

This produces in `release/`:
- `Dentiva-Setup-1.0.0.exe` — NSIS installer (~150 MB)
- `Dentiva-Portable-1.0.0.exe` — Standalone portable (~150 MB)

Both can be distributed to end users. The build process automatically:
- Downloads the Electron Windows binary (cached after first run)
- Packages the main + renderer + native modules
- Generates installers with desktop / start-menu shortcuts
- Code-signs (if certificate provided)

---

## Project Structure

```
dentiva/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── main.ts             # Entry point, window creation
│   │   ├── preload.ts          # IPC bridge (contextBridge)
│   │   ├── db/database.ts      # SQLite database layer
│   │   ├── i18n/i18n.ts        # Main-process translations
│   │   ├── ipc/handlers.ts     # All IPC handlers
│   │   ├── services/           # Business logic services
│   │   ├── pdf/                # PDF + HTML document templates
│   │   ├── print/printer.ts    # Printing system
│   │   └── backup/backup.ts    # Backup & restore
│   └── renderer/               # React UI
│       ├── App.tsx             # Main app + routing
│       ├── components/         # Shared UI components
│       ├── views/              # Top-level pages
│       ├── state/toast.tsx     # Toasts + Modals
│       ├── styles/index.css    # Design system
│       └── i18n/               # Renderer translations
├── build/                      # Build assets (icons, etc.)
├── dist/                       # Compiled output
├── release/                    # Packaged installers
├── package.json
└── tsconfig.json
```

---

## Database

Dentiva uses SQLite via the sql.js pure-WASM engine. The database file is stored at:

```
%APPDATA%/Dentiva/dentiva.db
```

You can open this location from **Settings → Data Management → Open Data Directory**.

### Schema

The application initializes a fully normalized relational schema:

- `patients` — Patient demographics + medical info
- `dental_chart` — Per-tooth clinical status
- `appointments` — Schedule with serial numbers
- `visits` — Clinical visit records
- `treatments` — Treatment plans and progress
- `prescriptions` — Rx documents
- `prescription_items` — Per-medicine lines
- `invoices` + `invoice_items` — Billing
- `payments` — Money receipts
- `expenses` — Operating expenses
- `staff` + `staff_salaries` — HR
- `inventory` + `inventory_movements` — Stock
- `notifications` — System notifications
- `audit_log` — Change audit trail
- `documents` — Uploaded files metadata
- `settings` — Key-value configuration

All foreign keys are enforced. Indexes are created on search columns.

---

## Architecture

### Main Process (Node.js / Electron)

- Owns the SQLite database (`sql.js`)
- Handles all file I/O (printing, PDF, backup, exports)
- Manages application lifecycle (window state, menus)
- Provides IPC to the renderer via `contextBridge`

### Renderer (React)

- Pure UI layer — no Node access directly
- Communicates with main process through the typed `window.api` bridge
- All state is local; no external services

### IPC Channels

- `patient:*` — Patient CRUD
- `appointment:*` — Appointments and queue
- `visit:*` — Clinical visits
- `treatment:*` — Treatment plans
- `prescription:*` — Prescriptions and templates
- `invoice:*` — Invoicing
- `payment:*` — Receipts
- `expense:*` — Expense tracking
- `staff:*` — HR
- `inventory:*` — Stock
- `reports:*` — Analytics
- `documents:*` — File attachments
- `notifications:*` — Notification center
- `settings:*` — Configuration
- `backup:*` — Backup / restore
- `print:*` / `pdf:*` — Document output
- `io:*` — Import / export

---

## Localization

Dentiva supports **English** (default) and **Bengali (বাংলা)**. The language can be switched at any time from the top bar or from **Settings → Language**.

All UI strings are in `src/main/i18n/i18n.ts` and `src/renderer/i18n/{en,bn}.ts`.

---

## Backup & Data Safety

- **Automatic file persistence**: every change is flushed to disk within 500 ms.
- **Manual backups**: Settings → Backup & Restore → Create Backup.
- **Restore safety**: A pre-restore backup is automatically created before any restore.
- **Verification**: Backups are validated against the SQLite magic header.
- **Export**: Full JSON export for migration to another machine.
- **CSV export**: Per-module CSV export for spreadsheet workflows.

---

## Security

- `contextIsolation: true` — Renderer cannot access Node directly.
- `nodeIntegration: false` — No `require()` in renderer.
- `sandbox: false` — Required for preload bridge.
- External links open in the OS browser, never in-app.
- Local PIN lock (optional, Settings → Security).

---

## Printing

Dentiva prints to any installed Windows printer. Printer selection is supported per document. Supported paper sizes:

- A4 (default)
- A5
- Letter
- Thermal 80 mm (receipt printer)
- Thermal 58 mm (mini printer)

The renderer auto-generates print-ready HTML with clinic branding, then the main process invokes Electron's `printToPDF` and `print` APIs.

---

## PDF Generation

PDFs are generated locally via Electron's `printToPDF` API. No external services or paid APIs are used. Documents preserve:

- Bengali text (when language is set to বাংলা)
- Clinic logo
- Typography and alignment
- Tables and totals

---

## License

Commercial. © Dentiva. All rights reserved.

---

## Support

For questions, contact the development team via your official Dentiva support channel.