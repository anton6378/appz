import { Component, OnInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {ModalTrackerService} from '../../services/modal-tracker/modal-tracker.service';
import {DataService} from "../../services/data/data.service";
import { List } from '../../models/list';
import { debounceTime, distinctUntilChanged, finalize, map, mergeMap, switchMap, filter } from 'rxjs/operators';
import { DownloadService } from '../../services/download/download.service';
import { ModalDataViewComponent } from "../modal-data-view/modal-data-view.component";
import { DaterangepickerComponent } from 'ng2-daterangepicker';
import * as moment from 'moment';

import * as jsPDF from "jspdf";
import 'jspdf-autotable';

@Component({
  selector: 'app-modal-vulnerabilities',
  templateUrl: './modal-vulnerabilities.component.html',
  styleUrls: ['./modal-vulnerabilities.component.css']
})
export class ModalVulnerabilitiesComponent implements OnInit {

  id: string;
  filter_range: any;
  level: any;

  env: string;
  layer: string;
  query: string;

  appList: List = new List;

  loader = true;
  dlLoader = false;

  drpickerOptions = {
    'alwaysShowCalendars': true,
    opens: 'left',
    singleDatePicker: true,
  };

  page = 1;
  perPage = 20;
  pagination: any = {
    prev: `<span class="small glyphicon glyphicon-chevron-left"></span>`,
    first: `<span class="small glyphicon glyphicon-fast-backward"></span>`,
    next: `<span class="small glyphicon glyphicon-chevron-right"></span>`,
    last: `<span class="small glyphicon glyphicon-fast-forward"></span>`,
  };

  setQueries() {

    var filterList = [];
    if ( this.env != "all" ) {
      filterList.push(`env:${this.env}`);
    } 

    if ( this.layer != "all" ) {
      filterList.push(`layer:${this.layer}`);
    }

    if ( this.level ) {
      filterList.push(`alert_level:${this.level}`);
    }

    if ( this.query ) {
      filterList.push(this.query);
    }

    return filterList.length ? filterList.join(' AND ') : '*'
  }

  @ViewChild('vulnerabilitiesBox', {static: true}) vBox: ElementRef;
  @ViewChild(DaterangepickerComponent, {static: true})
    private picker: DaterangepickerComponent;

  constructor(
    public modal: BsModalRef,
    private modalTracker: ModalTrackerService,
    private dataService: DataService,
    private downloadService: DownloadService,
    protected cd: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadData();
    const d = moment(this.filter_range[0]).utc().format('MM/DD/YYYY');
    this.drpickerOptions['startDate'] = d;
  }

  public selectedDate(value: any, datepicker?: any) {
    this.filter_range = [
      value.start.utc().set({
        'hour': 0,
        'minute': 0,
        'second': 0
      }).toJSON(),
      value.start.utc().set({
        'hour': 23,
        'minute': 59,
        'second': 59
      }).toJSON()
    ];
    this.loadData();
  }

  download(type) {
    this.dlLoader = true;

    var query = "*";
    if ( this.level ) {
      query = `alert_level:${this.level}`;
    }

    const sub = this.dataService.alertsDownload(query, this.filter_range, this.page).pipe(
      finalize(() => {
        sub.unsubscribe();
        this.dlLoader = false;
      })
    ).subscribe(result => {

      if ( result.result.length ) {
        const headers = Object.keys(result.result[0]);
        if ( type == 'csv' ) {
          this.downloadService.downloadFileAsCSV(result.result, 'log_csv', headers);
        }
        else if (type =='pdf') {
          this.downloadService.downloadFileAsPDF(result);
        }
      }
    });
  }

  loadData() {
    this.page = 1;
    this.appList = new List;

    this.loader = true;

    const query = this.setQueries();
    
    this.dataService.appzAlertGetByTime(query,this.filter_range, this.page)
      .subscribe((data: List) => {
        this.appList = List.fromDTO(data);
        console.log(this.appList);
      },
      null,
      () => this.loader = false
    );
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
    if (event.page <= this.appList.total_pages ) {
      this.loader = true;
      this.page = event.page;
      
      const query = this.setQueries();

      this.dataService.appzAlertGetByTime(query,this.filter_range, this.page)
      .subscribe(list => {
        this.appList.data = list['data'];
        this.loader = false;
      },
      () => {
        this.loader = false;
      });
    }
  }
}
