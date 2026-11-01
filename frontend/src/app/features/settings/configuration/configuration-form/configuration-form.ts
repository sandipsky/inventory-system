import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button, Card, EmailInput, Icon, NotificationService, Select, Skeleton, TextInput, Toggle } from '@lumen-ui/angular';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../auth/auth.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error';
import { Configuration, OTHER_FIELD, SETTING_FIELDS, SETTING_SECTIONS, SettingField } from '../configuration.model';
import { ConfigurationService } from '../configuration.service';

/** A text field holds a string, a select `null` until picked, a toggle a boolean. */
type ControlValue = string | boolean | null;

interface SettingRow {
  setting: Configuration;
  field: SettingField;
  label: string;
  /** A select's choices, plus the stored value if it isn't one of them. */
  options: { value: string; label: string }[];
}

/**
 * The company settings, one field per row of `GET /configurations`, grouped into sections
 * (see SETTING_FIELDS). They show read-only; Edit switches to editing in place and Save sends
 * only the settings that changed. Settings the API marks as not editable stay read-only.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Card, EmailInput, Icon, ReactiveFormsModule, Select, Skeleton, TextInput, Toggle],
  selector: 'app-configuration-form',
  styleUrl: './configuration-form.scss',
  templateUrl: './configuration-form.html',
})
export class ConfigurationForm {
  private readonly auth = inject(AuthService);
  private readonly configurationService = inject(ConfigurationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly notification = inject(NotificationService);

  readonly canEdit = computed(() => this.auth.hasOperation('EditConfiguration'));
  readonly editing = signal(false);
  readonly readonly = computed(() => !this.editing());

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal('');

  /** The settings as last loaded or saved. */
  readonly settings = signal<Configuration[]>([]);
  /** One control per setting, keyed by its `name`. */
  readonly form = this.fb.record<ControlValue>({});

  readonly sections = computed(() => {
    // Known settings in SETTING_FIELDS order, then the rest as the API sends them.
    const rows = this.settings()
      .map(setting => toRow(setting))
      .sort((a, b) => fieldOrder(a.setting) - fieldOrder(b.setting));
    return SETTING_SECTIONS.map(section => ({
      ...section,
      rows: rows.filter(row => row.field.section === section.key),
    })).filter(section => section.rows.length > 0);
  });

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.loadError.set('');
    this.configurationService
      .list()
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: settings => {
          // Controls first: the template binds them as soon as the rows render.
          for (const setting of settings) {
            const field = fieldOf(setting);
            const control = this.fb.control<ControlValue>(
              controlValue(setting, field),
              field.required ? Validators.required : null,
            );
            if (!setting.is_editable) control.disable();
            this.form.setControl(setting.name, control);
          }
          this.settings.set(settings);
        },
        error: (error: unknown) => this.loadError.set(apiErrorMessage(error, 'Could not load the settings.')),
      });
  }

  /** Shows the field as text: always outside edit mode, and for settings the API locks. */
  isReadonly(row: SettingRow): boolean {
    return this.readonly() || !row.setting.is_editable;
  }

  startEdit() {
    this.editing.set(true);
  }

  cancel() {
    this.fill(this.settings());
    this.editing.set(false);
  }

  save() {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notification.warn('Missing details', 'Fill in the fields highlighted in red.');
      return;
    }

    const changed = this.settings().flatMap(setting => {
      const control = this.form.controls[setting.name];
      if (!control || control.disabled) return [];
      const value = storedValue(control.value);
      return value === storedValue(controlValue(setting, fieldOf(setting))) ? [] : [{ ...setting, value }];
    });
    if (changed.length === 0) {
      this.cancel();
      return;
    }

    this.saving.set(true);
    this.configurationService
      .update(changed)
      .pipe(
        finalize(() => this.saving.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: response => {
          const saved = new Map(changed.map(setting => [setting.id, setting]));
          const settings = this.settings().map(setting => saved.get(setting.id) ?? setting);
          this.settings.set(settings);
          // Shows the values as stored, e.g. trimmed.
          this.fill(settings);
          this.editing.set(false);
          this.notification.success('Settings saved', response.message);
        },
        error: (error: unknown) => this.notification.error('Could not save', apiErrorMessage(error)),
      });
  }

  private fill(settings: Configuration[]) {
    for (const setting of settings) {
      this.form.controls[setting.name]?.setValue(controlValue(setting, fieldOf(setting)));
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }
}

function fieldOf(setting: Configuration): SettingField {
  return SETTING_FIELDS[setting.name] ?? OTHER_FIELD;
}

const FIELD_ORDER = Object.keys(SETTING_FIELDS);

function fieldOrder(setting: Configuration): number {
  const index = FIELD_ORDER.indexOf(setting.name);
  return index < 0 ? FIELD_ORDER.length : index;
}

function toRow(setting: Configuration): SettingRow {
  const field = fieldOf(setting);
  const options = field.options ?? [];
  const value = setting.value;
  return {
    setting,
    field,
    label: setting.label || setting.name,
    options: value && !options.some(option => option.value === value) ? [...options, { value, label: value }] : options,
  };
}

function controlValue(setting: Configuration, field: SettingField): ControlValue {
  const value = setting.value?.trim() ?? '';
  switch (field.kind) {
    case 'toggle':
      return value === '1' || value.toLowerCase() === 'true';
    case 'select':
      return value || null;
    default:
      return value;
  }
}

/** The text the API stores: toggles as `1` / `0`. */
function storedValue(value: ControlValue): string {
  if (typeof value === 'boolean') return value ? '1' : '0';
  return value?.trim() ?? '';
}
