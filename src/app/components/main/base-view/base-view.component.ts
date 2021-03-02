import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {Subject, Subscription} from 'rxjs';
import { List } from '../../../models/list';
import { DataService } from '../../../services/data/data.service';
import { AlertsService } from "../../../services/alerts/alerts.service";
import { ModalTrackerService } from '../../../services/modal-tracker/modal-tracker.service';
import { ModalBuildStreamViewComponent } from '../../modal-build-stream-view/modal-build-stream-view.component';
import { ModalDeploymentStreamViewComponent } from '../../modal-deployment-stream-view/modal-deployment-stream-view.component';
import { ModalMonitoringViewComponent } from '../../modal-monitoring-view/modal-monitoring-view.component';

@Component({
  selector: 'app-base-view',
  template: ``,
})
export class BaseViewComponent implements OnInit {
  loader: Subscription;
  appList: List = new List;
  sorting: any[] = [];
  filter: string;
  reload = new Subject<void>();

  constructor(
    protected dataService: DataService,
    protected modalTracker: ModalTrackerService,
    protected router: Router,
    protected route: ActivatedRoute,
    protected cd: ChangeDetectorRef,
    protected alertService: AlertsService
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
    if ( !this.alertService.serviceLoaded ) {
      this.alertService.getAlerts();
    }

    this.sorting = [
      { 'name': 'app_name', 'dir': '' }
    ];

    this.reload.subscribe(() => {
      this.loadData();
    });
    this.reload.next();
  }

  buildStreamView(app: any, filter: string = null) {
    this.modalTracker.navigate({ bsv: app.app_id, env: app.env, v: app.deploy_version || app.build_version, bsvfilter: filter });
  }

  buildStreamViewModal(app: any, filter = null) {
    this.dataService.check().subscribe(() => {
      this.modalTracker.track('bsv').show(ModalBuildStreamViewComponent, {
        initialState: {
          app: app,
          days: this._days,
          filter: filter
        },
        ignoreBackdropClick: true
      });
    });
  }

  deploymentStreamView(app: any, filter: string = null) {
    this.modalTracker.navigate({ dsv: app.app_id, env: app.env, v: app.deploy_version || app.build_version, dsvfilter: filter });
  }

  deploymentStreamViewModal(app: any, filter = null) {
    this.dataService.check().subscribe(() => {
      this.modalTracker.track('dsv').show(ModalDeploymentStreamViewComponent, {
        initialState: {
          app: app,
          days: this._days,
          filter: filter
        },
        ignoreBackdropClick: true
      });
    });
  }

  loadData() {
    throw new Error('Not implemented');
  }

  monitoringView(app: any) {
    this.modalTracker.navigate({ mv: app.app_id, env: app.env, v: app.deploy_version || app.build_version });
  }

  monitoringViewModal(app: any) {
    this.dataService.check().subscribe(() => {
      this.modalTracker.track('mv').show(ModalMonitoringViewComponent, {
        initialState: {
          app: app,
          days: this._days
        },
        ignoreBackdropClick: true
      });
    });
  }

  openLog(app: any, type: string, level: string = null) {
    this.modalTracker.navigate({
      mlv: app.app_id,
      env: app.env,
      v: app.deploy_version || app.build_version || (app[type] && app[type].version),
      mlvlevel: level,
      mlvtype: type
    });
  }

  isSortedBy(sort: string): boolean {
    return this.sorting.filter(e => e.dir + e.name === sort).length > 0;
  }

  isNotSorted(name: string): boolean {
    return this.sorting.filter(e => e.name === name).length === 0;
  }

  resetSort(sort: string[]) {
    this.sorting = this.sorting.filter(e => sort.indexOf(e.name) === -1);
    this.loadData();
  }

  isColumnSortedBy(sort: string[]) {
    return !!this.sorting.find(e => sort.indexOf(e.name) !== -1);
  }

  isFilteredBy(filter: string) {
    if (filter === 'ALL' && !this.filter) {
      return true;
    }
    return this.filter === filter;
  }

  addSort(name: string, dir: string, reset: string[] = []) {
    this.sorting = this.sorting.filter(e => reset.indexOf(e.name) === -1);
    const s = this.sorting.filter(e => e.name !== name);
    s.push({ 'name': name, 'dir': dir });
    this.sorting = s;
    this.loadData();
  }

  setFilter(filter: string | null) {
    this.filter = filter;
    this.loadData();
  }

  getSortParameter() {
    return this.sorting.map(e => e.dir + e.name);
  }

  get loading() {
    return this.loader && !this.loader.closed;
  }

}
