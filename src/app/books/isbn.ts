/**
 * Checks ISBN-10/ISBN-13 format and checksum, ignoring whitespace and hyphens.
 * Does not verify registration, separator placement, or whether a book exists.
 */
export function isValidIsbn(value: string): boolean {
  const isbn = value.replace(/[\s-]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(isbn)) {
    const sum = [...isbn].reduce(
      (total, digit, index) => total + (digit === 'X' ? 10 : Number(digit)) * (10 - index),
      0
    );
    return sum % 11 === 0;
  }
  if (/^97[89]\d{10}$/.test(isbn)) {
    const sum = [...isbn].reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
    return sum % 10 === 0;
  }
  return false;
}
