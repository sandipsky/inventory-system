import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Accordion, AccordionItem, Card, Icon } from '@lumen-ui/angular';
import { AuthService } from '../../auth/auth.service';
import { MANUAL_SECTIONS } from './user-manual.data';
import { ManualSection } from './user-manual.model';

/** How to use the app: one card per area, each task in an accordion, narrowed to the pages the role may open. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Accordion, AccordionItem, Card, Icon],
  selector: 'app-user-manual',
  styleUrl: './user-manual.scss',
  templateUrl: './user-manual.html',
})
export class UserManual {
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);

  /** Sections narrowed to the topics the role may see; a section left with none is dropped. */
  readonly sections = computed<ManualSection[]>(() =>
    MANUAL_SECTIONS.map(section => ({
      ...section,
      topics: section.topics.filter(topic => !topic.operation || this.auth.hasOperation(topic.operation)),
    })).filter(section => section.topics.length > 0),
  );

  /** The page scrolls inside the shell's content area, so scroll the section into view rather than use a URL fragment. */
  scrollTo(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
