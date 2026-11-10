import { Component, inject } from '@angular/core';
import { ThemeService } from './theme.service';

@Component({
  selector: 'app-theme-picker',
  template: `
    <label class="flex items-center gap-2 text-sm text-muted">
      Theme
      <select
        #themeSelect
        [value]="theme.preference()"
        (change)="theme.selectTheme(themeSelect.value)"
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
  protected readonly theme = inject(ThemeService);
}
