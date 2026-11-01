import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LIST_PAGE_CARD } from './list-page-card';

@Component({
  imports: [LIST_PAGE_CARD],
  template: `
    <app-list-page-card>
      <app-list-card-footer><span class="pager">pager</span></app-list-card-footer>
      <app-list-card-body><span class="table">table</span></app-list-card-body>
      <app-list-card-title>
        <span class="filter">filter</span>
        <span card-actions class="add">add</span>
      </app-list-card-title>
    </app-list-page-card>
  `,
})
class Host {}

describe('ListPageCard', () => {
  it('places title, body and footer in order, with actions on the right', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    const parts = [...el.querySelectorAll('app-list-card-title, app-list-card-body, app-list-card-footer')];
    expect(parts.map(part => part.tagName.toLowerCase())).toEqual([
      'app-list-card-title',
      'app-list-card-body',
      'app-list-card-footer',
    ]);
    expect(el.querySelector('app-list-card-title .start .filter')).not.toBeNull();
    expect(el.querySelector('app-list-card-title .end .add')).not.toBeNull();
  });
});
