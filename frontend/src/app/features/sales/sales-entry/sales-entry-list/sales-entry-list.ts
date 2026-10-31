import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sales-entry-list',
  styleUrl: './sales-entry-list.scss',
  templateUrl: './sales-entry-list.html',
})
export class SalesEntryList {}
