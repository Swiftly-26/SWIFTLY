import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestListComponent } from './requests/request-list.component';
import { RequestDetailComponent } from './requests/request-detail.component';
import { AgentsComponent } from './agents/agents.component';

export const routes: Routes = [
  { path: '',          redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'requests',  component: RequestListComponent },
  { path: 'requests/:id', component: RequestDetailComponent },
  { path: 'agents',    component: AgentsComponent },
  { path: '**',        redirectTo: 'dashboard' }
];