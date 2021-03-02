import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import * as moment from 'moment';
import 'moment/min/locales';
import { JsonConfigService } from '../services/config/json-config.service';


@Component({
  selector: 'body',
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit {

  constructor(
    private title: Title,
    private config: JsonConfigService
  ) {
  }

  ngOnInit(): void {
    this.title.setTitle(this.config.get('title'));
    moment.locale(navigator.language);
  }
}
