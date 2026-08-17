import { Component, input, output, signal, computed } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  template: `
    <div class="pagination-container">
      <button
        class="pagination-btn"
        [disabled]="currentPage() === 1"
        (click)="pageChange.emit(currentPage() - 1)"
      >
        ← Prev
      </button>

      <div class="pagination-numbers">
        @for (page of visiblePages(); track page) {
          <button
            class="pagination-number"
            [class.active]="page === currentPage()"
            (click)="pageChange.emit(page)"
          >
            {{ page }}
          </button>
        }
      </div>

      <button
        class="pagination-btn"
        [disabled]="currentPage() === totalPages()"
        (click)="pageChange.emit(currentPage() + 1)"
      >
        Next →
      </button>
    </div>
  `,
  styles: [`
    .pagination-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-top: 1.5rem;
    }
    .pagination-btn {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }
    .pagination-btn:hover:not(:disabled) {
      background-color: var(--bg-secondary);
    }
    .pagination-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .pagination-numbers {
      display: flex;
      gap: 0.5rem;
    }
    .pagination-number {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s ease;
    }
    .pagination-number:hover:not(.active) {
      background-color: var(--bg-secondary);
    }
    .pagination-number.active {
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-blue));
      color: white;
      border-color: transparent;
    }
  `]
})
export class PaginationComponent {
  totalItems = input.required<number>();
  pageSize = input(10);
  currentPage = input.required<number>();

  pageChange = output<number>();

  totalPages = computed(() => Math.ceil(this.totalItems() / this.pageSize()));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;
    
    let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > total) {
      endPage = total;
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  });
}
