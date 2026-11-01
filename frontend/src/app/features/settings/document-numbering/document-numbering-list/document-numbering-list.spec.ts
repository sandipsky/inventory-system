import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { DocumentNumbering } from '../document-numbering.model';
import { DocumentNumberingList } from './document-numbering-list';

const ROW: DocumentNumbering = {
  id: 1,
  name: 'Purchase Entry',
  prefix: '|PE-',
  body_length: 6,
  start_no: 1,
  end_no: 999999,
  numbering_style: null,
};

describe('DocumentNumberingList', () => {
  let component: DocumentNumberingList;
  let fixture: ComponentFixture<DocumentNumberingList>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DocumentNumberingList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DocumentNumberingList);
    component = fixture.componentInstance;
  });

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('lists each document type with its first number', async () => {
    http.expectOne(`${environment.apiUrl}/documentNumbering`).flush([ROW]);
    await fixture.whenStable();

    expect(component.rows()).toEqual([ROW]);
    expect(component.firstNumber(ROW)).toBe('|PE-000001');
    expect(text()).toContain('Purchase Entry');
    expect(text()).toContain('PE-000001');
    expect(text()).toContain('1 – 999,999');
    expect(text()).not.toContain('|PE-');
  });

  it('shows the API error in place of rows', async () => {
    http
      .expectOne(`${environment.apiUrl}/documentNumbering`)
      .flush({ message: 'Operation not allowed' }, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();

    expect(component.loading()).toBe(false);
    expect(text()).toContain('Operation not allowed');
  });
});
