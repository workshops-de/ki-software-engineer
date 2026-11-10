import { expect, test } from '@playwright/test';
import { isValidIsbn } from '../src/app/books/isbn';

test.describe('ISBN validation', () => {
  for (const isbn of [
    '0306406152',
    '080442957X',
    '080442957x',
    '0-306-40615-2',
    ' 0 8044 2957 X ',
    '9780306406157',
    '9783161484100',
    '9791090636071',
    '978-3-16-148410-0',
    ' 978 0 306 40615 7 '
  ]) {
    test(`accepts ${JSON.stringify(isbn)}`, () => {
      expect(isValidIsbn(isbn)).toBe(true);
    });
  }

  for (const isbn of [
    '',
    '   ',
    '---',
    '030640615',
    '03064061520',
    '978030640615',
    '97803064061570',
    '0306406153',
    '0804429570',
    '9780306406158',
    '9783161484101',
    '9791090636072',
    '4006381333931',
    'X804429570',
    '978030640615X',
    '978O306406157',
    '978.0306406157',
    'ISBN 9780306406157',
    '９７８０３０６４０６１５７'
  ]) {
    test(`rejects ${JSON.stringify(isbn)}`, () => {
      expect(isValidIsbn(isbn)).toBe(false);
    });
  }
});
