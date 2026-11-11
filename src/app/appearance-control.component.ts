import { Component, DestroyRef, inject } from '@angular/core';

type Appearance = 'system' | 'light' | 'dark';

@Component({
  selector: 'app-appearance-control',
  template: `
    <div class="appearance-control">
      <label for="appearance">Appearance</label>
      <select id="appearance" [value]="appearance" (change)="changeAppearance($event)">
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  `
})
export class AppearanceControlComponent {
  protected appearance: Appearance = this.readAppearance();
  private readonly colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  private readonly onSystemChange = () => this.applyAppearance();

  constructor() {
    this.applyAppearance();
    this.colorScheme.addEventListener('change', this.onSystemChange);
    inject(DestroyRef).onDestroy(() => this.colorScheme.removeEventListener('change', this.onSystemChange));
  }

  protected changeAppearance(event: Event): void {
    this.appearance = (event.target as HTMLSelectElement).value as Appearance;
    try {
      sessionStorage.setItem('appearance', this.appearance);
    } catch {
      // The choice still applies for the current page when storage is unavailable.
    }
    this.applyAppearance();
  }

  private readAppearance(): Appearance {
    try {
      const value = sessionStorage.getItem('appearance');
      return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
      return 'system';
    }
  }

  private applyAppearance(): void {
    document.documentElement.dataset['theme'] = this.appearance === 'system'
      ? (this.colorScheme.matches ? 'dark' : 'light')
      : this.appearance;
  }
}
