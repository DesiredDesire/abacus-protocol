import { BN_ZERO } from '@polkadot/util';
import { ReturnNumber, SignAndSendSuccessResponse } from '@727-ventures/typechain-types';
import BN from 'bn.js';
import { expect } from 'tests/setup/chai';
import { Transfer } from 'typechain/event-types/a_token';
import { BorrowStable, BorrowVariable, Deposit, Redeem, RepayStable, RepayVariable } from 'typechain/event-types/lending_pool';
import { ContractsEvents } from 'typechain/events/enum';
import { ReserveData, UserReserveData } from 'typechain/types-returns/lending_pool';
import { TokenReserve, TestEnvReserves } from './make-suite';
import { ValidateEventParameters } from './validateEvents';
export interface CheckDepositParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  aBalance: BN;
  timestamp: number;
}

export interface CheckRedeemParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  aBalance: BN;
  aAllowance: BN | undefined;
  timestamp: number;
}

export interface CheckBorrowVariableParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  vBalance: BN;
  vAllowance: BN | undefined;
  timestamp: number;
}

export interface CheckRepayVariableParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  vBalance: BN;
  timestamp: number;
}

export interface CheckBorrowStableParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  sBalance: BN;
  sAllowance: BN | undefined;
  timestamp: number;
}

export interface CheckRepayStableParameters {
  reserveData: ReserveData;
  userReserveData: UserReserveData;
  poolBalance: BN;
  callerBalance: BN;
  sBalance: BN;
  timestamp: number;
}

export interface Interests {
  supply: BN;
  variableBorrow: BN;
  stableBorrow: BN;
}

export const checkDeposit = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN,
  parBefore: CheckDepositParameters,
  parAfter: CheckDepositParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('Deposit | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }
  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);

  // get event and check what can be checked
  const depositEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.Deposit);
  expect(depositEventParameters, 'Deposit | Event | not emitted').not.to.be.undefined;
  expect.soft(depositEventParameters?.sourceContract.address, 'Deposit | Event | source contract').to.equal(lendingPoolAddress);
  const depositEvent = depositEventParameters?.event as any as Deposit;
  expect.soft(depositEvent.asset, 'Deposit | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(depositEvent.amount.toString(), 'Deposit | Event | amount').to.equal(amount.toString());
  expect.soft(depositEvent.caller, 'Deposit | Event | caller').to.equal(caller);
  expect.soft(depositEvent.onBehalfOf, 'Deposit | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    amount,
    userInterests.supply,
    true,
    'Deposit | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.variableBorrow,
    true,
    'Deposit | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.stableBorrow,
    true,
    'Deposit | SToken Transfer Event',
  );

  // ReserveData Checks
  // total_supplied <- increases on deposit
  let before = parBefore.reserveData.totalSupplied.rawNumber;
  let expected = before.add(amount).add(reserveInterests.supply);
  let actual = parAfter.reserveData.totalSupplied.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(`Deposit | ReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `Deposit | ReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp

  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `Deposit | UserReserveData | timestamp`);

  // supplied <- increases on deposit
  before = parBefore.userReserveData.supplied.rawNumber;
  expected = before.add(amount).add(userInterests.supply);
  actual = parAfter.userReserveData.supplied.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(`Deposit | UserReserveData | total_supplied | before:\n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `Deposit | UserReserveData | total_supplied | before:\n expected: ${expected} \n actual: ${actual}\n`)
    .to.equal(expected.toString());

  // Underlying Asset Checks
  // LendingPool Balance  <- increases on deposit
  before = parBefore.poolBalance;
  expected = before.add(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`Deposit | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `Deposit | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equal(expected.toString());

  // Caller Balance  <- decreases on deposit
  before = parBefore.callerBalance;
  expected = before.sub(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`Deposit | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `Deposit | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equal(expected.toString());

  // // AToken Checks
  // //balance <- increase od Deposit
  // before = parBefore.aBalance;
  // expected = before.add(amount).add(userInterests.supply);
  // actual = parAfter.aBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`Deposit | AToken user Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(
  //     actual.toString(),
  //     `Deposit | AToken user Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
  //   )
  //   .to.equal(expected.toString());
  expect.flushSoft();
};

export const checkRedeem = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN | null,
  parBefore: CheckRedeemParameters,
  parAfter: CheckRedeemParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('Redeem | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }
  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);
  amount = amount !== null ? amount : parBefore.userReserveData.supplied.rawNumber.add(userInterests.supply);

  const redeemEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.Redeem);
  expect(redeemEventParameters, 'Redeem | Event | not emitted').not.to.be.undefined;
  expect.soft(redeemEventParameters?.sourceContract.address, 'Redeem | Event | source contract').to.equal(lendingPoolAddress);
  const RedeemEvent = redeemEventParameters?.event as any as Redeem;
  expect(RedeemEvent, 'Redeem | Event | not emitted').not.to.be.undefined;
  expect.soft(RedeemEvent.asset, 'Redeem | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(RedeemEvent.amount.toString(), 'Redeem | Event | amount').to.equal(amount.toString());
  expect.soft(RedeemEvent.caller, 'Redeem | Event | caller').to.equal(caller);
  expect.soft(RedeemEvent.onBehalfOf, 'Redeem | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    amount.neg(),
    userInterests.supply,
    true,
    'Redeem | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.variableBorrow,
    true,
    'Redeem | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.stableBorrow,
    true,
    'Redeem | SToken Transfer Event',
  );

  // ReserveData Checks
  // total_supplied <- decreases on Redeem
  let before = parBefore.reserveData.totalSupplied.rawNumber;
  let expected = before.add(reserveInterests.supply).sub(amount);
  let actual = parAfter.reserveData.totalSupplied.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(`Redeem | ReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `Redeem | ReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp

  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `Redeem | UserReserveData | timestamp`);

  // supplied <- decreases on Redeem
  before = parBefore.userReserveData.supplied.rawNumber;
  expected = before.add(userInterests.supply).sub(amount);
  actual = parAfter.userReserveData.supplied.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `Redeem | UserReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `Redeem | UserReserveData | total_supplied | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Underlying Balances Checks
  // LendingPool Balance <- decreases on Redeem
  before = parBefore.poolBalance;
  expected = before.sub(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`Redeem | Underlying Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `Redeem | Underlying Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Caller Balance <- increases on Redeem
  before = parBefore.callerBalance;
  expected = before.add(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`Redeem | Underlying Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `Redeem | Underlying Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // // AToken Checks
  // // balance <- decrease on Redeem
  // before = parBefore.aBalance;
  // expected = before.add(userInterests.supply).sub(amount);
  // actual = parAfter.aBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`Redeem | AToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(actual.toString(), `Redeem | AToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
  //   .to.equal(expected.toString());

  // alowance <- decrease on Redeem
  if (parBefore.aAllowance !== undefined && parAfter.aAllowance !== undefined) {
    before = parBefore.aAllowance;
    expected = before.sub(amount);
    actual = parAfter.aAllowance;

    expect
      .soft(actual.toString(), `Redeem | AToken Allowance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
      .to.equal(expected.toString());
  }

  expect.flushSoft();
};

export const checkBorrowVariable = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN,
  parBefore: CheckBorrowVariableParameters,
  parAfter: CheckBorrowVariableParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('BorrowVariable | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }

  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);

  // get event and check what can be checked
  const borrowVariableEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.BorrowVariable);
  expect(borrowVariableEventParameters, 'BorrowVariable | Event | not emitted').not.to.be.undefined;
  expect.soft(borrowVariableEventParameters?.sourceContract.address, 'BorrowVariable | Event | source contract').to.equal(lendingPoolAddress);
  const BorrowVariableEvent = borrowVariableEventParameters?.event as any as BorrowVariable;
  expect(BorrowVariableEvent, 'BorrowVariable | Event | not emitted').not.to.be.undefined;
  expect.soft(BorrowVariableEvent.asset, 'BorrowVariable | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(BorrowVariableEvent.amount.toString(), 'BorrowVariable | Event | amount').to.equal(amount.toString());
  expect.soft(BorrowVariableEvent.caller, 'BorrowVariable | Event | caller').to.equal(caller);
  expect.soft(BorrowVariableEvent.onBehalfOf, 'BorrowVariable | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.supply,
    true,
    'BorrowVariable | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    amount,
    userInterests.variableBorrow,
    true,
    'BorrowVariable | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.stableBorrow,
    true,
    'BorrowVariable | SToken Transfer Event',
  );

  // ReserveData Checks
  // total_variable_borrowed <- increases on borrow
  let before = parBefore.reserveData.totalVariableBorrowed.rawNumber;
  let expected = before.add(reserveInterests.variableBorrow).add(amount);
  let actual = parAfter.reserveData.totalVariableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `BorrowVariable | ReserveData | total_variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `BorrowVariable | ReserveData | total_variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp

  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `BorrowVariable | UserReserveData | timestamp`);

  // variable_borroved <- increases on BorrowVariable
  before = parBefore.userReserveData.variableBorrowed.rawNumber;
  expected = before.add(userInterests.variableBorrow).add(amount);
  actual = parAfter.userReserveData.variableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `BorrowVariable | UserReserveData | variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `BorrowVariable | UserReserveData | variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Underlying Balances Checks
  // LendingPool Balance <- decreases on BorrowVariable
  before = parBefore.poolBalance;
  expected = before.sub(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`BorrowVariable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `BorrowVariable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Caller Balance <- increases on BorrowVariable
  before = parBefore.callerBalance;
  expected = before.add(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`BorrowVariable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `BorrowVariable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // // VToken Checks
  // // balnce <- increase on BorrowVariable
  // before = parBefore.vBalance;
  // expected = before.add(userInterests.variableBorrow).add(amount);
  // actual = parAfter.vBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`BorrowVariable | VToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(
  //     actual.toString(),
  //     `BorrowVariable | VToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
  //   )
  //   .to.equal(expected.toString());

  // allowance <- decrease on BorrowVariable
  if (parBefore.vAllowance !== undefined && parAfter.vAllowance !== undefined) {
    before = parBefore.vAllowance;
    expected = before.sub(amount);
    actual = parAfter.vAllowance;

    expect
      .soft(
        actual.toString(),
        `BorrowVariable | VToken Allowance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
      )
      .to.equal(expected.toString());
  }

  expect.flushSoft();
};

export const checkRepayVariable = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN | null,
  parBefore: CheckRepayVariableParameters,
  parAfter: CheckRepayVariableParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('RepayVariable | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }

  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);
  amount = amount !== null ? amount : parBefore.userReserveData.variableBorrowed.rawNumber.add(userInterests.variableBorrow);

  // get event and check what can be checked
  const repayVariableEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.RepayVariable);
  expect(repayVariableEventParameters, 'RepayVariable | Event | not emitted').not.to.be.undefined;
  expect.soft(repayVariableEventParameters?.sourceContract.address, 'RepayVariable | Event | source contract').to.equal(lendingPoolAddress);
  const RepayVariableEvent = repayVariableEventParameters?.event as any as RepayVariable;
  expect(RepayVariableEvent, 'RepayVariable | Event | not emitted').not.to.be.undefined;
  expect.soft(RepayVariableEvent.asset, 'RepayVariable | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(RepayVariableEvent.amount.toString(), 'RepayVariable | Event | amount').to.equalUpTo1Digit(amount.toString());
  expect.soft(RepayVariableEvent.caller, 'RepayVariable | Event | caller').to.equal(caller);
  expect.soft(RepayVariableEvent.onBehalfOf, 'RepayVariable | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.supply,
    true,
    'RepayVariable | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    amount.neg(),
    userInterests.variableBorrow,
    true,
    'RepayVariable | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.stableBorrow,
    true,
    'RepayVariable | SToken Transfer Event',
  );

  // ReserveData Checks
  // total_variable_borrowed <- decreases on repayVariable
  let before = parBefore.reserveData.totalVariableBorrowed.rawNumber;
  if (before.sub(amount).lten(0))
    console.log(
      'RepayVariable | ReserveData | total_variable_borrowed - repay of the amount would cause an underflow. No loss happens. Expecting total_variable_borrowed to equal 0',
    );

  let expected = before.add(reserveInterests.variableBorrow).sub(amount).lten(0) ? 0 : before.add(reserveInterests.variableBorrow).sub(amount);
  let actual = parAfter.reserveData.totalVariableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `RepayVariable | ReserveData | total_variable_borrowed | \n before: ${before} \n amount: ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `RepayVariable | ReserveData | total_variable_borrowed | \n before: ${before} \n amount: ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.almostEqualOrEqualNumberE12(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp
  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `RepayVariable | UserReserveData | timestamp`);

  // variable_borroved <- decreases on RepayVariable
  before = parBefore.userReserveData.variableBorrowed.rawNumber;
  expected = before.add(userInterests.variableBorrow).sub(amount);
  actual = parAfter.userReserveData.variableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `RepayVariable | UserReserveData | variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `RepayVariable | UserReserveData | variable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equalUpTo1Digit(expected.toString());

  // Underlying Balances Checks
  // LendingPool Balance <- increases on RepayVariable
  before = parBefore.poolBalance;
  expected = before.add(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`RepayVariable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `RepayVariable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equalUpTo1Digit(expected.toString());

  // Caller Balance <- decreases on RepayVariable
  before = parBefore.callerBalance;
  expected = before.sub(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`RepayVariable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `RepayVariable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equalUpTo1Digit(expected.toString());

  // // VToken Checks
  // // balnce <- decreases on RepayVariable
  // before = parBefore.vBalance;
  // expected = before.sub(amount);
  // actual = parAfter.vBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`RepayVariable | VToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(
  //     actual.toString(),
  //     `RepayVariable | VToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
  //   )
  //   .to.equal(expected.toString());
  expect.flushSoft();
};

export const checkBorrowStable = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN,
  parBefore: CheckBorrowStableParameters,
  parAfter: CheckBorrowStableParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('BorrowStable | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }

  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);
  // get event and check what can be checked
  const borrowStableEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.BorrowStable);
  expect(borrowStableEventParameters, 'BorrowStable | Event | not emitted').not.to.be.undefined;
  expect.soft(borrowStableEventParameters?.sourceContract.address, 'BorrowStable | Event | source contract').to.equal(lendingPoolAddress);
  const BorrowStableEvent = borrowStableEventParameters?.event as any as BorrowStable;
  expect(BorrowStableEvent, 'BorrowStable | Event | not emitted').not.to.be.undefined;
  expect.soft(BorrowStableEvent.asset, 'BorrowStable | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(BorrowStableEvent.amount.toString(), 'BorrowStable | Event | amount').to.equal(amount.toString());
  expect.soft(BorrowStableEvent.caller, 'BorrowStable | Event | caller').to.equal(caller);
  expect.soft(BorrowStableEvent.onBehalfOf, 'BorrowStable | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.supply,
    true,
    'BorrowStable | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.variableBorrow,
    true,
    'BorrowStable | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    amount,
    userInterests.stableBorrow,
    true,
    'BorrowStable | SToken Transfer Event',
  );

  // ReserveData Checks
  // sum_stable_debt <- increases on borrow
  let before = parBefore.reserveData.sumStableDebt.rawNumber;
  let expected = before.add(userInterests.stableBorrow).add(amount);
  let actual = parAfter.reserveData.sumStableDebt.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `BorrowStable | ReserveData | sum_stable_debt | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `BorrowStable | ReserveData | sum_stable_debt | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // accumulatedStableBorrow <- increases on borrow
  before = parBefore.reserveData.accumulatedStableBorrow.rawNumber;
  expected = before.add(reserveInterests.stableBorrow).gte(userInterests.stableBorrow)
    ? before.add(reserveInterests.stableBorrow).sub(userInterests.stableBorrow)
    : new BN(0);
  actual = parAfter.reserveData.accumulatedStableBorrow.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `BorrowStable | ReserveData | accumulatedStableBorrow | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `BorrowStable | ReserveData | accumulatedStableBorrow | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp
  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `BorrowStable | UserReserveData | timestamp`);

  // stable_borroved <- increases on BorrowStable
  before = parBefore.userReserveData.stableBorrowed.rawNumber;
  expected = before.add(userInterests.stableBorrow).add(amount);
  actual = parAfter.userReserveData.stableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `BorrowStable | UserReserveData | stable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `BorrowStable | UserReserveData | stable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Underlying Balances Checks
  // LendingPool Balance <- decreases on BorrowStable
  before = parBefore.poolBalance;
  expected = before.sub(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`BorrowStable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `BorrowStable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equal(expected.toString());

  // Caller Balance <- increases on BorrowStable
  before = parBefore.callerBalance;
  expected = before.add(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`BorrowStable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(
      actual.toString(),
      `BorrowStable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // // SToken Checks
  // // balnce <- increase on BorrowStable
  // before = parBefore.sBalance;
  // expected = before.add(amount);
  // actual = parAfter.sBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`BorrowStable | SToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(
  //     actual.toString(),
  //     `BorrowStable | SToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
  //   )
  //   .to.equal(expected.toString());

  // allowance <- decrease on BorrowStable
  if (parBefore.sAllowance !== undefined && parAfter.sAllowance !== undefined) {
    before = parBefore.sAllowance;
    expected = before.sub(amount);
    actual = parAfter.sAllowance;

    expect
      .soft(
        actual.toString(),
        `BorrowStable | SToken Allowance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
      )
      .to.equal(expected.toString());
  }

  expect.flushSoft();
};

export const checkRepayStable = (
  lendingPoolAddress: string,
  reserveTokens: TokenReserve,
  caller: string,
  onBehalfOf: string,
  amount: BN | null,
  parBefore: CheckRepayStableParameters,
  parAfter: CheckRepayStableParameters,
  capturedEventsParameters: ValidateEventParameters[],
) => {
  // if (
  //   parAfter.timestamp !== parBefore.timestamp ||
  //   parAfter.reserveData.indexesUpdateTimestamp !== parBefore.reserveData.indexesUpdateTimestamp ||
  //   parAfter.userReserveData.updateTimestamp !== parBefore.userReserveData.updateTimestamp
  // ) {
  //   console.log('RepayStable | TIME HAS PASSED | CHECK IS SKIPPED');
  //   return;
  // }

  const userInterests = getUserInterests(parBefore.userReserveData, parBefore.reserveData, parAfter.reserveData);
  const reserveInterests = getReserveInterests(parBefore.reserveData, parAfter.reserveData);
  amount = amount !== null ? amount : parBefore.userReserveData.stableBorrowed.rawNumber.add(userInterests.stableBorrow);

  // get event and check what can be checked
  const repayStableEventParameters = capturedEventsParameters.find((e) => e.eventName === ContractsEvents.LendingPoolEvents.RepayStable);
  expect(repayStableEventParameters, 'RepayStable | Event | not emitted').not.to.be.undefined;
  expect.soft(repayStableEventParameters?.sourceContract.address, 'RepayStable | Event | source contract').to.equal(lendingPoolAddress);
  const RepayStableEvent = repayStableEventParameters?.event as any as RepayStable;
  expect(RepayStableEvent, 'RepayStable | Event | not emitted').not.to.be.undefined;
  expect.soft(RepayStableEvent.asset, 'RepayStable | Event | asset').to.equal(reserveTokens.underlying.address);
  expect.soft(RepayStableEvent.amount.toString(), 'RepayStable | Event | amount').to.equalUpTo1Digit(amount.toString());
  expect.soft(RepayStableEvent.caller, 'RepayStable | Event | caller').to.equal(caller);
  expect.soft(RepayStableEvent.onBehalfOf, 'RepayStable | Event | onBehalfOf').to.equal(onBehalfOf);

  // AToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.aToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.supply,
    true,
    'RepayStable | AToken Transfer Event',
  );
  // VToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.vToken.address,
    onBehalfOf,
    BN_ZERO,
    userInterests.variableBorrow,
    true,
    'RepayStable | VToken Transfer Event',
  );
  // SToken
  checkAbacusTokenTransferEvent(
    capturedEventsParameters,
    reserveTokens.sToken.address,
    onBehalfOf,
    amount.neg(),
    userInterests.stableBorrow,
    true,
    'RepayStable | SToken Transfer Event',
  );
  // console.log({
  //   userInterests_supply: userInterests.stableBorrow.toString(),
  //   reserveInterests_supply: reserveInterests.stableBorrow.toString(),
  //   cumulativePre: parBefore.reserveData.cumulativeSupplyRateIndexE18.toString(),
  //   cumulativePost: parAfter.reserveData.cumulativeSupplyRateIndexE18.toString(),
  //   amount: amount.toString(),
  // });
  // console.table(Object.entries(parBefore.reserveData).map(([key, val]) => [key, val.toString()]));
  // console.table(Object.entries(parAfter.reserveData).map(([key, val]) => [key, val.toString()]));
  // console.table(Object.entries(parBefore.userReserveData).map(([key, val]) => [key, val.toString()]));
  // console.table(Object.entries(parAfter.userReserveData).map(([key, val]) => [key, val.toString()]));

  // ReserveData Checks
  // sum_stable_debt <- decreases on RepayStable
  let before = parBefore.reserveData.sumStableDebt.rawNumber;
  let expected = before.add(userInterests.stableBorrow).gte(amount) ? before.add(userInterests.stableBorrow).sub(amount) : 0;
  let actual = parAfter.reserveData.sumStableDebt.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `RepayStable | ReserveData | sum_stable_debt | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `RepayStable | ReserveData | sum_stable_debt | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // accumulatedStableBorrow <- increases on borrow
  before = parBefore.reserveData.accumulatedStableBorrow.rawNumber;
  expected = before.add(reserveInterests.stableBorrow).gte(userInterests.stableBorrow)
    ? before.add(reserveInterests.stableBorrow).sub(userInterests.stableBorrow)
    : new BN(0);
  actual = parAfter.reserveData.accumulatedStableBorrow.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `RepayStable | ReserveData | accumulatedStableBorrow | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `RepayStable | ReserveData | accumulatedStableBorrow | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // UserReserveData Checks
  // timestamp should be set to reserve data timestamp

  expect
    .soft(parAfter.userReserveData.updateTimestamp.toString())
    .to.equal(parAfter.reserveData.indexesUpdateTimestamp.toString(), `RepayStable | UserReserveData | timestamp`);

  // stable_borroved <- decreases on RepayStable
  before = parBefore.userReserveData.stableBorrowed.rawNumber;
  expected = before.add(userInterests.stableBorrow).sub(amount);
  actual = parAfter.userReserveData.stableBorrowed.rawNumber;

  if (expected.toString() !== actual.toString()) {
    console.log(
      `RepayStable | UserReserveData | stable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    );
  }
  expect
    .soft(
      actual.toString(),
      `RepayStable | UserReserveData | stable_borrowed | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
    )
    .to.equal(expected.toString());

  // Underlying Balances Checks
  // LendingPool Balance <- increases on RepayStable
  before = parBefore.poolBalance;
  expected = before.add(amount);
  actual = parAfter.poolBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`RepayStable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `RepayStable | Pool Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equalUpTo1Digit(expected.toString());

  // Caller Balance <- decreases on RepayStable
  before = parBefore.callerBalance;
  expected = before.sub(amount);
  actual = parAfter.callerBalance;

  if (expected.toString() !== actual.toString()) {
    console.log(`RepayStable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  }
  expect
    .soft(actual.toString(), `RepayStable | Caller Balace | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`)
    .to.equalUpTo1Digit(expected.toString());
  // // SToken Checks
  // // balnce <- decreases on RepayStable
  // before = parBefore.sBalance;
  // expected = before.sub(amount);
  // actual = parAfter.sBalance;

  // if (expected.toString() !== actual.toString()) {
  //   console.log(`RepayStable | SToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`);
  // }
  // expect
  //   .soft(
  //     actual.toString(),
  //     `RepayStable | SToken Balance | \n before: ${before} \n amount ${amount} \n expected: ${expected} \n actual: ${actual}\n`,
  //   )
  //   .to.equal(expected.toString());

  expect.flushSoft();
};

const getUserInterests = (userReserveData: UserReserveData, reserveDataBefore: ReserveData, reserveDataAfter: ReserveData): Interests => {
  const supplyInterest = userReserveData.appliedCumulativeSupplyRateIndexE18.rawNumber.eqn(0)
    ? new BN(0)
    : userReserveData.supplied.rawNumber
        .mul(reserveDataAfter.cumulativeSupplyRateIndexE18.rawNumber)
        .div(userReserveData.appliedCumulativeSupplyRateIndexE18.rawNumber)
        .sub(userReserveData.supplied.rawNumber);
  if (supplyInterest !== new BN(0)) {
    supplyInterest.addn(1);
  }

  const variableBorrowInterest = userReserveData.appliedCumulativeSupplyRateIndexE18.rawNumber.eqn(0)
    ? new BN(0)
    : userReserveData.variableBorrowed.rawNumber
        .mul(reserveDataAfter.cumulativeVariableBorrowRateIndexE18.rawNumber)
        .div(userReserveData.appliedCumulativeVariableBorrowRateIndexE18.rawNumber)
        .sub(userReserveData.variableBorrowed.rawNumber);
  if (variableBorrowInterest !== new BN(0)) {
    variableBorrowInterest.addn(1);
  }

  const deltaTimestamp = new BN(
    new BN(userReserveData.updateTimestamp.toString()).eqn(0)
      ? 0
      : new BN(reserveDataAfter.indexesUpdateTimestamp.toString()).sub(new BN(userReserveData.updateTimestamp.toString())),
  );
  const E24 = new BN('1000000000000000000000000');
  const stableBorrowInterest = userReserveData.stableBorrowed.rawNumber
    .mul(userReserveData.stableBorrowRateE24.rawNumber)
    .mul(deltaTimestamp)
    .div(E24);
  if (stableBorrowInterest !== new BN(0)) {
    stableBorrowInterest.addn(1);
  }

  return { supply: supplyInterest, variableBorrow: variableBorrowInterest, stableBorrow: stableBorrowInterest };
};
// this function does assume that comulative Indexes are calculated correctly inside the contract.
// this corectness is tested in rust unit tests.
const getReserveInterests = (reserveDataBefore: ReserveData, reserveDataAfter: ReserveData): Interests => {
  const deltaTimestamp = new BN(reserveDataAfter.indexesUpdateTimestamp.toString()).sub(new BN(reserveDataBefore.indexesUpdateTimestamp.toString()));

  const supplyInterest = reserveDataBefore.cumulativeSupplyRateIndexE18.rawNumber.eqn(0)
    ? new BN(0)
    : reserveDataBefore.totalSupplied.rawNumber
        .mul(reserveDataAfter.cumulativeSupplyRateIndexE18.rawNumber)
        .div(reserveDataBefore.cumulativeSupplyRateIndexE18.rawNumber)
        .sub(reserveDataBefore.totalSupplied.rawNumber);
  if (supplyInterest !== new BN(0)) {
    supplyInterest.addn(1);
  }

  const variableBorrowInterest = reserveDataBefore.cumulativeVariableBorrowRateIndexE18.rawNumber.eqn(0)
    ? new BN(0)
    : reserveDataBefore.totalVariableBorrowed.rawNumber
        .mul(reserveDataAfter.cumulativeVariableBorrowRateIndexE18.rawNumber)
        .div(reserveDataBefore.cumulativeVariableBorrowRateIndexE18.rawNumber)
        .sub(reserveDataBefore.totalVariableBorrowed.rawNumber);
  if (variableBorrowInterest !== new BN(0)) {
    variableBorrowInterest.addn(1);
  }
  const E24 = new BN('1000000000000000000000000');
  const stableBorrowInterest = reserveDataBefore.sumStableDebt.rawNumber
    .mul(reserveDataBefore.avarageStableRateE24.rawNumber)
    .mul(deltaTimestamp)
    .div(E24);
  if (stableBorrowInterest !== new BN(0)) {
    stableBorrowInterest.addn(1);
  }

  return { supply: supplyInterest, variableBorrow: variableBorrowInterest, stableBorrow: stableBorrowInterest };
};

const checkAbacusTokenTransferEvent = (
  capturedEventsParameters: ValidateEventParameters[],
  abacusTokenAddress: string,
  user: string,
  amount: BN | number | string,
  interest: BN | number | string,
  add: boolean,
  messagge: string,
) => {
  const amountTransferred: BN = add ? new BN(amount).add(new BN(interest)) : new BN(amount).sub(new BN(interest));
  const abacusTokenTransferEventParameters = capturedEventsParameters.find(
    (e) => e.eventName === ContractsEvents.ATokenEvents.Transfer && e.sourceContract.address === abacusTokenAddress,
  );

  if (process.env.DEBUG) {
    if (amountTransferred.isZero()) {
      if (abacusTokenTransferEventParameters !== undefined) console.log(messagge + ' | emitted while shouldnt be\n');
    } else {
      if (abacusTokenTransferEventParameters === undefined) console.log(messagge + ' | not emitted');
      if (abacusTokenTransferEventParameters?.sourceContract.address !== abacusTokenAddress) console.log(messagge + 'source contract');
      const abacusTokenTransferEvent = abacusTokenTransferEventParameters?.event as any as Transfer;
      if (amountTransferred.isNeg()) {
        if (abacusTokenTransferEvent?.from?.toString() !== user) console.log(messagge + ' | from');
        if (abacusTokenTransferEvent?.to?.toString() !== undefined) console.log(messagge + 'to');
      } else {
        if (abacusTokenTransferEvent?.from?.toString() !== undefined) console.log(messagge + ' | from');
        if (abacusTokenTransferEvent?.to?.toString() !== user) console.log(messagge + 'to');
      }
      if (abacusTokenTransferEvent?.value.toString() !== amountTransferred.abs().toString()) console.log(messagge + 'value');
    }
  }

  if (amountTransferred.isZero()) {
    expect(abacusTokenTransferEventParameters, messagge + ' | emitted while shouldnt be').to.be.undefined;
    return;
  }

  expect(abacusTokenTransferEventParameters, messagge + ' | not emitted').not.to.be.undefined;
  expect.soft(abacusTokenTransferEventParameters?.sourceContract.address, messagge + 'source contract').to.equal(abacusTokenAddress);
  const abacusTokenTransferEvent = abacusTokenTransferEventParameters?.event as any as Transfer;
  if (amountTransferred.isNeg()) {
    expect.soft(abacusTokenTransferEvent?.from?.toString(), messagge + ' | from').to.equal(user);
    expect.soft(abacusTokenTransferEvent?.to?.toString(), messagge + 'to').to.equal(undefined);
  } else {
    expect.soft(abacusTokenTransferEvent?.from?.toString(), messagge + ' | from').to.equal(undefined);
    expect.soft(abacusTokenTransferEvent?.to?.toString(), messagge + ' | to').to.equal(user);
  }
  expect.soft(abacusTokenTransferEvent?.value.toString(), messagge + ' | value').to.equalUpTo1Digit(amountTransferred.abs().toString());
};
