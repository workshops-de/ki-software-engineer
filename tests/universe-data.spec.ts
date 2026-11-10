import { expect, test } from '@playwright/test';
import {
  cameraDistance,
  classify,
  createGalaxy,
  discoveryTransition,
  matches,
  searchRank
} from '../src/app/book-universe/universe-data';
import { book } from './support/books';

test('classifies deterministically with explicit fallback and priority', () => {
  expect(classify(book)[0]).toBe('Angular');
  expect(classify({ ...book, title: 'SQL security', abstract: '' })[0]).toBe('Security');
  expect(classify({ ...book, title: 'Gardening', abstract: '' })[0]).toBe('Weitere Themen');
});

test('normalizes accents and searches all existing descriptive metadata', () => {
  const source = { ...book, title: 'Ängular', author: 'José Reader', abstract: 'Über Sicherheit', subtitle: 'Praxis' };
  for (const query of ['ANGULAR', 'Jose', 'uber sicherheit', 'Praxis', book.isbn, 'angular jose'])
    expect(matches(source, query)).toBe(true);
  expect(matches(source, 'absent')).toBe(false);
  expect(matches(source, '   ')).toBe(true);
});

test('rejects malformed records, deduplicates ISBNs, and tolerates missing metadata', () => {
  const galaxy = createGalaxy([
    null,
    {},
    book,
    book,
    { isbn: 'minimal', title: 'Unknown' },
    { ...book, isbn: 'bad', author: [] }
  ]);
  expect(galaxy.skipped).toBe(4);
  const minimal = galaxy.planets.find(planet => planet.book.isbn === 'minimal')!;
  expect(minimal.radius).toBe(1);
  expect(minimal.topic).toBe('Weitere Themen');
  expect(() => createGalaxy({})).toThrow();
  expect(createGalaxy([]).planets).toEqual([]);
});

for (const count of [50, 200, 500, 1000]) {
  test(`lays out ${count} books reproducibly without overlapping planets and bounds graph density`, () => {
    const books = Array.from({ length: count }, (_, index) => ({
      ...book,
      isbn: String(index).padStart(5, '0'),
      title: `${['Angular', 'SQL', 'CSS', 'Gardening'][index % 4]} ${index}`,
      numPages: index % 2 ? 1000000 : 1
    }));
    const start = performance.now();
    const galaxy = createGalaxy(books);
    expect(performance.now() - start).toBeLessThan(5000);
    expect(createGalaxy([...books].reverse())).toEqual(galaxy);
    expect(galaxy.planets).toHaveLength(count);
    expect(galaxy.clusters.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(count);
    const degree = new Uint8Array(count);
    for (const edge of galaxy.connections) {
      degree[edge.source]++;
      degree[edge.target]++;
    }
    expect(Math.max(...degree)).toBeLessThanOrEqual(3);
    for (let i = 0; i < count; i++) {
      const a = galaxy.planets[i];
      expect(a.radius).toBeGreaterThanOrEqual(0.8);
      expect(a.radius).toBeLessThanOrEqual(1.8);
      for (let j = i + 1; j < count; j++) {
        const b = galaxy.planets[j];
        const distance = Math.hypot(...a.position.map((value, axis) => value - b.position[axis]));
        if (distance <= a.radius + b.radius) throw new Error(`Overlapping planets ${i}/${j}`);
      }
    }
  });
}

test('explains relationships and excludes unknown themes as a relationship', () => {
  const galaxy = createGalaxy([
    book,
    { ...book, isbn: 'second', title: 'Other world', author: book.author, abstract: '' }
  ]);
  expect(galaxy.connections[0].reasons).toContain('Gleiche Autorenangabe');
  expect(galaxy.connections[0].weight).toBeGreaterThanOrEqual(6);
  const unrelated = createGalaxy([
    { ...book, title: 'Apples', author: '', abstract: '' },
    { ...book, isbn: 'other', title: 'Oranges', author: '', abstract: '' }
  ]);
  expect(unrelated.connections).toEqual([]);
});

test('fits portrait and landscape camera targets', () => {
  expect(cameraDistance(10, 0.5)).toBeGreaterThan(cameraDistance(10, 2));
  expect(cameraDistance(20, 1)).toBeCloseTo(cameraDistance(10, 1) * 2);
  expect(Number.isFinite(cameraDistance(10, 0))).toBe(true);
});

test('ranks exact titles and ISBNs before descriptive matches', () => {
  expect(searchRank(book, book.title)).toBeGreaterThan(searchRank(book, 'accessible'));
  expect(searchRank(book, book.isbn)).toBe(10);
  expect(searchRank(book, 'angular')).toBeGreaterThan(searchRank(book, 'jane'));
  expect(searchRank(book, '')).toBe(0);
});

test('discovery state only resumes paused tours', () => {
  expect(discoveryTransition('stopped', 'resume')).toBe('stopped');
  expect(discoveryTransition('stopped', 'pause')).toBe('stopped');
  expect(discoveryTransition('stopped', 'start')).toBe('playing');
  expect(discoveryTransition('playing', 'pause')).toBe('paused');
  expect(discoveryTransition('paused', 'resume')).toBe('playing');
  expect(discoveryTransition('playing', 'stop')).toBe('stopped');
});
