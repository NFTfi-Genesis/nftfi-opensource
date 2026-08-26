declare module 'api-spec-converter' {
  type Format = 'swagger_1' | 'swagger_2' | 'openapi_3';

  interface ConverterOptions {
    from: Format;
    to: Format;
    source: object | string;
  }

  interface Converted {
    stringify(): string;
    readSpec(): Record<string, unknown>;
    spec: Record<string, unknown>;
    format: Format;
  }

  class Converter {
    static convert(options: ConverterOptions): Promise<Converted>;
  }

  export default Converter;
}
