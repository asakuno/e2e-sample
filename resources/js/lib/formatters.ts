const JST_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatJstDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return JST_DATE_TIME_FORMATTER.format(date);
}

export function formatPrice(value: number | null, currency: string): string {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(value);
}

export function formatVolume(value: number | null): string {
  if (value === null) {
    return '-';
  }

  return new Intl.NumberFormat('ja-JP').format(value);
}

export function formatCurrencyChange(value: number | null, currency: string): string {
  if (value === null) {
    return '-';
  }

  const sign = value > 0 ? '+' : '';

  return `${sign}${formatPrice(value, currency)}`;
}

export function formatPercent(value: number | null): string {
  if (value === null) {
    return '';
  }

  const sign = value > 0 ? '+' : '';

  return `${sign}${value.toFixed(2)}%`;
}

export function formatShortDate(value: string): string {
  const [, month, day] = value.split('-');

  if (!month || !day) {
    return value;
  }

  return `${Number(month)}月${Number(day)}日`;
}
