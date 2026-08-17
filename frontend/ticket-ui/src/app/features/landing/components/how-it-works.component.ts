import { Component, ViewChildren, QueryList, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';

@Component({
  selector: 'app-how-it-works',
  standalone: true,
  template: `
    <section id="how-it-works" class="how-it-works">
      <div class="how-it-works-container">
        <h2 class="section-title">Comment ça marche</h2>
        <div class="steps">
          <div class="step" #stepEl>
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Le ticket arrive</h3>
              <p>Un utilisateur soumet un ticket via email, chat ou formulaire.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step" #stepEl>
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>L'IA analyse</h3>
              <p>Notre IA analyse le contenu, détecte l'intention et la priorité.</p>
            </div>
          </div>
          <div class="step-line"></div>
          <div class="step" #stepEl>
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Résolution rapide</h3>
              <p>Le ticket est assigné et une réponse est suggérée à l'agent.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .how-it-works {
      padding: 100px 2rem;
    }

    .how-it-works-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      margin-bottom: 4rem;
    }

    .steps {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 2rem;
      position: relative;
    }

    .step {
      flex: 1;
      text-align: center;
      opacity: 1;
      transform: none;
    }

    @media (prefers-reduced-motion: no-preference) {
      .step {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }
      .step.in-view {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .step-number {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-blue), var(--accent-violet));
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 auto 1.5rem;
    }

    .step-content h3 {
      margin-bottom: 0.5rem;
    }

    .step-content p {
      color: var(--text-secondary);
    }

    .step-line {
      flex: 0.5;
      height: 2px;
      background: linear-gradient(90deg, var(--accent-blue), var(--accent-violet), var(--accent-cyan));
      margin-top: 32px;
      opacity: 0.5;
    }

    @media (max-width: 980px) {
      .steps {
        flex-direction: column;
        align-items: center;
      }

      .step-line {
        width: 2px;
        height: 60px;
        margin: 1rem 0;
      }
    }
  `]
})
export class HowItWorksComponent implements AfterViewInit, OnDestroy {
  @ViewChildren('stepEl') stepElements!: QueryList<ElementRef<HTMLElement>>;
  private observer?: IntersectionObserver;

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          this.observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    this.stepElements.forEach(el => this.observer?.observe(el.nativeElement));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}
