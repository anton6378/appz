import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Subscription } from 'rxjs';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import * as Convert from "ansi-to-html";

@Component({
  selector: 'app-modal-expand-view',
  styleUrls: [ './modal-expand-view.component.css' ],
  templateUrl: './modal-expand-view.component.html',
})
export class ModalExpandViewComponent implements AfterViewInit, OnDestroy {
  app: any;
  thread: any;
  stream: any;
  query: any;
  message_id: any;
  timestamp: any;
  message: any = null;


  private converter = new Convert();
  
  messages: any[] = [];
  loader = false;

  querySub: Subscription;
  params: any = {};

  constructor(
    public modal: BsModalRef,
    protected dataService: DataService,
    protected ref: ChangeDetectorRef,
    protected router: Router,
    protected route: ActivatedRoute,
    protected modalTracker: ModalTrackerService
  ) {
  }

  ngAfterViewInit() {
    this.querySub = this.route.queryParamMap.subscribe(
      p => {
        if (p.get('exp') !== this.app.app_id) {
          this.modal.hide();
          return;
        }
      });
    this.load();
  }

  load() {
    this.loader = true;
    this.dataService.graylogFrameStream(this.stream, this.query, this.message_id, this.timestamp, 5, 10, 30)
      .subscribe((res) => {
        this.messages = res.messages;
        this.loader = false;
        const row = this.messages.find(msg => msg.message._id == this.message_id);
        this.message = row && row.message;
      });
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
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
