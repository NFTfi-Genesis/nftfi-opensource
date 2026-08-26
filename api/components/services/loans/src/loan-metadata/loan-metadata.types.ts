export interface LoanMetadataAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

export interface LoanMetadataResponse {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes?: LoanMetadataAttribute[];
}
