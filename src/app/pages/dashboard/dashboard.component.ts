import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent {
  // Dados de resumo rápido para os cartões
  stats = [
    {
      title: 'Distritos Monitorizados',
      value: '18 + Ilhas',
      change: 'Cobertura Nacional',
      icon: '📍',
    },
    {
      title: 'Modelo Preditivo',
      value: 'VotingRegressor',
      change: 'Random Forest + XGBoost',
      icon: '🤖',
    },
    { title: 'Base Histórica', value: '2018 - 2026', change: 'Evolução de m²', icon: '📈' },
    {
      title: 'Precisão Média',
      value: 'Alta Assertividade',
      change: 'Otimizado por Município/Tipo',
      icon: '🎯',
    },
  ];
}
