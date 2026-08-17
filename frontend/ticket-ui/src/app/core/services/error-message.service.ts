import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface NormalizedHttpError {
  status: number;
  title: string;
  message: string;
  raw: unknown;
}

@Injectable({ providedIn: 'root' })
export class ErrorMessageService {
  private readonly translate = inject(TranslateService);

  getHttpErrorMessage(error: unknown, fallbackKey = 'ERROR.GENERIC'): string {
    return this.normalizeHttpError(error, fallbackKey).message;
  }

  getHttpErrorTitle(error: unknown): string {
    return this.normalizeHttpError(error).title;
  }

  normalizeHttpError(error: unknown, fallbackKey = 'ERROR.GENERIC'): NormalizedHttpError {
    if (error instanceof HttpErrorResponse) {
      const message = this.extractErrorMessage(error) || this.translate.instant(fallbackKey);
      const title = this.getErrorTitle(error);
      return {
        status: error.status,
        title,
        message,
        raw: error,
      };
    }

    if (error instanceof Error) {
      return {
        status: 0,
        title: this.translate.instant('ERROR.TITLE'),
        message: error.message || this.translate.instant(fallbackKey),
        raw: error,
      };
    }

    return {
      status: 0,
      title: this.translate.instant('ERROR.TITLE'),
      message: this.translate.instant(fallbackKey),
      raw: error,
    };
  }

  private getErrorTitle(error: HttpErrorResponse): string {
    if (error.status === 0) {
      return this.translate.instant('ERROR.NETWORK_TITLE');
    }

    if (error.status === 404) {
      return this.translate.instant('ERROR.NOT_FOUND_TITLE');
    }

    if (error.status >= 500) {
      return this.translate.instant('ERROR.SERVER_TITLE');
    }

    return this.translate.instant('ERROR.TITLE');
  }

  private extractErrorMessage(error: HttpErrorResponse): string | null {
    const payload = error.error;

    if (typeof payload === 'string' && payload.trim()) {
      return payload.trim();
    }

    if (payload instanceof Error) {
      return payload.message;
    }

    const candidate = this.asString(payload?.message) || this.asString(payload?.error);
    if (candidate) {
      return candidate;
    }

    const validationMessage = this.extractValidationErrors(payload);
    if (validationMessage) {
      return validationMessage;
    }

    const nestedError = this.asString(payload?.error?.message) || this.asString(payload?.error?.error);
    if (nestedError) {
      return nestedError;
    }

    if (payload && typeof payload === 'object') {
      const objectMessage = this.flattenObjectValues(payload);
      if (objectMessage) {
        return objectMessage;
      }
    }

    if (error.status === 0) {
      return this.translate.instant('ERROR.NO_NETWORK');
    }

    if (error.status >= 500) {
      return this.translate.instant('ERROR.SERVER');
    }

    if (error.status === 404) {
      return this.translate.instant('ERROR.NOT_FOUND');
    }

    if (error.status === 401) {
      return this.translate.instant('ERROR.UNAUTHORIZED');
    }

    if (error.status === 403) {
      return this.translate.instant('ERROR.FORBIDDEN');
    }

    if (error.status === 400) {
      return this.translate.instant('ERROR.BAD_REQUEST');
    }

    return null;
  }

  private extractValidationErrors(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const errors = (payload as any).errors ?? (payload as any).validationErrors ?? (payload as any).fieldErrors;
    if (!errors) {
      return null;
    }

    if (Array.isArray(errors)) {
      const messages = errors.map((item) => this.asString(item?.message) || this.asString(item)).filter(Boolean);
      return messages.length ? messages.join(' ') : null;
    }

    return this.flattenObjectValues(errors);
  }

  private flattenObjectValues(value: any): string | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const results: string[] = [];

    for (const rawValue of Object.values(value)) {
      if (rawValue == null) {
        continue;
      }

      if (typeof rawValue === 'string') {
        const text = rawValue.trim();
        if (text) {
          results.push(text);
        }
        continue;
      }

      if (Array.isArray(rawValue)) {
        for (const nested of rawValue) {
          const nestedText = this.asString(nested);
          if (nestedText) {
            results.push(nestedText);
          }
        }
        continue;
      }

      if (typeof rawValue === 'object') {
        const nested = this.flattenObjectValues(rawValue);
        if (nested) {
          results.push(nested);
        }
      }
    }

    return results.length ? results.join(' ') : null;
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed ? trimmed : null;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Error) {
      return value.message;
    }

    return null;
  }
}
