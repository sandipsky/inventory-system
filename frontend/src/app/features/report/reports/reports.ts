import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Card, Icon } from '@lumen-ui/angular';
import { AuthService } from '../../../auth/auth.service';
import { REPORT_GROUPS, ReportGroup } from '../report.model';

/** Every report the role may open, grouped by what it reports on; each link opens the report's page. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Card, Icon, RouterLink],
  selector: 'app-reports',
  styleUrl: './reports.scss',
  templateUrl: './reports.html',
})
export class Reports {
  private readonly auth = inject(AuthService);

  /** Groups narrowed to the reports the role may open; a group left with none is dropped. */
  readonly groups = computed<ReportGroup[]>(() =>
    REPORT_GROUPS.map(group => ({
      ...group,
      reports: group.reports.filter(report => this.auth.hasOperation(report.operation)),
    })).filter(group => group.reports.length > 0),
  );
}
