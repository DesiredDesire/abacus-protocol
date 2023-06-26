import BN from 'bn.js';

//TODO populate/remove after addition of roles tests
export const Roles = {
  DefaultAdminRole: 0,
  Minter: 0xfd9ab216,
};

export enum RateMode {
  None = '0',
  Stable = '1',
  Variable = '2',
}

export enum LendingToken {
  AToken = 'AToken',
  VToken = 'VToken',
  SToken = 'SToken',
}
export const ONE_YEAR = new BN('31536000');

export const FLASH_BORROWER = 1112475474;
export const ASSET_LISTING_ADMIN = 1094072439;
export const PARAMETERS_ADMIN = 368001360;
export const EMERGENCY_ADMIN = 297099943;
export const GLOBAL_ADMIN = 2459877095;
export const ROLE_ADMIN = 0;
export const TREASURY = 2434241257;
