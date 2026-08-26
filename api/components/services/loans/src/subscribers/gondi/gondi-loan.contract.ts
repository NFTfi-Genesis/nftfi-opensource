import { Contract } from '@nftfi.api/modules/ethers-observer';
import { Cache } from '@nftfi.api/core/decorators';
import { Functions, GetProtocolFeeResult } from './loan-v2/gondi-loan-v2.types';

export class GondiLoanContract extends Contract {
  @Cache((instance: Contract) => `contract:${instance.address}:getProtocolFee`, 3600000)
  async getProtocolFee(): Promise<GetProtocolFeeResult> {
    const schema = this.interface.getFunction(Functions.GetProtocolFee);
    const args = await this.functions[Functions.GetProtocolFee]();
    const result = Contract.parseParams<{ null: GetProtocolFeeResult }>(args, schema.outputs);
    return result.null;
  }
}
