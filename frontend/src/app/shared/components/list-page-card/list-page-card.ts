import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from '@lumen-ui/angular';

/**
 * Page-height card for list screens: a toolbar, a scrolling table and a pager.
 *
 * ```html
 * <app-list-page-card>
 *   <app-list-card-title>
 *     <l-filter … />
 *     <l-button card-actions …>Export</l-button>
 *   </app-list-card-title>
 *   <app-list-card-body>
 *     <l-table … />
 *   </app-list-card-body>
 *   <app-list-card-footer>
 *     <l-pagination … />
 *   </app-list-card-footer>
 * </app-list-page-card>
 * ```
 *
 * Import the set with `LIST_PAGE_CARD`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card],
  selector: 'app-list-page-card',
  styleUrl: './list-page-card.scss',
  templateUrl: './list-page-card.html',
})
export class ListPageCard {}

/** Toolbar row. Filters go on the left; elements marked `card-actions` sit on the right. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-list-card-title',
  styleUrl: './list-card-title.scss',
  template: `
    <div class="start"><ng-content /></div>
    <div class="end"><ng-content select="[card-actions]" /></div>
  `,
})
export class ListCardTitle {}

/** Fills the space between toolbar and pager; an `l-table` inside scrolls under a sticky header. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-list-card-body',
  styleUrl: './list-card-body.scss',
  template: '<ng-content />',
})
export class ListCardBody {}

/** Pager row, usually an `l-pagination`. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-list-card-footer',
  styleUrl: './list-card-footer.scss',
  template: '<ng-content />',
})
export class ListCardFooter {}

export const LIST_PAGE_CARD = [ListPageCard, ListCardTitle, ListCardBody, ListCardFooter] as const;
