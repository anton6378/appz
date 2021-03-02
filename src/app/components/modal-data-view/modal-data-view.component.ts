import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BsModalRef } from 'ngx-bootstrap/modal';
import * as R from 'remedial/index.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-modal-data-view',
  templateUrl: './modal-data-view.component.html',
})
export class ModalDataViewComponent implements OnInit, OnDestroy {

  mid = 'dv';
  id: string;

  data: any;
  title: string;
  header: any;
  size: number;
  lines: number;

  querySub: Subscription;

  constructor(
    public modal: BsModalRef,
    public route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    this.size = this.data.length;
    const code = this.stringify(JSON.parse(this.data));
    const lines = code.replace(/\n*$/, '').split(/\n/).map(l => {
      if (this.mid === 'glvdata') {
        l = l.replace(/^\s\sgl2_/, '  __');
      }
      let value;
      if ( l.match(/(((https?\:\/\/)|(www\.))(\S+))/) ) {
        value = l.replace(/"/g, '').replace(/,/g, '').replace(
          /(((https?\:\/\/)|(www\.))(\S+))/gi,
          (match, space, url) => {
            var hyperlink = url;
            if (!hyperlink.match('^https?:\/\/')) {
              hyperlink = 'http://' + hyperlink;
            }
            return '<a href="' + match + '" target="_blank">' + match + '</a>';
          }
        )
        return `<code class="hljs yaml">` + value + `</code>`;
      }
      else {
        return `<code class="hljs yaml">` + l + `</code>`;
      }
    });
    this.lines = lines.length;
    this.data = `<pre>` + lines.join('') + `</pre>`;

    if (this.id) {
      this.querySub = this.route.queryParamMap.subscribe(p => {
        if (p.get(this.mid) !== this.id) {
          this.modal.hide();
          return;
        }
      });
    }
  }

  ngOnDestroy() {
    this.querySub && this.querySub.unsubscribe();
  }

  stringify(data) {

    const typeOf = R.typeOf;
    let handlers, indentLevel = '';

    handlers = {
      'undefined': function () {
        return 'null';
      },
      'null': function () {
        return 'null';
      },
      'number': function (x) {
        return x;
      },
      'boolean': function (x) {
        return x ? 'true' : 'false';
      },
      'string': function (x) {
        try {
          const obj = JSON.parse(x);
          let output = '';
          const handler = handlers[typeOf(obj)];
          output += handler(obj);
          return output;
        } catch (e) {
        }

        return JSON.stringify(x);
      },
      'array': function (x) {
        let output = '';

        if (0 === x.length) {
          output += '[]';
          return output;
        }

        indentLevel = indentLevel.replace(/$/, '  ');
        x.forEach(function (y) {
          const handler = handlers[typeOf(y)];

          if (!handler) {
            throw new Error('what the crap: ' + typeOf(y));
          }
          output += '\n' + indentLevel + '- ' + handler(y);
        });
        indentLevel = indentLevel.replace(/  /, '');

        return output;
      },
      'object': function (x) {
        let output = '';

        if (0 === Object.keys(x).length) {
          output += '{}';
          return output;
        }

        indentLevel = indentLevel.replace(/$/, '  ');
        Object.keys(x).sort().forEach(function (k) {
          const val = x[k], handler = handlers[typeOf(val)];

          if ('undefined' === typeof val) {
            return;
          }

          if (!handler) {
            throw new Error('what the crap: ' + typeOf(val));
          }

          output += '\n' + indentLevel + k + ': ' + handler(val);
        });
        indentLevel = indentLevel.replace(/  /, '');

        return output;
      },
      'function': function () {
        return '[object Function]';
      }
    };

    return handlers[typeOf(data)](data).substr(1) + '\n';
  }

}
