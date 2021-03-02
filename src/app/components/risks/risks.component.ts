import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { List } from '../../models/list';
import { Options } from 'ng5-slider';
import { Subject, Subscription } from 'rxjs';
import { distinctUntilChanged, map, filter } from 'rxjs/operators';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { ModalVulnerabilitiesComponent } from '../modal-vulnerabilities/modal-vulnerabilities.component';
import { DataService } from "../../services/data/data.service";

@Component({
  selector: 'app-risks',
  templateUrl: './risks.component.html',
  styleUrls: [ './risks.component.css' ]
})
export class RisksComponent implements OnInit, OnDestroy {

  days = 7;
  layer = 'all';
  layers: any = {
    all: 'All layers'
  };

  env = 'all';
  envs: any = {
    all: 'All environments',
  };

  queryParamsSub: Subscription;
  dailyOptions: any;
  ageOptions: any;
  affectedOptions: any;
  pieOptions: any;

  dailyData: any;
  dailyPieData: any;
  ageData: any;
  agePieData: any;
  affectedData: any;
  affectedPieData: any;

  dailyViewTriggered: boolean = false;
  ageViewTriggered: boolean = false;
  instanceViewTriggered: boolean = false;

  sliderOptions: Options = {
    showTicksValues: true,
    stepsArray: [
      { value: 1 },
      { value: 2 },
      { value: 3 },
      { value: 4 },
    ],
    translate: (value: number): string => {
      return {
        1: '<30 days',
        2: '<90',
        3: '<180',
        4: '180+',
      }[value];
    }
  };

  dailyHoverSub: Subscription;
  ageHoverSub: Subscription;
  affectedHoverSub: Subscription;

  dailyHover: Subject<any[]> = new Subject();
  ageHover: Subject<any[]> = new Subject();
  affectedHover: Subject<any[]> = new Subject();

  dailyHoverLabel:any = null;
  ageHoverLabel:any = null;
  affectedHoverLabel:any = null;

  params: any = {};

  appList: List = new List;
  loader = false;
  dailyLoader = true;
  ageLoader = true;
  instanceLoader = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalTracker: ModalTrackerService,
    private cd: ChangeDetectorRef,
    private dataService: DataService
  ) {
  }

  get layerIds() {
    return Object.keys(this.layers);
  }

  get layerLength() {
    return Object.keys(this.layers).length;
  }

  get envIds() {
    return Object.keys(this.envs);
  }

  get envLength() {
    return Object.keys(this.envs).length;
  }

  ngOnInit(): void {

    const compare = (a: any[], b: any[]) => a[0]['_index'] === b[0]['_index'];

    const getData = elements => {
      const datasets = elements[0]._chart.config.data.datasets;
      return [
        datasets[elements[0]._datasetIndex].data[elements[0]._index].y,
        datasets[elements[1]._datasetIndex].data[elements[1]._index].y,
        datasets[elements[2]._datasetIndex].data[elements[2]._index].y,
        datasets[elements[3]._datasetIndex].data[elements[3]._index].y,
      ];
    };

    const getEnvs = () => {
      this.dataService.getEnvironments().subscribe( (res) => {
        for (let key of Object.keys(res.terms_mapping)) {
          this.envs[res.terms_mapping[key][0].value] =  res.terms_mapping[key][0].value;
        }
      });
    };

    const getLayers = () => {
      this.dataService.getLayers().subscribe( (res) => {
        for (let key of Object.keys(res.terms_mapping)) {
          this.layers[res.terms_mapping[key][0].value] =  res.terms_mapping[key][0].value;
        }
      });
    };

    getEnvs();
    getLayers();

    this.dailyHoverSub = this.dailyHover.pipe(distinctUntilChanged(compare)).subscribe(elements => {
      this.dailyPieData = this.generatePieData(getData(elements));
      this.dailyHoverLabel = elements[0]._xScale.ticks[elements[0]._index];
      this.cd.detectChanges();
    });

    this.ageHoverSub = this.ageHover.pipe(distinctUntilChanged(compare)).subscribe(elements => {
      this.agePieData = this.generatePieData(getData(elements));
      this.ageHoverLabel = elements[0]._xScale.ticks[elements[0]._index];
      this.cd.detectChanges();
    });

    this.affectedHoverSub = this.affectedHover.pipe(distinctUntilChanged(compare)).subscribe(elements => {
      this.affectedPieData = this.generatePieData(getData(elements));
      this.affectedHoverLabel = elements[0]._xScale.ticks[elements[0]._index];
      this.cd.detectChanges();
    });

    this.initQueryParams();

    this.loadData();
  }

  ngOnDestroy(): void {
    this.queryParamsSub && this.queryParamsSub.unsubscribe();
    this.dailyHoverSub && this.dailyHoverSub.unsubscribe();
    this.ageHoverSub && this.ageHoverSub.unsubscribe();
    this.affectedHoverSub && this.affectedHoverSub.unsubscribe();
  }

  initQueryParams() {
    this.queryParamsSub = this.route.queryParamMap.subscribe(params => {
      this.days = parseInt(params.get('days'), 10) || 7;
      this.layer = params.get('layer') || 'all';
      this.env = params.get('env') || 'all';

      const vl = params.get('vl');

      this.modalTracker.execIfNewParam(this.params, 'vl', vl, (vl) => {
        // this.openVulnerabilitiesModal(vl);
      });

    });
  }

  setDays(days: number) {
    this.days = days;
    this.loadData();
    this.modalTracker.navigate({ days: days });

    this.dailyViewTriggered = false;
    this.dailyLoader = true;
    this.loadDailyCountData();
  }

  setLayer(layer: string) {
    this.modalTracker.navigate({ layer: layer });
  }

  setEnv(env: string) {
    this.modalTracker.navigate({ env: env });
    this.env = env;
    this.loadData();
  }

  loadData() {

    this.dailyViewTriggered = false;
    this.ageViewTriggered = false;
    this.instanceViewTriggered = false;
    this.dailyLoader = true;
    this.ageLoader = true;
    this.instanceLoader = true;
  }

  setQueries() {

    var filterList = [];
    if ( this.env != "all" ) {
      filterList.push(`env:${this.env}`);
    } 

    if ( this.layer != "all" ) {
      filterList.push(`layer:${this.layer}`);
    }

    return filterList.length ? filterList.join(' AND ') : '*'
  }

  loadDailyCountData() {
    this.dailyLoader = true;
    this.dailyViewTriggered = true;

    const query = this.setQueries();
    this.dataService.appzAlertGetByTerm(query, this.days.toString(), 'count')
    .subscribe(
      (data: List) => {
        this.appList = data;

        this.dailyOptions = this.buildOptions('Alerts - Daily Count', this.dailyHover, Object.keys(data));
        this.pieOptions = this.buildDoughnutChartOptions();
        this.dailyData = this.generateData(this.appList, "count");

        const last_break_data = {
          'count': [
            data[Object.keys(data)[Object.keys(data).length - 1]]['critical']["count"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['high']["count"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['medium']["count"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['low']["count"],
          ]
        }

        this.dailyHoverLabel = Object.keys(data)[Object.keys(data).length - 1];
        this.dailyPieData = this.generatePieData(last_break_data['count']);
      },
      null,
      () => this.dailyLoader = false
    );
  }

  loadAgeData() {
    this.ageLoader = true;
    this.ageViewTriggered = true;

    const query = this.setQueries();
    this.dataService.appzAlertGetByTerm(query, this.days.toString(), 'age')
    .subscribe(
      (data: List) => {
        this.appList = data;

        this.ageOptions = this.buildOptions('Alerts - Age', this.ageHover, Object.keys(data));
        this.pieOptions = this.buildDoughnutChartOptions();
        this.ageData = this.generateData(this.appList, "age");

        const last_break_data = {
          'age': [
            data[Object.keys(data)[Object.keys(data).length - 1]]['critical']["age"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['high']["age"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['medium']["age"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['low']["age"],
          ]
        }

        this.ageHoverLabel = Object.keys(data)[Object.keys(data).length - 1];
        this.agePieData = this.generatePieData(last_break_data['age']);
      },
      null,
      () => this.ageLoader = false
    );
  }

  loadInstanceData() {
    this.instanceLoader = true;
    this.instanceViewTriggered = true;

    const query = this.setQueries();
    this.dataService.appzAlertGetByTerm(query, this.days.toString(), 'instance')
    .subscribe(
      (data: List) => {
        this.appList = data;

        this.affectedOptions = this.buildOptions('Alerts - Instances Affected', this.affectedHover, Object.keys(data));
        this.pieOptions = this.buildDoughnutChartOptions();
        this.affectedData = this.generateData(this.appList, "instance");

        const last_break_data = {
          'instance': [
            data[Object.keys(data)[Object.keys(data).length - 1]]['critical']["instance"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['high']["instance"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['medium']["instance"],
            data[Object.keys(data)[Object.keys(data).length - 1]]['low']["instance"],
          ]
        }

        this.affectedHoverLabel = Object.keys(data)[Object.keys(data).length - 1];
        this.affectedPieData = this.generatePieData(last_break_data['instance']);
      },
      null,
      () => this.instanceLoader = false
    );
  }

  buildData(level) {

    const colors: any = {
      'Criticals': '236, 62, 64',
      'Highs': '255, 154, 43',
      'Mediums': '245, 216, 1',
      'Lows': '0, 164, 109',
    };

    return {
      label: level,
      backgroundColor: `rgba(${ colors[level] }, 0)`,
      borderColor: `rgb(${ colors[level] })`,
      borderWidth: 2,
      data: [],
      pointRadius: 2,
      pointHitRadius: 5
    };
  }

  generateData(data, chart_key) {

    const datasets = {
      'datasets': [
        this.buildData('Criticals'),
        this.buildData('Highs'),
        this.buildData('Mediums'),
        this.buildData('Lows')
      ]
    };

    for ( let key in data ) {
      datasets.datasets[0].data.push({t: key, y: data[key]['critical'][chart_key]});
      datasets.datasets[1].data.push({t: key, y: data[key]['high'][chart_key]});
      datasets.datasets[2].data.push({t: key, y: data[key]['medium'][chart_key]});
      datasets.datasets[3].data.push({t: key, y: data[key]['low'][chart_key]});
    }

    console.log(datasets);
    return datasets;
  }

  generatePieData(data = [ 30, 35, 60, 122 ]) {
    
    return {
      datasets: [ {
        data: data,
        backgroundColor: [ 'rgba(236, 62, 64, 0.8)', 'rgba(255, 154, 43, 0.8)', 'rgba(245, 216, 1, 0.8)', 'rgba(0, 164, 109, 0.8)', ],
        borderColor: [ '#fff', '#fff', '#fff', '#fff' ],
        hoverBorderColor: [ '#fff', '#fff', '#fff', '#fff' ],
        hoverBackgroundColor: [ 'rgba(236, 62, 64, 1)', 'rgba(255, 154, 43, 1)', 'rgba(245, 216, 1, 1)', 'rgba(0, 164, 109, 1)', ],
        borderWidth: [ 0, 0, 0, 0 ],
        hoverBorderWidth: [ 0, 0, 0, 0 ],
      } ],
      labels: [ 'Criticals', 'Highs', 'Mediums', 'Lows' ]
    };
  }

  openVulnerabilitiesModal(range, level=null) {
    this.modalTracker
      .track('vl')
      .show(ModalVulnerabilitiesComponent, {
        initialState: {
          filter_range: range,
          env: this.env,
          layer: this.layer,
          level: level
        },
        ignoreBackdropClick: true,
        class: "vulnerabilities"
      });
  }

  clickElement(e) {
    // this.modalTracker.navigate({ vl: 'dummy' });
    const label = e[0]._xScale.ticks[e[0]._index];
    const data = this.appList[label].range;

    const hoverLabel = e[0]._chart.config.data.datasets[e[0]._datasetIndex].label;
    var alertLevel = hoverLabel.toLowerCase().slice(0, hoverLabel.length - 1);
    this.openVulnerabilitiesModal(data, alertLevel);
  }

  clickPieChart(e, type) {
    
    var label;
    if ( type == 'count' ) {
      label = this.dailyHoverLabel;
    }
    if ( type == 'age' ) {
      label = this.ageHoverLabel;
    }
    if ( type == 'instance' ) {
      label = this.affectedHoverLabel;
    }
    const data = this.appList[label].range;
    var alertLevel = null;
    if ( e[0] ) alertLevel = e[0]._model.label.toLowerCase().slice(0, e[0]._model.label.length - 1);
    else {
      var clist;
      if ( e.target.classList.contains('link-elem') ) {
        clist = e.target.classList;
        clist.remove('link-elem');
      }
      else {
        clist = e.target.parentElement.classList;
        clist.remove('link-elem');
      }
      if ( clist.length ) {
        const levelLabel = clist[0].split('-')[1];
        alertLevel = levelLabel.slice(0, levelLabel.length - 1);
      }
    }
    this.openVulnerabilitiesModal(data, alertLevel);
  }

  private buildOptions(title, subj: Subject<any[]>, labels) {

    return {
      onHover: function (e, elements) {
        var point = this.getElementAtEvent(e);
        if (point.length) e.target.style.cursor = 'pointer';
        else e.target.style.cursor = 'default';
        
        if (!elements.length) {
          return false;
        }
        subj.next(elements);
      },
      animation: {
        duration: 1500,
      },
      title: {
        display: true,
        position: 'bottom',
        text: title,
      },
      layout: {
        padding: {
          left: 10,
          bottom: 5
        }
      },
      tooltips: {
        mode: 'single'
      },
      legend: {
        display: false,
        position: 'bottom'
      },
      scales: {
        xAxes: [ {
          barThickness: 2,
          type: 'category',
          ticks: {
            autoSkipPadding: 10,
            autoSkip: true,
            maxTicksLimit: 10
          },
          labels: labels
        } ],
        yAxes: [ {
          ticks: {
            min: 0,
            // callback: this.formatCallback
          }
        } ],
      }
    };
  }

  private buildDoughnutChartOptions() {
    return {
      responsive: true,
      maintainAspectRatio: true,
      cutoutPercentage: 60,
      onHover: function (e, elements) {
        var point = this.getElementAtEvent(e);
        if (point.length) e.target.style.cursor = 'pointer';
        else e.target.style.cursor = 'default';
        
        if (!elements.length) {
          return false;
        }
      },
      legend: {
        display: false,
        position: 'bottom',
        labels: {
          boxWidth: 10,
          fontSize: 10,
        }
      }
    };
  }

  public inDailyView(event) {
    if (event.visible && !this.dailyViewTriggered) {
      this.loadDailyCountData();
    }
  }

  public isAgeView(event) {
    if (event.visible && !this.ageViewTriggered) {
      this.loadAgeData();
    }
  }

  public isInstanceView(event) {
    if (event.visible && !this.instanceViewTriggered) {
      this.loadInstanceData();
    }
  }
}
