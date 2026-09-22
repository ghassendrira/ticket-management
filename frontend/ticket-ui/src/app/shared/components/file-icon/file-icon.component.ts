import { CommonModule } from '@angular/common';
import { Component, Input, computed } from '@angular/core';

export type FileType = 'pdf' | 'docx' | 'txt' | 'doc' | 'other';

@Component({
  selector: 'app-file-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="file-icon" [class]="iconClass()">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path *ngIf="type() === 'pdf'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5h-2v5h2c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1zm0 4h-1v-3h1v3zm4.5-4h-2.5v5h1.4v-1.5h1.1c.55 0 1-.45 1-1v-1.5c0-.55-.45-1-1-1zm0 2.5h-1.4V15h1.4v1zm5 0h-3.5v-3H16c.28 0 .5.22.5.5s-.22.5-.5.5h-1.5v.5H18v.5h-2v1h2v.5h-3v-1h1v-.5H18v1zm-7-2.5v1.5h-1.4V15H14zm-5-1h1v3h-1v-3z"/>
        <path *ngIf="type() === 'docx' || type() === 'doc'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 13h6v1H6v-1zm0 2h6v1H6v-1zm0-4h6v1H6v-1zm0 6h3v1H6v-1zm5 0h1v-1h-1v1zm2 0h3v1h-3v-1zm2-2h1v-1h-1v1zm-4 0h1v-1H9v1z"/>
        <path *ngIf="type() === 'txt'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM7 12h10v1H7v-1zm0 3h10v1H7v-1zm0 3h7v1H7v-1z"/>
        <path *ngIf="type() === 'other'" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/>
      </svg>
    </div>
  `,
  styles: [`
    .file-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      border-radius: var(--radius-lg);
      transition: transform var(--transition-fast);
    }

    .file-icon.size-sm { width: 32px; height: 32px; }
    .file-icon.size-md { width: 44px; height: 44px; }
    .file-icon.size-lg { width: 56px; height: 56px; }

    .file-icon.pdf { background: rgba(239, 68, 68, 0.12); color: #EF4444; }
    .file-icon.docx, .file-icon.doc { background: rgba(59, 130, 246, 0.12); color: #3B82F6; }
    .file-icon.txt { background: rgba(107, 114, 128, 0.12); color: #6B7280; }
    .file-icon.other { background: var(--primary-100); color: var(--primary); }
  `]
})
export class FileIconComponent {
  @Input() fileType: string | undefined | null = null;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  readonly type = computed<FileType>(() => {
    const t = (this.fileType ?? '').toLowerCase();
    if (t.includes('pdf')) return 'pdf';
    if (t.includes('docx')) return 'docx';
    if (t.includes('doc')) return 'doc';
    if (t.includes('text') || t.includes('txt')) return 'txt';
    return 'other';
  });

  iconClass() {
    return `${this.type()} size-${this.size}`;
  }
}
