import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { combineLatest, Observable, ReplaySubject, Subscription } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { DateRange } from '../../../models/range';
import { DataService } from '../../../services/data/data.service';
import { ModalTrackerService } from '../../../services/modal-tracker/modal-tracker.service';

@Component({
  selector: 'app-glog-chart-view',
  templateUrl: './glog-chart-view.component.html',
  styleUrls: [ './glog-chart-view.component.css' ]
})
export class GlogChartViewComponent implements OnInit, OnDestroy {

  data: any;
  options: any;

  update = new ReplaySubject<any>();

  dataSub: Subscription;
  updateSub: Subscription;

  range: DateRange;

  requester: ReplaySubject<{ labels: string[], requests: Observable<any>[] }> = new ReplaySubject();
  loader = true;
  private labels: string[];

  noStream = true;

  constructor(
    private dataService: DataService,
    private modalTracker: ModalTrackerService,
  ) {
  }

  private _params = {};

  @Input()
  set params(value: any) {
    if (value) {
      this._params = value;
      this.update.next(value);
    }
  }

  ngOnInit(): void {
    this.updateSub = this.update.subscribe((params) => {
      this.reload(params);
      this.options = this.buildOptions();
    });

    this.dataSub = this.requester.pipe(
      switchMap(obs => {
        this.labels = obs.labels;
        this.loader = true;
        return combineLatest(obs.requests).pipe(finalize(() => {
          this.loader = false;
        }));
      })
    ).subscribe((result) => {
      if ( result.length > 0 && result[0]['status'] && result[0]['status'] == 404 ) {
        this.noStream = true;
      }
      else {
        this.noStream = false;
        result.forEach((v, i) => {
          this.data.datasets[i] = this.datasetConfig(v['results'], this.labels[i], i);
        });
      }
    });


  }

  ngOnDestroy(): void {
    this.updateSub && this.updateSub.unsubscribe();
    this.dataSub && this.dataSub.unsubscribe();
  }

  reload(params) {

    const to = moment(params.date).add(params.time * 5, 'minutes');
    const from = moment(to).subtract(params.duration, 'minutes');

    this.range = new DateRange(from, to);

    const searches = params.query.split('|').map(e => e.trim()).filter(e => e.length);
    if (searches.length === 0) {
      searches.push('');
    }

    const obs: Observable<any>[] = [];

    const labels: string[] = [];

    searches.forEach((q, i) => {
      const queryArray = [];

      if (params.instance) {
        queryArray.push(`instance:${ params.instance.replace(/([\/\\-])/g, '\\$1') }`);
      }

      if (params.path) {
        queryArray.push(`path:${ params.path.replace(/([\/\\-])/g, '\\$1') }`);
      }

      if (params.filter.length) {
        queryArray.push(`(${ params.filter.map(f => `level:${ f }`).join(' OR ') })`);
      }

      if (q) {
        queryArray.push(`(${ q })`);
      }

      labels[i] = q || '*';

      const query = queryArray.length ? queryArray.join(' AND ') : '*';

      obs.push(this.dataService.graylogHistogram(params.id, query, from.toISOString(), to.toISOString(), params.duration > 60 ? 'hour' : 'minute'));
    });

    this.data = {
      datasets: []
    };

    this.requester.next({ labels: labels, requests: obs });
  }

  datasetConfig(data: any, label: string, idx: number) {

    const d = Object.keys(data).map(t => ({
      t: moment(parseInt(t, 10) * 1000),
      y: data[t]
    }));

    const colors = [
      '54, 162, 235', '162, 54, 235',
      '54, 235, 162', '162, 235, 54',
      '235, 54, 162', '235, 162, 54'
    ];

    return {
      label: label,
      backgroundColor: 'rgba(' + colors[idx] + ', 1)',
      borderColor: 'rgb(' + colors[idx] + ')',
      borderWidth: 1,
      data: d,
      fill: false,
      showLine: false,
      pointRadius: 3,
      pointHitRadius: 5
    };
  }

  getTooltipFormatter() {
    return (tooltip, data) => this.data.datasets[tooltip.datasetIndex].label + ': ' + this.formatCount(tooltip.yLabel, [ tooltip.yLabel ]);
  }

  formatCount(value, values, frCallback: any = null) {
    const options = { useGrouping: false };
    if (frCallback) {
      options['minimumFractionDigits'] = frCallback(values);
    } else {
      options['maximumFractionDigits'] = 4;
    }

    return Intl.NumberFormat(navigator.language, options).format(value);
  }

  clickElement(el) {

    const dur = this._params['duration'] > 60 ? 60 : 5;

    if (!(el.length && el[0].hasOwnProperty('_index') && el[0].hasOwnProperty('_datasetIndex'))) {
      return false;
    }


    const dataset = el[0]._chart.config.data.datasets[el[0]._datasetIndex];
    const search = dataset.label;

    const dt = dataset.data[el[0]._index].t;

    const date = dt.clone().startOf('day');
    let minutes = dt.diff(date, 'minutes');
    let time = Math.floor(minutes / 5);
    date.add(time * 5 + dur, 'minutes');

    const startOfDay = date.clone().startOf('day');
    minutes = date.diff(startOfDay, 'minutes');
    time = Math.floor(minutes / 5);
    const sod = startOfDay.toISOString();

    if (this._params['duration'] > 60) {
      this.modalTracker.navigate({ glvdate: sod, glvtime: time, glvduration: 60, glvpage: null });
    } else {
      this.modalTracker.navigate({ glvdate: sod, glvtime: time, glvduration: dur, glvpage: null, glvquery: search, glvtab: 'grid' });
    }

  }

  private buildOptions() {

    return {
      maintainAspectRatio: false,
      animation: {
        duration: 1500,
      },
      layout: {
        padding: {
          left: 10,
          bottom: 5
        }
      },
      tooltips: {
        callbacks: {
          label: this.getTooltipFormatter()
        }
      },
      legend: {
        display: true,
        position: 'bottom'
      },
      scales: {
        xAxes: [ {
          barThickness: 2,
          type: 'time',
          ticks: {
            autoSkipPadding: 10,
          },
          time: {
            tooltipFormat: 'lll',
            min: this.range.start,
            max: this.range.end,
          }
        } ],
        yAxes: [ {
          ticks: {
            min: 0,
            // callback: this.getFormatter()
          }
        } ]
      },
      onHover: (event, chartElement) => {
        event.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
      }
    };
  }

}
