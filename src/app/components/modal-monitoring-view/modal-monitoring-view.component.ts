import { AfterViewInit, Component, OnDestroy, ViewChild } from '@angular/core';
import * as moment from 'moment';
import { DaterangepickerComponent } from 'ng2-daterangepicker';
import { DateRange } from '../../models/range';
import { ModalGlogViewComponent } from '../modal-glog-view/modal-glog-view.component';
import { ModalMonitoringBasicViewComponent } from './modal-monitoring-basic-view.component';

@Component({
  selector: 'app-modal-monitoring-view',
  templateUrl: './modal-monitoring-view.component.html',
})
export class ModalMonitoringViewComponent extends ModalMonitoringBasicViewComponent implements AfterViewInit, OnDestroy {
  days: number;

  @ViewChild(DaterangepickerComponent, { static: false })
  drp: DaterangepickerComponent;

  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    ranges: {
      'Today': [ moment().startOf('day'), moment().endOf('day') ],
      'Yesterday': [ moment().subtract(1, 'days').startOf('day'), moment().subtract(1, 'days').endOf('day') ],
      'Last 7 Days': [ moment().subtract(6, 'days').startOf('day'), moment().endOf('day') ],
      'Last 30 Days': [ moment().subtract(29, 'days').startOf('day'), moment().endOf('day') ],
      'This Month': [ moment().startOf('month'), moment().endOf('month') ],
      'Last Month': [ moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month') ]
    }
  };

  ngAfterViewInit() {

    this.querySub = this.route.queryParamMap.subscribe(
      p => {
        if (p.get('mv') !== this.app.app_id) {
          this.modal.hide();
          return;
        }
      });

    this.reload();
  }

  subscribeRange() {
    this.rangeSub = this.rangeSub || this.route.queryParamMap.subscribe(p => {

      const from = p.get('mvdatestart')
        ? moment(p.get('mvdatestart')) : moment().subtract(this.days - 1, 'days').startOf('day');
      const to = p.get('mvdateend') ? moment(p.get('mvdateend')) : moment().endOf('day');

      this.drp.datePicker.setStartDate(from);
      this.drp.datePicker.setEndDate(to);

      const params = {
        mvdatestart: from.toISOString(),
        mvdateend: to.toISOString()
      };

      this.modalTracker.execIfNewParams(this.params, params, () => {
        this.range = new DateRange(from, to);
        this.updateRangeLabels();
        this.reloadGraphs();
      });

      this.modalTracker.execIfNewParam(this.params, 'glv', p.get('glv'), glv => {
        this.openGlogModal(glv);
      });

    });
  }

  reload() {
    this.loader = true;
    this.data.getMonitorData(this.app)
      .subscribe(
        data => {
          this.monitorData = data;
          this.instance = data.data.summary_instance;
          this.instances.push({ 'id': data.data.summary_instance, 'label': 'Summary', 'summary': true });

          this.instanceLabels = {};
          this.instanceLabels[data.data.summary_instance] = 'Summary';


          for (const i in data.data.instances) {
            if (!data.data.instances.hasOwnProperty(i)) {
              continue;
            }
            this.instances.push({ 'id': i, 'label': i, 'summary': false });
            this.instanceLabels[i] = i;
          }

          this.loader = false;
          this.initGraphs();
        },
        () => this.loader = false
      );
  }

  public selectedDate(value: any, datepicker?: any) {
    this.modalTracker.navigate({ mvdatestart: value.start.toISOString(), mvdateend: value.end.toISOString() });
  }


  switchInstance(id: string) {
    this.instance = id;
    this.reloadGraphs();
  }

  openGlog() {
    this.modalTracker.navigate({ glv: this.app.monitor_data.data.data.deployment, });
  }

  openGlogModal(glv) {
    this.data.check().subscribe(() => {
      this.modalTracker
        .track('glv')
        .show(ModalGlogViewComponent, {
          initialState: {
            id: glv,
            app: this.app,
          },
          ignoreBackdropClick: true
        });
    });
  }


}
