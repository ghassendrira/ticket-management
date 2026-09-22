import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  private readonly errorMessageState = signal<string | null>(null);

  readonly errorMessage = this.errorMessageState.asReadonly();

  setError(message: string): void {
    this.errorMessageState.set(message);
  }

  clear(): void {
    this.errorMessageState.set(null);
  }
}
