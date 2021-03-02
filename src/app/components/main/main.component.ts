import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { BehaviorSubject, from, Observable, of, Subscription } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { DataService } from '../../services/data/data.service';
import { ModalTrackerService } from '../../services/modal-tracker/modal-tracker.service';
import { BaseViewComponent } from './base-view/base-view.component';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html'
})
export class MainComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('searchBox', { static: true }) searchBox: ElementRef;

  @ViewChild('tabView', { static: false }) tabView: BaseViewComponent;

  private params: any = {};

  private searchTerms = new BehaviorSubject<string>(null);
  private searchQuery = '';
  private searchHistory: Observable<string[]>;

  private querySub: Subscription;
  private historySub: Subscription;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalTracker: ModalTrackerService,
    private dataService: DataService
  ) {
    this.searchTerms
      .pipe(
        debounceTime(600),
        distinctUntilChanged(),
        switchMap((term: string) => from([ term ])),
      )
      .subscribe((term: string) => {
        if (term == null) {
          return;
        }
        this.modalTracker.navigate({ query: term });
      });

    this.historySub = this.dataService.historyGetLast('app_history')
      .pipe(
        tap(historyItem => {
            const value = historyItem.value;
            this.modalTracker.navigate({ query: value });
          }
        ),
        tap(() => this.initQueryTracking()),
        catchError(() => of(this.initQueryTracking()))
      )
      .subscribe();

    this.searchHistory = new Observable((observer: any) => {
      observer.next(this.searchQuery);
    }).pipe(
      mergeMap((token: string) => this.getSearchHistory(token))
    );
  }

  ngOnInit() {
    this.searchBox.nativeElement.value = this.searchQuery;
  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.historySub && this.historySub.unsubscribe();
    this.querySub && this.querySub.unsubscribe();
    this.searchTerms.complete();
  }

  search(term: string): void {
    this.dataService.historySave('app_history', term).subscribe();
    this.searchTerms.next(term);
  }

  setDays(num: number) {
    this.modalTracker.navigate({ days: num });
  }

  switchTab(tab) {
    this.modalTracker.navigate({ tab: tab === 'grid' ? null : tab });
  }

  refreshTab() {
    this.tabView.reload.next();
  }

  private initQueryTracking() {
    this.querySub = this.route.queryParamMap
      .subscribe(
        (p: ParamMap) => {
          this.modalTracker.execIfNewParam(this.params, 'tab', p.get('tab') || 'grid');
          this.modalTracker.execIfNewParam(this.params, 'days', p.get('days') || '1');
          this.modalTracker.execIfNewParam(this.params, 'query', p.get('query') || '', (query) => {
            this.searchQuery = query;
          });
        }
      );
  }

  private getSearchHistory(token) {
    return this.dataService.historyGet('app_history', token).pipe(
      map(result => result.results),
      map(result => result == null ? [] : result),
      map(result => result.map(r => r.value)),
      map(result => result.slice(0, result.length < 10 ? result.length : 10))
    );
  }

}
