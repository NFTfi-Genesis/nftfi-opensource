import hre from 'hardhat';

type etherscanVerificationType = {
  address: string;
  constructorArguments: (string | string[])[];
  contract?: string;
  libraries?: Record<string, string>;
};

export const etherscanVerification = (params: etherscanVerificationType) => {
  if (hre.network.name === 'local' || hre.network.name === 'local-ovm') {
    return;
  }

  return runTaskWithRetry(params, 4, 1000);
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms, ''));
}

// Retry is needed because the contract was recently deployed and it hasn't propagated to the explorer backend yet
export const runTaskWithRetry = async (params: any, times: number, msDelay: number) => {
  let counter = times;
  await delay(msDelay);

  try {
    await hre.run('verify:verify', params);
  } catch (error: any) {
    counter--;

    if (counter > 0) {
      await runTaskWithRetry(params, counter, msDelay);
    } else {
      console.error('[ETHERSCAN][ERROR]', 'unable to verify', error.message);
    }
  }
};
