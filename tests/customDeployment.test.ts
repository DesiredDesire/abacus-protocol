import { ChildProcess } from 'child_process';
import { deployAndConfigureSystem, DeploymentConfig } from 'tests/setup/deploymentHelpers';
import { TestEnv } from './scenarios/utils/make-suite';
import { E6 } from '@abaxfinance/utils';
import { expect } from './setup/chai';
import { apiProviderWrapper, getSigners, getSignersWithoutOwner } from './setup/helpers';
import { restartAndRestoreNodeState } from './setup/nodePersistence';
import { DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING } from './setup/tokensToDeployForTesting';

describe('Custom deployment', () => {
  let getContractsNodeProcess: () => ChildProcess | undefined = () => undefined;
  after(async () => {
    return await apiProviderWrapper.closeApi();
  });
  before(async () => {
    getContractsNodeProcess = await restartAndRestoreNodeState(getContractsNodeProcess);
    await apiProviderWrapper.getAndWaitForReady();
  });

  describe('Completely new custom deployment', async () => {
    let testEnv: TestEnv;
    before(async () => {
      const signers = getSigners();
      //Arrange
      const customDeploymentConfig: Partial<DeploymentConfig> = {
        testTokensToDeploy: {
          reserveTokens: [
            {
              metadata: {
                name: 'BOI',
                symbol: 'BOI',
                decimals: 7,
              },
              parameters: {
                incomeForSuppliersPartE6: 1000000 - 100,
                interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
              },
              defaultRule: {
                collateralCoefficientE6: 0.9 * E6,
                borrowCoefficientE6: 1.1 * E6,
                penaltyE6: 0.05 * E6,
              },
              restrictions: {
                maximalSupply: null,
                maximalDebt: null,
                minimalCollateral: '0',
                minimalDebt: '0',
              },
            },
            {
              metadata: {
                name: 'WMN',
                symbol: 'WMN',
                decimals: 9,
              },
              parameters: {
                incomeForSuppliersPartE6: 1000000 - 200,
                interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
              },
              defaultRule: {
                collateralCoefficientE6: 0.9 * E6,
                borrowCoefficientE6: 1.1 * E6,
                penaltyE6: 0.05 * E6,
              },
              restrictions: {
                maximalSupply: null,
                maximalDebt: null,
                minimalCollateral: '0',
                minimalDebt: '0',
              },
            },
          ],
          stableTokens: [],
        },
        priceOverridesE18: { BOI: '5000000000000000000', WMN: '50000000000000000' },
        shouldUseMockTimestamp: false,
        users: getSignersWithoutOwner(signers, 5),
        owner: signers[5],
      };
      testEnv = await deployAndConfigureSystem(customDeploymentConfig);
    });
    it('BlockTimestampProvider does not use mocked timestamp', async () => {
      const queryRes = (await testEnv.blockTimestampProvider.query.getShouldReturnMockValue()).value.ok;
      expect(queryRes).to.be.equal(false);
    });
    it('Contains deployed reserves', async () => {
      const reserveBOI = (await testEnv.lendingPool.query.viewUnupdatedReserveData(testEnv.reserves['BOI'].underlying.address)).value.ok;
      const aTokensBOI = (await testEnv.lendingPool.query.viewReserveTokens(testEnv.reserves['BOI'].underlying.address)).value.ok;

      expect.soft(reserveBOI).to.be.not.null;
      expect.soft(aTokensBOI?.aTokenAddress).to.be.ok;
      expect.flushSoft();
    });
  });

  describe('Partial overrides', () => {
    it('Price override', async () => {
      const priceToOverride = '500000000000000000';
      const reserveSymbol = 'WETH';
      //Arrange
      const customDeploymentConfig: Partial<DeploymentConfig> = {
        priceOverridesE18: { [reserveSymbol]: priceToOverride },
      };
      const testEnv: TestEnv = await deployAndConfigureSystem(customDeploymentConfig);

      const price = (await testEnv.oracle.query.getLatestPrice(reserveSymbol + '/USD')).value.ok!;
      expect(price[1].rawNumber.toString()).to.equal(priceToOverride);
    });
  });
});
