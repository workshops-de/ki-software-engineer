import { Book } from '../books/book';

export type Point = [number, number, number];
export interface Planet {
  book: Book;
  topic: string;
  color: string;
  position: Point;
  radius: number;
  keywords: string[];
}
export interface Cluster {
  name: string;
  color: string;
  position: Point;
  radius: number;
  count: number;
}
export interface Connection {
  source: number;
  target: number;
  weight: number;
  reasons: string[];
}
export interface Galaxy {
  planets: Planet[];
  clusters: Cluster[];
  connections: Connection[];
  skipped: number;
}

const topics: [string, string, RegExp][] = [
  ['Angular', '#fb7185', /\bangular\b/],
  ['Security', '#fbbf24', /\b(security|sicherheit|hacking|cryptography|oauth)\b/],
  ['Datenbanken', '#34d399', /\b(database|datenbank\w*|sql|mongodb|postgres\w*)\b/],
  ['Architektur', '#c4b5fd', /\b(architecture|architektur|microservices|design patterns|domain driven)\b/],
  ['Performance', '#f97316', /\b(performance|optimization|optimierung)\b/],
  ['JavaScript', '#67e8f9', /\b(javascript|typescript|node\.?js|react|vue)\b/],
  ['Web Development', '#93c5fd', /\b(web|html|css|frontend|fullstack|accessibility)\b/]
];
export function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/ß/g, 'ss')
    : '';
}
export function classify(book: Book): [string, string] {
  const text = normalize(`${book.title ?? ''} ${book.subtitle ?? ''} ${book.abstract ?? ''}`);
  const match = topics.find(([, , pattern]) => pattern.test(text));
  return match ? [match[0], match[1]] : ['Weitere Themen', '#94a3b8'];
}
export function matches(book: Book, query: string): boolean {
  const text = normalize([book.title, book.subtitle, book.author, book.abstract, book.isbn].join(' '));
  return normalize(query)
    .trim()
    .split(/\s+/)
    .every(word => text.includes(word));
}
export function searchRank(book: Book, query: string): number {
  const normalized = normalize(query).trim();
  if (!normalized) return 0;
  if (normalize(book.title) === normalized || normalize(book.isbn) === normalized) return 10;
  if (normalize(book.title).includes(normalized)) return 6;
  if (normalize(book.author).includes(normalized)) return 4;
  if (normalize(book.subtitle).includes(normalized)) return 2;
  return 1;
}
function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return (result >>> 0) / 4294967296;
}
const stopWords = new Set(
  'about after before their there these those with from this that into your eine einer eines einen und oder der die das fur von mit dem den the and for you are how book guide practical applications'.split(
    ' '
  )
);
function keywords(book: Book): string[] {
  return [
    ...new Set(
      normalize(`${book.title ?? ''} ${book.subtitle ?? ''} ${book.abstract ?? ''}`)
        .split(/[^a-z0-9]+/)
        .filter(word => word.length > 3 && !stopWords.has(word))
    )
  ]
    .sort()
    .slice(0, 80);
}
export function createGalaxy(input: unknown): Galaxy {
  if (!Array.isArray(input)) throw new Error('Die API hat keine Buchsammlung geliefert.');
  const seen = new Set<string>();
  const books = input
    .filter((item): item is Book => {
      if (
        !item ||
        typeof item !== 'object' ||
        typeof item.isbn !== 'string' ||
        !item.isbn.trim() ||
        typeof item.title !== 'string' ||
        !item.title.trim() ||
        seen.has(item.isbn)
      )
        return false;
      // Reject malformed optional metadata before it reaches templates or the editor.
      if (
        ['subtitle', 'author', 'publisher', 'price', 'cover', 'abstract'].some(
          key => item[key] != null && typeof item[key] !== 'string'
        )
      )
        return false;
      if (item.numPages != null && (typeof item.numPages !== 'number' || !Number.isFinite(item.numPages))) return false;
      seen.add(item.isbn);
      return true;
    })
    .sort((a, b) => (a.isbn < b.isbn ? -1 : a.isbn > b.isbn ? 1 : 0));
  const groups = new Map<string, Book[]>();
  for (const book of books) {
    const name = classify(book)[0];
    groups.set(name, [...(groups.get(name) ?? []), book]);
  }
  const names = [...groups.keys()].sort();
  const maxRadius = Math.max(12, ...[...groups.values()].map(group => 8 + 5 * Math.sqrt(group.length)));
  const orbit = names.length === 1 ? 0 : maxRadius / Math.sin(Math.PI / names.length) + 12;
  const planets: Planet[] = [];
  const clusters: Cluster[] = [];
  names.forEach((name, clusterIndex) => {
    const group = groups.get(name)!;
    const angle = (clusterIndex * Math.PI * 2) / names.length;
    const center: Point = [Math.cos(angle) * orbit, 0, Math.sin(angle) * orbit];
    const color = classify(group[0])[1];
    clusters.push({ name, color, position: center, radius: 8 + 5 * Math.sqrt(group.length), count: group.length });
    group.forEach((book, index) => {
      const theta = index * 2.3999632297 + hash(name) * 6;
      const distance = 5 * Math.sqrt(index);
      planets.push({
        book,
        topic: name,
        color,
        keywords: keywords(book),
        radius:
          Number.isFinite(book.numPages) && book.numPages > 0
            ? Math.min(1.8, Math.max(0.8, Math.sqrt(book.numPages / 250)))
            : 1,
        position: [
          center[0] + Math.cos(theta) * distance,
          (hash(book.isbn) - 0.5) * 8,
          center[2] + Math.sin(theta) * distance
        ]
      });
    });
  });
  const connections: Connection[] = [];
  const degrees = new Uint8Array(planets.length);
  const candidates: Connection[] = [];
  const authors = planets.map(planet => normalize(planet.book.author).trim());
  const wordSets = planets.map(planet => new Set(planet.keywords));
  for (let i = 0; i < planets.length; i++) {
    const a = planets[i];
    const nearest: Connection[] = [];
    for (let j = i + 1; j < planets.length; j++) {
      const b = planets[j];
      let weight = 0;
      const reasons: string[] = [];
      if (authors[i] && authors[i] === authors[j]) {
        weight += 6;
        reasons.push('Gleiche Autorenangabe');
      }
      if (a.topic === b.topic && a.topic !== 'Weitere Themen') {
        weight += 2;
        reasons.push('Gleiches abgeleitetes Thema');
      }
      const shared = a.keywords.filter(word => wordSets[j].has(word));
      weight += Math.min(3, shared.length);
      if (shared.length) reasons.push(`Gemeinsame Wörter: ${shared.slice(0, 3).join(', ')}`);
      if (weight >= 3) {
        nearest.push({ source: i, target: j, weight, reasons });
        nearest.sort((first, second) => second.weight - first.weight || first.target - second.target);
        if (nearest.length > 6) nearest.pop();
      }
    }
    candidates.push(...nearest);
  }
  candidates.sort((a, b) => b.weight - a.weight || a.source - b.source || a.target - b.target);
  for (const edge of candidates) {
    if (degrees[edge.source] >= 3 || degrees[edge.target] >= 3) continue;
    connections.push(edge);
    degrees[edge.source]++;
    degrees[edge.target]++;
  }
  return { planets, clusters, connections, skipped: input.length - books.length };
}

export function cameraDistance(radius: number, aspect: number, fov = 50): number {
  const halfVertical = (fov * Math.PI) / 360;
  const halfHorizontal = Math.atan(Math.tan(halfVertical) * Math.max(0.1, aspect));
  return (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * 1.15;
}
export type DiscoveryState = 'stopped' | 'playing' | 'paused';
export function discoveryTransition(
  state: DiscoveryState,
  action: 'start' | 'pause' | 'resume' | 'stop'
): DiscoveryState {
  if (action === 'stop') return 'stopped';
  if (action === 'start') return 'playing';
  if (action === 'pause') return state === 'playing' ? 'paused' : state;
  return state === 'paused' ? 'playing' : state;
}
