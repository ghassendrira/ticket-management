import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';

export interface SourceItem {
  documentTitle: string;
  pageNumber?: number;
  section?: string;
  score?: number;
  snippet?: string;
}

@Component({
  selector: 'app-source-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sources-block">
      <button
        type="button"
        class="sources-toggle"
        (click)="isOpen.set(!isOpen())"
        [attr.aria-expanded]="isOpen()"
      >
        <div class="sources-head">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span class="fw-medium">Sources ({{ sources.length }})</span>
        </div>
        <svg
          class="chev"
          [class.open]="isOpen()"
          viewBox="0 0 24 24" width="16" height="16"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <div class="sources-list" *ngIf="isOpen()">
        <article class="source-item" *ngFor="let src of sources; index as i">
          <div class="source-head">
            <div class="source-title-wrap">
              <span class="source-num">{{ i + 1 }}</span>
              <span class="source-title truncate">{{ src.documentTitle }}</span>
            </div>
            <span *ngIf="src.score !== undefined" class="source-score" [class]="scoreClass(src.score)">
              {{ (src.score * 100).toFixed(0) }}%
            </span>
          </div>
          <div class="source-meta" *ngIf="src.pageNumber !== undefined || src.section">
            <span *ngIf="src.pageNumber !== undefined" class="meta-chip">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              p.{{ src.pageNumber }}
            </span>
            <span *ngIf="src.section" class="meta-chip">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
              {{ src.section }}
            </span>
          </div>
          <p class="source-snippet" *ngIf="src.snippet">"{{ src.snippet }}"</p>
        </article>
      </div>
    </div>
  `,
  styles: [`
    .sources-block {
      display: grid;
      gap: 8px;
    }

    .sources-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 10px 14px;
      border-radius: var(--radius-lg);
      background: var(--bg-muted);
      color: var(--text-secondary);
      border: 1px solid transparent;
      transition: all var(--transition-fast);
    }

    .sources-toggle:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
      border-color: var(--border-color);
    }

    .sources-head {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.85rem;
    }

    .chev {
      transition: transform var(--transition-base);
      color: currentColor;
      opacity: 0.6;
    }

    .chev.open {
      transform: rotate(180deg);
    }

    .sources-list {
      display: grid;
      gap: 8px;
      animation: fadeInUp var(--transition-base) ease-out;
      padding-left: 4px;
    }

    .source-item {
      padding: 12px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      display: grid;
      gap: 8px;
    }

    .source-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .source-title-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }

    .source-num {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      border-radius: var(--radius-md);
      background: var(--primary-100);
      color: var(--primary);
      font-size: 0.7rem;
      font-weight: 700;
    }

    .source-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .source-score {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      flex-shrink: 0;
    }

    .source-score.score-high {
      background: var(--accent-100);
      color: var(--accent);
    }

    .source-score.score-med {
      background: var(--warning-100);
      color: var(--warning);
    }

    .source-score.score-low {
      background: var(--danger-100);
      color: var(--danger);
    }

    .source-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .meta-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 500;
    }

    .source-snippet {
      font-size: 0.82rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
      font-style: italic;
      padding: 8px 10px;
      background: var(--bg-muted);
      border-left: 3px solid var(--primary);
      border-radius: 0 var(--radius-md) var(--radius-md) 0;
    }
  `]
})
export class SourceAccordionComponent {
  @Input({ required: true }) sources: SourceItem[] = [];

  readonly isOpen = signal(false);

  scoreClass(score: number): string {
    if (score >= 0.8) return 'score-high';
    if (score >= 0.5) return 'score-med';
    return 'score-low';
  }
}
