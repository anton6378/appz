import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { JsonConfigService } from '../../services/config/json-config.service';
import { AuthService } from '../../services/auth/auth.service';
import { AlertsService } from '../../services/alerts/alerts.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html'
})
export class LoginComponent implements OnInit, OnDestroy {
  model: { username: string, password: string } = { username: '', password: '' };
  returnUrl: string;
  message: string;

  disabled = false;
  error = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cookie: CookieService,
    public config: JsonConfigService,
    public alertService: AlertsService
  ) {
  }

  ngOnInit() {
    this.authService.logout();
    this.model.username = '';
    this.model.password = '';
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] ? decodeURI(this.route.snapshot.queryParams['returnUrl']) : '/';
    document.body.classList.add('cloud');
    document.body.classList.add('vcenter');
    document.body.classList.remove('modal-open');
    document.body.style.backgroundImage = 'url("' + this.config.loginBg + '")';
  }

  ngOnDestroy() {
    document.body.style.backgroundImage = '';
    document.body.classList.remove('cloud');
    document.body.classList.remove('vcenter');
    document.body.classList.remove('modal-open');
  }

  login() {
    this.disabled = true;
    this.error = false;
    this.authService.loginWithCredentials(this.model.username, this.model.password)
      .subscribe(
        () => {
          let returnUrl = this.returnUrl;
          if (returnUrl.startsWith('/login')) {
            this.alertService.getAlerts();
            returnUrl = '/';
          }
          this.router.navigateByUrl(returnUrl, { replaceUrl: true });
        },
        errorResponse => {
          this.disabled = false;
          if (errorResponse.status === 401 || errorResponse.status === 403) {
            this.error = true;

            const errorMsgs = errorResponse.error;
            const nonFieldErrorMsgs = errorMsgs['non_field_errors'];
            const usernameErrorMsgs = errorMsgs['username'];
            const passwordErrorMsgs = errorMsgs['password'];

            if (nonFieldErrorMsgs) {
              this.message = nonFieldErrorMsgs[0];
            } else if (usernameErrorMsgs) {
              this.message = String(usernameErrorMsgs[0]).replace('This field', 'Username field');
            } else if (passwordErrorMsgs) {
              this.message = String(passwordErrorMsgs[0]).replace('This field', 'Password field');
            } else {
              this.message = 'Wrong login or password';
            }
          } else {
            alert(errorResponse.message);
          }
        }
      );
  }

}
