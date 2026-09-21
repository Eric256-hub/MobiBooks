export function formatUGX(amount: number): string {
  return 'Ugx ' + new Intl.NumberFormat('en-UG').format(Math.round(amount));
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + ', ' + d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalDateInput(date: Date): string {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function isSameDay(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  return d.getDate() === ref.getDate() &&
    d.getMonth() === ref.getMonth() &&
    d.getFullYear() === ref.getFullYear();
}

export function isThisWeek(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  const startOfWeek = new Date(ref);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  return d >= startOfWeek && d < endOfWeek;
}

export function isThisMonth(dateStr: string, ref: Date): boolean {
  const d = new Date(dateStr);
  return d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear();
}

export type DateFilter = 'today' | 'week' | 'month';

export function matchesDateFilter(dateStr: string, filter: DateFilter, ref: Date = new Date()): boolean {
  switch (filter) {
    case 'today':
      return isSameDay(dateStr, ref);
    case 'week':
      return isThisWeek(dateStr, ref);
    case 'month':
      return isThisMonth(dateStr, ref);
  }
}
