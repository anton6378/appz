import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  SecurityContext,
  ViewChild
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActivatedRoute, ParamMap } from '@angular/router';
import * as moment from 'moment';
import { DaterangepickerComponent } from 'ng2-daterangepicker';
import { ChangeContext, LabelType, Options } from 'ng5-slider';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { combineLatest, from, Observable, ReplaySubject, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize, map, mergeMap, switchMap } from 'rxjs/operators';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';

@Component({
  selector: 'app-modal-glog-view',
  templateUrl: './modal-glog-view.component.html',
  styleUrls: [ './modal-glog-view.component.scss' ],
})
export class ModalGlogViewComponent implements OnInit, AfterViewInit, OnDestroy {

  id: string;
  app: any;
  appName: string;
  appVersion: string;
  appEnv: string;

  queryParamsSub: Subscription;

  @ViewChild('go', { static: false }) go;

  @ViewChild('copiedTooltip', { static: false }) tooltip;
  @ViewChild(DaterangepickerComponent, { static: false })
  drp: DaterangepickerComponent;

  time = 0;
  duration = 5;
  timeRefresh: EventEmitter<void> = new EventEmitter<void>();
  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    singleDatePicker: true,
  };
  date: moment.Moment;
  timeSilderOptions: Options = {
    floor: 0,
    ceil: 287,
    tickStep: 72,
    showTicks: true,
    showTicksValues: true,
    translate: this.label
  };
  durationSliderOptions: { [key: string]: Options } = {
    'grid': {
      showTicksValues: true,
      stepsArray: [
        { value: 5 },
        { value: 10 },
        { value: 15 },
      ],
      translate: (value: number): string => {
        return {
          5: '5m',
          10: '10m',
          15: '15m',
          60: '1h',
        }[value];
      }
    },

    'alert': {
      floor: 0,
      ceil: 1
    },
    'chart': {
      showTicksValues: true,
      stepsArray: [
        { value: 15 },
        { value: 30 },
        { value: 60 },
        { value: 180 },
        { value: 360 },
        { value: 720 },
        { value: 1440 },
      ],
      translate: (value: number): string => {
        return {
          15: '15m',
          30: '30m',
          60: '1h',
          180: '3h',
          360: '6h',
          720: '12h',
          1440: '24h',
        }[value];
      }
    }
  };
  dataSub: Subscription;
  timeSub: Subscription;
  timeSubject = new Subject<number>();
  filterSub: Subscription;
  filterSubject = new Subject<number[]>();
  perPage = 100;
  page = 1;
  total = 0;
  params: ParamMap;
  instance: string;
  instances: string[] = [];
  path: string;
  paths: string[] = [];
  glogParams: any = null;
  pagination: any = {
    prev: `<span class="small glyphicon glyphicon-chevron-left"></span>`,
    first: `<span class="small glyphicon glyphicon-fast-backward"></span>`,
    next: `<span class="small glyphicon glyphicon-chevron-right"></span>`,
    last: `<span class="small glyphicon glyphicon-fast-forward"></span>`,
  };
  qparams: any = {};
  copy = 0;
  filter = {
    all: true,
    emerg: false,
    alert: false,
    crit: false,
    err: false,
    warning: false,
    notice: false,
    info: false,
    debug: false,
  };
  filterAllDisabled = true;
  afilter: { any: boolean, resolved: boolean, unresolved: boolean } = {
    any: false,
    resolved: false,
    unresolved: true
  };
  state = 'unresolved';
  valuesRequester: ReplaySubject<[ moment.Moment, moment.Moment ]> = new ReplaySubject();
  loader = true;
  dlLoader = false;
  history: Observable<string[]>;
  query = '';

  noStream = false;

  constructor(
    public modal: BsModalRef,
    private modalTracker: ModalTrackerService,
    private dataService: DataService,
    private route: ActivatedRoute,
    private cd: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
  }

  private _tab: string;

  get tab(): string {
    return this._tab;
  }

  set tab(value: string) {
    this._tab = value;
    this.timeRefresh.emit();
  }

  ngOnInit(): void {
    this.appName = this.app.app_name;
    this.appVersion = this.app.deploy_version;
    this.appEnv = this.app.env;

    this.history = new Observable((observer: any) => {
      // Runs on every search
      observer.next(this.query);
    })
      .pipe(
        mergeMap((token: string) => this.getHistory(token))
      );

  }

  ngAfterViewInit(): void {
    this.timeRefresh.emit();

    this.dataSub = this.valuesRequester.pipe(
      switchMap((range) => {
        this.loader = true;
        return combineLatest([
          this.dataService.graylogValues(this.id, 'instance', range[0].toISOString(), range[1].toISOString()),
          this.dataService.graylogValues(this.id, 'path', range[0].toISOString(), range[1].toISOString())
        ]).pipe(finalize(() => {
          this.loader = false;
        }));
      })
    ).subscribe(([ instances, paths ]) => {
      if ( instances['status'] && instances['status'] == 404 ) {
        this.noStream = true;
      }
      else {
        this.instances = Object.keys(instances['terms']);
      }

      if ( instances['status'] && instances['status'] == 404 ) {
        this.noStream = true;
      }
      else {
        this.paths = Object.keys(paths['terms']);
      }
    });

    this.initSub();
  }

  ngOnDestroy(): void {
    if (this.queryParamsSub != null) {
      this.queryParamsSub.unsubscribe();
    }
    if (this.timeSub != null) {
      this.timeSub.unsubscribe();
    }
    if (this.dataSub != null) {
      this.dataSub.unsubscribe();
    }
  }

  initSub() {
    this.timeSub = this.timeSub || this.timeSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((time: number) => from([ time ])),
    ).subscribe(time => {
      this.modalTracker.navigate({ glvtime: time, glvpage: null });
    });

    this.filterSub = this.filterSub || this.filterSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((filter: number[]) => from([ filter ])),
    ).subscribe(filter => {
      this.modalTracker.navigate({ glvfilter: filter.length ? filter.join(',') : null, glvpage: null });
    });

    this.queryParamsSub = this.queryParamsSub || this.route.queryParamMap.subscribe(params => {
      if (params.get('glv') !== this.id) {
        this.modal.hide();
        return;
      }

      let flag = false;

      let time = params.get('glvtime');

      if (time === null) {
        flag = true;
        const now = moment();
        const minutes = now.diff(now.clone().startOf('day'), 'minutes');
        time = Math.ceil(minutes / 5).toString();
      }

      let date = params.get('glvdate');

      if (date === null) {
        flag = true;
        date = moment().startOf('day').toISOString();
      }

      if (flag === true) {
        this.modalTracker.navigate({ glvdate: date, glvtime: time }, true);
        return;
      }

      const p = {
        glv: params.get('glv'),
        glvdate: params.get('glvdate'),
        glvtime: params.get('glvtime'),
        glvduration: params.get('glvduration'),
        glvpage: params.get('glvpage'),
        glvinstance: params.get('glvinstance'),
        glvpath: params.get('glvpath'),
        glvquery: params.get('glvquery'),
        glvtab: params.get('glvtab'),
        glvfilter: params.get('glvfilter'),
        glvstate: params.get('glvstate')
      };

      this.modalTracker.execIfNewParams(this.qparams, p, () => {
        this.params = params;
        this.sendParams();
      });

    });
  }

  sendParams() {
    this.page = this.params.get('glvpage') ? parseInt(this.params.get('glvpage'), 10) : 1;

    this.time = parseInt(this.params.get('glvtime'), 10);
    this.date = this.params.get('glvdate') ? moment(this.params.get('glvdate')) : moment().startOf('day');
    this.drp.datePicker.setStartDate(this.date);
    this.drp.datePicker.setEndDate(this.date);

    this.instance = this.params.get('glvinstance');
    this.path = this.params.get('glvpath');
    this.query = this.params.get('glvquery') || '*|';

    const newtab = this.params.get('glvtab') || 'chart';
    if (this._tab !== newtab) {
      this._tab = newtab;
      this.perPage = this._tab === 'alert' ? 5 : 100;
      this.total = 0;
      this.timeRefresh.emit();
    }

    this.duration = parseInt(this.params.get('glvduration'), 10) || { 'grid': 5, 'chart': 60 }[this._tab];

    if (this._tab === 'grid') {
      let idx = -1;
      this.durationSliderOptions['grid'].stepsArray.forEach((v, i) => {
        if (v.value === 60) {
          idx = i;
        }
      });

      if (this.duration === 60 && idx < 0) {
        this.durationSliderOptions['grid'].stepsArray.push({ value: 60 });
      }

      if (this.duration < 60 && idx >= 0) {
        this.durationSliderOptions['grid'].stepsArray.splice(idx, 1);
      }

    }

    this.total = (this._tab === 'grid' || this._tab === 'alert') ? this.total : 0;

    const filter = this.params.get('glvfilter');
    let fList: number[] = [];

    if (!filter) {
      this.resetFilter();
    } else {
      fList = filter.split(',').map(e => parseInt(e, 10));
      this.filter.all = false;
      this.filter.emerg = fList.indexOf(0) !== -1;
      this.filter.alert = fList.indexOf(1) !== -1;
      this.filter.crit = fList.indexOf(2) !== -1;
      this.filter.err = fList.indexOf(3) !== -1;
      this.filter.warning = fList.indexOf(4) !== -1;
      this.filter.notice = fList.indexOf(5) !== -1;
      this.filter.info = fList.indexOf(6) !== -1;
      this.filter.debug = fList.indexOf(7) !== -1;
      this.filterAllDisabled = false;
    }

    if (this.params.get('glvstate')) {
      this.state = this.params.get('glvstate');
      this.updateAFilter(this.state);
    }

    this.glogParams = {
      id: this.id,
      date: this.date,
      time: this.time,
      duration: this.duration,
      instance: this.instance,
      path: this.path,
      perPage: this.perPage,
      page: this.page,
      query: this.query,
      app: this.app,
      filter: fList,
      state: this.state
    };

    const toTime = moment(this.date).add(this.time * 5, 'minutes');
    const fromTime = moment(toTime).subtract(this.duration, 'minutes');

    this.valuesRequester.next([ fromTime, toTime ]);
  }

  changePage(event) {
    this.modalTracker.navigate({ glvpage: event.page });
  }

  public selectedDate(value: any, datepicker?: any) {
    this.modalTracker.navigate({ glvdate: value.start.toISOString(), glvpage: null });
  }

  public label(value: number, type: LabelType): string {
    const minutes = ((value % 12) * 5 + 100).toString().slice(-2);

    switch (type) {
      case LabelType.TickValue:
      case LabelType.High:
      case LabelType.Low:
      case LabelType.Ceil:
      case LabelType.Floor:
        return Math.floor(value / 12) + ':' + minutes;
      default:
        return '';
    }
  }

  timeSliderChange(changeContext: ChangeContext) {
    this.timeSubject.next(changeContext.value);
  }

  durationSliderChange(changeContext: ChangeContext) {
    this.modalTracker.navigate({ glvduration: changeContext.value, glvpage: null });
  }

  setInstance(instance) {
    this.modalTracker.navigate({ glvinstance: instance, glvpage: null });
  }

  setPath(path) {
    this.modalTracker.navigate({ glvpath: path, glvpage: null });
  }

  setQuery() {
    this.dataService.historySave('graylog_history', this.query).subscribe();
    this.modalTracker.navigate({ glvquery: this.query, glvpage: null });
  }

  setTab(tab) {
    this.modalTracker.navigate({ glvtab: tab, glvpage: null, glvduration: null });
  }

  setTotal($event: number) {
    this.total = $event;
  }

  queryKeyup($event: KeyboardEvent) {
    if ($event.keyCode === 13) {
      this.go.nativeElement.click();
      this.go.nativeElement.focus();
    }
  }

  typeaheadOnSelect() {
    this.go.nativeElement.click();
    this.go.nativeElement.focus();
    this.setQuery();
  }

  copied() {
    this.tooltip.show();
    setTimeout(() => {
      this.tooltip.hide();
    }, 3000);
  }

  setFilter(level) {
    if (level === 'all' || (!(
      this.filter.emerg ||
      this.filter.alert ||
      this.filter.crit ||
      this.filter.err ||
      this.filter.warning ||
      this.filter.notice ||
      this.filter.info ||
      this.filter.debug
    ))) {
      this.resetFilter();
    } else {
      this.filterAllDisabled = false;
      this.filter.all = false;
    }

    const f: number[] = [];

    if (this.filter.emerg) {
      f.push(0);
    }
    if (this.filter.alert) {
      f.push(1);
    }
    if (this.filter.crit) {
      f.push(2);
    }
    if (this.filter.err) {
      f.push(3);
    }
    if (this.filter.warning) {
      f.push(4);
    }
    if (this.filter.notice) {
      f.push(5);
    }
    if (this.filter.info) {
      f.push(6);
    }
    if (this.filter.debug) {
      f.push(7);
    }

    this.filterSubject.next(f);
  }

  resetFilter() {
    this.filter.all = true;
    this.filter.alert = false;
    this.filter.emerg = false;
    this.filter.crit = false;
    this.filter.err = false;
    this.filter.warning = false;
    this.filter.notice = false;
    this.filter.info = false;
    this.filter.debug = false;
    this.filterAllDisabled = true;
  }

  setAFilter(e) {
    this.afilter = { any: false, resolved: false, unresolved: false };
    this.afilter[e.target.name] = true;

    const state = this.afilter.any ? 'any' : (
      this.afilter.resolved ? 'resolved' : 'unresolved'
    );

    this.modalTracker.navigate({ 'glvstate': state });

  }

  updateAFilter(state) {
    this.afilter = {
      any: state === 'any',
      unresolved: state === 'unresolved',
      resolved: state === 'resolved'
    };

  }

  download() {
    const toTime = moment(this.date).add(this.time * 5, 'minutes');
    const fromTime = moment(toTime).subtract(this.duration, 'minutes');

    const queryArray = [];

    if (this.instance) {
      queryArray.push(`instance:${ this.instance.replace(/([\/\\-])/g, '\\$1') }`);
    }
    if (this.path) {
      queryArray.push(`path:${ this.path.replace(/([\/\\-])/g, '\\$1') }`);
    }

    const search = this.query.split('|').map(e => e.trim()).filter(e => e.length).join(' OR ');

    if (search) {
      queryArray.push(`(${ search })`);
    }

    const f = [];
    if (this.filter.emerg) {
      f.push(0);
    }
    if (this.filter.alert) {
      f.push(1);
    }
    if (this.filter.crit) {
      f.push(2);
    }
    if (this.filter.err) {
      f.push(3);
    }
    if (this.filter.warning) {
      f.push(4);
    }
    if (this.filter.notice) {
      f.push(5);
    }
    if (this.filter.info) {
      f.push(6);
    }
    if (this.filter.debug) {
      f.push(7);
    }


    if (f.length) {
      queryArray.push(`(${ f.map(fun => `level:${ fun }`).join(' OR ') })`);
    }

    const query = queryArray.length ? queryArray.join(' AND ') : '*';

    this.dlLoader = true;
    const sub = this.dataService.graylogDownloadStream(this.id, query, fromTime.toISOString(), toTime.toISOString()).pipe(
      finalize(() => {
        sub.unsubscribe();
        this.dlLoader = false;
      })
    ).subscribe(result => {

      const blob = new Blob([result], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);

      let a = document.createElement('a');
      document.body.appendChild(a);
      a.setAttribute('style', 'display: none');
      a.href = url;
      a.download = `log_${ this.id }_${ fromTime.toISOString() }_${ toTime.toISOString() }.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    });
  }

  fastForward() {
    const now = moment();
    const minutes = now.diff(now.clone().startOf('day'), 'minutes');
    const time = Math.ceil(minutes / 5).toString();
    const date = moment().startOf('day').toISOString();

    this.modalTracker.navigate({ glvdate: date, glvtime: time, glvpage: null });
  }

  getHistory(token) {
    if (token === '*|' || token === '*') {
      token = '';
    }

    return this.dataService.historyGet('graylog_history', token).pipe(
      map(result => result.results),
      map(result => result == null ? [] : result),
      map(result => result.map(r => r.value)),
      map(result => result.slice(0, result.length < 10 ? result.length : 10))
    );
  }

}
