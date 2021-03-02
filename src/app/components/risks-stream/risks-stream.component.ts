import { Component, OnInit, Input, ChangeDetectorRef } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { map, timestamp } from 'rxjs/operators';
import { List } from '../../models/list';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { ModalVulnerabilitiesSingleComponent } from '../modal-vulnerabilities-single/modal-vulnerabilities-single.component';

@Component({
  selector: 'app-risks-stream',
  templateUrl: './risks-stream.component.html',
  styleUrls: [ './risks-stream.component.css' ]
})
export class RisksStreamComponent implements OnInit {

  appList: List = new List;

  params: any = {};

  querySub: Subscription;

  page = 0;

  loader = false;
  sorting: any[] = [];
  filter: string;
  reload = new Subject<void>();


  constructor(
    protected dataService: DataService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cd: ChangeDetectorRef,
    private modalTracker: ModalTrackerService,
  ) {
  }

  protected _days: number;

  @Input() set days(days: number) {
    this._days = days;
    this.reload.next();
  }

  protected _query: string;

  @Input() set query(query: string) {
    this._query = query;
    this.reload.next();
  }

  ngOnInit() {
    this.sorting = [
      { 'name': 'app_name', 'dir': '' }
    ];

    this.reload.subscribe(() => {
      this.loadData();
    });
    this.reload.next();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
  }

  loadData() {
    this.page = 0;
    this.appList = new List;
    this.loader = true;
    this.dataService.getAlertsStream(this._query, this._days)
      .pipe(
        map((data: any) => {
          this.convert(data);
          return data;
        })
      )
      .subscribe(
        (data: List) => {
          this.appList = List.fromDTO(data);
          console.log(this.appList);
        },
        null,
        () => this.loader = false
      );
  }

  loadMore() {
    if (this.page < this.appList.total_pages - 1) {
      this.loader = true;
      this.page++;
      this.cd.detectChanges();
      this.dataService.getAlertsStream(this._query, this._days, this.page)
        .subscribe(
          list => {
            this.convert(list);
            this.appList.data = this.appList.data.concat(list['data']);
            this.loader = false;
          },
          () => {
            this.loader = false;
            this.cd.detectChanges();
          }
        );
    }
  }

  convert(data) {
    data.data.map(v => {
      if ( typeof(v.d.data.data) == "string" ) {
        v.d.data.data = JSON.parse(v.d.data.data);
      }
    });

    data.data = data.data.sort((a, b) => {
      console.log(a.d.data);
      console.log(b.d.data);
      const at = a.d.data.end_time ? this.dt(a.d.data.end_time) : this.dt(a.d.data.start_time);
      const bt = b.d.data.end_time ? this.dt(b.d.data.end_time) : this.dt(b.d.data.start_time);
      return moment(bt).diff(moment(at), 'seconds');
    });
  }

  dt(date: string) {
    const parts = (date || 'zzz').split(' ');
    if (parts.length === 2) {
      return parts.join('T') + 'Z';
    }
  }

  buildTime(build: any) {
    return moment(this.dt(build.d.data.end_time)).diff(moment(this.dt(build.d.data.start_time)), 'seconds');
  }

  convertApp(app) {
    return {
      app_name: app.d.data.data.input ? app.d.data.data.input.yaml.app.name : '',
      app_id: app.app_id,
      build_version: app.version,
      build_build_number: app.d.build_number,
      deploy_version: app.version,
      deploy_build_number: app.d.build_number,
      env: app.env
    };
  }

  openLog(e, app: any, ageFilter: string = null ) {

    const alertLevel = e.target.getAttribute('data-id');
    this.openVulnerabilitiesModal(app, alertLevel, ageFilter);
  }

  openVulnerabilitiesModal(app, level=null, ageFilter=null) {
    this.modalTracker
      .track('vl')
      .show(ModalVulnerabilitiesSingleComponent, {
        initialState: {
          app: app.app,
          env: app.env,
          title: `${app.name} ${app.version}`,
          version: app.version,
          id: app.app_id,
          level: level,
          timestamp: app.d['data']['timestamp'],
          age: ageFilter
        },
        ignoreBackdropClick: true,
        class: "vulnerabilities"
      });
  }
}
