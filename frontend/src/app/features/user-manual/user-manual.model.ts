import { IconName } from '@lumen-ui/angular';

/**
 * One task in the manual (e.g. "Record a purchase"). Text may use `<b>` around on-screen labels;
 * the page renders it as sanitized HTML.
 */
export interface ManualTopic {
  title: string;
  /** Paragraphs before the steps. */
  text?: string[];
  /** Numbered steps. */
  steps?: string[];
  /** Rules and tips after the steps. */
  notes?: string[];
  /** Operation(s) that show this topic, any one of which does; none shows it to everyone. */
  operation?: string | string[];
}

/** One area of the app, listed in the contents; shown when the role sees at least one of its topics. */
export interface ManualSection {
  /** Anchor the contents scrolls to. */
  id: string;
  title: string;
  icon: IconName;
  summary: string;
  topics: ManualTopic[];
}
