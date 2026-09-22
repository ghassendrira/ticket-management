import { DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Document } from '../../../models';

@Component({
  selector: '[app-document-table-row]',
  standalone: true,
  imports: [DatePipe],
  template: `
    <td>{{ document.name }}</td>
    <td>{{ document.category?.name || 'Sans categorie' }}</td>
    <td>{{ document.fileType || '-' }}</td>
    <td>
      <span class="pill">{{ document.status }}</span>
    </td>
    <td>{{ document.publicationStatus || 'N/A' }}</td>
    <td>{{ document.active ? 'Actif' : 'Inactif' }}</td>
    <td>{{ document.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
    <td>
      <div class="actions">
        <button class="ghost-button" type="button" (click)="view.emit(document)">Voir</button>
        <button class="ghost-button" type="button" (click)="reindex.emit(document)">Reindexer</button>
        <button class="ghost-button" type="button" (click)="toggle.emit(document)">
          {{ document.active ? 'Desactiver' : 'Activer' }}
        </button>
        <button class="danger-button" type="button" (click)="remove.emit(document)">Supprimer</button>
      </div>
    </td>
  `,
  styles: [
    `
      :host td {
        padding: 1rem;
        border-top: 1px solid var(--border);
        vertical-align: middle;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }
    `
  ]
})
export class DocumentTableRowComponent {
  @Input({ required: true }) document!: Document;

  @Output() view = new EventEmitter<Document>();
  @Output() reindex = new EventEmitter<Document>();
  @Output() remove = new EventEmitter<Document>();
  @Output() toggle = new EventEmitter<Document>();
}
