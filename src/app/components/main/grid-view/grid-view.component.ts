import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { List } from '../../../models/list';
import { BackendConfigService } from '../../../services/config/backend-config.service';
import { DataService } from '../../../services/data/data.service';
import { AlertsService } from "../../../services/alerts/alerts.service";
import { ModalTrackerService } from '../../../services/modal-tracker/modal-tracker.service';
import { ModalLogViewComponent } from '../../modal-log-view/modal-log-view.component';
import { BaseViewComponent } from '../base-view/base-view.component';
import { ModalVulnerabilitiesSingleComponent } from '../../modal-vulnerabilities-single/modal-vulnerabilities-single.component';


@Component({
  selector: 'app-grid-view',
  templateUrl: './grid-view.component.html',
  styleUrls: [ './grid-view.component.css' ],
})
export class GridViewComponent extends BaseViewComponent implements OnInit, OnDestroy {
  appList: List = new List;
  appLoader: { [key: string]: boolean } = {};
  params: any = {};
  originList = [ 5,15,8,17,17,16,20,2 ];
  classList = [];

  querySub: Subscription;
  showAlertsColumn = true;

  constructor(backendConfigService: BackendConfigService,
              dataService: DataService,
              modalTracker: ModalTrackerService,
              router: Router,
              route: ActivatedRoute,
              cd: ChangeDetectorRef,
              alertService: AlertsService) {
    super(dataService, modalTracker, router, route, cd, alertService);
    this.classList = [];
    backendConfigService.get('show_alerts').subscribe(value => {
      if (value == null) {
        return;
      }
      this.showAlertsColumn = JSON.parse(String(value).toLowerCase());

      if ( !this.showAlertsColumn ) {
        this.classList = [];

        this.originList.map( (e, i) => {
          if ( i == 0 || i == 6 || i == 7  ) this.classList.push(`w-${e}`);
          else this.classList.push(`w-${e+4}`);
        });
      }
    });

    this.originList.map( e => {
      this.classList.push(`w-${e}`);
    });
  }

  static getAppVersion(app) {
    return app.deploy_version || app.build_version || app.version || '';
  }

  getAppKey(app) {
    return app.app_id + app.env + GridViewComponent.getAppVersion(app).toString();
  }

  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
    this.loader && this.loader.unsubscribe();
  }

  loadData() {
    this.appList = new List;
    this.loader = this.dataService.getMain(this.getSortParameter(), this.filter, this._query, this._days, null)
      .subscribe(
        (data: List) => {
          this.dataService.getVersion();
          this.appList = List.fromDTO(data);
          console.log(this.appList);
          this.initModals();
        }
      );
  }

  initModals() {

    this.querySub = this.querySub || this.route.queryParamMap.subscribe((p: ParamMap) => {

      this.modalTracker.execIfNewParam(this.params, 'bsv', p.get('bsv'), (v) => {
        this.appList.find(v, p.get('env'), p.get('v'), app => this.buildStreamViewModal(app));
      });

      this.modalTracker.execIfNewParam(this.params, 'dsv', p.get('dsv'), (v) => {
        this.appList.find(v, p.get('env'), p.get('v'), app => this.deploymentStreamViewModal(app));
      });

      this.modalTracker.execIfNewParam(this.params, 'mlv', p.get('mlv'), (mlv) => {
        this.appList.find(mlv, p.get('env'), p.get('v'), app => this.openLogModal(app, p.get('mlvtype'), p.get('mlvlevel')));
      });

      this.modalTracker.execIfNewParam(this.params, 'mv', p.get('mv'), (mv) => {
        this.appList.find(mv, p.get('env'), p.get('v'), app => this.monitoringViewModal(app));
      });

    });
  }


  openLogModal(app: any, type: string, level: string = null) {
    this.dataService.check().subscribe(() => {
      const data = {
        'build_id': app.build_id,
        'deploy_id': app.deploy_id,
        'build_number': type === 'build' ? app.build_build_number : app.deploy_build_number
      };

      this.modalTracker.track('mlv').show(ModalLogViewComponent, {
        initialState: {
          mid: 'mlv',
          id: app.app_id,
          app,
          data,
          type,
          level,
          status: (type === 'deploy') && app.deploy_status
        },
        ignoreBackdropClick: true
      });

    });
  }

  refreshAppRow(app: any) {
    const appId = app.app_id;
    const appKey = this.getAppKey(app);
    this.appLoader[appKey] = true;

    const query = this._query ? `${ this._query } ${ appId }` : `${ appId }`;
    this.dataService.getMain(this.getSortParameter(), this.filter, query, this._days, app.env)
      .subscribe(
        (data: List) => {
          if (data.total_pages === 0) {
            return;
          }
          const newAppData = data.data.find(appData => {
            return appData.deploy_version === app.deploy_version;
          });
          if (!newAppData) {
            return;
          }
          this.appList.replace(appId, app.env, GridViewComponent.getAppVersion(app), newAppData);
        },
        (e) => this.appLoader[appKey] = false,
        () => this.appLoader[appKey] = false
      );
  }

  openAlertModal(e, app: any, ageFilter: string = null ) {

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
          title: app.app_name,
          version: app.version,
          id: app.app_id,
          level: level,
          days: this._days,
          age: ageFilter
        },
        ignoreBackdropClick: true,
        class: "vulnerabilities"
      });
  }
}
