import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Category, Document, DocumentStatus } from '../../../models';
import { CategoryService } from '../../../core/services/category.service';
import { DocumentFilters, DocumentService } from '../../../core/services/document.service';
import { FileIconComponent } from '../../../shared/components/file-icon/file-icon.component';

interface DocumentWithCategory extends Document {
  categoryName?: string;
}

@Component({
  selector: 'app-admin-documents-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FileIconComponent],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div class="header-content">
          <div class="header-badge">
            <span class="badge-dot"></span>
            Knowledge Base
          </div>
          <h1 class="page-title">Gestion des Documents</h1>
          <p class="page-subtitle">Supervisez vos connaissances, importez de nouvelles sources et suivez l'indexation.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" type="button" (click)="showUploadModal = true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Importer un document
          </button>
        </div>
      </header>

      <div class="stats-row" *ngIf="!loading">
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-info">
            <span class="stat-value">{{ documents.length }}</span>
            <span class="stat-label">Total documents</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ indexedCount }}</span>
            <span class="stat-label">Indexes</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <span class="stat-value">{{ pendingCount }}</span>
            <span class="stat-label">En attente</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">❌</div>
          <div class="stat-info">
            <span class="stat-value">{{ failedCount }}</span>
            <span class="stat-label">Echecs</span>
          </div>
        </div>
      </div>

      <div class="stats-row" *ngIf="loading">
        <div class="stat-card loading-card" *ngFor="let _ of [1,2,3,4]">
          <div class="loading-line" style="width: 40px; height: 40px; border-radius: 10px;"></div>
          <div class="loading-line" style="width: 60%; height: 20px;"></div>
        </div>
      </div>

      <div class="toolbar-card">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input class="search-input" type="search" placeholder="Rechercher par nom, categorie..." [(ngModel)]="filters.query" (ngModelChange)="refreshDocuments()" />
        </div>
        <select class="filter-select" [(ngModel)]="filters.categoryId" (ngModelChange)="refreshDocuments()">
          <option value="">Toutes les categories</option>
          <option *ngFor="let category of categories" [value]="category.id">{{ category.name }}</option>
        </select>
        <div class="status-filters">
          <button *ngFor="let chip of statusChips()" type="button" class="status-chip" [class.active]="filters.status === chip.value" (click)="setStatusFilter(chip.value)">
            <span class="chip-indicator" [class]="'indicator-' + chip.variant"></span>
            {{ chip.label }}
            <span class="chip-badge">{{ chip.count }}</span>
          </button>
        </div>
      </div>

      <div class="error-card" *ngIf="errorMessage">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h4>Erreur de chargement</h4>
          <p>{{ errorMessage }}</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="refreshDocuments()">Reessayer</button>
      </div>

      <div class="documents-grid" *ngIf="!loading && !errorMessage">
        <div class="doc-card" *ngFor="let doc of documents; let i = index" [style.animation-delay]="(i * 50) + 'ms'">
          <div class="doc-header">
            <div class="doc-icon">
              <app-file-icon [fileType]="doc.fileType" size="md" />
            </div>
            <div class="doc-info">
              <h3 class="doc-name" [title]="doc.name">{{ doc.name }}</h3>
              <p class="doc-category">{{ doc.category?.name || 'Sans categorie' }}</p>
            </div>
          </div>
          <div class="doc-status-bar">
            <span class="status-pill" [class]="'pill-' + doc.status">
              <span class="pill-dot" [class.pulse]="doc.status === 'PROCESSING'"></span>
              {{ statusLabel(doc.status) }}
            </span>
            <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
          </div>
          <div class="doc-progress" *ngIf="doc.status === 'PROCESSING'">
            <div class="progress-track"><div class="progress-fill processing" style="width: 65%"></div></div>
          </div>
          <div class="doc-progress" *ngIf="doc.status === 'INDEXED'">
            <div class="progress-track"><div class="progress-fill success" style="width: 100%"></div></div>
          </div>
          <div class="doc-progress" *ngIf="doc.status === 'FAILED'">
            <div class="progress-track"><div class="progress-fill danger" style="width: 100%"></div></div>
          </div>
          <div class="doc-footer">
            <span class="doc-chunks" *ngIf="doc.chunksCount !== undefined">{{ doc.chunksCount }} chunks</span>
            <div class="doc-actions">
              <button class="btn-icon" type="button" (click)="reindexDocument(doc)" title="Reindexer">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
              </button>
              <button class="btn-icon danger" type="button" (click)="deleteDocument(doc)" title="Supprimer">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-card" *ngIf="!loading && !errorMessage && documents.length === 0">
        <div class="empty-icon">📄</div>
        <h3 class="empty-title">Aucun document trouve</h3>
        <p class="empty-text">Importez votre premier document pour commencer.</p>
        <button class="btn btn-primary" type="button" (click)="showUploadModal = true">
          Importer un document
        </button>
      </div>

      <div class="loading-grid" *ngIf="loading">
        <div class="doc-card loading-card" *ngFor="let _ of [1,2,3,4]">
          <div class="loading-line" style="width: 50px; height: 50px; border-radius: 10px; margin-bottom: 12px;"></div>
          <div class="loading-line" style="width: 70%; height: 16px; margin-bottom: 8px;"></div>
          <div class="loading-line" style="width: 40%; height: 12px; margin-bottom: 16px;"></div>
          <div class="loading-line" style="width: 100%; height: 8px; border-radius: 4px;"></div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showUploadModal" (click)="$event.target === $event.currentTarget && showUploadModal = false">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">Importer un document</h3>
            <button class="modal-close" type="button" (click)="showUploadModal = false">&times;</button>
          </div>
          <div class="modal-content">
            <div class="dropzone" [class.dragover]="isDragging" (dragover)="onDragOver($event)" (dragleave)="isDragging = false" (drop)="onDrop($event)" (click)="fileInput?.click()">
              <input #fileInput type="file" accept=".pdf,.docx,.doc,.txt" hidden (change)="onFileSelected($event)" />
              <div class="dropzone-icon">📤</div>
              <div class="dropzone-text">{{ selectedFile ? selectedFile.name : 'Deposez votre fichier ici ou cliquez' }}</div>
              <div class="dropzone-formats" *ngIf="!selectedFile">
                <span class="format-badge">PDF</span>
                <span class="format-badge">DOCX</span>
                <span class="format-badge">TXT</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Categorie</label>
              <select class="form-select" [(ngModel)]="uploadCategoryId">
                <option value="">Selectionner une categorie</option>
                <option *ngFor="let category of categories" [value]="category.id">{{ category.name }}</option>
              </select>
            </div>
            <div class="upload-progress" *ngIf="uploadProgress > 0">
              <div class="progress-track"><div class="progress-fill" [style.width.%]="uploadProgress"></div></div>
              <span class="progress-text">{{ uploadProgress }}%</span>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" type="button" (click)="showUploadModal = false">Annuler</button>
            <button class="btn btn-primary" type="button" [disabled]="loading || !selectedFile || !uploadCategoryId" (click)="uploadDocument()">
              {{ loading ? 'Importation...' : 'Importer et indexer' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .page-shell {
      display: flex;
      flex-direction: column;
      gap: 24px;
      padding: 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      flex-wrap: wrap;
    }

    .header-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: linear-gradient(135deg, #e0e7ff, #dbeafe);
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #4f46e5;
      margin-bottom: 12px;
    }

    .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #4f46e5;
      animation: pulse 2s infinite;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px;
    }

    .page-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .stat-icon {
      font-size: 1.75rem;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      background: #f9fafb;
      border-radius: 12px;
    }

    .stat-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #6b7280;
    }

    .loading-card {
      pointer-events: none;
      background: #f9fafb;
    }

    .loading-line {
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    .toolbar-card {
      padding: 16px 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
    }

    .search-wrap {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: #9ca3af;
    }

    .search-input {
      width: 100%;
      padding: 12px 16px 12px 42px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f9fafb;
      font-size: 0.875rem;
      color: #111827;
    }

    .search-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      background: white;
    }

    .filter-select {
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f9fafb;
      font-size: 0.875rem;
      color: #111827;
      min-width: 180px;
    }

    .status-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 100px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      font-size: 0.8rem;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }

    .status-chip:hover {
      border-color: #6366f1;
      color: #6366f1;
    }

    .status-chip.active {
      background: #6366f1;
      border-color: #6366f1;
      color: white;
    }

    .chip-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    .indicator-muted { background: #9ca3af; }
    .indicator-success { background: #10b981; }
    .indicator-warning { background: #f59e0b; }
    .indicator-primary { background: #6366f1; }
    .indicator-danger { background: #ef4444; }

    .chip-badge {
      padding: 2px 8px;
      border-radius: 100px;
      background: rgba(0, 0, 0, 0.06);
      font-size: 0.7rem;
      font-weight: 700;
    }

    .status-chip.active .chip-badge {
      background: rgba(255, 255, 255, 0.2);
    }

    .error-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .error-content { flex: 1; }
    .error-content h4 { margin: 0 0 4px; color: #b91c1c; font-size: 0.9rem; }
    .error-content p { margin: 0; font-size: 0.85rem; color: #7f1d1d; }

    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .doc-card {
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .doc-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }

    .doc-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }

    .doc-info { flex: 1; min-width: 0; }

    .doc-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .doc-category {
      font-size: 0.8rem;
      color: #6366f1;
      font-weight: 500;
      margin: 0;
    }

    .doc-status-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 100px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .pill-INDEXED { background: #d1fae5; color: #065f46; }
    .pill-PROCESSING { background: #fef3c7; color: #92400e; }
    .pill-PENDING { background: #e0e7ff; color: #3730a3; }
    .pill-FAILED { background: #fee2e2; color: #991b1b; }

    .pill-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .pill-dot.pulse {
      animation: pulse 1.5s infinite;
    }

    .doc-date {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .doc-progress {
      padding: 10px 0;
    }

    .progress-track {
      height: 6px;
      border-radius: 100px;
      background: #f3f4f6;
      overflow: hidden;
      margin-bottom: 6px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 100px;
      transition: width 0.3s ease;
    }

    .progress-fill.processing { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .progress-fill.success { background: linear-gradient(90deg, #10b981, #34d399); }
    .progress-fill.danger { background: linear-gradient(90deg, #ef4444, #f87171); }

    .doc-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }

    .doc-chunks {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .doc-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: white;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-icon:hover {
      border-color: #6366f1;
      color: #6366f1;
      background: #eef2ff;
    }

    .btn-icon.danger:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
    }

    .empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 60px 24px;
      background: white;
      border-radius: 12px;
      border: 1px dashed #d1d5db;
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px;
    }

    .empty-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0 0 24px;
    }

    .loading-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: grid;
      place-items: center;
      z-index: 1000;
      padding: 24px;
    }

    .modal-container {
      width: 100%;
      max-width: 520px;
      border-radius: 20px;
      background: white;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.15);
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .modal-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: none;
      background: #f9fafb;
      color: #6b7280;
      cursor: pointer;
      font-size: 1.2rem;
    }

    .modal-content {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .dropzone {
      padding: 40px 24px;
      border-radius: 16px;
      border: 2px dashed #d1d5db;
      background: #f9fafb;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .dropzone:hover, .dropzone.dragover {
      border-color: #6366f1;
      background: #eef2ff;
    }

    .dropzone-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .dropzone-text {
      font-size: 0.9rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 16px;
    }

    .dropzone-formats {
      display: flex;
      justify-content: center;
      gap: 8px;
    }

    .format-badge {
      padding: 4px 10px;
      border-radius: 8px;
      background: white;
      font-size: 0.7rem;
      font-weight: 600;
      color: #6b7280;
      border: 1px solid #e5e7eb;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 0.85rem;
      font-weight: 500;
      color: #374151;
    }

    .form-select {
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f9fafb;
      font-size: 0.875rem;
      color: #111827;
    }

    .upload-progress {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .progress-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: #6366f1;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .documents-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; }
      .toolbar-card { flex-direction: column; align-items: stretch; }
      .search-wrap { width: 100%; }
    }
  `]
})
export class AdminDocumentsPageComponent implements OnInit {
  private readonly documentService = inject(DocumentService);
  private readonly categoryService = inject(CategoryService);

  documents: Document[] = [];
  categories: Category[] = [];
  filters: DocumentFilters = { categoryId: '', status: '', query: '' };

  showUploadModal = false;
  selectedFile?: File;
  uploadCategoryId = '';
  uploadProgress = 0;
  isDragging = false;
  fileInput: HTMLInputElement | null = null;

  loading = false;
  errorMessage = '';

  get indexedCount(): number { return this.documents.filter(d => d.status === 'INDEXED').length; }
  get pendingCount(): number { return this.documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING').length; }
  get failedCount(): number { return this.documents.filter(d => d.status === 'FAILED').length; }

  statusChips = computed(() => {
    const docs = this.documents;
    return [
      { label: 'Tous', value: '' as const, count: docs.length, variant: 'muted' as const },
      { label: 'Indexes', value: 'INDEXED' as DocumentStatus, count: docs.filter(d => d.status === 'INDEXED').length, variant: 'success' as const },
      { label: 'En cours', value: 'PROCESSING' as DocumentStatus, count: docs.filter(d => d.status === 'PROCESSING').length, variant: 'warning' as const },
      { label: 'En attente', value: 'PENDING' as DocumentStatus, count: docs.filter(d => d.status === 'PENDING').length, variant: 'primary' as const },
      { label: 'Echecs', value: 'FAILED' as DocumentStatus, count: docs.filter(d => d.status === 'FAILED').length, variant: 'danger' as const }
    ];
  });

  ngOnInit(): void {
    this.loadCategories();
    this.refreshDocuments();
  }

  setStatusFilter(value: DocumentStatus | ''): void {
    this.filters = { ...this.filters, status: value };
    this.refreshDocuments();
  }

  refreshDocuments(): void {
    this.loading = true;
    this.errorMessage = '';
    this.documentService.listDocuments(this.filters).pipe(finalize(() => (this.loading = false))).subscribe({
      next: (documents) => { this.documents = documents; },
      error: () => { this.errorMessage = 'Impossible de charger les documents.'; }
    });
  }

  reindexDocument(document: Document): void {
    this.loading = true;
    this.errorMessage = '';
    this.documentService.reindexDocument(document.id).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => this.refreshDocuments(),
      error: () => { this.errorMessage = 'Impossible de reindexer.'; }
    });
  }

  deleteDocument(document: Document): void {
    if (!window.confirm(`Supprimer "${document.name}" ?`)) return;
    this.loading = true;
    this.documentService.deleteDocument(document.id).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => this.refreshDocuments(),
      error: () => { this.errorMessage = 'Impossible de supprimer.'; }
    });
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging = true; }
  onDrop(event: DragEvent): void { event.preventDefault(); this.isDragging = false; const file = event.dataTransfer?.files.item(0); if (file) this.selectedFile = file; }
  onFileSelected(event: Event): void { const input = event.target as HTMLInputElement; this.fileInput = input; this.selectedFile = input.files?.item(0) ?? undefined; }

  uploadDocument(): void {
    if (!this.selectedFile || !this.uploadCategoryId || this.loading) return;
    this.loading = true;
    this.errorMessage = '';
    this.uploadProgress = 0;
    const interval = setInterval(() => { this.uploadProgress = Math.min(90, this.uploadProgress + Math.floor(Math.random() * 12) + 3); }, 200);
    this.documentService.uploadDocument(this.selectedFile, this.uploadCategoryId).pipe(finalize(() => {
      clearInterval(interval);
      this.uploadProgress = 100;
      this.loading = false;
      setTimeout(() => { this.uploadProgress = 0; this.showUploadModal = false; }, 500);
    })).subscribe({
      next: () => this.refreshDocuments(),
      error: () => { this.errorMessage = "Impossible d'importer le document."; }
    });
  }

  statusLabel(status: DocumentStatus): string {
    const labels: Record<string, string> = { INDEXED: 'Indexe', PROCESSING: 'En cours', PENDING: 'En attente', FAILED: 'Echec' };
    return labels[status] || status;
  }

  formatDate(dateStr: string): string {
    try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return dateStr; }
  }

  private loadCategories(): void {
    this.categoryService.listCategories().subscribe({
      next: (categories) => { this.categories = categories; },
      error: () => { this.errorMessage = 'Impossible de charger les categories.'; }
    });
  }
}
