import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-purchase-entry-form',
  styleUrl: './purchase-entry-form.scss',
  templateUrl: './purchase-entry-form.html',
})
export class PurchaseEntryForm {}
