import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { DaterangepickerComponent } from 'ng2-daterangepicker';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { List } from '../../models/list';
import { DateRange } from '../../models/range';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { ModalDataViewComponent } from '../modal-data-view/modal-data-view.component';
import { ModalLogViewComponent } from '../modal-log-view/modal-log-view.component';

@Component({
  selector: 'app-modal-deployment-stream-view',
  templateUrl: './modal-deployment-stream-view.component.html',
})
export class ModalDeploymentStreamViewComponent implements AfterViewInit, OnDestroy {

  @ViewChild(DaterangepickerComponent, { static: false })
  drp: DaterangepickerComponent;

  page: number;

  app: any;
  days: number;

  deployments: List = new List;
  loader = false;

  querySub: Subscription;
  modalsSub: Subscription;

  filter: string = null;

  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    ranges: {
      'Today': [ moment().startOf('day'), moment().endOf('day') ],
      'Yesterday': [ moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day') ],
      'Last 7 Days': [ moment().subtract(6, 'days').startOf('day'), moment().endOf('day') ],
      'Last 30 Days': [ moment().subtract(29, 'days').startOf('day'), moment().endOf('day') ],
      'This Month': [ moment().startOf('month'), moment().endOf('month') ],
      'Last Month': [ moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month') ]
    }
  };

  range: DateRange = new DateRange(moment().startOf('day'), moment().endOf('day'));

  params: any = {};

  constructor(
    public modal: BsModalRef,
    private modalTracker: ModalTrackerService,
    private data: DataService,
    protected route: ActivatedRoute,
    protected router: Router,
    protected cd: ChangeDetectorRef
  ) {
  }

  ngOnDestroy(): void {
    this.querySub && this.querySub.unsubscribe();
    this.modalsSub && this.modalsSub.unsubscribe();
  }

  ngAfterViewInit() {

    this.querySub = this.route.queryParamMap.subscribe(
      p => {
        if (p.get('dsv') !== this.app.app_id) {
          this.modal.hide();
          return;
        }

        const from = p.get('dsvdatestart')
          ? moment(p.get('dsvdatestart')) : moment().subtract(this.days - 1, 'days').startOf('day');
        const to = p.get('dsvdateend') ? moment(p.get('dsvdateend')) : moment().endOf('day');
        this.drp.datePicker.setStartDate(from);
        this.drp.datePicker.setEndDate(to);

        const params = {
          dsvdatestart: from.toISOString(),
          dsvdateend: to.toISOString()
        };

        this.modalTracker.execIfNewParams(this.params, params, () => {
          this.range = new DateRange(from, to);
          this.reload();
        });
      }
    );
  }

  initModals() {

    this.modalsSub = this.modalsSub || this.route.queryParamMap.subscribe(p => {

      this.modalTracker.execIfNewParam(this.params, 'lv', p.get('lv'), lv => {
        const deployment = this.deployments.data.find(deploy => deploy.deploy_id === lv);
        if (deployment) {
          this.openLogModal(deployment, p.get('lvstatus'), p.get('lvlevel'), p.get('lvtype'));
        }
      });

      this.modalTracker.execIfNewParam(this.params, 'dsdv', p.get('dsdv'), dsdv => {
        const deployment = this.deployments.data.find(deploy => deploy.deploy_id === dsdv);
        if (deployment) {
          this.openDataModal(deployment);
        }
      });


    });

  }

  loadMore() {
    if (this.page < this.deployments.total_pages) {
      this.loader = true;
      this.page++;
      this.cd.detectChanges();
      this.data.getDeployments(this.app, this.page, this.range.toString(), this.filter)
        .subscribe(
          builds => {
            this.deployments.data = this.deployments.data.concat(builds.data);
            this.loader = false;
          },
          () => {
            this.loader = false;
            this.cd.detectChanges();
          }
        );
    }
  }

  public selectedDate(value: any, datepicker?: any) {
    this.modalTracker.navigate({ dsvdatestart: value.start.toISOString(), dsvdateend: value.end.toISOString() });
  }

  openLog(deploy: any, level: string = null, type: string = 'deploy') {
    this.modalTracker.navigate({ lv: deploy.deploy_id, lvstatus: deploy.deploy_status, lvlevel: level, lvtype: type });
  }

  openLogModal(deploy: any, lvstatus: string, level: string = null, type: string = 'deploy') {
    this.data.check().subscribe(() => {

      this.modalTracker
        .track('lv')
        .show(ModalLogViewComponent, {
          initialState: {
            mid: 'lv',
            id: deploy.deploy_id,
            app: this.app,
            type: type,
            data: deploy,
            level,
            status: lvstatus
          },
          ignoreBackdropClick: true
        });

    });
  }

  openData(deploy: any) {
    this.modalTracker.navigate({ dsdv: deploy.deploy_id });
  }

  openDataModal(deploy: any) {
    this.data.check().subscribe(() => {

      this.modalTracker
        .track('dsdv')
        .show(ModalDataViewComponent, {
          initialState: {
            mid: 'dsdv',
            id: deploy.deploy_id,
            title: 'Related Data from ' + this.app.app_name + ' ' + this.app.build_version + '.' + deploy.build_number,
            data: deploy.data
          },
          ignoreBackdropClick: true
        });

    });
  }

  deployTime(deploy: any) {
    if (!deploy.deploy_took_time) {
      return moment(deploy.deploy_end_time + 'Z').diff(moment(deploy.deploy_start_time + 'Z'), 'seconds');
    }
    return deploy.deploy_took_time;
  }

  private reload() {
    this.page = 1;
    this.deployments.data = [];
    this.loader = true;
    this.cd.detectChanges();
    this.data.getDeployments(this.app, this.page, this.range.toString(), this.filter)
      .subscribe(
        builds => {
          this.deployments = List.fromDTO(builds);
          this.initModals();
        },
        null,
        () => {
          this.loader = false;
          this.cd.detectChanges();
        }
      );
  }

}
