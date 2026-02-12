// frontend/src/app/app.routes.ts
import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RequestListComponent } from './requests/request-list.component';
import { RequestDetailComponent } from './requests/request-detail.component';
import { AgentsComponent } from './agents/agents.component'; // Add this import

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'requests', component: RequestListComponent },
  { path: 'requests/:id', component: RequestDetailComponent },
  { path: 'agents', component: AgentsComponent }, // Add this route
  { path: '**', redirectTo: '' }
];