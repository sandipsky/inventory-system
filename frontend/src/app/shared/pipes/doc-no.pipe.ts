import { Pipe, PipeTransform } from '@angular/core';

/**
 * Displays a document number such as `2082-83|PE-000005` as `2082-83 | PE-000005`.
 * The API returns numbers with a leading `|` when no fiscal-year prefix is set
 * (`|PE-000001`); that empty part is dropped. Send the raw value back to the API.
 */
@Pipe({ name: 'docNo' })
export class DocNoPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .split('|')
      .map(part => part.trim())
      .filter(Boolean)
      .join(' | ');
  }
}
