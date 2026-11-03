import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { testUser } from '../../auth/auth.testing';
import { SIDEBAR_SECTIONS } from '../../layout/sidebar/sidebar.data';
import { UserManual } from './user-manual';
import { MANUAL_SECTIONS } from './user-manual.data';

describe('UserManual', () => {
  let fixture: ComponentFixture<UserManual>;

  async function render(operations: string[]): Promise<HTMLElement> {
    await TestBed.configureTestingModule({ imports: [UserManual] }).compileComponents();
    TestBed.inject(AuthService).user.set(testUser({ operations }));
    fixture = TestBed.createComponent(UserManual);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  const sections = (element: HTMLElement) => [...element.querySelectorAll('.section .title')].map(el => el.textContent?.trim());
  const contents = (element: HTMLElement) => [...element.querySelectorAll('.contents .link')].map(el => el.textContent?.trim());
  const topics = (element: HTMLElement, id: string) =>
    [...element.querySelectorAll(`#${id} .l-accordion-item__title`)].map(el => el.textContent?.trim());

  it('shows a role with no operations only the sections every login may read', async () => {
    const element = await render([]);

    expect(sections(element)).toEqual(['Getting Started', 'Dashboard']);
    expect(contents(element)).toEqual(['Getting Started', 'Dashboard']);
  });

  it('adds only the topics of the pages the role may open', async () => {
    const element = await render(['ViewPurchaseEntry', 'ViewCustomerPayment']);

    expect(sections(element)).toEqual(['Getting Started', 'Dashboard', 'Purchase', 'Accounting', 'Reports']);
    expect(topics(element, 'purchase')).toEqual(['Record a purchase', 'Change or delete a purchase']);
    expect(topics(element, 'accounting')).toEqual(['Record a payment', 'Change or delete a payment']);
  });

  it('renders the labels in a topic as bold text', async () => {
    const element = await render(['ViewPurchaseEntry']);
    const steps = [...element.querySelectorAll('#purchase .steps li')];

    expect(steps[0].innerHTML).toBe(
      'Open <b>Purchase</b> › <b>Purchase Entry</b> and click <b>Add Purchase Invoice</b>.',
    );
  });

  it('scrolls a section into view from the contents', async () => {
    const element = await render(['ViewProduct']);
    const scrolled: Element[] = [];
    const original = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this);
    };

    try {
      const link = [...element.querySelectorAll<HTMLElement>('.contents .link')].find(el => el.textContent?.trim() === 'Products');
      link!.click();
    } finally {
      Element.prototype.scrollIntoView = original;
    }

    expect(scrolled.map(el => el.id)).toEqual(['products']);
  });

  describe('content', () => {
    it('gives every section its own id and every topic a title of its own and something to read', () => {
      expect(new Set(MANUAL_SECTIONS.map(section => section.id)).size).toBe(MANUAL_SECTIONS.length);
      for (const section of MANUAL_SECTIONS) {
        expect(new Set(section.topics.map(topic => topic.title)).size).toBe(section.topics.length);
        for (const topic of section.topics) {
          expect((topic.text?.length ?? 0) + (topic.steps?.length ?? 0)).toBeGreaterThan(0);
        }
      }
    });

    it('gates topics only on View operations that open a page in the sidebar', () => {
      const pages = new Set(
        SIDEBAR_SECTIONS.flatMap(section => section.items)
          .flatMap(item => [item, ...(item.children ?? [])])
          .flatMap(link => link.operation ?? []),
      );
      const views = MANUAL_SECTIONS.flatMap(section => section.topics)
        .flatMap(topic => topic.operation ?? [])
        .filter(operation => operation.startsWith('View'));

      expect(views.filter(operation => !pages.has(operation))).toEqual([]);
    });
  });
});
