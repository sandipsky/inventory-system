import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Card, Chip } from '@lumen-ui/angular';
import { DocNoPipe } from '../../pipes/doc-no.pipe';

/** The vendor / customer fields a document shows; both API shapes have them. */
export interface PartyDetails {
  registration_number: string | null;
  address: string | null;
  contact: string | null;
}

/** Vendor or customer details under a document's header fields, with the document number. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Chip, DocNoPipe],
  selector: 'app-party-details-card',
  styleUrl: './party-details-card.scss',
  templateUrl: './party-details-card.html',
})
export class PartyDetailsCard {
  readonly title = input('');
  /** `null` until a party is picked; the fields then show `-`. */
  readonly party = input<PartyDetails | null>(null);
  readonly documentLabel = input('Document Number');
  /** Raw API number (e.g. `|PE-000001`); hidden when empty. */
  readonly documentNumber = input<string | null>(null);
}
