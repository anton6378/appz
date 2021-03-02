import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { DataService } from '../../../services/data/data.service';
import { ModalTrackerService } from '../../../services/modal-tracker/modal-tracker.service';

@Component({
  selector: 'app-glog-alert-view',
  templateUrl: './glog-alert-view.component.html',
  styleUrls: [ './glog-alert-view.component.scss' ]
})
export class GlogAlertViewComponent implements OnInit, OnDestroy {

  update = new ReplaySubject<any>();

  dataSub: Subscription;
  updateSub: Subscription;

  requester: ReplaySubject<Observable<any>> = new ReplaySubject();

  loader = true;
  paramsSub: Subscription;

  alerts: any[] = [];

  @Output()
  total = new EventEmitter<number>();

  constructor(
    private dataService: DataService,
    private modalTracker: ModalTrackerService,
    // protected cd: ChangeDetectorRef
  ) {
  }

  @Input()
  set params(value: any) {
    if (value) {
      this.update.next(value);
    }
  }

  ngOnInit() {

    this.dataSub = this.requester.pipe(
      switchMap(obs => {
        this.loader = true;
        return obs.pipe(finalize(() => {
          this.loader = false;
        }));
      })
    ).subscribe(result => {
      this.alerts = result.alerts;
      this.total.emit(result.total);
    });

    this.updateSub = this.update.subscribe((params) => {
      this.requester.next(this.dataService.graylogAlerts(params.id, params.state, params.page - 1, params.perPage));
    });

  }

  ngOnDestroy(): void {
    this.dataSub && this.dataSub.unsubscribe();
    this.updateSub && this.updateSub.unsubscribe();
    this.paramsSub && this.paramsSub.unsubscribe();
  }

  openLog(alert) {

    const dt = moment(alert.triggered_at);
    const date = dt.clone().startOf('day');
    let minutes = dt.diff(date, 'minutes');
    let time = Math.floor(minutes / 5);
    date.add(time * 5 + 5, 'minutes');

    const startOfDay = date.clone().startOf('day');
    minutes = date.diff(startOfDay, 'minutes');
    time = Math.floor(minutes / 5);
    const sod = startOfDay.toISOString();

    this.modalTracker.navigate({ glvtab: 'grid', glvdate: sod, glvtime: time, glvpage: null, glvduration: 5, glvquery: null });
  }

}
