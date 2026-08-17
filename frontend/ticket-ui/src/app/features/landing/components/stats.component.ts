import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  template: `
    <section id="stats" class="stats">
      <div class="stats-container">
        @for (stat of stats; track stat.label; let i = $index) {
          <div class="stat-item" #statItem>
            <div class="stat-value">{{ displayValues[i] }}{{ stat.suffix }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .stats {
      padding: 100px 2rem;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
    }

    .stats-container {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 2rem;
      text-align: center;
    }

    .stat-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 3rem;
      font-weight: 700;
      color: white;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: rgba(255, 255, 255, 0.85);
      font-size: 1.1rem;
    }

    @media (max-width: 980px) {
      .stats-container {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .stats-container {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StatsComponent implements AfterViewInit, OnDestroy {
  stats: Stat[] = [
    { value: 52, suffix: '%', label: 'Réduction temps de résolution' },
    { value: 38, suffix: '%', label: 'Satisfaction client' },
    { value: 96, suffix: '%', label: 'Précision IA' },
    { value: 3.4, suffix: 'x', label: 'Productivité' }
  ];

  displayValues: number[] = [0, 0, 0, 0];
  private animated = false;
  private observer?: IntersectionObserver;
  @ViewChildren('statItem') statItems!: QueryList<ElementRef<HTMLElement>>;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.animated) {
          this.animated = true;
          this.animateStats();
          this.observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    this.statItems.forEach(el => this.observer?.observe(el.nativeElement));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private animateStats() {
    this.stats.forEach((stat, index) => {
      const duration = 2000;
      const start = performance.now();
      const animate = (time: number) => {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        this.displayValues[index] = parseFloat((stat.value * easeOut).toFixed(1));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    });
  }
}
