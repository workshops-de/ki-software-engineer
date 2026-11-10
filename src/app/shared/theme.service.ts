import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

type ThemePreference = 'system' | 'light' | 'dark';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly selected = signal<ThemePreference>('system');
  readonly preference = this.selected.asReadonly();

  constructor() {
    let saved: string | null = null;
    try {
      saved = this.document.defaultView?.localStorage.getItem('bookmonkey-theme') ?? null;
    } catch {
      // Storage may be disabled; the system preference still works.
    }
    this.applyTheme(isThemePreference(saved) ? saved : 'system');
  }

  selectTheme(value: string): void {
    if (!isThemePreference(value)) return;
    this.applyTheme(value);
    try {
      this.document.defaultView?.localStorage.setItem('bookmonkey-theme', value);
    } catch {
      // Keep the choice usable for this visit when persistence is unavailable.
    }
  }

  private applyTheme(value: ThemePreference): void {
    this.selected.set(value);
    this.document.documentElement.dataset['theme'] = value;
  }
}
