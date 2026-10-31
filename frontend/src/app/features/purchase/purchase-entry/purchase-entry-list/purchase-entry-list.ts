import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Button,
  CalendarSystem,
  Card,
  DateInput,
  Filter,
  FilterChange,
  FilterColumn,
  Icon,
  SegmentedControl,
  SegmentedOption,
} from '@lumen-ui/angular';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, DateInput, Filter, FormsModule, Icon, RouterLink, SegmentedControl],
  selector: 'app-purchase-entry-list',
  styleUrl: './purchase-entry-list.scss',
  templateUrl: './purchase-entry-list.html',
})
export class PurchaseEntryList {
  // Field keys are the backend's camelCase filter names (see backend/endpoints.md).
  readonly filterColumns: FilterColumn[] = [
    { name: 'Vendor', formcontrolName: 'vendor.name', type: 'text' },
    { name: 'Bill No', formcontrolName: 'billNo', type: 'text' },
    { name: 'Entry No', formcontrolName: 'systemEntryNo', type: 'text' },
    {
      name: 'Transaction Type',
      formcontrolName: 'transactionType',
      type: 'select',
      data: [
        { id: 'Cash', name: 'Cash' },
        { id: 'Credit', name: 'Credit' },
      ],
    },
  ];

  readonly calendarOptions: SegmentedOption[] = [
    { label: 'AD', value: 'ad' },
    { label: 'BS', value: 'bs' },
  ];

  readonly calendar = signal<CalendarSystem>('bs');
  readonly fromDate = signal<Date | null>(startOfToday());
  readonly toDate = signal<Date | null>(startOfToday());
  readonly filters = signal<FilterChange[]>([]);

  /** Query params for the paged list request: applied filters plus the date range. */
  readonly params = computed(() => {
    const params: Record<string, string> = {};
    for (const filter of this.filters()) {
      params[filter.field] = filter.value;
    }
    const from = this.fromDate();
    const to = this.toDate();
    if (from) params['dateFrom'] = toIsoDate(from);
    if (to) params['dateTo'] = toIsoDate(to);
    return params;
  });

  onFilterChange(filters: FilterChange[]) {
    this.filters.set(filters);
  }

  print() {
    window.print();
  }

  exportList() {
    // Export is wired once the list data is loaded.
  }
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
