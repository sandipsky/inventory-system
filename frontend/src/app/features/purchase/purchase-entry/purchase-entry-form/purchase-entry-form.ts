import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DRAWER_DATA, DrawerRef, Icon } from '@lumen-ui/angular';
import { PurchaseFormData, PurchaseFormMode } from '../../purchase.model';

const TITLES: Record<PurchaseFormMode, string> = {
  add: 'Add Purchase Entry',
  edit: 'Edit Purchase Entry',
  view: 'Purchase Entry',
};

/**
 * Purchase entry form, opened in a near full-screen bottom drawer from the list in one of
 * three modes (see PurchaseFormData). The drawer ref and data are optional so
 * the component also renders inline (e.g. in tests), defaulting to `add`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  selector: 'app-purchase-entry-form',
  styleUrl: './purchase-entry-form.scss',
  templateUrl: './purchase-entry-form.html',
})
export class PurchaseEntryForm {
  private readonly drawerRef = inject<DrawerRef<PurchaseEntryForm, boolean>>(DrawerRef, { optional: true });
  private readonly data = inject<PurchaseFormData | null>(DRAWER_DATA, { optional: true });

  readonly mode = signal<PurchaseFormMode>(this.data?.mode ?? 'add');
  readonly id = signal<number | undefined>(this.data?.id);

  readonly title = computed(() => TITLES[this.mode()]);
  readonly readonly = computed(() => this.mode() === 'view');

  startEdit() {
    this.mode.set('edit');
  }

  save() {
    // Submit lands with the form fields; `true` tells the list to refresh.
    this.drawerRef?.close(true);
  }

  close() {
    this.drawerRef?.close(false);
  }
}
