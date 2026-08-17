import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { UserService, UpdateUserRequest } from '../../../core/services/user.service';
import { UserResponse } from '../../../core/services/auth.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Edit User</h2>
          <button class="modal-close" (click)="onClose()">&times;</button>
        </div>

        @if (errorMessage()) {
          <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
        }
        @if (successMessage()) {
          <app-alert type="success" class="mb-4">{{ successMessage() }}</app-alert>
        }

        <form [formGroup]="editUserForm" (ngSubmit)="onSubmit()" class="modal-form">
          <app-input
            type="text"
            label="Full Name"
            placeholder="Enter full name"
            formControlName="fullName"
            [errorMessage]="getErrorMessage('fullName')"
          />

          <div class="form-group">
            <label class="input-label">Username</label>
            <input type="text" [value]="user().username" disabled class="input-field disabled-input" />
          </div>

          <app-input
            type="email"
            label="Email"
            placeholder="Enter email"
            formControlName="email"
            [errorMessage]="getErrorMessage('email')"
          />

          <div class="form-group">
            <label class="input-label">Role</label>
            <div class="role-options">
              <label class="role-option">
                <input type="radio" formControlName="role" value="AGENT" />
                <span>Agent</span>
              </label>
              <label class="role-option">
                <input type="radio" formControlName="role" value="MANAGER" />
                <span>Manager</span>
              </label>
              <label class="role-option">
                <input type="radio" formControlName="role" value="ADMIN" />
                <span>Admin</span>
              </label>
            </div>
            @if (editUserForm.get('role')?.touched && editUserForm.get('role')?.invalid) {
              <span class="input-error">Role is required</span>
            }
          </div>

          <div class="modal-actions">
            <app-button variant="secondary" (click)="onClose()" type="button">Cancel</app-button>
            <app-button type="submit" [loading]="loading()" [disabled]="editUserForm.invalid">
              Save Changes
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
      max-width: 500px;
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

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .disabled-input {
      padding: 0.875rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background-color: var(--bg-secondary);
      color: var(--text-secondary);
      font-size: 0.9375rem;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
      width: 100%;
      opacity: 0.7;
    }

    .role-options {
      display: flex;
      gap: 1rem;
    }

    .role-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      color: var(--text-primary);
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
export class EditUserModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  user = input.required<UserResponse>();
  closed = output<void>();
  userUpdated = output<void>();

  editUserForm = this.fb.group({
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required]
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  ngOnInit() {
    if (this.user()) {
      this.editUserForm.patchValue({
        fullName: this.user().fullName,
        email: this.user().email,
        role: this.user().role
      });
    }
  }

  onClose() {
    this.closed.emit();
  }

  getErrorMessage(controlName: string): string | undefined {
    const control = this.editUserForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email';
    return undefined;
  }

  onSubmit() {
    if (this.editUserForm.invalid) {
      this.editUserForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.userService.updateUser(this.user().id, this.editUserForm.value as UpdateUserRequest).subscribe({
      next: () => {
        this.successMessage.set('User updated successfully');
        setTimeout(() => {
          this.userUpdated.emit();
          this.onClose();
        }, 1500);
      },
      error: err => {
        console.error('Failed to update user:', err);
        this.errorMessage.set(err.error?.message || 'Failed to update user');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }
}
