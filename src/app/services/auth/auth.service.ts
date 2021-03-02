import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { flatMap, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface TokenResponse {
  token: string;
}

export interface User {
  id: string;
  username: string;
  wrap: boolean;
}

export interface Authentication {
  user: User;
  token: string;
}

@Injectable()
export class AuthService {

  private tokenKey = 'x-appz-dashboard-token';

  private _authentication = new BehaviorSubject<Authentication>(null);

  constructor(private http: HttpClient) {
  }

  get authentication$(): Observable<Authentication> {
    const savedToken = localStorage.getItem(this.tokenKey);
    if (this._authentication.value == null && savedToken != null) {
      return this.loginWithToken(savedToken);
    } else {
      return this._authentication.asObservable();
    }
  }

  get authentication(): Authentication {
    return this._authentication.value;
  }

  loginWithCredentials(username: string, password: string): Observable<Authentication> {
    const body = { username, password };

    const headers = new HttpHeaders()
      .set('Content-Type', 'application/json');

    return this.http.post(environment.apiUrl + '/auth/rest/login/', body, { headers })
      .pipe(flatMap((tokenResponse: TokenResponse) => this.loginWithToken(tokenResponse.token)));
  }

  loginWithToken(token: string): Observable<Authentication> {
    return this.getUser(token)
      .pipe(
        map((user: User) => ({ user: user, token: token })),
        tap(authentication => {
          this.setAuthentication(authentication);
        }),
      );
  }

  logout() {
    this.setAuthentication(null);
  }

  private getUser(token: string): Observable<User> {
    const headers = new HttpHeaders().append('Authorization', `Token ${ token }`);
    return this.http.get<User>(environment.apiUrl + '/user/', { headers: headers });
  }

  public updateWrapOption(wrap: boolean): Observable<any> {
    let params = new HttpParams()
      .set('wrap', wrap.toString());

    return this.http.get(environment.apiUrl + '/user-wrap/', {
      params: params
    });
  }

  private setAuthentication(authentication: Authentication) {
    if (authentication === null) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem('user-wrap');
    } else {
      localStorage.setItem(this.tokenKey, authentication.token);
      localStorage.setItem('user-wrap', authentication.user.wrap.toString());
    }
    this._authentication.next(authentication);
  }

}
