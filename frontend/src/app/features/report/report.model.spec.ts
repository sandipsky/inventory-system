import { SIDEBAR_SECTIONS } from '../../layout/sidebar/sidebar.data';
import { REPORTS, REPORT_GROUPS, REPORT_OPERATIONS } from './report.model';
import { REPORT_ROUTES } from './report.routes';

describe('report config', () => {
  it('gives the sidebar link every operation that opens a report', () => {
    const link = SIDEBAR_SECTIONS.flatMap(section => section.items).find(item => item.route === '/reports');
    expect([...(link?.operation ?? [])].sort()).toEqual([...REPORT_OPERATIONS].sort());
  });

  it('routes every report the Reports page lists', () => {
    const paths = REPORT_ROUTES.map(route => route.path);
    const listed = REPORT_GROUPS.flatMap(group => group.reports.map(report => report.path));
    expect(listed.filter(path => !paths.includes(path))).toEqual([]);
    expect(Object.keys(REPORTS).length + 1).toBe(listed.length);
  });

  it('labels the derived discount, which the register sends as typed', () => {
    const register = REPORTS['purchase'];
    const discount = register.columns.find(column => column.key === 'discount');
    expect(discount?.value?.({ sub_total: 1000, taxable_amount: 850, non_taxable_amount: 50, discount: 10 })).toBe(100);
  });
});
