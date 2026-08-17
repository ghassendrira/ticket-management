import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'relativeTime',
  standalone: true,
  pure: false
})
export class RelativeTimePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(value: string | Date): string {
    if (!value) return '';
    const date = typeof value === 'string' ? new Date(value) : value;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);

    if (diffSec < 60) return this.translate.instant('RELATIVE.JUST_NOW');
    if (diffMin < 60) return this.translate.instant('RELATIVE.MINUTES_AGO', { count: diffMin });
    if (diffHour < 24) return this.translate.instant('RELATIVE.HOURS_AGO', { count: diffHour });
    if (diffDay < 7) return this.translate.instant('RELATIVE.DAYS_AGO', { count: diffDay });
    if (diffWeek < 4) return this.translate.instant('RELATIVE.WEEKS_AGO', { count: diffWeek });
    if (diffMonth < 12) return this.translate.instant('RELATIVE.MONTHS_AGO', { count: diffMonth });
    return this.translate.instant('RELATIVE.YEARS_AGO', { count: diffYear });
  }
}
