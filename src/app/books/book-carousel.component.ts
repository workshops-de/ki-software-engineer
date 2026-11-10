import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Book } from './book';

@Component({
  selector: 'app-book-carousel',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './book-carousel.component.html',
  styleUrl: './book-carousel.component.css'
})
export class BookCarouselComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) books: Book[] = [];
  @Input() party = false;
  @ViewChild('stage', { static: true }) private stage!: ElementRef<HTMLElement>;

  readonly rotation = signal(0);
  readonly failedCovers = signal(new Set<string>());
  readonly sparks = Array.from({ length: 28 }, (_, index) => ({
    angle: `${(index * 137.5) % 360}deg`,
    delay: `${-(index % 10) / 10}s`,
    distance: `${100 + (index % 5) * 35}px`
  }));
  readonly cheers = ['Huiiii!', 'Schneller!', 'Wohooo!', 'Ab geht’s!'];
  private frame: number | undefined;
  private previousTime: number | undefined;
  private partySeconds = 0;
  private pointer: { id: number; startX: number; startY: number; angle: number; dragging: boolean } | undefined;
  private suppressClick = false;
  private readonly captureClick = (event: MouseEvent) => this.onClick(event);

  get radius(): number {
    return this.books.length === 1 ? 0 : Math.max(165, this.books.length * 29);
  }

  get step(): number {
    return 360 / Math.max(1, this.books.length);
  }

  ngOnChanges(): void {
    this.stopAnimation();
    this.pointer = undefined;
    if (this.party) this.frame = requestAnimationFrame(time => this.animate(time));
  }

  ngAfterViewInit(): void {
    // Capture before RouterLink's click handler so a completed drag never navigates.
    this.stage.nativeElement.addEventListener('click', this.captureClick, true);
  }

  ngOnDestroy(): void {
    this.stopAnimation();
    this.stage.nativeElement.removeEventListener('click', this.captureClick, true);
  }

  rotate(direction: number): void {
    if (!this.party) this.rotation.update(angle => angle + direction * this.step);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    this.rotate(event.key === 'ArrowRight' ? -1 : 1);
  }

  onPointerDown(event: PointerEvent): void {
    this.suppressClick = false;
    if (this.party || !event.isPrimary || event.button !== 0) return;
    this.pointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      angle: this.rotation(),
      dragging: false
    };
  }

  onPointerMove(event: PointerEvent): void {
    const pointer = this.pointer;
    if (!pointer || pointer.id !== event.pointerId || this.party) return;
    const distance = event.clientX - pointer.startX;
    if (!pointer.dragging) {
      if (Math.abs(distance) < 8 || Math.abs(distance) < Math.abs(event.clientY - pointer.startY)) return;
      pointer.dragging = true;
      // Capture only a real drag; ordinary cover taps keep native link behavior.
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    }
    this.suppressClick = true;
    this.rotation.set(pointer.angle + distance * 0.45);
  }

  onPointerEnd(event: PointerEvent): void {
    if (this.pointer?.id !== event.pointerId) return;
    this.pointer = undefined;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  onClick(event: MouseEvent): void {
    if (!this.suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopPropagation();
    this.suppressClick = false;
  }

  onCoverFocus(event: FocusEvent, index: number): void {
    if (!this.party && (event.target as HTMLElement).matches(':focus-visible')) this.rotation.set(-index * this.step);
  }

  onCoverError(id: string): void {
    this.failedCovers.update(failed => new Set([...failed, id]));
  }

  private animate(time: number): void {
    const elapsed = this.previousTime === undefined ? 0 : Math.min(time - this.previousTime, 64) / 1000;
    this.previousTime = time;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initialSpeed = reducedMotion ? 40 : 180;
    const acceleration = reducedMotion ? 10 : 90;
    // Integrate linear acceleration so speed keeps increasing for the entire party.
    const distance = (initialSpeed + acceleration * this.partySeconds) * elapsed + (acceleration * elapsed ** 2) / 2;
    this.partySeconds += elapsed;
    this.rotation.update(angle => angle + distance);
    this.frame = requestAnimationFrame(next => this.animate(next));
  }

  private stopAnimation(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.previousTime = undefined;
    this.partySeconds = 0;
  }
}
