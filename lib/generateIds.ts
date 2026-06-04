const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0, O, 1, I)

export function generateUniqueIdentifier(): string {
  return Array.from({ length: 10 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

export function generateReceiptNumber(stateCode: string = 'NG'): string {
  const year = new Date().getFullYear();
  const suffix = Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
  return `DRN-${stateCode.toUpperCase()}-${year}-${suffix}`;
}
