import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Category } from '../../../models';

@Component({
  selector: 'app-category-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <article class="item section-card">
      <div class="content" *ngIf="!editing">
        <div>
          <h3>{{ category.name }}</h3>
          <p class="muted">{{ category.documentsCount || 0 }} documents lies</p>
        </div>

        <div class="actions">
          <button class="ghost-button" type="button" (click)="startEdit()">Renommer</button>
          <button class="danger-button" type="button" (click)="remove.emit(category)">Supprimer</button>
        </div>
      </div>

      <div class="editor" *ngIf="editing">
        <input class="field" [(ngModel)]="draftName" placeholder="Nom de la categorie">
        <div class="actions">
          <button class="primary-button" type="button" (click)="save()">Enregistrer</button>
          <button class="ghost-button" type="button" (click)="cancel()">Annuler</button>
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      .item {
        padding: 1rem;
      }

      .content,
      .editor {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        align-items: center;
      }

      h3,
      p {
        margin: 0;
      }

      .actions {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .editor .field {
        max-width: 360px;
      }

      @media (max-width: 768px) {
        .content,
        .editor {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `
  ]
})
export class CategoryItemComponent {
  @Input({ required: true }) category!: Category;

  @Output() rename = new EventEmitter<{ category: Category; name: string }>();
  @Output() remove = new EventEmitter<Category>();

  editing = false;
  draftName = '';

  startEdit(): void {
    this.editing = true;
    this.draftName = this.category.name;
  }

  cancel(): void {
    this.editing = false;
    this.draftName = this.category.name;
  }

  save(): void {
    const name = this.draftName.trim();

    if (!name) {
      return;
    }

    this.rename.emit({ category: this.category, name });
    this.editing = false;
  }
}
