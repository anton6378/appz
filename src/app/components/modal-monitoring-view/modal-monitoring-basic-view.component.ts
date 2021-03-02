import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { DateRange } from '../../models/range';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';

@Component({
  selector: 'app-modal-monitoring-basic-view',
  templateUrl: './modal-monitoring-basic-view.component.html',
})
export class ModalMonitoringBasicViewComponent implements AfterViewInit, OnDestroy {
  app: any;

  loader: boolean = false;
  monitorData: any;
  graphs: any[];

  instance: string;
  instancehl: string;
  date: string;
  instances: any[] = [];
  instanceLabels: any = {};

  range: DateRange = new DateRange(moment().startOf('day'), moment().endOf('day'));

  rangeLabels = [];

  showGraphs: boolean = false;

  querySub: Subscription;
  rangeSub: Subscription;
  params: any = {};

  constructor(
    public modal: BsModalRef,
    protected data: DataService,
    protected ref: ChangeDetectorRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected modalTracker: ModalTrackerService
  ) {
  }

  ngAfterViewInit() {

    this.querySub = this.route.queryParamMap.subscribe(
      p => {
        if (p.get('mbv') != this.app.app_id) {
          this.modal.hide();
          return;
        }
      });

    this.reload();
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
    this.rangeSub && this.rangeSub.unsubscribe();
  }

  reload() {
    this.loader = true;
    this.data.getMonitorData(this.app)
      .pipe(finalize(() => {
        this.loader = false;
      }))
      .subscribe(
        data => {
          this.monitorData = data;

          this.instances.push({ 'id': data.data.summary_instance, 'label': 'Summary', 'summary': true });

          this.instanceLabels = {};
          this.instanceLabels[data.data.summary_instance] = 'Summary';


          for (let i in data.data.instances) {
            if (!data.data.instances.hasOwnProperty(i)) {
              continue;
            }
            this.instances.push({ 'id': i, 'label': i, 'summary': false });
            this.instanceLabels[i] = i;
          }

          this.initGraphs();
        }
      );
  }


  calcWidth(arr: any[], i: number) {

    let type = this.getType(arr[i]);

    if ((arr.length == i + 1) || type != this.getType(arr[i + 1])) {

      let cnt = 0;
      i--;

      while (i >= 0 && type == this.getType(arr[i])) {
        cnt++;
        i--;
      }

      return cnt % 2 ? 6 : 12;

    } else {
      return 6;
    }
  }

  getType(e: any) {
    const types = {
      line: 'chart',
      bar: 'chart',
      info: 'info',
      heading: 'heading'
    };
    return types[e.type];
  }


  initGraphs() {
    this.loader = true;
    this.data.getMonitorGraphs(this.app, this.monitorData.data.summary_instance)
      .pipe(finalize(() => {
        this.loader = false;
      }))
      .subscribe(
        data => {
          this.graphs = [];
          let graphs = data.data.monitoring_data.charts;

          graphs.forEach((g, i) => {
            g['class'] = 'col-xs-' + this.calcWidth(graphs, i);
            g['cellType'] = this.getType(g);
            g['factor'] = g['factor'] || 1;
            this.graphs.push(g);
          });

          this.subscribeRange();

        }
      );
  }

  subscribeRange() {
    this.rangeSub = this.rangeSub || this.route.queryParamMap.subscribe(p => {

      console.log(p);

      let from = p.get('mbvdatestart') ? moment(p.get('mbvdatestart')) : null;
      let to = p.get('mbvdateend') ? moment(p.get('mbvdateend')) : null;

      this.instance = p.get('mbvinstance');
      this.instancehl = p.get('mbvinstancehl');
      this.date = moment(p.get('mbvdate')).format('LL');

      let params = {
        mbvdatestart: from.toISOString(),
        mbvdateend: to.toISOString(),
        mbvinstance: this.instance
      };

      this.modalTracker.execIfNewParams(this.params, params, () => {
        this.range = new DateRange(from, to);
        this.updateRangeLabels();
        this.reloadGraphs();
      });

    });
  }

  switchInstance(id: string) {
    this.modalTracker.navigate({ mbvinstance: id });
  }


  reloadGraphs() {
    this.showGraphs = false;
    this.ref.detectChanges();
    this.showGraphs = true;
  }

  updateRangeLabels() {
    let from = this.range.start.valueOf();
    let to = this.range.end.valueOf() + 1;
    let delta = (to - from) / 12;

    this.rangeLabels = [];

    for (let d = from; d <= to; d += delta) {
      this.rangeLabels.push(moment(Math.ceil(d)));
    }
  }
}
