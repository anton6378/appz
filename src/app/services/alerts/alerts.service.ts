import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { List } from '../../models/list';
import { JsonConfigService } from '../config/json-config.service';
import { App } from '../../models/app';
import { Version } from '../../models/version';
import { DataService } from "../data/data.service";

@Injectable()
export class AlertsService {

  version: ReplaySubject<Version>;

  appList: List = new List;
  appLoading: boolean = true;
  alertLoading: boolean = true;
  serviceLoaded: boolean = false;
  alertLoadingChange: Subject<List> = new Subject<List>();

  constructor(
    private http: HttpClient,
    private jsonConfigService: JsonConfigService,
    private service: DataService 
  ) {
    this.version = new ReplaySubject();
    this.serviceLoaded = false;

    // this.alertLoadingChange.subscribe((value) => {
    //   this.appList = value
    // });
  }

  getAlerts() {
    this.serviceLoaded = true;
    this.service.appzAlertsByApplist()
        .subscribe(
          (data) => {
            if ( data && data.length ) {
              const dataList = [];
              data.forEach(element => {
                dataList.push({
                  name: `${element['app_name']} ${element['version']}`,
                  env: element['env'],
                  app: element['app'],
                  id: element['app_id'],
                  version: element['version'],
                  viewtriggered: false,
                  loading: false,
                  current: this.generatePieData(element['info']),
                  less90: this.generatePieData(element['info']),
                  more90: this.generatePieData(element['info'])
                });
              });
              this.appLoading = false;

              this.appList = List.fromDTO({
                page: 0,
                total_pages: 1,
                data: dataList
              });
              this.alertLoadingChange.next(this.appList);
            }
          }
        );
  }

  generatePieData(alertInfo) {
    return {
      datasets: [ {
        data: [
          alertInfo ? alertInfo.critical : 0,
          alertInfo ? alertInfo.high: 0,
          alertInfo ? alertInfo.medium: 0,
          alertInfo ? alertInfo.low: 0,
        ],
        backgroundColor: [ 'rgba(236, 62, 64, 0.8)', 'rgba(255, 154, 43, 0.8)', 'rgba(245, 216, 1, 0.8)', 'rgba(0, 164, 109, 0.8)', ],
        borderColor: [ '#fff', '#fff', '#fff', '#fff' ],
        hoverBorderColor: [ '#fff', '#fff', '#fff', '#fff' ],
        hoverBackgroundColor: [ 'rgba(236, 62, 64, 1)', 'rgba(255, 154, 43, 1)', 'rgba(245, 216, 1, 1)', 'rgba(0, 164, 109, 1)', ],
        borderWidth: [ 0, 0, 0, 0 ],
        hoverBorderWidth: [ 0, 0, 0, 0 ],
      } ],
      labels: [ 'Critical', 'Highs', 'Mediums', 'Lows' ]
    };
  }

  getAppAlert(app) {
    let index = null;
    this.appList.data.forEach((v, i) => {
      if ( v.id === app.id && v.version === app.version && v.env === app.env ) {
        index = i;
      }
    });

    if ( index >= 0 && index != null ) {
      this.appList.data[index].viewtriggered = true;
      this.appList.data[index].loading = true;
    }

    this.service.appzAlertGetByApp(`app="${app['app']}"`, "0", app['id'], app['version'], app['env'])
      .subscribe(
        (res) => {
          this.appList.data[index].loading = false;
          if ( index >= 0 && index != null ) {
            this.appList.data[index].current = this.generatePieData(res.info);
            this.appList.data[index].less90 = this.generatePieData(res.info);
            this.appList.data[index].more90 = this.generatePieData(res.info);
          }
        },
      );
  }
}
