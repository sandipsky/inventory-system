import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sales-entry-form',
  styleUrl: './sales-entry-form.scss',
  templateUrl: './sales-entry-form.html',
})
export class SalesEntryForm {}
