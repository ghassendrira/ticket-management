import { Component } from '@angular/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { HeroComponent } from './components/hero.component';
import { FeaturesComponent } from './components/features.component';
import { HowItWorksComponent } from './components/how-it-works.component';
import { StatsComponent } from './components/stats.component';
import { DemoPreviewComponent } from './components/demo-preview.component';
import { CtaComponent } from './components/cta.component';
import { FooterComponent } from './components/footer.component';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    HowItWorksComponent,
    StatsComponent,
    DemoPreviewComponent,
    CtaComponent,
    FooterComponent
  ],
  template: `
    <app-navbar [showLanguageSwitcher]="true" />
    <main>
      <app-hero />
      <app-features />
      <app-how-it-works />
      <app-stats />
      <app-demo-preview />
      <app-cta />
    </main>
    <app-footer />
  `
})
export class LandingComponent {}
