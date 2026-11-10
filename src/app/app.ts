import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemePickerComponent } from './shared/theme-picker.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ThemePickerComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
