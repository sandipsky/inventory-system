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

  it('lists a party’s documents for the reference selects', () => {
    service.purchases(6).subscribe();
    service.sales(4).subscribe();
    http.expectOne(`${environment.apiUrl}/dropdown/purchase/6`).flush([]);
    http.expectOne(`${environment.apiUrl}/dropdown/sales/4`).flush([]);
  });

  it('builds the account path from its filters', () => {
    service.accounts('party', 'vendor', 'all').subscribe();
    http.expectOne(`${environment.apiUrl}/dropdown/accountMaster/party/vendor/all`).flush([]);
  });
});
