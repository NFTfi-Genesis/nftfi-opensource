import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { LoanCoordinator } from '../typechain';
import { deployContracts, NFTfiContracts } from './utils/deploy-contracts';
import { ADDRESS_ZERO, restoreSnapshot, takeSnapshot, toBytes32 } from './utils/utils';

describe('LoanCoordinator', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let smartContracts: NFTfiContracts; // Smart Contracts
  let deployer: SignerWithAddress;
  let owner: SignerWithAddress;
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;

  const vegetaOfferType = 'VEGETA';
  const kakarotoOfferType = 'KAKAROTO';

  const LOAN_STATUS_NEW = 1;
  const LOAN_STATUS_REPAYED = 2;
  const LOAN_STATUS_LIQUIDATED = 3;

  let snapshot: number;

  before(async () => {
    accounts = await ethers.getSigners();
    [deployer, owner, kakaroto, vegeta, karpincho, lender, borrower] = accounts;
    smartContracts = await deployContracts(owner);
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('#constructor', () => {
    it('should set hub properly', async () => {
      const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
      const contractKeyUtils = await ContractKeyUtils.connect(deployer).deploy();
      await contractKeyUtils.waitForDeployment();

      const LoanCoordinator = await ethers.getContractFactory('LoanCoordinator', {
        libraries: {
          ContractKeyUtils: await contractKeyUtils.getAddress(),
        },
      });
      const loanCoordinator = (await LoanCoordinator.connect(deployer).deploy(
        kakaroto.address,
        deployer.address,
        [],
        [],
      )) as LoanCoordinator;
      await loanCoordinator.waitForDeployment();

      expect(await loanCoordinator.hub()).to.eq(kakaroto.address);
    });
  });

  describe('#initialize', async () => {
    let coordinator: LoanCoordinator;

    before(async () => {
      const ContractKeyUtils = await ethers.getContractFactory('ContractKeyUtils');
      const contractKeyUtils = await ContractKeyUtils.connect(deployer).deploy();
      await contractKeyUtils.waitForDeployment();

      const LoanCoordinator = await ethers.getContractFactory('LoanCoordinator', {
        libraries: {
          ContractKeyUtils: await contractKeyUtils.getAddress(),
        },
      });
      coordinator = (await LoanCoordinator.connect(deployer).deploy(
        kakaroto.address,
        deployer.address,
        [],
        [],
      )) as LoanCoordinator;
      await coordinator.waitForDeployment();
    });

    it('non deployer should no be able to call initialize', async () => {
      await expect(
        coordinator.connect(kakaroto).initialize(vegeta.address, karpincho.address),
      ).to.be.revertedWithCustomError(coordinator, 'OnlyDeployer');
    });

    it('deployer should not be able to call initialize with zero address as promissoryNoteToken', async () => {
      await expect(
        coordinator.connect(deployer).initialize(ADDRESS_ZERO, karpincho.address),
      ).to.be.revertedWithCustomError(coordinator, 'PromissoryNoteZeroAddress');
    });

    it('deployer should not be able to call initialize with zero address as obligationReceiptToken', async () => {
      await expect(
        coordinator.connect(deployer).initialize(vegeta.address, ADDRESS_ZERO),
      ).to.be.revertedWithCustomError(coordinator, 'ObligationReceiptZeroAddress');
    });

    it('deployer should be able to call initialize', async () => {
      await coordinator.connect(deployer).initialize(vegeta.address, karpincho.address);
      expect(await coordinator.promissoryNoteToken()).to.eq(vegeta.address);
      expect(await coordinator.obligationReceiptToken()).to.eq(karpincho.address);
    });

    it('deployer should not be able to call initialize twice', async () => {
      await coordinator.connect(deployer).initialize(vegeta.address, karpincho.address);
      await expect(
        coordinator.connect(deployer).initialize(vegeta.address, karpincho.address),
      ).to.be.revertedWithCustomError(coordinator, 'AlreadyInitialized');
    });
  });

  describe('#registerLoan', () => {
    before(async () => {
      await smartContracts.loanRegistry.registerOfferType(kakarotoOfferType, kakaroto.address);
    });

    it('should not allow to be called by a non registered loan type', async () => {
      expect(await smartContracts.loanRegistry.getDefaultLoanContractForOfferType(toBytes32(vegetaOfferType))).to.eq(
        ADDRESS_ZERO,
      );
      await expect(smartContracts.loanCoordinator.connect(vegeta).registerLoan()).to.be.revertedWithCustomError(
        smartContracts.loanCoordinator,
        'NotRegisteredLoanContract',
      );
    });

    describe('loan registered', () => {
      let initialTotalNumLoans: bigint;
      let initialLenderSnftBalance: bigint;
      before(async () => {
        initialTotalNumLoans = await smartContracts.loanCoordinator.totalNumLoans();
        initialLenderSnftBalance = await smartContracts.promissoryNote.balanceOf(lender.address);

        await smartContracts.loanCoordinator.connect(kakaroto).registerLoan();
      });
      it('should increase total number of loans by one', async () => {
        expect(await smartContracts.loanCoordinator.totalNumLoans()).to.eq(initialTotalNumLoans + 1n);
      });
      it('should mint promissory note for the lender', async () => {
        await smartContracts.loanCoordinator
          .connect(kakaroto)
          .mintPromissoryNote(initialTotalNumLoans + 1n, lender.address);
        expect(await smartContracts.promissoryNote.balanceOf(lender.address)).to.eq(initialLenderSnftBalance + 1n);
      });
      it('should register the new loan properly', async () => {
        const loanData = await smartContracts.loanCoordinator.getLoanData(initialTotalNumLoans + 1n);
        expect(loanData.status).to.eq(LOAN_STATUS_NEW);
        expect(loanData.loanContract).to.eq(kakaroto.address);
        expect(loanData.smartNftId).to.eq(0);
      });
    });
  });

  describe('#resolveLoan', () => {
    let lastLoanId: bigint;
    before(async () => {
      lastLoanId = await smartContracts.loanCoordinator.totalNumLoans();
    });
    it('should not allow resolve a loan if its status is not NEW', async () => {
      expect((await smartContracts.loanCoordinator.getLoanData(lastLoanId + 1n)).status).to.not.eq(LOAN_STATUS_NEW);
      await expect(
        smartContracts.loanCoordinator.connect(kakaroto).resolveLoan(lastLoanId + 1n, true),
      ).to.be.revertedWithCustomError(smartContracts.loanCoordinator, 'LoanStatusMustBeNEW');
    });
    it('should not allow resolve a loan if the caller in not how registered the loan', async () => {
      expect((await smartContracts.loanCoordinator.getLoanData(lastLoanId + 1n)).loanContract).to.not.eq(
        kakaroto.address,
      );
      await expect(
        smartContracts.loanCoordinator.connect(vegeta).resolveLoan(lastLoanId, true),
      ).to.be.revertedWithCustomError(smartContracts.loanCoordinator, 'CallerNotLoanCreatorContract');
    });

    describe('loan repayed/liquidated', () => {
      let loanData: any;
      before(async () => {
        await smartContracts.loanCoordinator.connect(kakaroto).mintPromissoryNote(lastLoanId, lender.address);
        loanData = await smartContracts.loanCoordinator.getLoanData(lastLoanId);

        expect(loanData.status).to.eq(LOAN_STATUS_NEW);
        expect(await smartContracts.promissoryNote.ownerOf(loanData.smartNftId)).to.eq(lender.address);
      });
      it('should set the loan status as REPAYED', async () => {
        const loanRepayed = true;
        await smartContracts.loanCoordinator.connect(kakaroto).resolveLoan(lastLoanId, loanRepayed);
        loanData = await smartContracts.loanCoordinator.getLoanData(lastLoanId);
        expect(loanData.status).to.eq(LOAN_STATUS_REPAYED);
        expect(await smartContracts.promissoryNote.exists(loanData.smartNftId)).to.eq(
          false,
          'should burn promissory note from the lender',
        );
      });
      it('should set the loan status as LIQUIDATED', async () => {
        const loanRepayed = false;
        await smartContracts.loanCoordinator.connect(kakaroto).resolveLoan(lastLoanId, loanRepayed);
        loanData = await smartContracts.loanCoordinator.getLoanData(lastLoanId);
        expect(loanData.status).to.eq(LOAN_STATUS_LIQUIDATED);
        expect(await smartContracts.promissoryNote.exists(loanData.smartNftId)).to.eq(
          false,
          'should burn promissory note from the lender',
        );
      });
    });

    describe('isValidLoanId', () => {
      it('should return valid for right loan address and id', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(1, kakaroto.address)).to.eq(true);
      });

      it('should return invalid for wrong loan address', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(1, vegeta.address)).to.eq(false);
      });

      it('should return valid for wrong loan id', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(0, kakaroto.address)).to.eq(false);
      });
    });
  });

  describe('#registerLoan with obligation receipt', () => {
    it('should not allow to be called by a non registered loan type', async () => {
      expect(await smartContracts.loanRegistry.getDefaultLoanContractForOfferType(toBytes32(vegetaOfferType))).to.eq(
        ADDRESS_ZERO,
      );
      await expect(smartContracts.loanCoordinator.connect(vegeta).registerLoan()).to.be.revertedWithCustomError(
        smartContracts.loanCoordinator,
        'NotRegisteredLoanContract',
      );
    });

    describe('loan registered with obligation receipt', () => {
      let initialTotalNumLoans: bigint;
      let initialLenderSnftBalance: bigint;
      let initialBorrowerSnftBalance: bigint;
      before(async () => {
        initialTotalNumLoans = await smartContracts.loanCoordinator.totalNumLoans();
        initialLenderSnftBalance = await smartContracts.promissoryNote.balanceOf(lender.address);
        initialBorrowerSnftBalance = await smartContracts.obligationReceipt.balanceOf(borrower.address);

        await smartContracts.loanCoordinator.connect(kakaroto).registerLoan();

        const loanId = await smartContracts.loanCoordinator.totalNumLoans();

        await smartContracts.loanCoordinator.connect(kakaroto).mintObligationReceipt(loanId, borrower.address);
        await smartContracts.loanCoordinator.connect(kakaroto).mintPromissoryNote(loanId, lender.address);
      });
      it('should increase total number of loans by one', async () => {
        expect(await smartContracts.loanCoordinator.totalNumLoans()).to.eq(initialTotalNumLoans + 1n);
      });
      it('should mint promissory note for the lender', async () => {
        expect(await smartContracts.promissoryNote.balanceOf(lender.address)).to.eq(initialLenderSnftBalance + 1n);
      });
      it('should mint obligation note for the borrower', async () => {
        expect(await smartContracts.obligationReceipt.balanceOf(borrower.address)).to.eq(
          initialBorrowerSnftBalance + 1n,
        );
      });
      it('should register the new loan properly', async () => {
        const loanData = await smartContracts.loanCoordinator.getLoanData(initialTotalNumLoans + 1n);
        expect(loanData.status).to.eq(LOAN_STATUS_NEW);
        expect(loanData.loanContract).to.eq(kakaroto.address);
        expect(loanData.smartNftId).to.gt(0);

        expect(await smartContracts.promissoryNote.ownerOf(loanData.smartNftId)).to.eq(lender.address);
        expect(await smartContracts.obligationReceipt.ownerOf(loanData.smartNftId)).to.eq(borrower.address);
      });
    });
  });

  describe('#resolveLoan with obligation receipt', () => {
    let lastLoanId: bigint;
    before(async () => {
      lastLoanId = await smartContracts.loanCoordinator.totalNumLoans();
    });
    it('should not allow resolve a loan if its status is not NEW', async () => {
      expect((await smartContracts.loanCoordinator.getLoanData(lastLoanId + 1n)).status).to.not.eq(LOAN_STATUS_NEW);
      await expect(
        smartContracts.loanCoordinator.connect(kakaroto).resolveLoan(lastLoanId + 1n, true),
      ).to.be.revertedWithCustomError(smartContracts.loanCoordinator, 'LoanStatusMustBeNEW');
    });
    it('should not allow resolve a loan if the caller in not how registered the loan', async () => {
      expect((await smartContracts.loanCoordinator.getLoanData(lastLoanId + 1n)).loanContract).to.not.eq(
        kakaroto.address,
      );
      await expect(
        smartContracts.loanCoordinator.connect(vegeta).resolveLoan(lastLoanId, true),
      ).to.be.revertedWithCustomError(smartContracts.loanCoordinator, 'CallerNotLoanCreatorContract');
    });

    describe('loan resolved with obligation receipt', () => {
      let loanData: any;
      before(async () => {
        loanData = await smartContracts.loanCoordinator.getLoanData(lastLoanId);
        expect(loanData.status).to.eq(LOAN_STATUS_NEW);
        expect(await smartContracts.promissoryNote.ownerOf(loanData.smartNftId)).to.eq(lender.address);
        expect(await smartContracts.obligationReceipt.ownerOf(loanData.smartNftId)).to.eq(borrower.address);

        await smartContracts.loanCoordinator.connect(kakaroto).resolveLoan(lastLoanId, true);
        loanData = await smartContracts.loanCoordinator.getLoanData(lastLoanId);
      });
      it('should set the loan status as RESOLVED', async () => {
        expect(loanData.status).to.eq(LOAN_STATUS_REPAYED);
      });
      it('should burn promissory note from the lender', async () => {
        expect(await smartContracts.promissoryNote.exists(loanData.smartNftId)).to.eq(false);
      });
      it('should bur obligation note from the borrower', async () => {
        expect(await smartContracts.obligationReceipt.exists(loanData.smartNftId)).to.eq(false);
      });
    });

    describe('isValidLoanId', () => {
      it('should return valid for right loan address and id', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(1, kakaroto.address)).to.eq(true);
      });

      it('should return invalid for wrong loan address', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(1, vegeta.address)).to.eq(false);
      });

      it('should return valid for wrong loan id', async () => {
        expect(await smartContracts.loanCoordinator.isValidLoanId(0, kakaroto.address)).to.eq(false);
      });
    });
  });
});
