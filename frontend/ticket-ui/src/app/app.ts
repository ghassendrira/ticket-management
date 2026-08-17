import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LanguagePreferenceService } from './core/services/language-preference.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private readonly languagePreferenceService = inject(LanguagePreferenceService);

  ngOnInit() {
    this.languagePreferenceService.initialize();
  }
}
