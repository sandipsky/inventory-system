import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DropdownService } from './dropdown.service';

describe('DropdownService', () => {
  let service: DropdownService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(DropdownService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists active vendors by default', () => {
    service.vendors().subscribe();
    http.expectOne(`${environment.apiUrl}/dropdown/vendor/active`).flush([]);
  });

  it('builds the product path from its filters', () => {
    service.products('inventory', 'purchasable').subscribe();
    http.expectOne(`${environment.apiUrl}/dropdown/products/inventory/purchasable/active`).flush([]);
  });
});
