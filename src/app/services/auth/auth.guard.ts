import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AlertsService } from '../alerts/alerts.service';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private cookies: CookieService,
    private authService: AuthService,
    private alertService: AlertsService
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.authService.authentication$.pipe(
      map(e => {
          if (e) {
            if ( !this.alertService.serviceLoaded ) {
              this.alertService.getAlerts();
            }
            return true;
          }

          this.navigateToLogin();
          return false;
        }
      ),
      catchError((e) => {
        this.navigateToLogin();
        return of(false);
      })
    );
  }

  private navigateToLogin() {
    this.router.navigate(
      [ '/login/' ],
      { queryParams: { returnUrl: this.router.routerState.snapshot.url }, replaceUrl: true }
    );
  }
}
