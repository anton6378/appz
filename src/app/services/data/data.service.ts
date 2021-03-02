import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject } from 'rxjs';
import { JsonConfigService } from '../config/json-config.service';
import { App } from '../../models/app';
import { Version } from '../../models/version';

@Injectable()
export class DataService {

  version: ReplaySubject<Version>;

  constructor(
    private http: HttpClient,
    private jsonConfigService: JsonConfigService
  ) {
    this.version = new ReplaySubject();
  }

  getMain(sorting: string[], filter: string, query: string, days: number, env: string): Observable<any> {
    let p = new HttpParams();
    if (sorting.length) {
      p = p.set('sorting[]', JSON.stringify(sorting));
    }
    if (filter) {
      p = p.set('filter', filter);
    }
    if (query) {
      p = p.set('query', query);
    }
    if (days) {
      p = p.set('days', days.toString());
    }
    if ( env ) {
      p = p.set('app-env', env);
    }

    return this.http.get(this.jsonConfigService.getEndpoint('home/'), { params: p });
  }

  getMainCharts(sorting: string[], filter: string, query: string, days: number): Observable<any> {
    let p = new HttpParams();
    if (sorting.length) {
      p = p.set('sorting[]', JSON.stringify(sorting));
    }
    if (filter) {
      p = p.set('filter', filter);
    }
    if (query) {
      p = p.set('query', query);
    }
    if (days) {
      p = p.set('days', days.toString());
    }

    return this.http.get(this.jsonConfigService.getEndpoint('chart-view/'), { params: p });
  }

  getBuilds(app: App, page: number, period: string, filter: string = null, build_id: string = null): Observable<any> {

    let params = new HttpParams()
      .set('app_id', app.app_id)
      // .set('fullversion', app.build_version+'.'+app.build_build_number.toString())
      .set('env', app.env)
      .set('version', app.build_version)
      .set('period', period);

    if (filter) {
      params = params.set('filter', filter);
    }

    if (build_id) {
      params = params.set('build_id', build_id);
    }

    if (page > 1) {
      params = params.set('page', page.toString());
    }

    return this.http.get(this.jsonConfigService.getEndpoint('build-stream/'), {
      params: params
    });
  }

  getDeployments(app: App, page: number, period: string, filter: string = null): Observable<any> {

    let params = new HttpParams()
      .set('app_id', app.app_id)
      .set('fullversion', app.build_version + '.' + app.build_build_number.toString())
      .set('env', app.env)
      .set('version', app.deploy_version)
      .set('period', period);

    if (filter) {
      params = params.set('filter', filter);
    }

    if (page > 1) {
      params = params.set('page', page.toString());
    }

    return this.http.get(this.jsonConfigService.getEndpoint('deploy-stream/'), {
      params: params
    });
  }

  getMonitorData(app: App): Observable<any> {
    const time = '>2017-01-01';
    return this.http.get(this.jsonConfigService.getEndpoint('monitor-stream-info/'), {
      params: new HttpParams()
        .set('app_id', app.app_id)
        .set('env', app.env)
        .set('version', app.deploy_version)
        .set('period', time)
    });
  }

  getMonitorGraphs(app: App, instance: string): Observable<any> {
    const time = '>2017-01-01';
    return this.http.get(this.jsonConfigService.getEndpoint('monitor-stream-line-graph/'), {
      params: new HttpParams()
        .set('app_id', app.app_id)
        .set('env', app.env)
        .set('version', app.deploy_version)
        .set('period', time)
        .set('instance', instance)
    });
  }

  getGraphData(instanceId: string, level: string, period: string) {
    return this.http.get(this.jsonConfigService.getEndpoint('monitor-stream-load-line-graph-data/'), {
      params: new HttpParams()
        .set('level', level)
        .set('period', period)
        .set('instance_id', instanceId)
    });

  }

  getInfoData(instanceId: string, level: string, period: string) {
    return this.http.get(this.jsonConfigService.getEndpoint('monitor-stream-load-info-data/'), {
      params: new HttpParams()
        .set('level', level)
        .set('period', period)
        .set('instance_id', instanceId)
    });

  }

  getLogs(id: string, type: string, page: number, level: string = null): Observable<any> {

    let params = new HttpParams()
      .set('id', id)
      .set('type', type);

    if (page > 1) {
      params = params.set('page', page.toString());
    }
    if ( level ) {
      params = params.set('level', level);
    }

    return this.http.get(this.jsonConfigService.getEndpoint('log-stream/'), {
      params: params
    });
  }

  check() {
    return this.http.get(this.jsonConfigService.getEndpoint('check/'));
  }

  getVersion(): void {
    this.http.get(this.jsonConfigService.getEndpoint('version/')).subscribe((v: Version) => {
      this.version.next(v);
    });
  }

  getStream(_query: string, _days: number, page: number = 0) {
    let p = new HttpParams().set('page', page.toString());
    if (_query) {
      p = p.set('query', _query);
    }
    if (_days) {
      p = p.set('days', _days.toString());
    }


    return this.http.get(this.jsonConfigService.getEndpoint('stream-view/'), { params: p });
  }

  getAlertsStream(_query: string, _days: number, page: number = 0) {
    let p = new HttpParams().set('page', page.toString());
    if (_query) {
      p = p.set('query', _query);
    }
    if (_days) {
      p = p.set('days', _days.toString());
    }


    return this.http.get(this.jsonConfigService.getEndpoint('alert-stream-view/'), { params: p });
  }

  approveBrowse(app_id: string) {
    const p = new HttpParams().set('app_id', app_id);
    return this.http.get(this.jsonConfigService.getEndpoint('approve/browse'), { params: p });
  }

  approveApprove(app_id: string) {
    return this.http.post(this.jsonConfigService.getEndpoint('approve/approve'), { app_id });
  }

  approveReject(app_id: string, reason: string) {
    return this.http.post(this.jsonConfigService.getEndpoint('approve/reject'), { app_id, reason });
  }

  graylogStream(stream: string, query: string, from: string, to: string, page: number, perPage: number): Observable<any> {
    const p = new HttpParams()
      .set('stream', stream)
      .set('query', query)
      .set('from', from)
      .set('to', to)
      .set('page', page.toString())
      .set('perpage', perPage.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/stream'), { params: p });
  }

  graylogFrameStream(stream: string, query: string, message_id: string,
                     timestamp: string, before: number, after: number, limit: number): Observable<any> {
    const p = new HttpParams()
      .set('stream', stream)
      .set('query', query)
      .set('message_id', message_id)
      .set('timestamp', timestamp)
      .set('before', before.toString())
      .set('after', after.toString())
      .set('limit', limit.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/stream/frame'), { params: p });
  }

  graylogAlerts(stream: string, state: string, page: number, perPage: number): Observable<any> {
    const p = new HttpParams()
      .set('stream', stream)
      .set('page', page.toString())
      .set('perpage', perPage.toString())
      .set('state', state);
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/alerts'), { params: p });
  }

  graylogHistogram(stream: string, query: string, from: string, to: string, interval: string): Observable<any> {
    const p = new HttpParams()
      .set('stream', stream)
      .set('query', query)
      .set('from', from)
      .set('to', to)
      .set('interval', interval)
    ;
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/histogram'), { params: p });
  }

  graylogValues(stream: string, field: string, from: string, to: string) {
    const p = new HttpParams()
      .set('stream', stream)
      .set('from', from)
      .set('to', to)
      .set('field', field);
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/values'), { params: p });
  }

  graylogDownloadStream(stream: string, query: string, from: string, to: string): Observable<any> {
    const p = new HttpParams()
      .set('stream', stream)
      .set('query', query)
      .set('from', from)
      .set('to', to);
    return this.http.get(this.jsonConfigService.getEndpoint('graylog/stream/download'), { responseType: 'text', params: p });
  }

  historySave(type: string, value: string): Observable<any> {
    return this.http.post(this.jsonConfigService.getEndpoint('user/history'), { type: type, value: value });
  }

  historyGet(type: string, query: string): Observable<any> {
    const p = new HttpParams()
      .set('type', type)
      .set('query', query);

    return this.http.get(this.jsonConfigService.getEndpoint('user/history'), { params: p });
  }

  historyGetLast(type: string): Observable<any> {
    const p = new HttpParams().set('type', type);
    return this.http.get(this.jsonConfigService.getEndpoint('user/history/last'), { params: p });
  }

  appzAlertGet(query: string, days: string): Observable<any> {
    const p = new HttpParams()
      .set('query', query)
      .set('days', days);
    return this.http.get(this.jsonConfigService.getEndpoint('appz/alert/'), { params: p });
  }

  appzAlertGetByTerm(query: string, days: string, term: string): Observable<any> {
    const p = new HttpParams()
      .set('query', query)
      .set('days', days)
      .set('term', term);
    return this.http.get(this.jsonConfigService.getEndpoint('appz/alert/'), { params: p });
  }

  appzAlertGetByApp(query: string, days: string, appId: string, version: string, env: string, page: number = 0, timestamp: number = 0): Observable<any> {

    const p = new HttpParams()
      .set('query', query)
      .set('days', days)
      .set('app', appId)
      .set('version', version)
      .set('env', env)
      .set('page', page.toString())
      .set('timestamp', timestamp.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('appz/app-alert/'), { params: p });
  }

  appzAlertGetByAppAbsolute(query: string, days: string, appId: string, version: string, env: string, page: number = 0): Observable<any> {

    const p = new HttpParams()
      .set('query', query)
      .set('days', days)
      .set('app', appId)
      .set('version', version)
      .set('env', env)
      .set('page', page.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('appz/app-alert-absolute/'), { params: p });
  }

  appzAlertsByApplist(): Observable<any> {
    return this.http.get(this.jsonConfigService.getEndpoint('appz/app-list-alert'));
  }

  alertsByAppDownloadStream(query: string, days: string, appId: string, version: string, env: string, page: number = 0 ): Observable<any> {
    const p = new HttpParams()
      .set('query', query)
      .set('days', days)
      .set('app', appId)
      .set('version', version)
      .set('env', env)
      .set('page', page.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('appz-alerts-app/download/'), { params: p });
  }

  alertsDownload(query: string, range: Array<string>, page: number = 0 ): Observable<any> {
    const p = new HttpParams()
      .set('query', query)
      .set('from', range[0])
      .set('to', range[1])
      .set('page', page.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('appz-alerts/download/'), { params: p });
  }

  appzAlertGetByTime(query: string, range: Array<string>, page: number = 0): Observable<any> {
    const p = new HttpParams()
      .set('query', query)
      .set('from', range[0])
      .set('to', range[1])
      .set('page', page.toString());
    return this.http.get(this.jsonConfigService.getEndpoint('appz/time/'), { params: p });
  }

  getAppList(): Observable<any> {
    return this.http.get(this.jsonConfigService.getEndpoint('application-list'));
  }

  getEnvironments(): Observable<any> {
    return this.http.get(this.jsonConfigService.getEndpoint('envs/'));
  }

  getLayers(): Observable<any> {
    return this.http.get(this.jsonConfigService.getEndpoint('layers/'));
  }
}
