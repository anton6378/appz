import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { JsonConfigService } from '../../services/config/json-config.service';
import { BackendConfigService } from '../../services/config/backend-config.service';
import { AuthService } from '../../services/auth/auth.service';
import { DataService } from '../../services/data/data.service';

@Component({
    selector: 'app-user',
    templateUrl: './user.component.html'
})
export class UserComponent implements OnInit {

    username = null;
    footer = '';
    showAlertsColumn = true;

    constructor(
        private config: JsonConfigService,
        private backendConfigService: BackendConfigService,
        private dataService: DataService,
        private authService: AuthService,
        private router: Router
    ) {
        backendConfigService.get('show_alerts').subscribe(value => {
            if (value == null) {
              return;
            }
            this.showAlertsColumn = JSON.parse(String(value).toLowerCase());
          });
    }

    ngOnInit() {
        const footer = this.config.get('footer');
        this.authService.authentication$.subscribe(a => this.username = a.user.username);

        this.dataService.version.subscribe(v => {
            this.footer =
                footer.replace(/##DASHBOARDVERSION##/g, v.version).replace(/##ENGINEVERSION##/g, v.engine_version);
        });
    }

    public isLinkActive(url) {
        const charPos = this.router.url.indexOf('?');
        const cleanUrl = charPos !== -1 ? this.router.url.slice(0, charPos) : this.router.url;
        return (cleanUrl === url);
    }
}
