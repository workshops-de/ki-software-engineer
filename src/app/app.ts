import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppearanceControlComponent } from './appearance-control.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppearanceControlComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'BookMonkey';
}
