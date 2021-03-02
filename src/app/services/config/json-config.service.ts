import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable()
export class JsonConfigService {

  public readonly apiUrl = environment.apiUrl;

  private config: any = {};

  public logo = '/assets/images/logo.png';
  public loginBg = '/assets/images/cloud.png';

  constructor(
    private http: HttpClient
  ) {
  }

  public getEndpoint(name: string) {
    return this.apiUrl + '/' + name;
  }

  public get(name: string) {
    return this.config[name];
  }

  public load() {
    return this.http.get('/config.json').toPromise().then(config => {
      this.config = config;
      this.logo = config['logo'] || this.logo;
      this.loginBg = config['loginBg'] || this.loginBg;
    });
  }

}
