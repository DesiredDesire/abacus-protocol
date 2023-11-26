import { TokensToDeployForTesting } from './tokensToDeployForTesting.types';

/* eslint-disable */
export const DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING: [number, number, number, number, number, number, number] = [
  300_000, 500_000, 2_000_000, 4_000_000, 10_000_000, 100_000_000, 300_000_000,
];

export const E6: number = 1_000_000;

export const TOKENS_TO_DEPLOY_FOR_TESTING: TokensToDeployForTesting = {
  reserveTokens: [
    {
      metadata: {
        name: 'DAI',
        symbol: 'DAI',
        decimals: 6,
      },
      parameters: {
        incomeForSuppliersPartE6: 1000000 - 10,
        interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
      },
      defaultRule: {
        collateralCoefficientE6: 0.97 * E6,
        borrowCoefficientE6: 1.03 * E6,
        penaltyE6: 0.015 * E6,
      },
      restrictions: {
        maximalSupply: null,
        maximalDebt: null,
        minimalCollateral: '2000000',
        minimalDebt: '1000000',
      },
    },
    {
      metadata: {
        name: 'USDC',
        symbol: 'USDC',
        decimals: 6,
      },
      parameters: {
        incomeForSuppliersPartE6: 1000000 - 10,
        interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
      },
      defaultRule: {
        collateralCoefficientE6: 0.98 * E6,
        borrowCoefficientE6: 1.02 * E6,
        penaltyE6: 0.01 * E6,
      },
      restrictions: {
        maximalSupply: null,
        maximalDebt: null,
        minimalCollateral: '2000',
        minimalDebt: '1000',
      },
    },
    {
      metadata: {
        name: 'WETH',
        symbol: 'WETH',
        decimals: 18,
      },
      parameters: {
        incomeForSuppliersPartE6: 1000000 - 10,
        interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
      },
      defaultRule: {
        collateralCoefficientE6: 0.8 * E6,
        borrowCoefficientE6: 1.2 * E6,
        penaltyE6: 0.1 * E6,
      },
      restrictions: {
        maximalSupply: null,
        maximalDebt: null,
        minimalCollateral: '2000',
        minimalDebt: '1000',
      },
    },
    {
      metadata: {
        name: 'LINK',
        symbol: 'LINK',
        decimals: 18,
      },
      parameters: {
        incomeForSuppliersPartE6: 1000000 - 10,
        interestRateModelE24: DEFAULT_INTEREST_RATE_MODEL_FOR_TESTING,
      },
      defaultRule: {
        collateralCoefficientE6: 0.7 * E6,
        borrowCoefficientE6: 1.3 * E6,
        penaltyE6: 0.15 * E6,
      },
      restrictions: {
        maximalSupply: '1000000000000000000000000000',
        maximalDebt: '1000000000000000000000000000',
        minimalCollateral: '2000',
        minimalDebt: '1000',
      },
    },
  ],
  stableTokens: [
    {
      metadata: {
        name: 'USDax',
        symbol: 'USDax',
        decimals: 6,
      },
      defaultRule: {
        collateralCoefficientE6: null,
        borrowCoefficientE6: 1.1 * E6,
        penaltyE6: 0.05 * E6,
      },
      restrictions: {
        maximalSupply: '0',
        maximalDebt: '1000000000000',
        minimalCollateral: '2000',
        minimalDebt: '1000000',
      },
      debtRate: '350000',
    },
  ],
};
