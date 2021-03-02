import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { List } from '../../models/list';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { DataService } from "../../services/data/data.service";
import { ModalVulnerabilitiesSingleComponent } from "../modal-vulnerabilities-single/modal-vulnerabilities-single.component";
import { AlertsService } from '../../services/alerts/alerts.service';

@Component({
  selector: 'app-risks-grid',
  templateUrl: './risks-grid.component.html',
  styleUrls: [ './risks-grid.component.css' ]
})
export class RisksGridComponent implements OnInit {

  loader = true;
  sorting: any[] = [];
  filter: string;

  appList: List = new List;

  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    singleDatePicker: true,
  };

  options = {
    responsive: true,
    maintainAspectRatio: false,
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
    },
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalTracker: ModalTrackerService,
    private service: DataService,
    private alertService: AlertsService
  ) {
    
    if ( !this.alertService.serviceLoaded ) {
      this.alertService.getAlerts();
    }
    else {
      this.appList = this.alertService.appList;
      this.loader = false;
    }

    this.alertService.alertLoadingChange.subscribe( value => {
      this.appList = this.alertService.appList;
      this.loader = false;
    })
  }

  ngOnInit() {
  }

  isSortedBy(sort: string) {
    return this.sorting.filter(e => e.dir + e.name === sort).length > 0;
  }

  resetSort(sort: string[]) {
    this.sorting = this.sorting.filter(e => sort.indexOf(e.name) === -1);
    // this.loadData();
  }

  isColumnSortedBy(sort: string[]) {
    return !!this.sorting.find(e => sort.indexOf(e.name) !== -1);
  }

  addSort(name: string, dir: string, reset: string[] = []) {
    this.sorting = this.sorting.filter(e => reset.indexOf(e.name) === -1);
    const s = this.sorting.filter(e => e.name !== name);
    s.push({ 'name': name, 'dir': dir });
    this.sorting = s;
    // this.loadData();
  }

  public selectedDate(value: any, datepicker?: any) {
    this.modalTracker.navigate({ date: value.start.toISOString(), page: null });
  }

  isFilteredBy(filter: string) {
    if (filter === 'ALL' && !this.filter) {
      return true;
    }
    return this.filter === filter;
  }

  setFilter(filter: string | null) {
    this.filter = filter;
    // this.loadData();
  }

  generatePieData(alertInfo) {
    return {
      datasets: [ {
        data: [
          alertInfo ? alertInfo.critical : 0,
          alertInfo ? alertInfo.high: 0,
          alertInfo ? alertInfo.medium: 0,
          alertInfo ? alertInfo.low: 0,
        ],
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

  openLog(e, app: any, ageFilter: string = null ) {

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

    this.openVulnerabilitiesModal(app, alertLevel, ageFilter);
  }

  openVulnerabilitiesModal(app, level=null, ageFilter=null) {
    this.modalTracker
      .track('vl')
      .show(ModalVulnerabilitiesSingleComponent, {
        initialState: {
          app: app.app,
          env: app.env,
          title: app.name,
          version: app.version,
          id: app.id,
          level: level,
          age: ageFilter
        },
        ignoreBackdropClick: true,
        class: "vulnerabilities"
      });
  }

  escapeRegExp(string) {
    return string.replace(/\-/g, '%2D').replace(/\//g, '%5C'); // $& means the whole matched string
  }

  composeQueryParams(app) {
    var filters = [];
    if ( app ) {
      const d = app.indexOf('logcollectores') > -1 ? `myco-dev/appz-${app}` : `myco-dev/${app}`;
      const appName = this.escapeRegExp(d);
      filters.push(`app:${appName}`);
    }
    return filters.join(' AND ');
  }

  inView(event, app) {
    // let index = null;
    // this.appList.data.forEach((v, i) => {
    //   if ( v.id === app.id && v.version === app.version && v.env === app.env ) {
    //     index = i;
    //   }
    // });

    // if ( event.visible && !app.viewtriggered ) {

    //   if ( index >= 0 && index != null ) {
    //     this.appList.data[index].viewtriggered = true;
    //     this.appList.data[index].loading = true;
    //   }

    //   this.service.appzAlertGetByApp(`app="${app['app']}"`, "0", app['id'], app['version'], app['env'])
    //     .subscribe(
    //       (res) => {
    //         this.appList.data[index].loading = false;
    //         if ( index >= 0 && index != null ) {
    //           this.appList.data[index].current = this.generatePieData(res.info);
    //           this.appList.data[index].less90 = this.generatePieData(res.info);
    //           this.appList.data[index].more90 = this.generatePieData(res.info);
    //         }
    //       },
    //     );
    // }
  }
}
