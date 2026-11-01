import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  LocationsResponse,
  PredictPayload,
  PredictResponse,
  PropertyType,
} from '../Interfaces/predict.interface';

@Injectable({
  providedIn: 'root',
})
export class MlService {
  private apiUrl = 'http://localhost:3000/ml';

  constructor(private http: HttpClient) {}

  getDistrictTrends(
    district: string,
    municipality?: string,
    propertyType?: string,
  ): Observable<any> {
    let params = new HttpParams();
    if (municipality) params = params.set('municipality', municipality);
    if (propertyType) params = params.set('property_type', propertyType);

    return this.http.get<any>(`${this.apiUrl}/trends/${district}`, { params });
  }

  predict(payload: PredictPayload): Observable<PredictResponse> {
    return this.http.post<PredictResponse>(`${this.apiUrl}/predict`, payload);
  }

  getLocations(): Observable<LocationsResponse> {
    return this.http.get<LocationsResponse>(`${this.apiUrl}/locations`);
  }

  getPropertyTypes(): Observable<PropertyType> {
    return this.http.get<PropertyType>(`${this.apiUrl}/property-types`);
  }
}
