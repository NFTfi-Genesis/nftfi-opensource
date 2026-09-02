import ora, { Ora } from 'ora';

const totalGas = 0n;
let spinner: Ora;

export function accumulateGas(gasUsed: bigint) {
  totalGas + gasUsed;
}

export function getTotalGas() {
  return totalGas;
}

export function startLog(message: string) {
  spinner = ora().start(message);
}

export function updateLog(message: string) {
  spinner.text = message;
}

export function succeedLog(message: string) {
  spinner.succeed(message);
}

export function failLog() {
  spinner.fail();
}

export function warnLog(message: string) {
  spinner.warn(message);
}
