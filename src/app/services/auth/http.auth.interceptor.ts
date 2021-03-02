import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ModalAuthRequiredComponent } from '../../components/modal-auth-required/modal-auth-required.component';
import { sleep } from '../../util/lang';
import { AuthService } from './auth.service';

@Injectable()
export class HttpAuthInterceptor implements HttpInterceptor {

  modal: any = { active: false };

  constructor(protected authService: AuthService,
              protected router: Router,
              protected modalService: BsModalService) {
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const authentication = this.authService.authentication;
    let newHeaders = req.headers;
    if (authentication != null) {
      if (!newHeaders.has('Authorization')) {
        newHeaders = newHeaders.append('Authorization', `Token ${ authentication.token }`);
      }
    }

    return next.handle(req.clone({ headers: newHeaders, withCredentials: true })).pipe(
      tap(
        () => {
        },
        event => {
          if (event instanceof HttpErrorResponse && event.status === 401) {
            for (let i = 1; i <= this.modalService.getModalsCount(); i++) {
              sleep(500).then(_ => {
                this.modalService.hide(i);
              });
            }
            this.authService.logout();

            this.modal.active = true;
            const modal = this.modalService.show(ModalAuthRequiredComponent, {
              class: 'modal-expired',
              backdrop: 'static',
              ignoreBackdropClick: true,
              initialState: {
                message: 'Your session has expired. Please login again.'
              }
            });
            modal.content.status = this.modal;
          }
        }
      )
    );
  }
}
