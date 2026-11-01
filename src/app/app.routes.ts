import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.component').then((m) => m.DashboardComponent),
    title: 'ImobAI | Início',
  },
  {
    path: 'predict',
    loadComponent: () =>
      import('./pages/predict/predict.component').then((m) => m.PredictComponent),
    title: 'ImobAI | Simulador de Preços',
  },
  {
    path: 'trends',
    loadComponent: () => import('./pages/trends/trends.component').then((m) => m.TrendsComponent),
    title: 'ImobAI | Tendências de Mercado',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
