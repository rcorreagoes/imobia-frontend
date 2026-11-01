import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, ChartData, ChartDataset, registerables } from 'chart.js';
import { MlService } from '../../services/ml.service';

Chart.register(...registerables);

interface LocationItem {
  district: string;
  municipalities: string[];
}

interface LocationsResponse {
  locations: LocationItem[];
}

interface PropertyTypeResponse {
  property_types: string[];
}

interface TrendRecord {
  year: number;
  property_type?: string;
  median_price_sqm: number;
}

interface TrendResponse {
  historical_trend?: TrendRecord[];
  historical_trend_by_type?: TrendRecord[];
}

@Component({
  standalone: true,
  selector: 'app-trends',
  imports: [CommonModule, FormsModule],
  templateUrl: './trends.component.html',
  styleUrls: ['./trends.component.scss'],
})
export class TrendsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('trendCanvas')
  trendCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart<'line', (number | null)[], string> | null = null;

  private isViewInitialized = false;

  // Dados das localizações
  locationsData: LocationItem[] = [];
  districts: string[] = [];
  availableMunicipalities: string[] = [];
  propertyTypes: string[] = [];

  // Filtros selecionados
  selectedDistrict = '';
  selectedMunicipality = '';
  selectedPropertyType = '';

  // Estado da tela
  isLoading = false;
  errorMessage: string | null = null;

  // Dados do Chart.js
  chartData: ChartData<'line', (number | null)[], string> = {
    labels: [],
    datasets: [],
  };

  private readonly colors: string[] = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#f46cb0',
    '#125301',
    '#6b7280',
  ];

  constructor(
    @Inject(MlService)
    private readonly mlService: MlService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadLocations();
    this.loadTypes();
  }

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    this.renderChart();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
    this.chart = null;
  }

  /**
   * Carrega os distritos e municípios disponíveis.
   */
  loadLocations(): void {
    this.mlService.getLocations().subscribe({
      next: (response: LocationsResponse) => {
        this.locationsData = response.locations;

        this.districts = [...new Set(this.locationsData.map((item) => item.district))].sort(
          (a, b) => a.localeCompare(b, 'pt-PT'),
        );

        if (this.districts.length > 0) {
          this.selectedDistrict = this.districts[0];

          this.onDistrictChange();

          // Carrega inicialmente as tendências do primeiro distrito.
          this.fetchTrends();
        }

        this.cdr.markForCheck();
      },

      error: (error: unknown) => {
        console.error('Erro ao carregar localizações:', error);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Carrega os tipos de propriedade disponíveis.
   */
  loadTypes(): void {
    this.mlService.getPropertyTypes().subscribe({
      next: (response: PropertyTypeResponse) => {
        this.propertyTypes = response.property_types;
        this.cdr.markForCheck();
      },

      error: (error: unknown) => {
        console.error('Erro ao carregar tipos de propriedade:', error);
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Atualiza os municípios quando o distrito é alterado.
   */
  onDistrictChange(): void {
    const found = this.locationsData.find((item) => item.district === this.selectedDistrict);

    this.availableMunicipalities = found
      ? [...found.municipalities].sort((a, b) => a.localeCompare(b, 'pt-PT'))
      : [];

    this.selectedMunicipality = '';
  }

  /**
   * Executado ao clicar no botão Aplicar Filtros.
   */
  onFilterChange(): void {
    this.fetchTrends();
  }

  /**
   * Consulta a API de tendências.
   */
  fetchTrends(): void {
    if (!this.selectedDistrict) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    this.cdr.markForCheck();

    const municipalityParam = this.selectedMunicipality || undefined;

    const typeParam = this.selectedPropertyType || undefined;

    this.mlService
      .getDistrictTrends(this.selectedDistrict, municipalityParam, typeParam)
      .subscribe({
        next: (response: TrendResponse) => {
          const rawData = response.historical_trend_by_type?.length
            ? response.historical_trend_by_type
            : (response.historical_trend ?? []);

          this.updateChart(rawData, typeParam || 'Geral');

          this.isLoading = false;
          this.cdr.markForCheck();
        },

        error: (error: unknown) => {
          console.error('Erro ao buscar tendências:', error);

          this.errorMessage = 'Erro ao carregar dados de tendências.';

          this.clearChart();

          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * Transforma os dados da API no formato esperado pelo Chart.js.
   */
  private updateChart(rawData: TrendRecord[], singleSeriesName: string): void {
    if (!rawData.length) {
      this.clearChart();
      return;
    }

    // Obtém todos os anos sem repetição e em ordem crescente.
    const years = [...new Set(rawData.map((item) => Number(item.year)))].sort((a, b) => a - b);

    // Agrupa os valores por tipo de propriedade.
    const groupedData = new Map<string, Map<number, number>>();

    rawData.forEach((item) => {
      const type = item.property_type || singleSeriesName;

      const year = Number(item.year);
      const value = Number(item.median_price_sqm);

      if (!Number.isFinite(year) || !Number.isFinite(value)) {
        return;
      }

      if (!groupedData.has(type)) {
        groupedData.set(type, new Map<number, number>());
      }

      groupedData.get(type)!.set(year, value);
    });

    // Cria um dataset para cada tipo de propriedade.
    const datasets: ChartDataset<'line', (number | null)[]>[] = Array.from(
      groupedData.entries(),
    ).map(([type, valuesByYear], index) => {
      const color = this.colors[index % this.colors.length];

      return {
        label: type,

        data: years.map((year) => valuesByYear.get(year) ?? null),

        borderColor: color,
        backgroundColor: color,

        // Pontos sempre visíveis.
        pointRadius: 5,
        pointHoverRadius: 8,
        pointBackgroundColor: color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,

        // Interpolação do exemplo oficial.
        cubicInterpolationMode: 'monotone',
        tension: 0.4,

        fill: false,

        // Não conecta pontos separados por anos sem dados.
        spanGaps: false,
      };
    });

    this.chartData = {
      labels: years.map((year) => year.toString()),
      datasets,
    };

    console.log('Dados enviados ao Chart.js:', this.chartData);

    this.renderChart();
  }

  /**
   * Cria ou atualiza o gráfico.
   */
  private renderChart(): void {
    if (!this.isViewInitialized || !this.trendCanvas) {
      return;
    }

    // Se o gráfico já existe, atualiza os dados.
    if (this.chart) {
      this.chart.data.labels = this.chartData.labels;
      this.chart.data.datasets = this.chartData.datasets;

      this.chart.update('none');
      return;
    }

    // Cria o gráfico pela primeira vez.
    this.chart = new Chart<'line', (number | null)[], string>(this.trendCanvas.nativeElement, {
      type: 'line',
      data: this.chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,

        interaction: {
          intersect: false,
          mode: 'index',
        },

        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },

          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;

                if (value === null) {
                  return `${context.dataset.label}: Sem dados`;
                }

                const formattedValue = new Intl.NumberFormat('pt-PT', {
                  style: 'currency',
                  currency: 'EUR',
                  minimumFractionDigits: 2,
                }).format(value);

                return `${context.dataset.label}: ${formattedValue}/m²`;
              },
            },
          },
        },

        scales: {
          x: {
            title: {
              display: true,
              text: 'Ano',
            },
          },

          y: {
            beginAtZero: true,

            title: {
              display: true,
              text: 'Mediana Preço por m² (€/m²)',
            },

            ticks: {
              callback: (value) => `${Number(value).toLocaleString('pt-PT')} €`,
            },
          },
        },
      },
    });
  }

  /**
   * Limpa os dados do gráfico.
   */
  private clearChart(): void {
    this.chartData = {
      labels: [],
      datasets: [],
    };

    if (this.chart) {
      this.chart.data.labels = [];
      this.chart.data.datasets = [];
      this.chart.update('none');
    }
  }
}
