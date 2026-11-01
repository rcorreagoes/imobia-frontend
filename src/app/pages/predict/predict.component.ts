import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  LocationsResponse,
  PredictPayload,
  PredictResponse,
  PropertyType,
} from '../../Interfaces/predict.interface';
import { MlService } from '../../services/ml.service';

@Component({
  selector: 'app-predict',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './predict.component.html',
  styleUrls: ['./predict.component.css'],
})
export class PredictComponent implements OnInit {
  locationsData: any[] = [];
  availableMunicipalities: string[] = [];
  energyEfficiencyOptions = ['A+', 'A', 'B', 'B-', 'C', 'D', 'E', 'F'];

  predictForm!: FormGroup;

  predictionResult: { estimated_price_eur: number; estimated_price_sqm: number | null } | null =
    null;
  errorMessage: string | null = null;

  // Listas de exemplo (pode carregar dinamicamente da API se preferir)
  districts: string[] = [];
  propertyTypes: string[] = [];

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly fb: FormBuilder,
    private readonly mlService: MlService,
  ) {}

  ngOnInit(): void {
    this.predictForm = this.fb.group({
      District: ['', Validators.required],
      City: ['', Validators.required],
      Type: ['Apartment', Validators.required],
      TotalArea: [null, [Validators.required, Validators.min(0)]],
      LivingArea: [null, [Validators.required, Validators.min(0)]],
      NumberOfBedrooms: [null, [Validators.min(0)]],
      NumberOfBathrooms: [null, [Validators.min(0)]],
      ConstructionYear: [null, [Validators.min(0), Validators.max(2026)]],
      Garage: ['False', Validators.required],
      Elevator: ['False', Validators.required],
      EnergyCertificate: ['A+', Validators.required],
    });

    this.loadLocations();
    this.loadTypes();
  }

  calculate(): void {
    if (this.predictForm.invalid) {
      this.predictForm.markAllAsTouched();
      return;
    }

    const payload: PredictPayload = this.predictForm.getRawValue();

    console.log('Payload enviado:', payload);

    this.errorMessage = null;

    this.mlService.predict(payload).subscribe({
      next: (response: PredictResponse) => {
        console.log('Resposta da API:', response);

        const estimatedPrice = response.estimated_price_eur ?? response.predicted_price;

        console.log('Preço estimado:', estimatedPrice);

        if (typeof estimatedPrice !== 'number' || Number.isNaN(estimatedPrice)) {
          this.errorMessage = 'Resposta inválida da API de predição.';
          this.cdr.markForCheck();
          return;
        }

        const area = Number(this.predictForm.get('TotalArea')?.value);

        const estimatedPriceSqm =
          response.estimated_price_sqm ??
          response.price_per_sqm ??
          (area > 0 ? estimatedPrice / area : null);

        this.predictionResult = {
          estimated_price_eur: estimatedPrice,
          estimated_price_sqm: estimatedPriceSqm,
        };

        console.log('PredictionResult atualizado:', this.predictionResult);

        this.cdr.markForCheck();
      },
      error: (err: unknown) => {
        console.error('Erro na predição:', err);

        this.errorMessage =
          err instanceof Error ? err.message : 'Erro ao comunicar com o servidor de predição.';

        this.cdr.markForCheck();
      },
    });
  }

  loadLocations(): void {
    this.mlService.getLocations().subscribe({
      next: (response: LocationsResponse) => {
        this.locationsData = response.locations;
        this.districts = this.locationsData
          .map((item) => item.district)
          .sort((a, b) => a.localeCompare(b, 'pt'));

        if (this.districts.length > 0) {
          const firstDistrict = this.districts[0];
          this.predictForm.patchValue({ District: firstDistrict });
          this.onDistrictChange();
        }
      },
      error: (err) => console.error('Erro ao carregar localizações:', err),
    });
  }

  loadTypes(): void {
    this.mlService.getPropertyTypes().subscribe({
      next: (response: PropertyType) => {
        this.propertyTypes = response.property_types;
      },
      error: (err) => console.error('Erro ao carregar tipos de propriedade:', err),
    });
  }

  onDistrictChange(): void {
    const district = this.predictForm.get('District')?.value;

    const found = this.locationsData.find((item) => item.district === district);

    this.availableMunicipalities = found
      ? [...found.municipalities].sort((a, b) => a.localeCompare(b, 'pt-PT'))
      : [];

    this.predictForm.patchValue({ City: '' });
  }
}
