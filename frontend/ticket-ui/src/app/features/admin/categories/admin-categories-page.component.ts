import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { Category } from '../../../models';
import { CategoryService } from '../../../core/services/category.service';
import { DocumentService } from '../../../core/services/document.service';

interface CategoryWithCount extends Category {
  documentCount?: number;
}

@Component({
  selector: 'app-admin-categories-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page-shell">
      <header class="page-header">
        <div class="header-content">
          <div class="header-badge">
            <span class="badge-dot"></span>
            Knowledge Base
          </div>
          <h1 class="page-title">Gestion des Categories</h1>
          <p class="page-subtitle">Organisez votre base documentaire et gerez les classifications.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" type="button" (click)="showCreateForm = !showCreateForm">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Nouvelle categorie
          </button>
        </div>
      </header>

      <div class="stats-row" *ngIf="!loading">
        <div class="stat-card">
          <div class="stat-icon">📁</div>
          <div class="stat-info">
            <span class="stat-value">{{ categories.length }}</span>
            <span class="stat-label">Total categories</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-info">
            <span class="stat-value">{{ totalDocuments }}</span>
            <span class="stat-label">Total documents</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <span class="stat-value">{{ categoriesWithDocs }}</span>
            <span class="stat-label">Categories utilisees</span>
          </div>
        </div>
      </div>

      <div class="create-card" *ngIf="showCreateForm">
        <h3 class="create-title">Creer une nouvelle categorie</h3>
        <div class="create-form">
          <input class="form-input" [(ngModel)]="newCategoryName" placeholder="Nom de la categorie" (keyup.enter)="createCategory()" />
          <input class="form-input" [(ngModel)]="newCategoryDescription" placeholder="Description (optionnel)" />
          <div class="form-actions">
            <button class="btn btn-ghost" type="button" (click)="showCreateForm = false">Annuler</button>
            <button class="btn btn-primary" type="button" [disabled]="loading || !newCategoryName.trim()" (click)="createCategory()">
              {{ loading ? 'Creation...' : 'Creer' }}
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-card">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input class="search-input" type="search" placeholder="Rechercher une categorie..." [(ngModel)]="searchTerm" />
        </div>
      </div>

      <div class="error-card" *ngIf="errorMessage">
        <div class="error-icon">⚠️</div>
        <div class="error-content">
          <h4>Erreur de chargement</h4>
          <p>{{ errorMessage }}</p>
        </div>
        <button class="btn btn-secondary btn-sm" type="button" (click)="refreshCategories()">Reessayer</button>
      </div>

      <div class="categories-grid" *ngIf="!loading && !errorMessage">
        <div class="category-card" *ngFor="let category of filteredCategories; let i = index" [style.animation-delay]="(i * 50) + 'ms'">
          <div class="category-header">
            <div class="category-icon">📁</div>
            <div class="category-info">
              <h3 class="category-name">{{ category.name }}</h3>
              <p class="category-desc">{{ category.description || 'Pas de description' }}</p>
            </div>
          </div>
          <div class="category-footer">
            <span class="category-count">
              <span class="count-badge">{{ category.documentCount || 0 }}</span>
              documents
            </span>
            <div class="category-actions">
              <button class="btn-icon" type="button" (click)="startEdit(category)" title="Modifier">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </button>
              <button class="btn-icon danger" type="button" (click)="deleteCategory(category)" title="Supprimer">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"></path>
                </svg>
              </button>
            </div>
          </div>
          <div class="edit-form" *ngIf="editingCategory?.id === category.id">
            <input class="form-input" [(ngModel)]="editName" placeholder="Nom" />
            <input class="form-input" [(ngModel)]="editDescription" placeholder="Description" />
            <div class="form-actions">
              <button class="btn btn-ghost btn-sm" type="button" (click)="cancelEdit()">Annuler</button>
              <button class="btn btn-primary btn-sm" type="button" (click)="saveEdit()">Enregistrer</button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-card" *ngIf="!loading && !errorMessage && filteredCategories.length === 0">
        <div class="empty-icon">📁</div>
        <h3 class="empty-title">Aucune categorie trouvee</h3>
        <p class="empty-text">{{ searchTerm ? 'Aucune categorie ne correspond a votre recherche.' : 'Commencez par creer votre premiere categorie.' }}</p>
        <button class="btn btn-primary" type="button" (click)="showCreateForm = true" *ngIf="!searchTerm">
          Creer une categorie
        </button>
      </div>

      <div class="loading-grid" *ngIf="loading">
        <div class="category-card loading-card" *ngFor="let _ of [1,2,3,4]">
          <div class="loading-line" style="width: 60%; height: 18px; margin-bottom: 8px;"></div>
          <div class="loading-line" style="width: 80%; height: 12px;"></div>
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
      grid-template-columns: repeat(3, 1fr);
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

    .create-card {
      padding: 24px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .create-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 16px;
    }

    .create-form {
      display: grid;
      gap: 12px;
    }

    .form-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.875rem;
      color: #111827;
      background: #f9fafb;
      transition: border-color 0.2s, box-shadow 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      background: white;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }

    .toolbar-card {
      padding: 16px 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .search-wrap {
      position: relative;
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

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .category-card {
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .category-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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

    .category-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 16px;
    }

    .category-icon {
      font-size: 1.5rem;
      width: 44px;
      height: 44px;
      display: grid;
      place-items: center;
      background: #eef2ff;
      border-radius: 10px;
      flex-shrink: 0;
    }

    .category-info { flex: 1; min-width: 0; }

    .category-name {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .category-desc {
      font-size: 0.8rem;
      color: #6b7280;
      margin: 0;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .category-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 14px;
      border-top: 1px solid #f3f4f6;
    }

    .category-count {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .count-badge {
      padding: 4px 10px;
      background: #eef2ff;
      color: #4f46e5;
      border-radius: 100px;
      font-weight: 700;
      font-size: 0.75rem;
    }

    .category-actions {
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

    .edit-form {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f3f4f6;
      display: grid;
      gap: 10px;
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

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 768px) {
      .stats-row { grid-template-columns: 1fr; }
      .categories-grid { grid-template-columns: 1fr; }
      .page-header { flex-direction: column; }
    }
  `]
})
export class AdminCategoriesPageComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly documentService = inject(DocumentService);

  categories: CategoryWithCount[] = [];
  newCategoryName = '';
  newCategoryDescription = '';
  searchTerm = '';
  loading = false;
  errorMessage = '';
  showCreateForm = false;

  editingCategory: Category | null = null;
  editName = '';
  editDescription = '';

  totalDocuments = 0;

  get categoriesWithDocs(): number {
    return this.categories.filter(c => (c.documentCount || 0) > 0).length;
  }

  get filteredCategories(): CategoryWithCount[] {
    const query = this.searchTerm.trim().toLowerCase();
    return query
      ? this.categories.filter(c => c.name.toLowerCase().includes(query))
      : this.categories;
  }

  ngOnInit(): void {
    this.refreshCategories();
    this.loadDocumentCounts();
  }

  refreshCategories(): void {
    this.loading = true;
    this.errorMessage = '';
    this.categoryService.listCategories().pipe(finalize(() => (this.loading = false))).subscribe({
      next: (categories) => {
        this.categories = categories.map(c => ({ ...c, documentCount: 0 }));
        this.loadDocumentCounts();
      },
      error: () => { this.errorMessage = 'Impossible de charger les categories.'; }
    });
  }

  loadDocumentCounts(): void {
    this.documentService.listDocuments({ categoryId: '', status: '', query: '' }).subscribe({
      next: (docs) => {
        this.totalDocuments = docs.length;
        this.categories = this.categories.map(cat => ({
          ...cat,
          documentCount: docs.filter(d => d.category?.id === cat.id).length
        }));
      }
    });
  }

  createCategory(): void {
    const name = this.newCategoryName.trim();
    if (!name || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    this.categoryService.createCategory({ name, description: this.newCategoryDescription.trim() })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: () => {
          this.newCategoryName = '';
          this.newCategoryDescription = '';
          this.showCreateForm = false;
          this.refreshCategories();
        },
        error: () => { this.errorMessage = 'Impossible de creer la categorie.'; }
      });
  }

  startEdit(category: Category): void {
    this.editingCategory = category;
    this.editName = category.name;
    this.editDescription = category.description || '';
  }

  cancelEdit(): void {
    this.editingCategory = null;
    this.editName = '';
    this.editDescription = '';
  }

  saveEdit(): void {
    if (!this.editingCategory || !this.editName.trim()) return;
    this.loading = true;
    this.categoryService.updateCategory(this.editingCategory.id, { name: this.editName, description: this.editDescription })
      .pipe(finalize(() => { this.loading = false; }))
      .subscribe({
        next: () => { this.cancelEdit(); this.refreshCategories(); },
        error: () => { this.errorMessage = 'Impossible de modifier la categorie.'; }
      });
  }

  deleteCategory(category: Category): void {
    if (!window.confirm(`Supprimer la categorie "${category.name}" ?`)) return;
    this.loading = true;
    this.categoryService.deleteCategory(category.id).pipe(finalize(() => (this.loading = false))).subscribe({
      next: () => this.refreshCategories(),
      error: () => { this.errorMessage = 'Suppression impossible.'; }
    });
  }
}
