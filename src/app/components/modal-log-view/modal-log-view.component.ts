import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { List } from '../../models/list';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { ModalDataViewComponent } from '../modal-data-view/modal-data-view.component';
import { ModalGlogViewComponent } from '../modal-glog-view/modal-glog-view.component';
import * as Convert from "ansi-to-html";
import { AuthService } from '../../services/auth/auth.service';


@Component({
  selector: 'app-modal-log-view',
  templateUrl: './modal-log-view.component.html'
})
export class ModalLogViewComponent implements AfterViewInit, OnDestroy {

  mid = 'lv';
  id: string;
  status: string;

  app: any;
  data: any;
  type: string;
  level: string;

  title = '';
  page: number;
  loader = false;
  logs: List = new List;

  prevDt: moment.Moment;
  idx = 0;

  filter = {
    all: true,
    warn: false,
    error: false,
    status: false,
    activity: false
  };
  filterAllDisabled = true;

  wrapOption = false;
  params: any = {};
  private modalsSub: Subscription;
  private querySub: Subscription;

  private converter = new Convert();

  constructor(
    public modal: BsModalRef,
    private modalTracker: ModalTrackerService,
    private dataService: DataService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private authService: AuthService
  ) {
  }

  ngOnDestroy(): void {
    this.modalsSub && this.modalsSub.unsubscribe();
    this.querySub && this.querySub.unsubscribe();
  }

  ngAfterViewInit() {
    this.title = (this.type === 'build' ? 'Build' : 'Deploy') + ' log of ' + this.app.app_name + ' '
      + (this.type === 'build' ? this.app.build_version : this.app.deploy_version) + '.' + this.data.build_number;

    if (this.level) {
      this.filter[this.level] = true;
      this.setFilter(this.level);
    }
    else {
      this.filter.all = true;
      this.setFilter('all');
    }

    this.querySub = this.route.queryParamMap.subscribe(p => {
      if (p.get(this.mid) !== this.id) {
        this.modal.hide();
        return;
      }

    });

    if ( localStorage.getItem('user-wrap') ) {
      this.wrapOption = localStorage.getItem('user-wrap') === 'true';
    }
  }

  filterLevels() {
    let levels = [];

    Object.keys(this.filter).forEach(e => {
      if ( this.filter[e] && e !== 'all' ) levels.push(e); 
    });

    if ( levels.length > 0 ) {
      return levels.join(',');
    }
    return null;
  }

  reload() {
    this.page = 1;
    this.logs.data = [];
    this.loader = true;

    const id = this.type === 'build' ? this.data.build_id : this.data.deploy_id;
    const levels = this.filterLevels();
    this.dataService.getLogs(id, this.type, this.page, levels)
      .subscribe(
        data => {

          const log = this.parse(data);

          this.logs = List.fromDTO({
            page: data.page,
            total_pages: data.total_pages,
            data: log
          });

          this.initModals();

        },
        null,
        () => this.loader = false
      );
  }

  parse(data) {
    const log = [];
    let date = null;

    for (const d of data.data) {
      this.idx++;
      d.idx = this.idx;
      const m = moment(d.timestamp + 'Z');
      d.diff = this.prevDt ? new Intl.NumberFormat('en', { minimumFractionDigits: 3 }).format(m.diff(this.prevDt) / 1000) : null;
      this.prevDt = m;

      const dt = m.format('ll');
      if (date !== dt) {
        log.push({ date: dt, lines: [] });
      }
      date = dt;
      log[log.length - 1].lines.push(d);
    }

    return log;
  }

  initModals() {

    this.modalsSub = this.modalsSub || this.route.queryParamMap.subscribe(p => {

      this.modalTracker.execIfNewParam(this.params, 'dv', p.get('dv'), dv => {
        const item = this.logs.data.reduce((result, block) => result.concat(block.lines), []).find(line => line.seq === dv);
        if (item) {
          this.openDataModal(item);
        }
      });

    });

  }

  openData(item: any) {
    this.modalTracker.navigate({ dv: item.seq });
  }

  openDataModal(item: any) {
    this.dataService.check().subscribe(() => {
      const version = this.type === 'build' ? this.app.build_version : this.app.deploy_version;
      const title = 'Related Data from ' + (this.type === 'build' ? 'Build' : 'Deploy') + ' log of ' + this.app.app_name + ' ' + version + '.' + this.data.build_number;
      this.modalTracker.track('dv').show(ModalDataViewComponent, {
        initialState: {
          id: item.seq,
          title,
          data: item.data,
          header: { timestamp: item.timestamp, level: item.level, status: item.status, log: item.log, idx: item.idx }
        },
        ignoreBackdropClick: true
      });
    });
  }

  setFilter(level) {
    if (level === 'all' || (!(this.filter.warn || this.filter.error || this.filter.status || this.filter.activity))) {
      this.filter.all = true;
      this.filter.warn = false;
      this.filter.error = false;
      this.filter.status = false;
      this.filter.activity = false;
      this.filterAllDisabled = true;
    } else {
      this.filterAllDisabled = false;
      this.filter.all = false;
    }
    this.page = 1;
    this.logs.data = [];
    this.idx = 0;
    this.reload();
  }

  isVisible(item: any) {
    if (this.filter.all) {
      return true;
    }
    return !!this.filter[item.level];
  }

  logCount(data) {
    return !!data.filter(d => this.isVisible(d)).length;
  }

  totalLogCount() {
    let visible = false;

    for (const data of this.logs.data) {
      visible = visible || this.logCount(data.lines);
    }

    return visible;
  }

  loadMore() {
    if (this.page < this.logs.total_pages) {
      this.loader = true;
      this.page++;
      this.cd.detectChanges();
      // this.dataService.getStream(this._query, this._days, this.page)
      //   .subscribe(
      //     list => {
      //       this.convert(list);
      //       this.appList.data = this.appList.data.concat(list['data']);
      //       this.loader = false;
      //     },
      //     () => {
      //       this.loader = false;
      //       this.cd.detectChanges();
      //     }
      //   );

      const id = this.type === 'build' ? this.data.build_id : this.data.deploy_id;

      this.dataService.getLogs(id, this.type, this.page)
        .subscribe(
          data => {

            const log = this.parse(data);

            this.logs.page = data.page;
            this.logs.data = this.logs.data.concat(log);
            this.logs.total_pages = data.total_pages;

            this.cd.detectChanges();
          },
          null,
          () => {
            this.loader = false;
            this.cd.detectChanges();
          }
        );

    }
  }

  getLastLog() {
    if (this.logs.data.length < 1) {
      return null;
    }
    const lastData = this.logs.data[this.logs.data.length - 1];
    let lastItem = null;
    for (let i = lastData.lines.length - 1; i >= 0; i--) {
      if (this.isVisible(lastData.lines[i])) {
        lastItem = lastData.lines[i];
        break;
      }
    }
    return lastItem;
  }

  viewPostDeploymentLogs() {
    const lastItem = this.getLastLog();
    if (!lastItem) {
      return;
    }

    const timestamp = lastItem.timestamp + 'Z';
    const dur = 5;
    const dt = moment(timestamp);

    const date = dt.clone().startOf('day');
    let minutes = dt.diff(date, 'minutes');
    let time = Math.floor(minutes / 5);
    date.add(time * 5 + dur, 'minutes');

    const startOfDay = date.clone().startOf('day');
    minutes = date.diff(startOfDay, 'minutes');
    time = Math.floor(minutes / 5);
    const sod = startOfDay.toISOString();
    this.modalTracker
      .track('glv')
      .show(ModalGlogViewComponent, {
        initialState: {
          id: this.app.monitor_data.data.data.deployment,
          app: this.app,
        },
        ignoreBackdropClick: true
      });
    this.modalTracker.navigate({
      glv: this.app.monitor_data.data.data.deployment,
      glvtab: 'grid',
      glvdate: sod,
      glvtime: time,
      glvpage: null,
      glvduration: 5,
      glvquery: null
    });
    // ({glv: , glvdate: sod, glvtime: time, glvduration: 5 , glvpage: null, glvquery: null, glvtab: 'grid'});
  }

  convertAnsitoHtml(val) {
    if ( val.indexOf('zloirock') > -1) {
      console.log('asdfasdf');
    }
    
    let value = val.replace(/"/g, '').replace(/,/g, '').replace(
      /(((https?\:\/\/)|(www\.))(\S+))/gi,
      (match, space, url) => {
        var hyperlink = url;
        if (!hyperlink.match('^https?:\/\/')) {
          hyperlink = 'http://' + hyperlink;
        }
        return '<a href="' + match + '" target="_blank">' + match + '</a>';
      }
    );
    return this.converter.toHtml(value);
  }

  changeWrapOption() {
    this.authService.updateWrapOption(this.wrapOption).subscribe();
  }
}
