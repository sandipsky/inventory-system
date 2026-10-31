import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-purchase-entry-list',
  styleUrl: './purchase-entry-list.scss',
  templateUrl: './purchase-entry-list.html',
})
export class PurchaseEntryList {}
