import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as moment from 'moment';
import { ClipboardService } from 'ngx-clipboard';
import { Observable, ReplaySubject, Subscription } from 'rxjs';
import { finalize, switchMap } from 'rxjs/operators';
import { DataService } from '../../../services/data/data.service';
import { ModalTrackerService } from '../../../services/modal-tracker/modal-tracker.service';
import { ModalDataViewComponent } from '../../modal-data-view/modal-data-view.component';
import { ModalExpandViewComponent } from '../../modal-expand-view/modal-expand-view.component';
import { ModalMonitoringBasicViewComponent } from '../../modal-monitoring-view/modal-monitoring-basic-view.component';
import * as Convert from "ansi-to-html";

@Component({
  selector: 'app-glog-grid-view',
  templateUrl: './glog-grid-view.component.html',
  styleUrls: [ './glog-grid-view.component.css' ],
})
export class GlogGridViewComponent implements OnInit, OnDestroy {

  app: any;

  data: any;
  messages: any[] = [];

  private converter = new Convert();

  @Output()
  total = new EventEmitter<number>();

  @Output()
  flash = new EventEmitter<void>();

  update = new ReplaySubject<any>();

  dataSub: Subscription;
  updateSub: Subscription;

  queryError: string;
  qparams: any = {};
  stream = '';
  requester: ReplaySubject<Observable<any>> = new ReplaySubject();
  loader = true;
  private paramsSub: Subscription;

  constructor(
    private dataService: DataService,
    private modalTracker: ModalTrackerService,
    protected route: ActivatedRoute,
    private clipboardService: ClipboardService
  ) {
  }

  @Input()
  set copy(value: any) {
    if (value) {

      const remove = (arr, value) => {
        const idx = arr.indexOf(value);
        if (idx > -1) {
          arr.splice(idx, 1);
        }
      };

      const pad = (str, length) => {
        const diff = length - str.length;
        return str + (diff > 0 ? ' '.repeat(diff) : '');
      };

      const maxLength = (arr, column, storage, transform = s => s) => {
        if (storage.hasOwnProperty(column)) {
          return storage[column];
        }
        const lengthes = arr.map(row => {
          const x = transform(row['message'][column]);
          // console.log(x);
          return (x + '').length;
        });
        const max = Math.max.apply(null, lengthes);

        // console.log(lengthes, max);

        storage[column] = max;

        return max;
      };

      const content = [];
      const lengths: any = {};

      const trs = {
        'timestamp': v => moment(v).format('LTS'),
        'streams': v => JSON.stringify(v)
      };

      this.messages.forEach((m, i, a) => {
        const row = [];
        const msg = m.message;
        const keys = Object.keys(msg);
        remove(keys, 'timestamp');
        remove(keys, 'message');
        keys.sort();
        const tr = trs['timestamp'];
        row.push(pad(tr(msg['timestamp']), maxLength(a, 'timestamp', lengths, tr)));
        row.push(pad(msg['message'], maxLength(a, 'message', lengths)));

        keys.forEach(k => {
          const tr = trs[k] || (s => s);
          row.push(pad(tr(msg[k]), maxLength(a, k, lengths, tr)));
        });

        content.push(row.join('   '));
      });

      this.clipboardService.copyFromContent(content.join('\n'));
      this.flash.emit();
    }
  }

  @Input()
  set params(value: any) {
    if (value) {
      this.update.next(value);
    }
  }

  ngOnInit(): void {
    this.updateSub = this.update.subscribe((params) => {
      this.stream = params.id;
      this.reload(params);
    });

    this.dataSub = this.requester.pipe(
      switchMap(obs => {
        this.loader = true;
        return obs.pipe(finalize(() => {
          this.loader = false;
        }));
      })
    ).subscribe(result => {
      this.messages = [];

      if (result.hasOwnProperty('total_results')) {
        this.data = result;
        this.total.emit(this.data.total_results);
        this.messages = this.data.messages;
        this.queryError = null;
      } else {
        this.queryError = result['message'];
      }

      this.subscribeParams();
    });

  }

  ngOnDestroy(): void {
    this.updateSub && this.updateSub.unsubscribe();
    this.paramsSub && this.paramsSub.unsubscribe();
    this.dataSub && this.dataSub.unsubscribe();
  }

  reload(params) {

    this.app = params.app;

    const to = moment(params.date).add(params.time * 5, 'minutes');
    const from = moment(to).subtract(params.duration, 'minutes');


    const queryArray = [];

    if (params.instance) {
      queryArray.push(`instance:${ params.instance.replace(/([\/\\-])/g, '\\$1') }`);
    }
    if (params.path) {
      queryArray.push(`path:${ params.path.replace(/([\/\\-])/g, '\\$1') }`);
    }

    const search = params.query.split('|').map(e => e.trim()).filter(e => e.length).join(' OR ');

    if (search) {
      queryArray.push(`(${ search })`);
    }

    if (params.filter.length) {
      queryArray.push(`(${ params.filter.map(f => `level:${ f }`).join(' OR ') })`);
    }

    const query = queryArray.length ? queryArray.join(' AND ') : '*';

    this.requester.next(
      this.dataService.graylogStream(params.id, query, from.toISOString(), to.toISOString(),
        params.page - 1, params.perPage)
    );

  }

  subscribeParams() {
    this.paramsSub = this.paramsSub || this.route.queryParamMap.subscribe(p => {
      this.modalTracker.execIfNewParam(this.qparams, 'mbv', p.get('mbv'), () => {
        this.openChartModal();
      });
      this.modalTracker.execIfNewParam(this.qparams, 'exp', p.get('exp'), () => {
        this.openExpandModal(p.get('expmid'), p.get('expq'), p.get('expts'), p.get('thread'));
      });

    });
  }

  openChartModal() {
    this.dataService.check().subscribe(() => {
      this.modalTracker.track('mbv').show(ModalMonitoringBasicViewComponent, {
        initialState: {
          app: this.app
        },
        ignoreBackdropClick: true
      });
    });
  }

  openChart(item) {
    const ts = moment(item.message.timestamp);
    const from = ts.clone().subtract(15, 'minutes');
    const to = ts.clone().add(5, 'minutes');

    this.modalTracker.navigate({
      mbv: this.app.app_id,
      mbvenv: this.app.env,
      mbvdate: ts.toISOString(),
      mbvdatestart: from.toISOString(),
      mbvdateend: to.toISOString(),
      mbvinstance: item.message.namespace + '/' + item.message.instance,
      mbvinstancehl: item.message.namespace + '/' + item.message.instance,
    });
  }

  openData(item: any) {
    this.modalTracker
      .track('glvdata')
      .show(ModalDataViewComponent, {
        initialState: {
          mid: 'glvdata',
          title: 'Log entry data',
          data: JSON.stringify(item.message)
        },
        ignoreBackdropClick: true
      });

  }

  openExpandModal(message_id, query, timestamp, thread) {
    this.modalTracker.track('exp').show(ModalExpandViewComponent, {
      initialState: {
        app: this.app,
        thread,
        stream: this.stream,
        query,
        message_id,
        timestamp
      },
      ignoreBackdropClick: true
    });
  }

  expandMessage(item: any) {
    const timestamp = moment(item.message.timestamp);

    this.modalTracker.navigate({
      exp: this.app.app_id,
      thread: item.message.thread,
      expmid: item.message._id,
      expq: '(*)',
      expts: timestamp.toISOString()
    });
  }

  convertAnsitoHtml(val) {
    let value = val.replace(/"/g, '').replace(/,/g, '').replace(
      /(((https?\:\/\/)|(www\.))(\S+))/gi,
      (match, space, url) => {
        var hyperlink = url;
        if (!hyperlink.match('^https?:\/\/')) {
          hyperlink = 'http://' + hyperlink;
        }
        return '<a href="' + match + '" target="_blank">' + match + '</a>';
      }
    );
    return this.converter.toHtml(value);
  }
}
