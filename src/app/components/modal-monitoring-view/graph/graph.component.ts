import { Component, Input, OnInit } from '@angular/core';
import * as moment from 'moment';
import { DateRange } from '../../../models/range';
import { SecondsToTimePipe } from '../../../pipes/seconds-to-time.pipe';
import { DataService } from '../../../services/data/data.service';

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
})
export class GraphComponent implements OnInit {
  formatCallback: any;
  @Input() title: string;
  @Input() range: DateRange;
  @Input() series: any;
  @Input() instance: string;
  @Input() labels: moment.Moment[];
  @Input() unit: string;
  @Input() container: Element;
  @Input() type: string;
  @Input() factor: number;

  count: number = 0;
  data: any;
  inViewTriggered: boolean = false;

  loader: boolean = false;

  options: any;

  infoValue: string;

  constructor(
    private dataService: DataService,
    private secondsToTime: SecondsToTimePipe
  ) {
  }

  ngOnInit(): void {
    this.options = this.buildOptions();
  }

  getGraphData() {
    this.loader = true;
    this.inViewTriggered = true;
    this.data = {
      datasets: []
    };

    let getData, dataConfig;

    if (this.type == 'info') {
      getData = this.dataService.getInfoData;
      dataConfig = this.infoDataConfig;
    } else {
      getData = this.dataService.getGraphData;
      dataConfig = this.datasetConfig;
    }

    let i = 0;

    for (let g of this.series) {
      let ti = i;
      let level = Object.keys(g).map(e => g[e])[0].replace('.', '/');
      let label = Object.keys(g)[0];
      getData.call(this.dataService, this.instance, level, this.range.toString())
        .subscribe(
          (data: any) => {
            // this.data.datasets.push(dataConfig.call(this, data, label));
            this.data.datasets[ti] = dataConfig.call(this, data, label, ti);
            this.updateLoader();
          },
          () => this.updateLoader()
        );
      i++;
    }
  }

  updateLoader() {
    this.count++;
    if (this.count == this.series.length) {
      this.loader = false;
      if (this.type == 'info') {
        let data = this.data.datasets[0].data.data.data.data;
        this.infoValue = this.formatCallback(data, 0, [ data ]);
      } else {
        // console.log(this.data);
      }
    }
  }

  datasetConfig(data: any, label: string, idx: number) {
    let d = data.data.map(d => {
      return {
        t: moment(d.timestamp + 'Z'),
        y: d.data * this.factor
      };
    });

    let colors = [
      '54, 162, 235', '162, 54, 235',
      '54, 235, 162', '162, 235, 54',
      '235, 54, 162', '235, 162, 54'
    ];

    return {
      label: label,
      backgroundColor: 'rgba(' + colors[idx] + ', 0.2)',
      borderColor: 'rgb(' + colors[idx] + ')',
      borderWidth: 1,
      data: d,
      pointRadius: 0,
      pointHitRadius: 5
    };
  }

  infoDataConfig(data: any, label: string, idx: number) {
    return {
      data: data,
      label: label
    };
  }

  getFormatter() {
    let timeFormatter = this.secondsToTime.transform;
    let formatTime = (value, index, values) => {
      return timeFormatter(Math.floor(value / 1000));
    };
    let formatCount = (value, index, values) => {
      return this.formatCount(value, values, this.fractionNum);
    };
    let formatPercent = (value, index, values) => {
      return this.formatPercent(value, values, this.fractionNum);
    };
    let formatSize = (value, index, values) => {
      return this.formatSize(value, values, this.fractionNum);
    };

    let formatters = {
      'percent': formatPercent,
      'count': formatCount,
      'time': formatTime
    };

    return formatters[this.unit] || formatSize;
  }

  getTooltipFormatter() {
    let formatters = {
      'percent': (tooltip, data) => this.data.datasets[tooltip.datasetIndex].label + ': ' + this.formatPercent(tooltip.yLabel, [ tooltip.yLabel ]),
      'count': (tooltip, data) => this.data.datasets[tooltip.datasetIndex].label + ': ' + this.formatCount(tooltip.yLabel, [ tooltip.yLabel ])
    };
    let d = (tooltip, data) => this.data.datasets[tooltip.datasetIndex].label + ': ' + this.formatSize(tooltip.yLabel, [ tooltip.yLabel / 1000 ]);
    return formatters[this.unit] || d;
  }

  formatSize(value, values, frCallback: any = null) {
    value = value || 0;

    let options = { useGrouping: false };
    if (frCallback) {
      options['minimumFractionDigits'] = frCallback(values);
    } else {
      options['maximumFractionDigits'] = 2;
    }

    let f = function (value) {
      return Intl.NumberFormat(navigator.language, options).format(value);
    };

    let max = Math.max.apply(null, values) || 0;
    if (max < 1000) {
      return f(value) + ' b';
    } else if (max < 1000000) {
      return f(value / 1000) + ' Kb';
    } else if (max < 1000000000) {
      return f(value / 1000000) + ' Mb';
    } else {
      return f(value / 1000000000) + ' Gb';
    }
  }

  // formatSize(value, index, values, onlyInt = false) {
  //   let f = function(value, onlyInt) {
  //     return onlyInt ? Math.floor(value) : Intl.NumberFormat(navigator.language, {maximumFractionDigits: 2, useGrouping: false}).format(value);
  //   };
  //
  //   if (onlyInt && value !== Math.round(value)) return null;
  //   let max = Math.max.apply(null, values);
  //   if (max < 1000) return f(value, onlyInt) + ' b';
  //   else if (max < 1000000) return f(value/1000, onlyInt) + ' Kb';
  //   else if (max < 1000000000) return f(value/1000000, onlyInt) + ' Mb';
  //   else return f(value/1000000000, onlyInt) + ' Gb';
  // }

  formatPercent(value, values, frCallback: any = null) {
    value = value || 0;

    let options = { style: 'percent' };
    if (frCallback) {
      options['minimumFractionDigits'] = frCallback(values);
    } else {
      options['maximumFractionDigits'] = 2;
    }

    return Intl.NumberFormat(navigator.language, options).format(value / 100);
  }

  formatCount(value, values, frCallback: any = null) {
    value = value || 0;

    let options = { useGrouping: false };
    if (frCallback) {
      options['minimumFractionDigits'] = frCallback(values);
    } else {
      options['maximumFractionDigits'] = 4;
    }

    return Intl.NumberFormat(navigator.language, options).format(value);
  }

  inView(event) {
    if (event.visible && !this.inViewTriggered) {
      this.getGraphData();
    }
  }

  fractionNum(values: number[]) {
    let n = values.length > 1 ? Math.floor(Math.abs(values[0]) * 1000000) - Math.floor(Math.abs(values[1]) * 1000000) : Math.floor(Math.abs(values[0]) * 1000000);
    if (!n) {
      return 0;
    }
    let s = n.toString();
    let z = s.match(/0*$/)[0].length;
    if (z > 6) {
      return 0;
    }
    return 6 - z;
  }

  private buildOptions() {

    this.formatCallback = this.getFormatter();

    return {
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
            callback: this.formatCallback
          }
        } ]
      }
    };
  }


}
