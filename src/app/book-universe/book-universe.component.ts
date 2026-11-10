import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription, timeout } from 'rxjs';
import { BookApiClient } from '../books/book-api-client.service';
import { BookDialogService } from '../books/book-dialog.service';
import {
  Cluster,
  createGalaxy,
  discoveryTransition,
  DiscoveryState,
  Galaxy,
  matches,
  Planet,
  searchRank
} from './universe-data';
import { UniverseRenderer } from './universe-renderer';

@Component({
  selector: 'app-book-universe',
  imports: [RouterLink],
  templateUrl: './book-universe.component.html',
  styleUrl: './book-universe.component.css',
  encapsulation: ViewEncapsulation.None
})
export class BookUniverseComponent implements AfterViewInit, OnDestroy {
  @ViewChild('scene', { static: true }) private sceneHost!: ElementRef<HTMLElement>;
  private readonly api = inject(BookApiClient);
  private readonly dialogs = inject(BookDialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly zone = inject(NgZone);
  private renderer?: UniverseRenderer;
  private request?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  private tourIndex = 0;
  private tourStage: 'cluster' | 'book' = 'cluster';
  private destroyed = false;
  readonly galaxy = signal<Galaxy>({ planets: [], clusters: [], connections: [], skipped: 0 });
  readonly loading = signal(true);
  readonly error = signal('');
  readonly graphicsError = signal(false);
  readonly query = signal('');
  readonly cluster = signal('');
  readonly selected = signal(-1);
  readonly hovered = signal(-1);
  readonly tooltip = signal({ x: 0, y: 0 });
  readonly labels = signal(true);
  readonly connections = signal(true);
  readonly rotation = signal(false);
  readonly explorer = signal(false);
  readonly library = signal(false);
  readonly searchOpen = signal(false);
  readonly activeResult = signal(0);
  readonly discovery = signal<DiscoveryState>('stopped');
  readonly tourCaption = signal('');
  readonly brokenCovers = signal(new Set<string>());
  readonly results = computed(() =>
    this.galaxy()
      .planets.map((planet, index) => ({ planet, index }))
      .filter(
        ({ planet }) => (!this.cluster() || planet.topic === this.cluster()) && matches(planet.book, this.query())
      )
      .sort((a, b) => searchRank(b.planet.book, this.query()) - searchRank(a.planet.book, this.query()))
  );
  readonly selectedPlanet = computed(() => this.galaxy().planets[this.selected()]);
  readonly hoverPlanet = computed(() => this.galaxy().planets[this.hovered()]);
  readonly related = computed(() =>
    this.galaxy()
      .connections.filter(edge => edge.source === this.selected() || edge.target === this.selected())
      .sort((a, b) => b.weight - a.weight)
      .map(edge => ({
        index: edge.source === this.selected() ? edge.target : edge.source,
        planet: this.galaxy().planets[edge.source === this.selected() ? edge.target : edge.source],
        reasons: edge.reasons.join(' · ')
      }))
  );

  ngAfterViewInit(): void {
    this.dialogs.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    document.addEventListener('visibilitychange', this.onVisibility);
    this.load();
  }
  load(): void {
    this.request?.unsubscribe();
    this.stopTour();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .getAllBooks()
      .pipe(timeout(15000), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: books => {
          try {
            const isbn = this.selectedPlanet()?.book.isbn;
            const galaxy = createGalaxy(books);
            this.galaxy.set(galaxy);
            this.selected.set(isbn ? galaxy.planets.findIndex(planet => planet.book.isbn === isbn) : -1);
            if (!galaxy.clusters.some(group => group.name === this.cluster())) this.cluster.set('');
            this.hovered.set(-1);
            this.loading.set(false);
            this.initializeScene();
          } catch {
            this.loading.set(false);
            this.error.set('Die Buchdaten konnten nicht gelesen werden.');
          }
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Die Sammlung ist gerade nicht erreichbar. Bitte erneut versuchen.');
        }
      });
  }
  private initializeScene(): void {
    this.renderer?.dispose();
    this.renderer = undefined;
    this.graphicsError.set(false);
    if (!this.galaxy().planets.length) return;
    this.zone.runOutsideAngular(() => {
      try {
        this.renderer = new UniverseRenderer(
          this.sceneHost.nativeElement,
          this.galaxy(),
          (index, focus) => this.zone.run(() => this.select(index, focus)),
          (index, x, y) =>
            this.zone.run(() => {
              this.hovered.set(index);
              this.tooltip.set({ x, y });
            }),
          () =>
            this.zone.run(() => {
              this.pauseTour();
              this.rotation.set(false);
            }),
          () =>
            this.zone.run(() => {
              this.graphicsError.set(true);
              this.stopTour();
            })
        );
        this.syncScene();
      } catch {
        // Initialization can fail before the renderer owner exists (e.g. unavailable WebGL).
        this.sceneHost.nativeElement.replaceChildren();
        this.zone.run(() => this.graphicsError.set(true));
      }
    });
  }
  private syncScene(): void {
    this.renderer?.setState(
      this.selected(),
      new Set(this.results().map(item => item.index)),
      this.labels(),
      this.connections(),
      this.rotation()
    );
  }
  search(value: string): void {
    this.pauseTour();
    this.query.set(value);
    this.activeResult.set(0);
    this.searchOpen.set(true);
    this.syncScene();
  }
  searchKey(event: KeyboardEvent): void {
    const count = Math.min(8, this.results().length);
    if (event.key === 'Escape') {
      this.searchOpen.set(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.searchOpen.set(true);
      this.activeResult.set(count ? (this.activeResult() + (event.key === 'ArrowDown' ? 1 : -1) + count) % count : 0);
    }
    if (event.key === 'Enter' && count) {
      event.preventDefault();
      this.select(this.results()[this.activeResult()]?.index ?? this.results()[0].index, true);
    }
  }
  select(index: number, focus = true, fromTour = false): void {
    if (!fromTour) this.pauseTour();
    const planet = this.galaxy().planets[index];
    if (!planet) return;
    this.selected.set(index);
    this.searchOpen.set(false);
    this.hovered.set(-1);
    if (focus) this.renderer?.focus(planet.position, Math.max(7, planet.radius * 5));
    this.syncScene();
  }
  chooseCluster(group?: Cluster): void {
    this.pauseTour();
    this.cluster.set(group?.name ?? '');
    this.selected.set(-1);
    this.syncScene();
    if (group) this.renderer?.focus(group.position, group.radius);
    else this.renderer?.fit();
  }
  back(): void {
    this.stopTour();
    this.selected.set(-1);
    this.cluster.set('');
    this.query.set('');
    this.searchOpen.set(false);
    this.syncScene();
    this.renderer?.fit();
  }
  fit(reset = false): void {
    this.pauseTour();
    if (reset) {
      this.rotation.set(false);
      this.back();
    } else this.renderer?.fit();
  }
  toggle(option: 'labels' | 'connections' | 'rotation'): void {
    if (option === 'rotation') this.pauseTour();
    this[option].update(value => !value);
    this.syncScene();
  }
  toggleExplorer(): void {
    this.explorer.update(value => !value);
  }
  toggleLibrary(): void {
    this.library.update(value => !value);
  }
  openDetails(planet: Planet): void {
    this.pauseTour();
    this.dialogs.openDetails(planet.book.isbn);
  }
  coverFailed(isbn: string): void {
    this.brokenCovers.update(set => new Set([...set, isbn]));
  }
  startTour(): void {
    this.stopTour();
    this.query.set('');
    this.cluster.set('');
    this.rotation.set(false);
    this.tourIndex = 0;
    this.tourStage = 'cluster';
    this.discovery.set(discoveryTransition(this.discovery(), 'start'));
    this.tourStep();
  }
  pauseTour(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.discovery.set(discoveryTransition(this.discovery(), 'pause'));
    this.renderer?.stopFlight();
  }
  resumeTour(): void {
    this.discovery.set(discoveryTransition(this.discovery(), 'resume'));
    if (this.discovery() === 'playing') this.tourStep();
  }
  stepTour(delta: number): void {
    const playing = this.discovery() === 'playing';
    this.pauseTour();
    const size = this.galaxy().planets.length;
    if (!size) return;
    this.tourIndex = (this.tourIndex + delta + size) % size;
    this.tourStage = 'book';
    if (playing) this.discovery.set('playing');
    this.tourStep();
  }
  private tourStep(): void {
    if (this.destroyed || !this.galaxy().planets.length) return;
    const planet = this.galaxy().planets[this.tourIndex];
    if (this.tourStage === 'cluster') {
      const group = this.galaxy().clusters.find(item => item.name === planet.topic)!;
      this.tourCaption.set(`${group.name} · ${group.count} Bücher`);
      this.selected.set(-1);
      this.renderer?.focus(group.position, group.radius);
      this.tourStage = 'book';
      this.syncScene();
    } else {
      this.tourCaption.set(planet.book.title);
      this.select(this.tourIndex, true, true);
      const next = (this.tourIndex + 1) % this.galaxy().planets.length;
      this.tourStage = this.galaxy().planets[next].topic !== planet.topic ? 'cluster' : 'book';
      if (this.discovery() === 'playing') {
        this.timer = setTimeout(() => {
          this.tourIndex = next;
          this.tourStep();
        }, 5500);
      }
      return;
    }
    if (this.discovery() === 'playing') this.timer = setTimeout(() => this.tourStep(), 5500);
  }
  stopTour(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.discovery.set(discoveryTransition(this.discovery(), 'stop'));
    this.tourCaption.set('');
    this.renderer?.stopFlight();
  }
  private readonly onVisibility = (): void => {
    if (document.hidden) this.pauseTour();
  };
  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTour();
    this.request?.unsubscribe();
    this.renderer?.dispose();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
