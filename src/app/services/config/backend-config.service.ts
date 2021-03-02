import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

interface ConfigOptionType {
    [key: string]: string;
}

@Injectable()
export class BackendConfigService {

    constructor(private http: HttpClient) {
    }

    list(): Observable<ConfigOptionType[]> {
        const httpParams = new HttpParams().set('rand', Date.now().toString());
        return this.http.get<ConfigOptionType[]>(environment.apiUrl + '/ui-config', { params: httpParams });
    }

    get(key): Observable<string> {
        const httpParams = new HttpParams()
          .set('key', key)
          .set('rand', Date.now().toString());
        return this.http.get<string>(environment.apiUrl + '/ui-config', { params: httpParams });
    }

}
