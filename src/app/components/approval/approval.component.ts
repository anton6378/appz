import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { Subscription, timer } from 'rxjs';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { ModalBuildStreamViewComponent } from '../modal-build-stream-view/modal-build-stream-view.component';
import { ModalLogViewComponent } from '../modal-log-view/modal-log-view.component';

@Component({
  selector: 'app-approval',
  templateUrl: './approval.component.html',
  styleUrls: [ './approval.component.css' ]
})
export class ApprovalComponent implements OnInit, OnDestroy {

  approveModal: BsModalRef;
  rejectModal: BsModalRef;
  reviewModal: BsModalRef;

  newStatus: { status: 'rejected' | 'approved', reason?: string };

  reason: string;

  app: any;
  browseSub: Subscription;
  rejectSub: Subscription;
  approveSub: Subscription;
  reasonError = false;
  errorText: string;
  errorOccured: boolean = false;

  reviewed = false;
  querySub: Subscription;

  params: any = {};

  constructor(
    private modalService: BsModalService,
    private dataService: DataService,
    private modalTracker: ModalTrackerService,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {

    this.route.paramMap.subscribe(params => {

      this.browseSub = this.dataService.approveBrowse(params.get('app_id')).subscribe(
        app => {
          this.app = app;
          this.querySub = this.querySub || this.route.queryParamMap.subscribe((p: ParamMap) => {

            this.modalTracker.execIfNewParam(this.params, 'bsvbid', p.get('bsvbid'), (v) => {
              this.buildStreamViewModal();
            });

          });
        },
        null,
        () => this.browseSub.unsubscribe()
      );

    });

    this.dataService.getVersion();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
  }

  buildStreamViewModal() {
    this.dataService.check().subscribe(() => {

      const app = this.app.src;
      app.build_version = app.version;
      app.app_name = this.app.app_name;

      this.modalTracker.track('bsv').show(ModalBuildStreamViewComponent, {
        initialState: {
          app: app,
          build_id: app.build_id
        },
        ignoreBackdropClick: true
      });
    });
  }

  approve() {
    this.approveSub = this.dataService.approveApprove(this.app.workflow_id).subscribe(result => {
      if ( !result.hasOwnProperty('error') ) {
        this.app = result;
        this.newStatus = { status: 'approved' };
        this.approveModal.hide();
        this.errorOccured = false;
      }
      else {
        this.errorText = result['error'];
        this.errorOccured = true;
      }
    }, null, () => this.approveSub.unsubscribe());
  }

  reject() {
    if (this.reason.length < 10 || this.reason.split(/\s+/).length < 2) {
      this.reasonError = true;
      return;
    }

    this.rejectSub = this.dataService.approveReject(this.app.workflow_id, this.reason).subscribe(result => {
      this.app = result;
      this.newStatus = { status: 'rejected', reason: this.reason };
      this.rejectModal.hide();
    }, null, () => this.rejectSub.unsubscribe());
  }

  confirmApprove(modal, reviewModal) {
    this.reviewed = false;
    if (this.app.warning_count) {
      this.reviewModal = this.modalService.show(reviewModal, { ignoreBackdropClick: true, class: 'modal-650' });
    } else {
      this.approveModal = this.modalService.show(modal, { ignoreBackdropClick: true, class: 'modal-650' });
    }
  }

  confirmReject(modal) {
    this.reason = '';
    this.reasonError = false;
    this.rejectModal = this.modalService.show(modal, { ignoreBackdropClick: true, class: 'modal-650' });
  }

  review() {

    timer(1500).subscribe(() => {
      this.reviewed = true;
    });

    const app = {
      app_name: this.app.app_name,
      build_version: this.app.src.version
    };

    this.modalService.show(ModalLogViewComponent, {
      initialState: {
        mid: 'lv',
        id: this.app.build_id,
        app: app,
        type: 'build',
        data: this.app.src,
        level: 'warn'
      },
      ignoreBackdropClick: true
    });


  }

  confirmAfterReview(approveTpl) {
    this.reviewModal.hide();
    this.approveModal = this.modalService.show(approveTpl, { ignoreBackdropClick: true, class: 'modal-650' });
  }

  rejectAfterReview(rejectTpl) {
    this.reviewModal.hide();
    this.reason = '';
    this.reasonError = false;
    this.rejectModal = this.modalService.show(rejectTpl, { ignoreBackdropClick: true, class: 'modal-650' });
  }

  viewBuild() {
    this.modalTracker.navigate({ bsv: this.app.src.app_id, env: this.app.src.env, bsvbid: this.app.src.build_id });
  }
}
