import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrap" [style.width.%]="100">
      <div
        *ngFor="let line of lines"
        class="skeleton"
        [style.height.px]="line.h"
        [style.width.%]="line.w"
        [style.marginBottom.px]="line.mb || 8"
      ></div>
    </div>
  `,
  styles: [`
    .skeleton-wrap { display: grid; }
  `]
})
export class LoadingSkeletonComponent {
  @Input() lines: { h: number; w: number; mb?: number }[] = [
    { h: 24, w: 60, mb: 12 },
    { h: 14, w: 100, mb: 8 },
    { h: 14, w: 90, mb: 8 },
    { h: 14, w: 75, mb: 0 }
  ];
}
