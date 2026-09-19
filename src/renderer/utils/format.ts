// Formatting utilities — used throughout the renderer

export function formatMoney(amount: number | string | null | undefined, currency: string = '৳'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(n)) return `${currency} 0.00`;
  const fixed = Number(n).toFixed(2);
  const [whole, dec] = fixed.split('.');
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${withCommas}.${dec}`;
}

export function formatNumber(n: number | string | null | undefined, decimals = 0): string {
  const num = typeof n === 'string' ? parseFloat(n) : (n || 0);
  if (isNaN(num)) return '0';
  return Number(num).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '-';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return String(d);
  }
}

export function formatDateLong(d: string | Date | null | undefined): string {
  if (!d) return '-';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  } catch {
    return String(d);
  }
}

export function formatTime(d: string | Date | null | undefined): string {
  if (!d) return '-';
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(d);
  }
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '-';
  return `${formatDate(d)} ${formatTime(d)}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function dateRangeISO(range: string): { from: string; to: string } {
  const now = new Date();
  const from = new Date();
  if (range === 'today') {
    from.setHours(0, 0, 0, 0);
  } else if (range === '7d') {
    from.setDate(now.getDate() - 7);
  } else if (range === '1m') {
    from.setMonth(now.getMonth() - 1);
  } else if (range === '3m') {
    from.setMonth(now.getMonth() - 3);
  } else if (range === '6m') {
    from.setMonth(now.getMonth() - 6);
  } else if (range === '1y') {
    from.setFullYear(now.getFullYear() - 1);
  }
  return {
    from: from.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0]
  };
}

export function ageFromDOB(dob: string): number | null {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
}

export function genderLabel(g: string | null | undefined, lang: 'en' | 'bn' = 'en'): string {
  if (g === 'male') return lang === 'bn' ? 'পুরুষ' : 'Male';
  if (g === 'female') return lang === 'bn' ? 'মহিলা' : 'Female';
  if (g === 'other') return lang === 'bn' ? 'অন্যান্য' : 'Other';
  return '-';
}

export function appointmentStatusClass(status: string): string {
  return `status-${status.replace(/_/g, '-')}`;
}

export function invoiceStatusLabel(status: string, lang: 'en' | 'bn' = 'en'): string {
  if (status === 'paid') return lang === 'bn' ? 'সম্পূর্ণ প্রদান' : 'Paid';
  if (status === 'partial') return lang === 'bn' ? 'আংশিক প্রদান' : 'Partial';
  if (status === 'unpaid') return lang === 'bn' ? 'অপ্রদান্ত' : 'Unpaid';
  if (status === 'refunded') return lang === 'bn' ? 'ফেরত' : 'Refunded';
  return status;
}

export function paymentMethodLabel(method: string, lang: 'en' | 'bn' = 'en'): string {
  const map: Record<string, Record<string, string>> = {
    en: { cash: 'Cash', bank: 'Bank', card: 'Card', mfs: 'MFS', other: 'Other' },
    bn: { cash: 'নগদ', bank: 'ব্যাংক', card: 'কার্ড', mfs: 'এমএফএস', other: 'অন্যান্য' }
  };
  return map[lang]?.[method] || method;
}

export function initials(name: string): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('');
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}