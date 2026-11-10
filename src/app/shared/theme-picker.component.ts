import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

type ThemePreference = 'system' | 'light' | 'dark';

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

@Component({
  selector: 'app-theme-picker',
  template: `
    <label class="flex items-center gap-2 text-sm text-muted">
      Theme
      <select
        #themeSelect
        [value]="preference()"
        (change)="selectTheme(themeSelect.value)"
        class="rounded-md border border-line bg-surface px-3 py-2 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
})
export class ThemePickerComponent {
  private readonly document = inject(DOCUMENT);
  protected readonly preference = signal<ThemePreference>('system');

  constructor() {
    let saved: string | null = null;
    try {
      saved = this.document.defaultView?.localStorage.getItem('bookmonkey-theme') ?? null;
    } catch {
      // Storage may be disabled; the system preference still works.
    }
    this.applyTheme(isThemePreference(saved) ? saved : 'system');
  }

  protected selectTheme(value: string): void {
    if (!isThemePreference(value)) return;
    this.applyTheme(value);
    try {
      this.document.defaultView?.localStorage.setItem('bookmonkey-theme', value);
    } catch {
      // Keep the choice usable for this visit when persistence is unavailable.
    }
  }

  private applyTheme(value: ThemePreference): void {
    this.preference.set(value);
    this.document.documentElement.dataset['theme'] = value;
  }
}
