import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sales-return-form',
  styleUrl: './sales-return-form.scss',
  templateUrl: './sales-return-form.html',
})
export class SalesReturnForm {}
