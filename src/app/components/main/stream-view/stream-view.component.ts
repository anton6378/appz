import { Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { List } from '../../../models/list';
import { ModalDataViewComponent } from '../../modal-data-view/modal-data-view.component';
import { ModalLogViewComponent } from '../../modal-log-view/modal-log-view.component';
import { BaseViewComponent } from '../base-view/base-view.component';

@Component({
  selector: 'app-stream-view',
  templateUrl: './stream-view.component.html',
  styleUrls: [ './stream-view.component.css' ]
})
export class StreamViewComponent extends BaseViewComponent implements OnInit, OnDestroy {

  appList: List = new List;

  params: any = {};

  querySub: Subscription;

  page = 0;


  ngOnInit() {
    super.ngOnInit();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
  }

  loadData() {
    this.page = 0;
    this.appList = new List;
    this.loader = this.dataService.getStream(this._query, this._days)
      .pipe(
        map((data: any) => {
          this.convert(data);
          return data;
        })
      ).subscribe(
        (data: List) => {
          this.appList = List.fromDTO(data);
          this.initModals();
        }
      );
  }

  loadMore() {
    if (this.page < this.appList.total_pages - 1) {
      this.page++;
      this.cd.detectChanges();
      this.loader = this.dataService.getStream(this._query, this._days, this.page)
        .subscribe(
          list => {
            this.convert(list);
            this.appList.data = this.appList.data.concat(list['data']);
          }
        );
    }
  }

  initModals() {

    this.querySub = this.querySub || this.route.queryParamMap.subscribe(p => {

      this.modalTracker.execIfNewParam(this.params, 'mlv', p.get('mlv'), (mlv) => {
        this.appList.findTyped(mlv, p.get('env'), p.get('mlvtype'), app => this.openLogModal(app, p.get('mlvtype'), p.get('mlvlevel')));
      });

      this.modalTracker.execIfNewParam(this.params, 'mv', p.get('mv'), (mv) => {
        this.appList.findTyped(mv, p.get('env'), 'deploy', app => this.monitoringViewModal(this.convertApp(app)));
      });

      this.modalTracker.execIfNewParam(this.params, 'dv', p.get('dv'), dv => {
        this.appList.findTyped(dv, p.get('env'), p.get('dvtype'), app => this.openDataModal(app, p.get('dvtype')));
      });


    });
  }

  // openLog(build: any, level: string = null) {
  //   this.modalTracker.navigate({lv: build.build_id, lvlevel: level});
  // }

  openLogModal(app: any, type: string, level: string = null) {
    this.dataService.check().subscribe(() => {

      const data = {
        'build_id': app.d.data.build_id,
        'deploy_id': app.d.data.deploy_id,
        'build_number': app.d.build_number
      };

      this.modalTracker.track('mlv').show(ModalLogViewComponent, {
        initialState: {
          mid: 'mlv',
          id: app.app_id,
          app: this.convertApp(app),
          data,
          type,
          level
        },
        ignoreBackdropClick: true
      });

    });
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

  openData(item: any, type: string) {
    this.modalTracker.navigate({ dv: item.app_id, env: item.env, dvtype: type });
  }

  openDataModal(app: any, type: string) {
    const capp = this.convertApp(app);
    this.dataService.check().subscribe(() => {
      this.modalTracker
        .track('dv')
        .show(ModalDataViewComponent, {
          initialState: {
            mid: 'dv',
            id: app.app_id,
            title: `Related Data from ${ capp.app_name } ${ capp[type + '_version'] }.${ capp[type + '_build_number'] }`,
            data: JSON.stringify(app.d.data.data)
          },
          ignoreBackdropClick: true
        });
    });
  }

}
