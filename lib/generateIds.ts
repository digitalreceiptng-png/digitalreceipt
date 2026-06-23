const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0, O, 1, I)

export function generateUniqueIdentifier(): string {
  return Array.from({ length: 10 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

export function generateReceiptNumber(): string {
  const suffix = Array.from({ length: 6 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
  return `DRN-${suffix}`;
}
