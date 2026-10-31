import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  selector: 'app-sales-return-list',
  styleUrl: './sales-return-list.scss',
  templateUrl: './sales-return-list.html',
})
export class SalesReturnList {}
