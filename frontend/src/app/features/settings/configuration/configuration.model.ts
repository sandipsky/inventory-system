/** A row of `GET /configurations`: one company setting, stored as text. */
export interface Configuration {
  id: number;
  /** Fixed key, e.g. `company_name` or `calendar_type`. */
  name: string;
  label: string | null;
  value: string | null;
  /** Saving a setting that isn't editable fails. */
  is_editable: boolean;
}

export type SettingSection = 'company' | 'preferences' | 'other';

export const SETTING_SECTIONS: { key: SettingSection; title: string; subtitle: string }[] = [
  { key: 'company', title: 'Company Details', subtitle: 'Shown on documents and reports' },
  { key: 'preferences', title: 'Preferences', subtitle: 'Defaults used across the app' },
  { key: 'other', title: 'Other Settings', subtitle: 'Settings without a dedicated field' },
];

/** How a setting is edited. A `toggle` stores `1` or `0`. */
export type SettingKind = 'text' | 'email' | 'select' | 'toggle';

export interface SettingField {
  section: SettingSection;
  kind: SettingKind;
  placeholder?: string;
  /** Choices of a `select`; the value is what gets stored. */
  options?: { value: string; label: string }[];
  /** Spans two grid columns. */
  wide?: boolean;
  required?: boolean;
  /** Line under a `toggle`, saying what it does. */
  hint?: string;
}

/**
 * The settings the seed data creates (`backend/database.sql`), keyed by `name`, in the order
 * the page shows them. The API sends each one's label; this adds the field to edit it with.
 * Unknown settings get a text field under Other Settings.
 */
export const SETTING_FIELDS: Record<string, SettingField> = {
  company_name: { section: 'company', kind: 'text', placeholder: 'e.g. Shakya Traders Pvt. Ltd.', wide: true, required: true },
  company_reg_type: {
    section: 'company',
    kind: 'select',
    placeholder: 'Select type',
    options: [
      { value: 'PAN', label: 'PAN' },
      { value: 'VAT', label: 'VAT' },
    ],
  },
  company_reg: { section: 'company', kind: 'text', placeholder: 'Registration number' },
  company_contact: { section: 'company', kind: 'text', placeholder: 'Phone number' },
  company_email: { section: 'company', kind: 'email', placeholder: 'name@example.com' },
  company_address: { section: 'company', kind: 'text', placeholder: 'e.g. Kathmandu', wide: true },
  calendar_type: {
    section: 'preferences',
    kind: 'select',
    placeholder: 'Select calendar',
    options: [
      { value: 'BS', label: 'BS (Bikram Sambat)' },
      { value: 'AD', label: 'AD (Gregorian)' },
    ],
  },
  fiscal_year: { section: 'preferences', kind: 'text', placeholder: 'e.g. 2082-83' },
  default_rounding: {
    section: 'preferences',
    kind: 'toggle',
    hint: 'When on, new invoices start with Rounding Amount on, rounding the grand total to a whole amount.',
  },
};

export const OTHER_FIELD: SettingField = { section: 'other', kind: 'text' };
