import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-purchase-return-form',
  styleUrl: './purchase-return-form.scss',
  templateUrl: './purchase-return-form.html',
})
export class PurchaseReturnForm {}
