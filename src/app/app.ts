import { Component, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemePreference, ThemeService } from './shared/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly theme = inject(ThemeService);
  private readonly nextTheme: Record<ThemePreference, ThemePreference> = {
    system: 'light',
    light: 'dark',
    dark: 'system'
  };
  private readonly themeNames = { system: 'System', light: 'Hell', dark: 'Dunkel' };
  protected readonly themeLabel = computed(
    () =>
      `Farbschema: ${this.themeNames[this.theme.preference()]}. Zu ${this.themeNames[this.nextTheme[this.theme.preference()]]} wechseln`
  );

  protected cycleTheme(): void {
    this.theme.choose(this.nextTheme[this.theme.preference()]);
  }

  protected title = 'BookMonkey';
}
