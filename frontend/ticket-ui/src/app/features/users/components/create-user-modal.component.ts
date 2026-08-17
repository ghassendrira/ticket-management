import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { UserService, CreateUserRequest } from '../../../core/services/user.service';
import { AlertComponent } from '../../../shared/components/alert/alert.component';

@Component({
  selector: 'app-create-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, AlertComponent],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="modal-title">Create User</h2>
          <button class="modal-close" (click)="onClose()">&times;</button>
        </div>

        @if (errorMessage()) {
          <app-alert type="error" class="mb-4">{{ errorMessage() }}</app-alert>
        }
        @if (successMessage()) {
          <app-alert type="success" class="mb-4">{{ successMessage() }}</app-alert>
        }
        @if (tempPasswordMessage()) {
          <app-alert type="warning" class="mb-4">
            <div class="temp-password-container">
              <p class="temp-password-text">User created but email failed to send. Temporary password:</p>
              <div class="temp-password-box">
                <code>{{ tempPassword() }}</code>
                <button class="copy-btn" (click)="copyToClipboard()">📋 Copy</button>
              </div>
            </div>
          </app-alert>
        }

        <form [formGroup]="createUserForm" (ngSubmit)="onSubmit()" class="modal-form">
          <app-input
            type="text"
            label="Full Name"
            placeholder="Enter full name"
            formControlName="fullName"
            [errorMessage]="getErrorMessage('fullName')"
          />

          <app-input
            type="text"
            label="Username"
            placeholder="Enter username"
            formControlName="username"
            [errorMessage]="getErrorMessage('username')"
          />

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
            @if (createUserForm.get('role')?.touched && createUserForm.get('role')?.invalid) {
              <span class="input-error">Role is required</span>
            }
          </div>

          <p class="helper-text">
            A temporary password will be generated and emailed to the user automatically.
          </p>

          <div class="modal-actions">
            <app-button variant="secondary" (click)="onClose()" type="button">Cancel</app-button>
            <app-button type="submit" [loading]="loading()" [disabled]="createUserForm.invalid">
              Create User
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

    .helper-text {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin: 0;
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

    .temp-password-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .temp-password-text {
      margin: 0;
    }

    .temp-password-box {
      display: flex;
      align-items: center;
      gap: 1rem;
      background-color: var(--bg);
      padding: 0.75rem 1rem;
      border-radius: 12px;
    }

    .temp-password-box code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      flex: 1;
      color: var(--text-primary);
    }

    .copy-btn {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
    }

    .copy-btn:hover {
      background-color: var(--border);
    }
  `]
})
export class CreateUserModalComponent {
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  closed = output<void>();
  userCreated = output<void>();

  createUserForm = this.fb.group({
    fullName: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['', Validators.required]
  });

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  tempPasswordMessage = signal<string | null>(null);
  tempPassword = signal<string | null>(null);

  onClose() {
    this.closed.emit();
  }

  getErrorMessage(controlName: string): string | undefined {
    const control = this.createUserForm.get(controlName);
    if (!control || !control.touched || !control.errors) {
      return undefined;
    }
    if (control.errors['required']) return 'This field is required';
    if (control.errors['email']) return 'Please enter a valid email';
    return undefined;
  }

  onSubmit() {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.tempPasswordMessage.set(null);
    this.tempPassword.set(null);

    this.userService.createUser(this.createUserForm.value as CreateUserRequest).subscribe({
      next: response => {
        if (response.emailSent) {
          this.successMessage.set(`User created - an email with login instructions was sent to ${response.user.email}`);
          setTimeout(() => {
            this.userCreated.emit();
            this.onClose();
          }, 2000);
        } else {
          this.tempPasswordMessage.set('User created but email failed');
          this.tempPassword.set(response.temporaryPassword!);
        }
      },
      error: err => {
        console.error('Failed to create user:', err);
        this.errorMessage.set(err.error?.message || 'Failed to create user');
      },
      complete: () => {
        this.loading.set(false);
      }
    });
  }

  copyToClipboard() {
    if (this.tempPassword()) {
      navigator.clipboard.writeText(this.tempPassword()!);
    }
  }
}
