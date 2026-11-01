import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MODAL_DATA, ModalRef } from '@lumen-ui/angular';
import { Subject, of } from 'rxjs';
import { CancelDialog, CancelDialogData } from './cancel-dialog';

describe('CancelDialog', () => {
  let fixture: ComponentFixture<CancelDialog>;
  let component: CancelDialog;
  let ref: { close: ReturnType<typeof vi.fn>; config: { disableClose?: boolean } };
  let onConfirm: ReturnType<typeof vi.fn<CancelDialogData['onConfirm']>>;

  beforeEach(async () => {
    ref = { close: vi.fn(), config: {} };
    onConfirm = vi.fn<CancelDialogData['onConfirm']>(() => of({}));
    const data: CancelDialogData = {
      title: 'Cancel sales invoice?',
      message: 'SI-000001 will be cancelled.',
      confirmText: 'Cancel Invoice',
      onConfirm,
    };
    await TestBed.configureTestingModule({
      imports: [CancelDialog],
      providers: [
        { provide: MODAL_DATA, useValue: data },
        { provide: ModalRef, useValue: ref },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CancelDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows the title, message and confirm text', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.title')?.textContent).toBe('Cancel sales invoice?');
    expect(el.querySelector('.message')?.textContent).toBe('SI-000001 will be cancelled.');
    expect(el.textContent).toContain('Cancel Invoice');
  });

  it('needs a reason', () => {
    component.remarks.setValue('   ');
    component.confirm();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(component.remarks.touched).toBe(true);
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('cancels with the trimmed reason and closes with true', () => {
    component.remarks.setValue('  Wrong customer ');
    component.confirm();
    expect(onConfirm).toHaveBeenCalledWith('Wrong customer');
    expect(ref.close).toHaveBeenCalledWith(true);
  });

  it('stays open when the cancel fails, and blocks closing while it runs', () => {
    const result = new Subject<unknown>();
    onConfirm.mockReturnValue(result);
    component.remarks.setValue('Wrong customer');

    component.confirm();
    expect(component.cancelling()).toBe(true);
    expect(ref.config.disableClose).toBe(true);

    result.error(new Error('Payments already recorded against this invoice'));
    expect(component.cancelling()).toBe(false);
    expect(ref.config.disableClose).toBe(false);
    expect(ref.close).not.toHaveBeenCalled();
  });
});
