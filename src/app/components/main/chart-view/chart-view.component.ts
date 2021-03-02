import { Component, OnDestroy, OnInit } from '@angular/core';
import { ParamMap } from '@angular/router';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { List } from '../../../models/list';
import { ModalLogViewComponent } from '../../modal-log-view/modal-log-view.component';
import { BaseViewComponent } from '../base-view/base-view.component';

@Component({
  selector: 'app-chart-view',
  templateUrl: './chart-view.component.html',
})
export class ChartViewComponent extends BaseViewComponent implements OnInit, OnDestroy {
  appList: List = new List;

  options = {
    responsive: true,
    maintainAspectRatio: false,
    cutoutPercentage: 60,
    legend: {
      display: false,
      position: 'bottom',
      labels: {
        boxWidth: 10,
        fontSize: 10,
      }
    },
    onHover: (event, chartElement) => {
      event.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
    }
  };

  params: any = {};

  querySub: Subscription;


  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
    this.loader && this.loader.unsubscribe();
  }

  loadData() {
    this.appList = new List;
    this.loader = this.dataService.getMainCharts(this.getSortParameter(), this.filter, this._query, this._days)
      .pipe(
        map(data => this.convert(data))
      ).subscribe(data => {
        this.appList = List.fromDTO(data);
        this.initModals();
      });
  }

  initModals() {

    this.querySub = this.querySub || this.route.queryParamMap.subscribe((p: ParamMap) => {

      this.modalTracker.execIfNewParam(this.params, 'mlv', p.get('mlv'), mlv => {
        this.appList.find(mlv, p.get('env'), p.get('v'), app => this.openLogModal(app, p.get('mlvtype'), p.get('mlvlevel')));
      });

      this.modalTracker.execIfNewParam(this.params, 'bsv', p.get('bsv'), bsv => {
        this.appList.find(bsv, p.get('env'), p.get('v'), app => this.buildStreamViewModal(this.convertApp(app), p.get('bsvfilter')));
      });

      this.modalTracker.execIfNewParam(this.params, 'dsv', p.get('dsv'), dsv => {
        this.appList.find(dsv, p.get('env'), p.get('v'), app => this.deploymentStreamViewModal(this.convertApp(app), p.get('dsvfilter')));
      });

      this.modalTracker.execIfNewParam(this.params, 'mv', p.get('mv'), mv => {
        this.appList.find(mv, p.get('env'), p.get('v'), app => this.monitoringViewModal(this.convertApp(app)));
      });

    });
  }


  convert(data) {
    data.data = data.data.filter(d => d.build);

    data.data.map((v, i, a) => {
      data.data[i].app_id = data.data[i].build.app_id;

      if (v.build && v.build.data) {
        data.data[i].build.data = JSON.parse(data.data[i].build.data);
        data.data[i].build.data.data.data = JSON.parse(data.data[i].build.data.data.data);
      }

      if (v.deploy && v.deploy.data) {
        data.data[i].deploy.data = JSON.parse(data.data[i].deploy.data);
        data.data[i].deploy.data.data.data = JSON.parse(data.data[i].deploy.data.data.data);
      }

      if (v.monitor && v.monitor.data) {
        data.data[i].monitor.data = JSON.parse(data.data[i].monitor.data);
        data.data[i].monitor.data.data.data = JSON.parse(data.data[i].monitor.data.data.data);
      }
    });

    data.data.map((r, i) => {
      if (r.build && r.build.data) {
        data.data[i].builds = this.datasetConfig([
          r.build.data.build_count_by_status.success,
          r.build.data.build_count_by_status.failed,
          r.build.data.build_count_by_status.running,
        ], [ '114,219,131', '208,2,27', '245,166,35' ], [ 'Success', 'Failed', 'Running', ]);
      }

      if (r.deploy && r.deploy.data) {
        data.data[i].deployments = this.datasetConfig([
          r.deploy.data.deploy_count_by_status.success,
          r.deploy.data.deploy_count_by_status.failed,
          r.deploy.data.deploy_count_by_status.running,
        ], [ '114,219,131', '208,2,27', '245,166,35' ], [ 'Success', 'Failed', 'Running', ]);
      }

      if (r.monitor && r.monitor.data) {
        data.data[i].instances = this.datasetConfig([
          r.monitor.data.instance_count_by_status.green,
          r.monitor.data.instance_count_by_status.red,
          r.monitor.data.instance_count_by_status.yellow,
        ], [ '114,219,131', '208,2,27', '245,231,39' ], [ 'Green', 'Red', 'Yellow' ]);
      }
    });

    return data;
  }

  datasetConfig(data: any[], color: any[], labels: any[]) {
    return {
      datasets: [ {
        data: [ data[0], data[1], data[2] ],
        backgroundColor: [ 'rgba(' + color[0] + ', 0.5)', 'rgba(' + color[1] + ', 0.5)', 'rgba(' + color[2] + ', 0.5)', ],
        borderColor: [ '#fff', '#fff', '#fff' ],
        hoverBorderColor: [ '#fff', '#fff', '#fff' ],
        hoverBackgroundColor: [ 'rgba(' + color[0] + ', 0.8)', 'rgba(' + color[1] + ', 0.8)', 'rgba(' + color[2] + ', 0.8)', ],
        borderWidth: [ 0, 0, 0 ],
        hoverBorderWidth: [ 0, 0, 0 ],
      } ],
      labels: [ labels[0], labels[1], labels[2], ]
    };
  }

  openLogModal(app: any, type: string, level: string = null) {
    this.dataService.check().subscribe(() => {

      app.build_version = app.build ? app.build.version : '';
      app.deploy_version = app.deploy ? app.deploy.version : '';

      const data = {
        'build_id': app.build ? app.build.data.data.build_id : null,
        'deploy_id': app.deploy ? app.deploy.data.data.deploy_id : null,
        'build_number': type === 'build'
          ? (app.build ? app.build.data.build_number : null) : (app.deploy ? app.deploy.data.build_number : null)
      };

      console.log('level', level);

      this.modalTracker.track('mlv').show(ModalLogViewComponent, {
        initialState: {
          mid: 'mlv',
          id: app.app_id,
          app,
          data,
          type,
          level
        },
        ignoreBackdropClick: true
      });

    });
  }

  convertApp(app) {
    return {
      app_name: app.app_name,
      app_id: app.app_id,
      build_version: app.build.version,
      build_build_number: app.build.data.build_number,
      deploy_version: app.deploy && app.deploy.version ? app.deploy.version : 'n/a',
      deploy_build_number: app.deploy && app.deploy.data && app.deploy.data.build_number ? app.deploy.data.build_number : 'n/a',
      env: app.build.env,
      monitor_data: app.monitor.data
    };
  }

  buildClick(e, app) {
    if (e.length) {
      this.modalTracker.navigate({
        bsv: app.app_id,
        env: app.env,
        v: app.deploy_version || app.build_version,
        bsvfilter: [ 'success', 'failed' ][e[0]._index]
      } as any);
    }
  }

  deployClick(e, app) {
    if (e.length) {
      this.modalTracker.navigate({
        dsv: app.app_id,
        env: app.env,
        v: app.deploy_version || app.build_version,
        dsvfilter: [ 'success', 'failed' ][e[0]._index]
      } as any);
    }
  }

}
