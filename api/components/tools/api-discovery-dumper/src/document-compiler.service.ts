import { uniq, uniqBy } from 'lodash';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OpenAPIObject } from '@nestjs/swagger';
import { ParameterObject, PathItemObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import Converter from 'api-spec-converter';
import { CliArgsDto, SpecVersion } from './cli-args.dto';

@Injectable()
export class DocumentCompilerService {
  private readonly logger = new Logger(DocumentCompilerService.name);

  async compile(document: OpenAPIObject, args: CliArgsDto): Promise<string> {
    const stringify = (obj: object): string => JSON.stringify(obj, null, '\t');

    if (args.includeOptions === true) {
      document.paths = this.enhancePathsWithOptions(document);
    }

    document.paths = this.ennhacePaths(document, {
      'x-google-backend': {
        deadline: 100
      }
    });

    if (args.specVersion === SpecVersion.V2) {
      const converted = await Converter.convert({
        from: 'openapi_3',
        to: 'swagger_2',
        source: document
      });

      return stringify(converted.spec);
    }

    return stringify(document);
  }

  enhancePathsWithOptions(document: OpenAPIObject): OpenAPIObject['paths'] {
    let addedEntries = 0;
    let totalPaths = 0;
    const result: OpenAPIObject['paths'] = {};
    for (const [path, pathItem] of Object.entries(document.paths)) {
      totalPaths++;
      const hasOptions = Object.keys(pathItem).includes('options');
      if (!hasOptions) {
        addedEntries++;
        const params = this.collectParams(pathItem);
        const operationId = this.stringifyOperationId(pathItem) + this.stringifyPathParams(params) + '_handleOptions';
        result[path] = {
          ...pathItem,
          options: {
            operationId,
            parameters: params,
            responses: {
              [HttpStatus.NO_CONTENT]: {
                description: '204 response'
              }
            },
            summary: 'Obtain preflight options'
          }
        };
        continue;
      }

      result[path] = pathItem;
    }
    this.logger.log(`Added ${addedEntries} OPTIONS entries to ${totalPaths} paths`);

    return result;
  }

  private ennhacePaths(document: OpenAPIObject, section: object): OpenAPIObject['paths'] {
    const result: OpenAPIObject['paths'] = {};
    for (const [path, pathItem] of Object.entries(document.paths)) {
      result[path] = {
        ...Object.entries(pathItem).reduce((acc, [method, operation]) => {
          acc[method] = {
            ...operation,
            ...section
          };
          return acc;
        }, {} as PathItemObject)
      };
    }
    return result;
  }

  private stringifyOperationId(pathItem: PathItemObject): string {
    const operationIds = uniq(Object.values(pathItem).map(operation => operation.operationId));
    return operationIds.join('_');
  }

  private stringifyPathParams(params: ParameterObject[]): string {
    const names = params.filter(param => param.in === 'path').map(param => param.name);
    return names.length ? '_' + Buffer.from(names.join('_')).toString('base64').replace('==', '').toLowerCase() : '';
  }

  private collectParams(pathItem: PathItemObject): ParameterObject[] {
    const params = [].concat(...Object.values(pathItem).map(operation => operation.parameters));
    return uniqBy(params, param => `${param.in}_${param.name}`);
  }
}
