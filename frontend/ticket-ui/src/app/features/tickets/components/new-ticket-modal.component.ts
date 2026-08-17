import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { TicketService, TicketRequest, Priority, Category } from '../../../core/services/ticket.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';
import { AttachmentService } from '../../../core/services/attachment.service';
import { FileDropZoneComponent } from '../../../shared/components/file-drop-zone/file-drop-zone.component';

@Component({
  selector: 'app-new-ticket-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    AlertComponent,
    FileDropZoneComponent
  ],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Create New Ticket</h2>
          <button class="modal-close" (click)="onClose()" [disabled]="loading()">&times;</button>
        </div>

        @if (errorMessage()) {
          <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
        }
        @if (successMessage()) {
          <app-alert type="success" class="mb-4">{{ successMessage() }}</app-alert>
        }

        <form [formGroup]="createTicketForm" (ngSubmit)="onSubmit()" class="modal-form">
          <app-input
            type="text"
            label="Title"
            placeholder="Enter ticket title"
            formControlName="title"
            [errorMessage]="getErrorMessage('title')"
          />

          <div class="form-group">
            <label class="input-label">Description</label>
            <textarea
              class="form-control"
              placeholder="Enter ticket description"
              formControlName="description"
              rows="4"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="input-label">Priority</label>
              <select class="form-control" formControlName="priority">
                <option value="" disabled>Select priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            <div class="form-group">
              <label class="input-label">Category</label>
              <select class="form-control" formControlName="category">
                <option value="" disabled>Select category</option>
                <option value="ACCOUNT_ACCESS">Account Access</option>
                <option value="BILLING">Billing</option>
                <option value="TECHNICAL">Technical</option>
                <option value="ORDER">Order</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SECURITY">Security</option>
                <option value="INFORMATION">Information</option>
              </select>
            </div>
          </div>

          <app-input
            type="text"
            label="Customer ID (Optional)"
            placeholder="Enter customer ID"
            formControlName="customerId"
          />

          <div class="form-group">
            <label class="input-label">Attachments</label>
            <app-file-drop-zone
              [files]="stagedFiles()"
              (filesChange)="stagedFiles.set($event)"
            />
            <p class="helper-text">
              Files stay local until the ticket is created, then we upload them automatically.
            </p>
          </div>

          @if (uploadProgressText()) {
            <app-alert type="success">{{ uploadProgressText() }}</app-alert>
          }

          <div class="modal-actions">
            <app-button
              variant="secondary"
              (click)="onClose()"
              type="button"
              [disabled]="loading()"
            >
              Cancel
            </app-button>
            <app-button
              type="submit"
              [loading]="loading()"
              [disabled]="createTicketForm.invalid || loading()"
            >
              {{ loading() ? submitButtonLabel() : 'Create Ticket' }}
            </app-button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background-color: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      padding: 2rem;
      width: 100%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .modal-title {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 1.5rem;
      color: var(--text-primary);
      margin: 0;
    }

    .modal-close {
      background: transparent;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.5rem;
    }

    .modal-close:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .input-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .helper-text {
      margin: 0.5rem 0 0;
      font-size: 0.8125rem;
      color: var(--text-secondary);
    }

    .form-control {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--surface);
      color: var(--text-primary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      resize: vertical;
    }

    .form-control:focus {
      border-color: var(--accent-violet);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 1rem;
    }

    .mb-4 {
      margin-bottom: 1rem;
    }
  `]
})
export class NewTicketModalComponent {
  private fb = inject(FormBuilder);
  private ticketService = inject(TicketService);
  private attachmentService = inject(AttachmentService);
  private router = inject(Router);

  closed = output<void>();
  ticketCreated = output<void>();

  createTicketForm = this.fb.group({
    title: ['', Validators.required],
    description: [''],
    priority: ['LOW' as Priority],
    category: ['TECHNICAL' as Category],
    customerId: ['']
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  uploadProgressText = signal<string | null>(null);
  stagedFiles = signal<File[]>([]);

  onClose() {
    if (this.loading()) {
      return;
    }
    this.closed.emit();
  }

  getErrorMessage(controlName: string): string | undefined {
    const control = this.createTicketForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'This field is required';
    return undefined;
  }

  submitButtonLabel(): string {
    return this.uploadProgressText() || 'Creating Ticket...';
  }

  async onSubmit() {
    if (this.createTicketForm.invalid) {
      this.createTicketForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.uploadProgressText.set('Creating ticket...');

    try {
      const createdTicket = await firstValueFrom(
        this.ticketService.createTicket(this.createTicketForm.getRawValue() as TicketRequest)
      );

      const files = [...this.stagedFiles()];
      let failedUploads = 0;

      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        this.uploadProgressText.set(`Uploading attachments (${index + 1}/${files.length})...`);

        try {
          await firstValueFrom(this.attachmentService.uploadAttachment(createdTicket.id, file));
        } catch (uploadError) {
          failedUploads++;
          console.error(`Failed to upload attachment "${file.name}":`, uploadError);
        }
      }

      if (failedUploads > 0) {
        this.successMessage.set(
          `Ticket created, but ${failedUploads} of ${files.length} file${files.length > 1 ? 's' : ''} failed to upload. You can retry from the ticket page.`
        );
      } else if (files.length > 0) {
        this.successMessage.set('Ticket created and attachments uploaded successfully!');
      } else {
        this.successMessage.set('Ticket created successfully!');
      }

      this.ticketCreated.emit();
      this.createTicketForm.reset({
        title: '',
        description: '',
        priority: 'LOW' as Priority,
        category: 'TECHNICAL' as Category,
        customerId: ''
      });
      this.stagedFiles.set([]);
      this.uploadProgressText.set(null);

      setTimeout(() => {
        this.loading.set(false);
        this.closed.emit();
        void this.router.navigate(['/tickets', createdTicket.id]);
      }, 800);
    } catch (err: any) {
      console.error('Failed to create ticket:', err);
      this.errorMessage.set(err.error?.message || 'Failed to create ticket');
      this.uploadProgressText.set(null);
      this.loading.set(false);
    }
  }
}
