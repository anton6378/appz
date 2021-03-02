import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import * as moment from 'moment';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {ModalTrackerService} from '../../services/modal-tracker/modal-tracker.service';
import {DataService} from "../../services/data/data.service";
import {DownloadService} from "../../services/download/download.service";
import { List } from '../../models/list';
import { debounceTime, distinctUntilChanged, finalize, map, mergeMap, switchMap } from 'rxjs/operators';
import { ModalDataViewComponent } from "../modal-data-view/modal-data-view.component";
import { DaterangepickerComponent } from 'ng2-daterangepicker';

@Component({
  selector: 'app-modal-vulnerabilities-single',
  templateUrl: './modal-vulnerabilities-single.component.html',
  styleUrls: ['./modal-vulnerabilities-single.component.css']
})
export class ModalVulnerabilitiesSingleComponent implements OnInit {

  id: string;
  app: string;
  version : string;
  title: string;
  env: string;
  level: string;
  age: string;
  days: number;
  timestamp: number;

  query: string;

  appList: List = new List;

  loader = true;
  dlLoader = false;

  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    singleDatePicker: true,
    autoUpdateInput: false
  };
  @ViewChild('vulnerabilitiesBox', {static: true}) vBox: ElementRef;
  @ViewChild(DaterangepickerComponent, {static: true})
    private picker: DaterangepickerComponent;

  page = 1;
  perPage = 20;
  pagination: any = {
    prev: `<span class="small glyphicon glyphicon-chevron-left"></span>`,
    first: `<span class="small glyphicon glyphicon-fast-backward"></span>`,
    next: `<span class="small glyphicon glyphicon-chevron-right"></span>`,
    last: `<span class="small glyphicon glyphicon-fast-forward"></span>`,
  };

  constructor(
    public modal: BsModalRef,
    private modalTracker: ModalTrackerService,
    private dataService: DataService,
    private downloadService: DownloadService,
    protected cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadData();
  }

  public selectedDate(value: any, datepicker?: any) {
    this.picker.datePicker.element.val(value.start.utc().format('MM/DD/YYYY'));
    this.modalTracker.navigate({vldate: value.start.toISOString(), vlpage: null});
  }

  setQueries() {

    var filterList = [];
    if ( this.env != "all" ) {
      filterList.push(`env:${this.env}`);
    } 

    if ( this.level ) {
      filterList.push(`alert_level:${this.level}`);
    }

    if ( this.query ) {
      filterList.push(this.query);
    }

    return filterList.length ? filterList.join(' AND ') : '*'
  }

  download(type) {
    this.dlLoader = true;
    
    const query = this.composeQueryParams() ? this.composeQueryParams() : '*';

    const sub = this.dataService.alertsByAppDownloadStream(query, "0", this.id, this.version, this.env, this.page).pipe(
      finalize(() => {
        sub.unsubscribe();
        this.dlLoader = false;
      })
    ).subscribe(result => {

      const filename = `log_${ this.id }.txt`;

      if ( result.result.length ) {
        const headers = Object.keys(result.result[0]);
        if ( type == 'csv' ) {
          this.downloadService.downloadFileAsCSV(result.result, filename, headers);
        }
        else if (type =='pdf') {
          this.downloadService.downloadFileAsPDF(result);
        }
      }
    });
  }

  escapeRegExp(string) {
    return string.replace(/\-/g, '%2D').replace(/\//g, '%5C'); // $& means the whole matched string
  }

  composeQueryParams() {
    var filters = [];
    if ( this.app ) {
      const d = this.app.indexOf('logcollectores') > -1 && this.app.indexOf('appz') == -1 ? `myco-dev/appz-${this.app}` : `myco-dev/${this.app}`;

      const appName = this.escapeRegExp(d);
      filters.push(`app:${appName}`);
    }
    if ( this.level ) filters.push(`alert_level:${this.level}`);
    if ( this.age ) filters.push(`age:${this.age}`);
    // if ( this.timestamp ) filters.push(`timestamp:${this.timestamp}`);
    if ( this.query ) {
      filters.push(this.query);
    }
    return filters.join(' AND ');
  }

  loadData() {
    this.page = 1;
    this.appList = new List;
    this.loader = true;

    const query = this.composeQueryParams() ? this.composeQueryParams() : '*';

    if ( this.days > 0 ) {
      this.dataService.appzAlertGetByAppAbsolute(query, "0", this.id, this.version, this.env, this.page)
      .subscribe( (data: List) => {
        this.appList = List.fromDTO(data);
        this.loader = false;
      },
      () => {
        this.loader = false;
      });
    }
    else {
      this.dataService.appzAlertGetByApp(query, "0", this.id, this.version, this.env, this.page, this.timestamp)
      .subscribe((data: List) => {
        this.appList = List.fromDTO(data);
        this.loader = false;
      },
      () => {
        this.loader = false;
      });
    }
  }

  dt(date: string) {
    const parts = (date || 'zzz').split(' ');
    if (parts.length === 2) {
      return parts.join('T') + 'Z';
    }
  }

  openData(data) {
    this.modalTracker
      .track('glvdata')
      .show(ModalDataViewComponent, {
        initialState: {
          mid: 'glvdata',
          title: 'Alert entry data',
          data: JSON.stringify(data)
        },
        ignoreBackdropClick: true
      });
  }

  changePage(event) {
    if (event.page <= this.appList.total_pages) {
      this.loader = true;
      this.page = event.page;

      const query = this.composeQueryParams() ? this.composeQueryParams() : '*';

      if ( this.days > 0 ) {
        this.dataService.appzAlertGetByAppAbsolute(query, "0", this.id, this.version, this.env, this.page)
        .subscribe((data: List) => {
          this.appList = List.fromDTO(data);
          this.loader = false;
        },
        () => {
          this.loader = false;
        });
      }
      else {
        this.dataService.appzAlertGetByApp(query, "0", this.id, this.version, this.env, this.page, this.timestamp)
        .subscribe((data: List) => {
          this.appList = List.fromDTO(data);
          this.loader = false;
        },
        () => {
          this.loader = false;
        });
      }
    }
  }
}
