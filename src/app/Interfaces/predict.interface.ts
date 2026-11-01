export interface PredictPayload {
  District: string;
  City: string;
  Type: string;
  TotalArea: number;
  LivingArea: number;
  NumberOfBedrooms: number;
  NumberOfBathrooms: number;
  Garage: string;
  Elevator: string;
  ConstructionYear: number;
  EnergyCertificate: string;
}

export interface PredictResponse {
  estimated_price_eur?: number;
  estimated_price_sqm?: number;
  predicted_price?: number;
  price_per_sqm?: number;
  status: string;
}

export interface PropertyType {
  total_types: number;
  property_types: string[];
}

export interface MunicipalityLocation {
  district: string;
  municipalities: string[];
}

export interface LocationsResponse {
  total_districts: number;
  locations: MunicipalityLocation[];
}
