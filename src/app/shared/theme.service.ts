import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

export type ThemePreference = 'system' | 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly media = this.window?.matchMedia('(prefers-color-scheme: dark)');
  private readonly selection = signal<ThemePreference>('system');
  readonly preference = this.selection.asReadonly();

  constructor() {
    try {
      const saved = this.window?.localStorage.getItem('bookmonkey-theme');
      if (saved === 'system' || saved === 'light' || saved === 'dark') this.selection.set(saved);
    } catch {
      // Storage may be unavailable; keep the session preference usable.
    }
    this.apply();
    const onSystemChange = () => this.apply();
    this.media?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onSystemChange));
  }

  choose(value: string): void {
    if (value !== 'system' && value !== 'light' && value !== 'dark') return;
    this.selection.set(value);
    this.apply();
    try {
      this.window?.localStorage.setItem('bookmonkey-theme', value);
    } catch {
      // Applying the theme does not depend on successful persistence.
    }
  }

  private apply(): void {
    const dark = this.preference() === 'dark' || (this.preference() === 'system' && this.media?.matches);
    this.document.documentElement.dataset['theme'] = dark ? 'dark' : 'light';
    this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }
}
