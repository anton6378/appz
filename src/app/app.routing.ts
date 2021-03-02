import {RouterModule, Routes} from "@angular/router";
import {AuthGuard} from "./services/auth/auth.guard";
import {LoginComponent} from "./components/login/login.component";
import {MainComponent} from "./components/main/main.component";
import {UserComponent} from "./components/user/user.component";
import {ApprovalComponent} from './components/approval/approval.component';
import {RisksComponent} from './components/risks/risks.component';
import {RisksGridComponent} from './components/risks-grid/risks-grid.component';
import {RisksStreamComponent} from './components/risks-stream/risks-stream.component';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    component: UserComponent,
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: MainComponent,

      },

      {
        path: 'approve/:app_id',
        pathMatch: 'full',
        component: ApprovalComponent
      },
      {
        path: 'alerts',
        pathMatch: 'full',
        component: RisksComponent
      },
      {
        path: 'alerts/grid',
        pathMatch: 'full',
        component: RisksGridComponent
      },
      {
        path: 'alerts/stream',
        pathMatch: 'full',
        component: RisksStreamComponent
      },
    ]
  },
  {
    path: 'login',
    component: LoginComponent
  }
];

export const routing = RouterModule.forRoot(routes);