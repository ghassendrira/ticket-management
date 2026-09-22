import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CustomerIdentityService } from '../../../core/services/customer-identity.service';

@Component({
  selector: 'app-home-identity-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="home-identity-panel">
      <button class="identity-toggle" type="button" (click)="toggleOpen()">
        <span>Identifie comme invite</span>
        <span class="identity-link">Renseigner un email</span>
      </button>

      <div *ngIf="isOpen()" class="identity-form">
        <label class="identity-label" for="customer-email">Email</label>
        <input
          id="customer-email"
          name="customer-email"
          type="email"
          [(ngModel)]="email"
          placeholder="vous@example.com"
        />

        <div class="identity-actions">
          <button class="primary-button" type="button" (click)="continueWithEmail()">
            Continuer
          </button>
          <button class="secondary-button" type="button" (click)="continueAsGuest()">
            Continuer sans email
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .home-identity-panel {
        border-top: 0.5px solid var(--border-color);
        padding-top: 18px;
        display: grid;
        gap: 14px;
        text-align: left;
      }

      .identity-toggle {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--text-secondary);
        font-size: 13px;
        line-height: 1.4;
        cursor: pointer;
      }

      .identity-toggle span {
        display: inline-flex;
        align-items: center;
      }

      .identity-link {
        color: var(--accent-color);
        text-decoration: none;
        font-weight: 500;
      }

      .identity-form {
        display: grid;
        gap: 12px;
      }

      .identity-label {
        font-size: 12px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      input {
        width: 100%;
        min-height: 48px;
        padding: 0 14px;
        border-radius: 14px;
        border: 1px solid var(--border-color);
        background: var(--bg-card-secondary);
        color: var(--text-primary);
        font-size: 14px;
      }

      .identity-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .primary-button,
      .secondary-button {
        min-height: 48px;
        border-radius: 14px;
        border: 0;
        cursor: pointer;
        font-size: 14px;
      }

      .primary-button {
        background: var(--accent-color);
        color: white;
      }

      .secondary-button {
        background: var(--bg-card-secondary);
        color: var(--text-primary);
      }
    `
  ]
})
export class HomeIdentityPanelComponent {
  private readonly customerIdentityService = inject(CustomerIdentityService);

  protected email = '';
  protected readonly isOpen = signal(false);

  protected toggleOpen(): void {
    this.isOpen.update((open) => !open);
  }

  protected continueWithEmail(): void {
    const normalizedEmail = this.email.trim().toLowerCase();
    if (!normalizedEmail) {
      return;
    }

    this.customerIdentityService.retrieveByEmail(normalizedEmail).subscribe({
      next: () => {
        this.isOpen.set(false);
      },
      error: () => {
        this.customerIdentityService.linkEmail(normalizedEmail).subscribe(() => {
          this.isOpen.set(false);
        });
      }
    });
  }

  protected continueAsGuest(): void {
    this.isOpen.set(false);
  }
}
