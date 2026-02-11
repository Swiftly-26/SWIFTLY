import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestListComponent } from './requests/request-list.component';
import { RequestDetailComponent } from './requests/request-detail.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'requests', component: RequestListComponent },
  { path: 'requests/:id', component: RequestDetailComponent }
];
