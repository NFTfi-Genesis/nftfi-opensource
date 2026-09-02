import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { expect } from 'chai';
import hre, { ethers } from 'hardhat';
import { NFTfiSigningUtils, NFTfiSigningUtilsContract, TestSignerContract, TestSigningUtils } from '../typechain';
import {
  ADDRESS_ZERO,
  currentTime,
  daysToSeconds,
  getLenderRenegotiationSignature,
  getLenderSignature,
  getLenderSignatureEIP1271,
  restoreSnapshot,
  takeSnapshot,
} from './utils/utils';

describe('NFTfiSigningUtils', function () {
  let accounts: SignerWithAddress[]; // Test accounts
  let signingUtils: TestSigningUtils; // Smart Contracts
  let testSignerContractBorrower: TestSignerContract; // Smart Contracts
  let testSignerContractLender: TestSignerContract; // Smart Contracts
  let signingUtilsLibrary: NFTfiSigningUtils; // Smart Contracts
  let nftfiSigningUtilsContract: NFTfiSigningUtilsContract; // Smart Contracts
  let kakaroto: SignerWithAddress;
  let vegeta: SignerWithAddress;
  let karpincho: SignerWithAddress;
  let lender: SignerWithAddress;
  let borrower: SignerWithAddress;
  let someAddress: SignerWithAddress;
  let sigExpiry: bigint;
  let sigExpiryExpired: bigint;

  let lenderSig: string;
  let lenderSigExpired: string;
  let lenderSigWrongType: string;

  let lenderRenegotiationSig: string;
  let lenderRenegotiationSigExpired: string;
  let lenderRenegotiationSigWrongContract: string;

  let snapshot: number;
  let chainId: number;

  const offerType = ethers.encodeBytes32String('ASSET_OFFER_LOAN');

  before(async () => {
    accounts = await ethers.getSigners();
    [kakaroto, vegeta, karpincho, lender, borrower, someAddress] = accounts;

    const NFTfiSigningUtils = await ethers.getContractFactory('NFTfiSigningUtils');
    signingUtilsLibrary = (await NFTfiSigningUtils.deploy()) as NFTfiSigningUtils;
    await signingUtilsLibrary.waitForDeployment();

    const NFTfiSigningUtilsContract = await ethers.getContractFactory('NFTfiSigningUtilsContract', {
      libraries: {
        NFTfiSigningUtils: await signingUtilsLibrary.getAddress(),
      },
    });
    nftfiSigningUtilsContract = (await NFTfiSigningUtilsContract.deploy()) as NFTfiSigningUtilsContract;
    await nftfiSigningUtilsContract.waitForDeployment();

    const TestSignerContract = await ethers.getContractFactory('TestSignerContract');
    testSignerContractBorrower = (await TestSignerContract.deploy(borrower.address)) as TestSignerContract;
    await testSignerContractBorrower.waitForDeployment();

    testSignerContractLender = (await TestSignerContract.deploy(lender.address)) as TestSignerContract;
    await testSignerContractLender.waitForDeployment();

    const TestSigningUtils = await ethers.getContractFactory('TestSigningUtils', {
      libraries: {
        NFTfiSigningUtils: await signingUtilsLibrary.getAddress(),
      },
    });
    signingUtils = (await TestSigningUtils.deploy()) as TestSigningUtils;
    await signingUtils.waitForDeployment();

    const now = await currentTime();
    sigExpiry = now + daysToSeconds(10n);
    sigExpiryExpired = now - 1n;

    chainId = hre.network.config.chainId || 31337;
  });

  beforeEach(async () => {
    snapshot = await takeSnapshot();
  });

  afterEach(async () => {
    await restoreSnapshot(snapshot);
    snapshot = await takeSnapshot();
  });

  describe('#isValidLenderSignature', () => {
    before(async () => {
      lenderSig = await getLenderSignature(
        lender,
        1n,
        true,
        1n,
        1n,
        1n,
        1n,
        karpincho.address,
        kakaroto.address,
        sigExpiry,
        offerType,
        1n,
      );
      lenderSigExpired = await getLenderSignature(
        lender,
        1n,
        true,
        1n,
        1n,
        1n,
        1n,
        karpincho.address,
        kakaroto.address,
        sigExpiryExpired,
        offerType,
        1n,
      );
      lenderSigWrongType = await getLenderSignature(
        lender,
        1n,
        true,
        1n,
        1n,
        1n,
        1n,
        karpincho.address,
        kakaroto.address,
        sigExpiry,
        ethers.encodeBytes32String('SOME_TYPE'),
        1n,
      );
    });

    it('should fail if signature is expired', async () => {
      await expect(
        signingUtils.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: lender.address,
            nonce: 1n,
            expiry: sigExpiryExpired,
            signature: lenderSigExpired,
          },
          offerType,
        ),
      ).to.be.revertedWith('Lender Signature has expired');
    });
    it('should return false if lender is ZERO address', async () => {
      expect(
        await signingUtils.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: ADDRESS_ZERO,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderSig,
          },
          offerType,
        ),
      ).to.false;
    });
    it('should return false if lender is not the signer', async () => {
      expect(
        await signingUtils.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: vegeta.address,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderSig,
          },
          offerType,
        ),
      ).to.false;
    });
    it('should return false if the contract address included in the signature is not the same as the contract validating it', async () => {
      expect(
        await signingUtils.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: lender.address,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderSigWrongType,
          },
          offerType,
        ),
      ).to.false;
    });
    it('should return true if signature is correct', async () => {
      expect(
        await signingUtils.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: lender.address,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderSig,
          },
          offerType,
        ),
      ).to.true;
    });

    it('should return true if signature is correct utility contract to externally validate signatures', async () => {
      expect(
        await nftfiSigningUtilsContract.isValidLenderSignature(
          {
            loanERC20Denomination: kakaroto.address,
            loanPrincipalAmount: 1n,
            maximumRepaymentAmount: 1n,
            nftCollateralContract: karpincho.address,
            nftCollateralId: 1n,
            loanDuration: 1n,
            isProRata: true,
            originationFee: 1n,
          },
          {
            signer: lender.address,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderSig,
          },
          offerType,
        ),
      ).to.true;
    });

    describe('EIP-1271', () => {
      let nonLenderSig: string;
      before(async () => {
        lenderSig = await getLenderSignatureEIP1271(
          lender,
          await testSignerContractLender.getAddress(),
          1n,
          true,
          1n,
          1n,
          1n,
          1n,
          karpincho.address,
          kakaroto.address,
          sigExpiry,
          offerType,
          1n,
        );
        lenderSigExpired = await getLenderSignatureEIP1271(
          lender,
          await testSignerContractLender.getAddress(),
          1n,
          true,
          1n,
          1n,
          1n,
          1n,
          karpincho.address,
          kakaroto.address,
          sigExpiryExpired,
          offerType,
          1n,
        );
        lenderSigWrongType = await getLenderSignatureEIP1271(
          lender,
          await testSignerContractLender.getAddress(),
          1n,
          true,
          1n,
          1n,
          1n,
          1n,
          karpincho.address,
          kakaroto.address,
          sigExpiry,
          offerType,
          1n,
        );
        nonLenderSig = await getLenderSignatureEIP1271(
          kakaroto,
          await testSignerContractLender.getAddress(),
          1n,
          true,
          1n,
          1n,
          1n,
          1n,
          karpincho.address,
          kakaroto.address,
          sigExpiry,
          offerType,
          1n,
        );
      });

      it('should fail if signature is expired', async () => {
        await expect(
          signingUtils.isValidLenderSignature(
            {
              loanERC20Denomination: kakaroto.address,
              loanPrincipalAmount: 1n,
              maximumRepaymentAmount: 1n,
              nftCollateralContract: karpincho.address,
              nftCollateralId: 1n,
              loanDuration: 1n,
              isProRata: true,
              originationFee: 1n,
            },
            {
              signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
              nonce: 1n,
              expiry: sigExpiryExpired,
              signature: lenderSigExpired,
            },
            offerType,
          ),
        ).to.be.revertedWith('Lender Signature has expired');
      });
      it('should return false if sig is not from the lender', async () => {
        expect(
          await signingUtils.isValidLenderSignature(
            {
              loanERC20Denomination: kakaroto.address,
              loanPrincipalAmount: 1n,
              maximumRepaymentAmount: 1n,
              nftCollateralContract: karpincho.address,
              nftCollateralId: 1n,
              loanDuration: 1n,
              isProRata: true,
              originationFee: 1n,
            },
            {
              signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
              nonce: 1n,
              expiry: sigExpiry,
              signature: nonLenderSig,
            },
            offerType,
          ),
        ).to.false;
      });
      it('should return true if signature is correct', async () => {
        expect(
          await signingUtils.isValidLenderSignature(
            {
              loanERC20Denomination: kakaroto.address,
              loanPrincipalAmount: 1n,
              maximumRepaymentAmount: 1n,
              nftCollateralContract: karpincho.address,
              nftCollateralId: 1n,
              loanDuration: 1n,
              isProRata: true,
              originationFee: 1n,
            },
            {
              signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
              nonce: 1n,
              expiry: sigExpiry,
              signature: lenderSig,
            },
            offerType,
          ),
        ).to.true;
      });
    });
  });

  describe('#isValidLenderRenegotiationSignature', () => {
    before(async () => {
      lenderRenegotiationSig = await getLenderRenegotiationSignature(
        lender,
        1n,
        1n,
        true,
        1n,
        1n,
        1n,
        sigExpiry,
        await signingUtils.getAddress(),
      );
      lenderRenegotiationSigExpired = await getLenderRenegotiationSignature(
        lender,
        1n,
        1n,
        true,
        1n,
        1n,
        1n,
        sigExpiryExpired,
        await signingUtils.getAddress(),
      );
      lenderRenegotiationSigWrongContract = await getLenderRenegotiationSignature(
        lender,
        1n,
        1n,
        true,
        1n,
        1n,
        1n,
        sigExpiry,
        someAddress.address,
      );
    });

    it('should fail if signature is expired', async () => {
      await expect(
        signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
          signer: lender.address,
          nonce: 1n,
          expiry: sigExpiryExpired,
          signature: lenderRenegotiationSigExpired,
        }),
      ).to.be.revertedWith('Renegotiation Signature expired');
    });
    it('should return false if lender is ZERO address', async () => {
      expect(
        await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
          signer: ADDRESS_ZERO,
          nonce: 1n,
          expiry: sigExpiry,
          signature: lenderRenegotiationSig,
        }),
      ).to.false;
    });
    it('should return false if lender is not the signer', async () => {
      expect(
        await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
          signer: karpincho.address,
          nonce: 1n,
          expiry: sigExpiry,
          signature: lenderRenegotiationSig,
        }),
      ).to.false;
    });
    it('should return false if signature is not correct', async () => {
      expect(
        await signingUtils.isValidLenderRenegotiationSignature(2, 1n, true, 1n, 1n, {
          signer: lender.address,
          nonce: 1n,
          expiry: sigExpiry,
          signature: lenderRenegotiationSig,
        }),
      ).to.false;
    });
    it('should return false if the contract address included in the signature is not the same as the contract validating it', async () => {
      expect(
        await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
          signer: lender.address,
          nonce: 1n,
          expiry: sigExpiry,
          signature: lenderRenegotiationSigWrongContract,
        }),
      ).to.false;
    });
    it('should return true if signature is correct', async () => {
      expect(
        await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
          signer: lender.address,
          nonce: 1n,
          expiry: sigExpiry,
          signature: lenderRenegotiationSig,
        }),
      ).to.true;
    });

    it('should return true if signature is correct utility contract to externally validate signatures', async () => {
      expect(
        await nftfiSigningUtilsContract.isValidLenderRenegotiationSignature(
          1n,
          1n,
          true,
          1n,
          1n,
          {
            signer: lender.address,
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderRenegotiationSig,
          },
          await signingUtils.getAddress(),
        ),
      ).to.true;
    });

    describe('EIP-1271', () => {
      let nonLenderRenegotiationSig: string;
      before(async () => {
        lenderRenegotiationSig = await lender.signMessage(
          ethers.getBytes(
            ethers.solidityPackedKeccak256(
              [
                'uint256',
                'uint32',
                'bool',
                'uint256',
                'uint256',
                'address',
                'uint256',
                'uint256',
                'address',
                'uint256',
              ],
              [
                1n,
                1n,
                true,
                1n,
                1n,
                await testSignerContractLender.getAddress(), // note this is the address of the signer contract
                1n,
                sigExpiry,
                await signingUtils.getAddress(),
                chainId,
              ],
            ),
          ),
        );

        lenderRenegotiationSigExpired = await lender.signMessage(
          ethers.getBytes(
            ethers.solidityPackedKeccak256(
              ['uint256', 'uint32', 'bool', 'uint256', 'address', 'uint256', 'uint256', 'address', 'uint256'],
              [
                1n,
                1n,
                true,
                1n,
                await testSignerContractLender.getAddress(), // note this is the address of the signer contract
                1n,
                sigExpiryExpired,
                await signingUtils.getAddress(),
                chainId,
              ],
            ),
          ),
        );

        lenderRenegotiationSigWrongContract = await lender.signMessage(
          ethers.getBytes(
            ethers.solidityPackedKeccak256(
              ['uint256', 'uint32', 'bool', 'uint256', 'address', 'uint256', 'uint256', 'address', 'uint256'],
              [
                1n,
                1n,
                true,
                1n,
                await testSignerContractLender.getAddress(), // note this is the address of the signer contract
                1n,
                sigExpiryExpired,
                someAddress.address,
                chainId,
              ],
            ),
          ),
        );

        nonLenderRenegotiationSig = await kakaroto.signMessage(
          ethers.getBytes(
            ethers.solidityPackedKeccak256(
              ['uint256', 'uint32', 'bool', 'uint256', 'address', 'uint256', 'uint256', 'address', 'uint256'],
              [
                1n,
                1n,
                true,
                1n,
                await testSignerContractLender.getAddress(), // note this is the address of the signer contract
                1n,
                sigExpiry,
                await signingUtils.getAddress(),
                chainId,
              ],
            ),
          ),
        );
      });

      it('should fail if signature is expired', async () => {
        await expect(
          signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
            signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
            nonce: 1n,
            expiry: sigExpiryExpired,
            signature: lenderRenegotiationSigExpired,
          }),
        ).to.be.revertedWith('Renegotiation Signature expired');
      });

      it('should return false if sig is not from the admin', async () => {
        expect(
          await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
            signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract,
            nonce: 1n,
            expiry: sigExpiry,
            signature: nonLenderRenegotiationSig,
          }),
        ).to.false;
      });

      it('should return false if signature is not correct', async () => {
        expect(
          await signingUtils.isValidLenderRenegotiationSignature(2, 1n, true, 1n, 1n, {
            signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderRenegotiationSig,
          }),
        ).to.false;
      });
      it('should return false if the contract address included in the signature is not the same as the contract validating it', async () => {
        expect(
          await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
            signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderRenegotiationSigWrongContract,
          }),
        ).to.false;
      });

      it('should return true if signature is correct', async () => {
        expect(
          await signingUtils.isValidLenderRenegotiationSignature(1n, 1n, true, 1n, 1n, {
            signer: await testSignerContractLender.getAddress(), // note this is the address of the signer contract
            nonce: 1n,
            expiry: sigExpiry,
            signature: lenderRenegotiationSig,
          }),
        ).to.true;
      });
    });
  });
});
