import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { Moment } from 'moment';
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
  selector: 'app-modal-build-stream-view',
  templateUrl: './modal-build-stream-view.component.html',
})
export class ModalBuildStreamViewComponent implements AfterViewInit, OnDestroy {

  @ViewChild(DaterangepickerComponent, { static: false })
  drp: DaterangepickerComponent;

  app: any;
  days: number;

  page: number;

  builds: List = new List;
  loader = false;

  querySub: Subscription;
  modalsSub: Subscription;

  filter: string = null;
  build_id: string = null;

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

  ngAfterViewInit(): void {

    this.querySub = this.route.queryParamMap.subscribe(
      p => {
        if (p.get('bsv') !== this.app.app_id) {
          this.modal.hide();
          return;
        }

        const from = p.get('bsvdatestart')
          ? moment(p.get('bsvdatestart')) : moment().subtract(this.days - 1, 'days').startOf('day');
        const to = p.get('bsvdateend') ? moment(p.get('bsvdateend')) : moment().endOf('day');
        this.drp.datePicker.setStartDate(from);
        this.drp.datePicker.setEndDate(to);

        const params = {
          bsvdatestart: from.toISOString(),
          bsvdateend: to.toISOString()
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
        const build = this.builds.data.find(b => b.build_id === lv);
        if (build) {
          this.openLogModal(build, p.get('lvlevel'));
        }
      });

      this.modalTracker.execIfNewParam(this.params, 'bsdv', p.get('bsdv'), bsdv => {
        const build = this.builds.data.find(b => b.build_id === bsdv);
        if (build) {
          this.openDataModal(build);
        }
      });

    });
  }

  loadMore() {
    if (this.page < this.builds.total_pages) {
      this.loader = true;
      this.page++;
      this.cd.detectChanges();
      this.data.getBuilds(this.app, this.page, this.range.toString(), this.filter)
        .subscribe(
          builds => {
            this.builds.data = this.builds.data.concat(builds.data);
            this.loader = false;
          },
          () => {
            this.loader = false;
            this.cd.detectChanges();
          }
        );
    }
  }

  selectedDate(value: { start: Moment, end: Moment, label: string }, datepicker?: any) {
    this.modalTracker.navigate({ bsvdatestart: value.start.toISOString(), bsvdateend: value.end.toISOString() });
  }

  openLog(build: any, level: string = null) {
    this.modalTracker.navigate({ lv: build.build_id, lvlevel: level });
  }

  openLogModal(build: any, level: string = null) {
    this.data.check().subscribe(() => {
      this.modalTracker
        .track('lv')
        .show(ModalLogViewComponent, {
          initialState: {
            mid: 'lv',
            id: build.build_id,
            app: this.app,
            type: 'build',
            data: build,
            level
          },
          ignoreBackdropClick: true
        });
    });
  }

  openData(build: any) {
    this.modalTracker.navigate({ bsdv: build.build_id });
  }

  openDataModal(build: any) {
    this.data.check().subscribe(() => {
      this.modalTracker
        .track('bsdv')
        .show(ModalDataViewComponent, {
          initialState: {
            mid: 'bsdv',
            id: build.build_id,
            title: `Related Data from ${ this.app.app_name } ${ this.app.build_version }.${ build.build_number }`,
            data: build.data
          },
          ignoreBackdropClick: true
        });
    });
  }

  buildTime(build: any) {
    if (!build.build_time_taken) {
      return moment(build.end_time + 'Z').diff(moment(build.start_time + 'Z'), 'seconds');
    }
    return build.build_time_taken;
  }

  private reload() {
    this.page = 1;
    this.builds.data = [];
    this.loader = true;
    this.cd.detectChanges();
    this.data.getBuilds(this.app, this.page, this.range.toString(), this.filter, this.build_id)
      .subscribe(
        builds => {
          this.builds = List.fromDTO(builds);
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
