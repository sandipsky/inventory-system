import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { BreadcrumbService } from './breadcrumb.service';

@Component({ template: '' })
class Stub {}

describe('BreadcrumbService', () => {
  let service: BreadcrumbService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard', component: Stub, data: { breadcrumb: 'Dashboard' } },
          {
            path: 'purchase',
            data: { breadcrumb: 'Purchase' },
            children: [
              {
                path: 'entry',
                data: { breadcrumb: 'Purchase Entry' },
                children: [
                  { path: '', component: Stub },
                  { path: 'new', component: Stub, data: { breadcrumb: 'New' } },
                ],
              },
            ],
          },
        ]),
      ],
    });
    service = TestBed.inject(BreadcrumbService);
    router = TestBed.inject(Router);
  });

  it('should start with Home only', () => {
    expect(service.items()).toEqual([{ label: 'Home', link: '/dashboard' }]);
  });

  it('should build a trail from route data', async () => {
    await router.navigateByUrl('/purchase/entry/new');
    expect(service.items()).toEqual([
      { label: 'Home', link: '/dashboard' },
      { label: 'Purchase', link: '/purchase' },
      { label: 'Purchase Entry', link: '/purchase/entry' },
      { label: 'New' },
    ]);
    expect(service.title()).toBe('New');
  });

  it('should leave the current page unlinked', async () => {
    await router.navigateByUrl('/purchase/entry');
    expect(service.items().at(-1)).toEqual({ label: 'Purchase Entry' });
  });

  it('should allow an override that resets on navigation', async () => {
    await router.navigateByUrl('/purchase/entry');
    service.setTitle('PE-0001');
    expect(service.title()).toBe('PE-0001');
    expect(service.items().at(-1)).toEqual({ label: 'PE-0001' });

    await router.navigateByUrl('/dashboard');
    expect(service.title()).toBe('Dashboard');
  });
});
