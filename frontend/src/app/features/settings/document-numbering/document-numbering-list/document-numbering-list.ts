import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon, Table, TableCellDirective, TableColumn } from '@lumen-ui/angular';
import { LIST_PAGE_CARD } from '../../../../shared/components/list-page-card/list-page-card';
import { DocNoPipe } from '../../../../shared/pipes/doc-no.pipe';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { DocumentNumbering } from '../document-numbering.model';
import { DocumentNumberingService } from '../document-numbering.service';

/**
 * How each document type is numbered. View only: the API has no endpoint to change the formats.
 * The list isn't paged, so the table sorts it locally.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe, DocNoPipe, Icon, LIST_PAGE_CARD, Table, TableCellDirective],
  selector: 'app-document-numbering-list',
  styleUrl: './document-numbering-list.scss',
  templateUrl: './document-numbering-list.html',
})
export class DocumentNumberingList {
  private readonly documentNumberingService = inject(DocumentNumberingService);

  readonly columns: TableColumn[] = [
    { key: 'sn', header: 'S.N', width: '56px' },
    { key: 'name', header: 'Document Type', sortable: true },
    { key: 'prefix', header: 'Prefix', sortable: true },
    { key: 'body_length', header: 'Digits', sortable: true, width: '120px' },
    { key: 'range', header: 'Number Range' },
    { key: 'first', header: 'First Number' },
  ];

  readonly rows = signal<DocumentNumbering[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal('');

  readonly emptyText = computed(() => this.loadError() || 'No document types found.');

  constructor() {
    this.documentNumberingService
      .list()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: rows => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(apiErrorMessage(error, 'Could not load the document numbering.'));
          this.loading.set(false);
        },
      });
  }

  /** Two-digit running number: 01, 02, … */
  serial(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  /** The number the first document of this type gets, raw like the API returns it. */
  firstNumber(row: DocumentNumbering): string {
    return `${row.prefix ?? ''}${String(row.start_no).padStart(row.body_length, '0')}`;
  }
}
