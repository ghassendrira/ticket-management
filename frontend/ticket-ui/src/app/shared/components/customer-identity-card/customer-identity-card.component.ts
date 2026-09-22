import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomerIdentityService } from '../../../core/services/customer-identity.service';

@Component({
  selector: 'app-customer-identity-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="identity-card">
      <div class="identity-title-row">
        <strong>Identité client</strong>
        <span class="identity-hint">Anonyme ou lié à un email</span>
      </div>

      <div class="identity-form">
        <label class="field-label" for="customer-email">Email</label>
        <input
          id="customer-email"
          name="customer-email"
          type="email"
          [(ngModel)]="email"
          placeholder="vous@example.com"
        >
      </div>

      <div class="identity-actions">
        <button class="primary-button" type="button" (click)="continueWithEmail()">
          Continuer
        </button>
        <button class="secondary-button" type="button" (click)="continueAsGuest()">
          Continuer sans email
        </button>
      </div>

      @if (linkedEmail()) {
        <div class="identity-status">
          <span>Connecté : {{ linkedEmail() }}</span>
          <button class="link-button" type="button" (click)="disconnect()">Se déconnecter</button>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .identity-card {
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--border-color);
        border-radius: 16px;
        background: var(--bg-card);
        box-shadow: 0 8px 18px rgba(0, 0, 0, 0.05);
      }

      .identity-title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 0.92rem;
      }

      .identity-hint {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }

      .identity-form {
        display: grid;
        gap: 6px;
      }

      .field-label {
        color: var(--text-secondary);
        font-size: 0.84rem;
      }

      input {
        width: 100%;
        padding: 0.85rem 0.95rem;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        background: var(--bg-page);
        color: var(--text-primary);
      }

      .identity-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .primary-button,
      .secondary-button,
      .link-button {
        border: 0;
        cursor: pointer;
        border-radius: 10px;
      }

      .primary-button,
      .secondary-button {
        padding: 0.72rem 0.98rem;
      }

      .primary-button {
        background: var(--accent-color);
        color: white;
      }

      .secondary-button {
        background: transparent;
        color: var(--text-primary);
        border: 1px solid var(--border-color);
      }

      .identity-status {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
        color: var(--text-secondary);
        font-size: 0.84rem;
      }

      .link-button {
        background: transparent;
        color: var(--accent-color);
        padding: 0;
      }
    `
  ]
})
export class CustomerIdentityCardComponent {
  private readonly customerIdentityService = inject(CustomerIdentityService);

  protected email = '';
  protected readonly linkedEmail = () => this.customerIdentityService.email();

  protected continueWithEmail(): void {
    const normalizedEmail = this.email.trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    this.customerIdentityService.retrieveByEmail(normalizedEmail).subscribe({
      next: () => {
        // service.email signal will update automatically
      },
      error: () => {
        this.customerIdentityService.linkEmail(normalizedEmail).subscribe({
          next: () => {
            // service.email signal will update automatically
          }
        });
      }
    });
  }

  protected continueAsGuest(): void {
    this.email = '';
  }

  protected disconnect(): void {
    this.customerIdentityService.logout();
    this.email = '';
  }
}
