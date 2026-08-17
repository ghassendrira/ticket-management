import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordStrengthValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = control.value;
  if (!value) {
    return null;
  }

  const hasUpperCase = /[A-Z]/.test(value);
  const hasLowerCase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasMinLength = value.length >= 8;

  const errors: any = {};
  if (!hasUpperCase) {
    errors['missingUpperCase'] = true;
  }
  if (!hasLowerCase) {
    errors['missingLowerCase'] = true;
  }
  if (!hasNumber) {
    errors['missingNumber'] = true;
  }
  if (!hasMinLength) {
    errors['minLength'] = true;
  }

  return Object.keys(errors).length ? errors : null;
};

export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  return password && confirmPassword && password.value !== confirmPassword.value
    ? { passwordMismatch: true }
    : null;
};
