import { Injectable } from '@angular/core';

import { Params, Router } from '@angular/router';
import { BsModalService } from 'ngx-bootstrap/modal';

@Injectable()
export class ModalTrackerService {

  modalStack: string[] = [];

  params: { [key: string]: string } = {
    bsv: 'env v bsvdatestart bsvdateend bsvfilter bsvbid',
    dsv: 'env v dsvdatestart dsvdateend dsvfilter',
    mv: 'env v mvdatestart mvdateend',
    mbv: 'mbvenv mbvdatestart mbvdateend mbvinstance mbvinstancehl mbvdate',
    mlv: 'env v mlvtype mlvlevel',
    lv: 'lvstatus lvtype lvlevel',
    dv: 'dvtype',
    bsdv: 'empty', // empty is needed to be not false
    dsdv: 'empty',
    glv: 'glvdate glvtime glvduration glvpage glvinstance glvpath glvquery glvtab glvfilter glvstate',
    glvdata: 'empty',
    vl: 'vldate vlpage',
    exp: 'expq expts expmid thread'
  };

  constructor(
    protected modalService: BsModalService,
    protected router: Router
  ) {

    this.modalService.onHide.subscribe(() => {
      const modal = this.modalStack.pop();
      if (this.params[modal]) {
        const params: Params = {};
        params[modal] = null;
        this.params[modal].split(' ').filter(s => s != '').forEach(p => {
          params[p] = null;
        });

        this.navigate(params);
      }
    });

  }

  navigate(params: Params, replace: boolean = false) {
    this.router.navigate([], { queryParamsHandling: 'merge', queryParams: params, replaceUrl: replace });
  }

  track(key: string) {
    this.modalStack.push(key);
    return this.modalService;
  }

  execIfNewParam(oldParams: any, key: string, value: string, callback = null) {
    if (value && value !== oldParams[key]) {
      if (callback != null) {
        callback(value);
      }
    }
    oldParams[key] = value;
  }

  execIfNewParams(oldParams: Params, params: Params, callback = null) {
    let flag = false;

    for (const key in params) {
      if (params[key] !== oldParams[key]) {
        flag = true;
        oldParams[key] = params[key];
      }
    }

    if (flag && callback != null) {
      callback(params);
    }
  }

}
