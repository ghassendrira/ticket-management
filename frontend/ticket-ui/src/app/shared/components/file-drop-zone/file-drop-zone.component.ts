import { Component, inject, input, output, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AttachmentService } from '../../../core/services/attachment.service';
import { AlertComponent } from '../alert/alert.component';

@Component({
  selector: 'app-file-drop-zone',
  standalone: true,
  imports: [AlertComponent, TranslatePipe],
  template: `
    <div
      class="drop-zone"
      [class.drag-over]="isDragOver()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="drop-zone-content">
        <div class="drop-icon">📎</div>
        <p class="drop-text">{{ 'FILE_DROP.DROP_HINT' | translate }}</p>
        <label class="file-input-label">
          <input type="file" multiple (change)="onFileSelect($event)" class="file-input">
          <span class="file-input-text">{{ 'FILE_DROP.BROWSE_FILES' | translate }}</span>
        </label>
      </div>
    </div>

    @if (validationError()) {
      <app-alert type="error" class="mt-3">{{ validationError() }}</app-alert>
    }

    @if (files().length > 0) {
      <div class="file-list mt-3">
        @for (file of files(); track file.name + file.lastModified) {
          <div class="file-item">
            <div class="file-icon">{{ getFileIcon(file.type) }}</div>
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
            </div>
            <button class="remove-button" (click)="removeFile(file)" aria-label="Remove file">✕</button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .drop-zone {
      border: 2px dashed var(--border);
      border-radius: 16px;
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s ease;
      background-color: var(--bg-secondary);
    }
    .drop-zone.drag-over {
      border-color: var(--accent-violet);
      background-color: rgba(139, 92, 246, 0.1);
    }
    .drop-zone-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }
    .drop-icon {
      font-size: 3rem;
    }
    .drop-text {
      color: var(--text-secondary);
      margin: 0;
    }
    .file-input-label {
      background: linear-gradient(135deg, var(--accent-violet), var(--accent-blue));
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 12px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .file-input-label:hover {
      opacity: 0.9;
    }
    .file-input {
      display: none;
    }
    .file-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .file-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .file-icon {
      font-size: 1.5rem;
    }
    .file-info {
      flex: 1;
    }
    .file-name {
      font-weight: 500;
      color: var(--text-primary);
      font-size: 0.9rem;
    }
    .file-size {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }
    .remove-button {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
    }
    .remove-button:hover {
      color: #ef4444;
    }
    .mt-3 { margin-top: 1rem; }
  `]
})
export class FileDropZoneComponent {
  private attachmentService = inject(AttachmentService);
  private translateService = inject(TranslateService);

  files = input<File[]>([]);
  filesChange = output<File[]>();

  isDragOver = signal(false);
  validationError = signal<string | null>(null);

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver.set(false);
    this.validationError.set(null);

    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    this.processFiles(droppedFiles);
  }

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFiles = Array.from(input.files || []);
    this.validationError.set(null);
    this.processFiles(selectedFiles);
  }

  private processFiles(newFiles: File[]) {
    const currentFiles = [...this.files()];

    for (const file of newFiles) {
      const validation = this.attachmentService.validateFile(file);
      if (!validation.valid) {
        this.validationError.set(validation.error ?? this.translateService.instant('FILE_DROP.INVALID_FILE'));
        continue;
      }
      const isDuplicate = currentFiles.some(f => f.name === file.name && f.lastModified === file.lastModified);
      if (!isDuplicate) {
        currentFiles.push(file);
      }
    }

    this.filesChange.emit(currentFiles);
  }

  removeFile(file: File) {
    const updatedFiles = this.files().filter(f => f !== file);
    this.filesChange.emit(updatedFiles);
  }

  getFileIcon(type: string): string {
    if (type.includes('pdf')) return '📄';
    if (type.includes('image')) return '🖼️';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('sheet') || type.includes('excel')) return '📊';
    if (type.includes('text')) return '📃';
    return '📁';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
