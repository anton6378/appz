// import {CookieModule} from 'ngx-cookie';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule, Title } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChartModule } from 'angular2-chartjs';
import { AngularHighlightJsModule } from 'angular2-highlight-js';
import 'intersection-observer';
import { InViewportModule } from 'ng-in-viewport';
import { Daterangepicker } from 'ng2-daterangepicker';
import { Ng5SliderModule } from 'ng5-slider';
import { BsDropdownModule } from "ngx-bootstrap/dropdown";
import { ModalModule } from "ngx-bootstrap/modal";
import { PaginationModule } from "ngx-bootstrap/pagination";
import { TooltipModule } from "ngx-bootstrap/tooltip";
import { TypeaheadModule } from "ngx-bootstrap/typeahead";
import { ClipboardModule } from 'ngx-clipboard';
import { CookieService } from 'ngx-cookie-service';
import { MomentModule } from 'ngx-moment';
import { BackendConfigService } from './services/config/backend-config.service';
import { JsonConfigService } from './services/config/json-config.service';
import { routing } from './app.routing';
import { AppComponent } from './components/app.component';
import { ApprovalComponent } from './components/approval/approval.component';
import { LoginComponent } from './components/login/login.component';
import { BaseViewComponent } from './components/main/base-view/base-view.component';
import { ChartViewComponent } from './components/main/chart-view/chart-view.component';
import { GridViewComponent } from './components/main/grid-view/grid-view.component';
import { MainComponent } from './components/main/main.component';
import { StreamViewComponent } from './components/main/stream-view/stream-view.component';
import { ModalAuthRequiredComponent } from './components/modal-auth-required/modal-auth-required.component';
import { ModalBuildStreamViewComponent } from './components/modal-build-stream-view/modal-build-stream-view.component';
import { ModalDataViewComponent } from './components/modal-data-view/modal-data-view.component';
import { ModalDeploymentStreamViewComponent } from './components/modal-deployment-stream-view/modal-deployment-stream-view.component';
import { ModalExpandViewComponent } from './components/modal-expand-view/modal-expand-view.component';
import { GlogAlertViewComponent } from './components/modal-glog-view/glog-alert-view/glog-alert-view.component';
import { GlogChartViewComponent } from './components/modal-glog-view/glog-chart-view/glog-chart-view.component';
import { GlogGridViewComponent } from './components/modal-glog-view/glog-grid-view/glog-grid-view.component';
import { ModalGlogViewComponent } from './components/modal-glog-view/modal-glog-view.component';
import { ModalLogViewComponent } from './components/modal-log-view/modal-log-view.component';
import { GraphComponent } from './components/modal-monitoring-view/graph/graph.component';
import { ModalMonitoringBasicViewComponent } from './components/modal-monitoring-view/modal-monitoring-basic-view.component';
import { ModalMonitoringViewComponent } from './components/modal-monitoring-view/modal-monitoring-view.component';
import { ModalVulnerabilitiesComponent } from './components/modal-vulnerabilities/modal-vulnerabilities.component';
import { ModalVulnerabilitiesSingleComponent } from './components/modal-vulnerabilities-single/modal-vulnerabilities-single.component';
import { RisksGridComponent } from './components/risks-grid/risks-grid.component';
import { RisksStreamComponent } from './components/risks-stream/risks-stream.component';
import { RisksComponent } from './components/risks/risks.component';
import { UserComponent } from './components/user/user.component';
import { NotePipe } from './pipes/note.pipe';
import { SecondsToTimePipe } from './pipes/seconds-to-time.pipe';
import { AuthGuard } from './services/auth/auth.guard';
import { AuthService } from './services/auth/auth.service';
import { HttpAuthInterceptor } from './services/auth/http.auth.interceptor';
import { DataService } from './services/data/data.service';
import { AlertsService } from "./services/alerts/alerts.service";
import { ModalTrackerService } from './services/modal-tracker/modal-tracker.service';
import { DownloadService } from "./services/download/download.service";
import hljs from 'highlight.js/lib/highlight';
import yaml from 'highlight.js/lib/languages/yaml';
import { SafePipe } from './pipes/safe.pipe';
import { StripTextPipe } from './pipes/strip-text.pipe';

hljs.registerLanguage('yaml', yaml);


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    MainComponent,
    UserComponent,
    ModalBuildStreamViewComponent,
    SecondsToTimePipe,
    ModalDeploymentStreamViewComponent,
    ModalMonitoringViewComponent,
    GraphComponent,
    ModalLogViewComponent,
    ModalDataViewComponent,
    ModalAuthRequiredComponent,
    BaseViewComponent,
    GridViewComponent,
    ChartViewComponent,
    StreamViewComponent,
    ApprovalComponent,
    ModalGlogViewComponent,
    NotePipe,
    GlogGridViewComponent,
    GlogChartViewComponent,
    ModalMonitoringBasicViewComponent,
    GlogAlertViewComponent,
    RisksComponent,
    RisksGridComponent,
    RisksStreamComponent,
    ModalVulnerabilitiesComponent,
    ModalVulnerabilitiesSingleComponent,
    ModalExpandViewComponent,
    SafePipe,
    StripTextPipe,
  ],
  imports: [
    BrowserModule,
    MomentModule,
    HttpClientModule,
    FormsModule,
    routing,
    ModalModule.forRoot(),
    TypeaheadModule.forRoot(),
    BsDropdownModule.forRoot(),
    TooltipModule.forRoot(),
    PaginationModule.forRoot(),
    InViewportModule,
    ChartModule,
    Daterangepicker,
    AngularHighlightJsModule,
    Ng5SliderModule,
    ClipboardModule,
    BrowserAnimationsModule,
  ],
  providers: [
    CookieService,
    Title,
    AuthGuard,
    AuthService,
    ModalTrackerService,
    JsonConfigService,
    {
      provide: APP_INITIALIZER,
      useFactory: initConfig,
      deps: [ JsonConfigService ],
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: HttpAuthInterceptor,
      multi: true
    },
    BackendConfigService,
    DataService,
    AlertsService,
    SecondsToTimePipe,
    DownloadService
  ],
  bootstrap: [ AppComponent ],
  entryComponents: [
    ModalBuildStreamViewComponent,
    ModalDeploymentStreamViewComponent,
    ModalMonitoringViewComponent,
    ModalMonitoringBasicViewComponent,
    ModalLogViewComponent,
    ModalGlogViewComponent,
    ModalDataViewComponent,
    ModalAuthRequiredComponent,
    ModalVulnerabilitiesComponent,
    ModalVulnerabilitiesSingleComponent,
    ModalExpandViewComponent
  ]
})
export class AppModule {
}

export function initConfig(jsonConfigService: JsonConfigService) {
  return () => jsonConfigService.load();
}
