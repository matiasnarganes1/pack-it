import { Component } from '@angular/core';
import { PackItComponent } from "./components/pack-it.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [PackItComponent],
  template: `<app-pack-it />`,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'pack-it';
}