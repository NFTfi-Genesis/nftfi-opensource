import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectEthersProvider } from 'nestjs-ethers';
import { StaticJsonRpcProvider } from '@ethersproject/providers';
import { Contract } from '@nftfi.api/modules/ethers-observer';

import { Config } from '../../config';
import ABI from './nftfi-loan-coordinator.abi.json';

interface CoordinatorLoanData {
  loanContract: string;
  smartNftId: string;
  status: number;
}

@Injectable()
export class NftfiLoanCoordinator implements OnModuleInit {
  private readonly logger = new Logger(NftfiLoanCoordinator.name);
  private readonly loanContractToCoordinator = new Map<string, Contract>();

  constructor(
    private readonly configService: ConfigService,
    @InjectEthersProvider() private readonly provider: StaticJsonRpcProvider
  ) {}

  onModuleInit(): void {
    this.buildCoordinatorMap();
  }

  async getSmartNftId(loanContractAddress: string, loanId: string): Promise<string | null> {
    const coordinator = this.loanContractToCoordinator.get(loanContractAddress.toLowerCase());
    if (!coordinator) {
      this.logger.warn(`No coordinator mapped for loan contract ${loanContractAddress} (pre-coordinator loan)`);
      return null;
    }

    const result = await coordinator.call<{ null: CoordinatorLoanData }>('getLoanData', loanId);
    const smartNftId = result.null.smartNftId;

    if (!smartNftId || smartNftId === '0') {
      this.logger.warn(`Coordinator returned empty smartNftId for loanId=${loanId} on ${loanContractAddress}`);
      return null;
    }

    this.logger.log(`Resolved smartNftId=${smartNftId} for loanId=${loanId} on ${loanContractAddress}`);
    return smartNftId;
  }

  private buildCoordinatorMap(): void {
    const nftfiContracts = this.configService.get<Config['ethereum']>('ethereum').contracts.nftfi;

    const coordinatorV2 = this.createCoordinator(nftfiContracts.coordinatorV2?.address, 'coordinatorV2');
    const coordinatorV23 = this.createCoordinator(nftfiContracts.coordinatorV23?.address, 'coordinatorV23');
    const coordinatorV3 = this.createCoordinator(nftfiContracts.coordinatorV3?.address, 'coordinatorV3');

    this.mapLoan(nftfiContracts, 'loanV2Fixed', coordinatorV2);
    this.mapLoan(nftfiContracts, 'loanV2FixedCollection', coordinatorV2);
    this.mapLoan(nftfiContracts, 'loanV21Fixed', coordinatorV2);
    this.mapLoan(nftfiContracts, 'loanV23Fixed', coordinatorV23);
    this.mapLoan(nftfiContracts, 'loanV23FixedCollection', coordinatorV23);
    this.mapLoan(nftfiContracts, 'loanV3Asset', coordinatorV3);
    this.mapLoan(nftfiContracts, 'loanV3Collection', coordinatorV3);
  }

  private createCoordinator(address: string | undefined, name: string): Contract {
    if (!address) {
      throw new Error(`Missing coordinator address for ${name}. Service cannot start without full configuration.`);
    }
    return new Contract(address.toLowerCase(), ABI, this.provider);
  }

  private mapLoan(
    nftfiContracts: Config['ethereum']['contracts']['nftfi'],
    configKey: keyof typeof nftfiContracts,
    coordinator: Contract
  ): void {
    const entry = nftfiContracts[configKey];
    if (entry?.address) {
      this.loanContractToCoordinator.set(entry.address.toLowerCase(), coordinator);
    }
  }
}
