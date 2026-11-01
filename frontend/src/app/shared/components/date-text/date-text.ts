import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CalendarSystem, DateInput } from '@lumen-ui/angular';
import { fromIsoDate } from '../../utils/date';

/**
 * Shows an API date (`YYYY-MM-DD`) as text in the AD or BS calendar. It is Lumen's
 * date input in view mode, so it uses the same AD → BS conversion as the pickers.
 * Text inherits color and size from where it is placed.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DateInput, FormsModule],
  selector: 'app-date-text',
  styleUrl: './date-text.scss',
  template: `
    <l-date-input
      [viewMode]="true"
      [useValidation]="false"
      [calendar]="calendar()"
      [format]="format()"
      [viewValue]="value() ? undefined : fallback()"
      [ngModel]="value()"
      [ngModelOptions]="{ standalone: true }"
    />
  `,
})
export class DateText {
  readonly date = input<string | Date | null | undefined>(null);
  readonly calendar = input<CalendarSystem>('bs');
  readonly format = input('YYYY-MM-DD');
  /** Shown when there is no date. */
  readonly fallback = input('-');

  /** API strings parsed as local dates; `new Date('YYYY-MM-DD')` would read them as UTC. */
  protected readonly value = computed(() => {
    const date = this.date();
    return typeof date === 'string' ? fromIsoDate(date) : (date ?? null);
  });
}
