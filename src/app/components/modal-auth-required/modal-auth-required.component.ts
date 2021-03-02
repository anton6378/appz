import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-modal-auth-required',
  template: `
    <div class="modal-body text-center">
      <br>
      <br>
      {{message}}
      <br><br>
      <button class="btn btn-default" (click)="relogin()">&nbsp;&nbsp;OK&nbsp;&nbsp;</button>
      <br>
      <br>
      <br>
    </div>
  `,
})
export class ModalAuthRequiredComponent implements OnInit {

  status: any;
  message: string;

  constructor(
    public modal: BsModalRef,
    private router: Router,
    protected modalService: BsModalService,
  ) {
  }

  ngOnInit(): void {
  }

  relogin() {
    this.modalService.hide(1);
    this.status.active = false;
    this.router.navigate([ '/login/' ], { queryParams: { returnUrl: this.router.routerState.snapshot.url }, replaceUrl: true });
  }
}
