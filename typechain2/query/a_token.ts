/* This file is auto-generated */
// @ts-nocheck

import type { ContractPromise } from '@polkadot/api-contract';
import type { ApiPromise } from '@polkadot/api';
import type { ContractOptionsWithRequiredValue, Result } from '@c-forge/typechain-types';
import type { ContractOptions } from '@polkadot/api-contract/types';
import type { QueryReturnType } from '@c-forge/typechain-types';
import { queryJSON, queryOkJSON, handleReturnType } from '@c-forge/typechain-types';
import type * as ArgumentTypes from '../types-arguments/a_token';
import type * as ReturnTypes from '../types-returns/a_token';
import type BN from 'bn.js';
import { getTypeDescription } from '../shared/utils';
import DATA_TYPE_DESCRIPTIONS from '../data/a_token.json';
import { bnToBn } from '@polkadot/util';

export default class ATokenMethods {
  readonly __nativeContract: ContractPromise;
  readonly __apiPromise: ApiPromise;
  readonly __callerAddress: string;

  constructor(nativeContract: ContractPromise, nativeApi: ApiPromise, callerAddress: string) {
    this.__nativeContract = nativeContract;
    this.__callerAddress = callerAddress;
    this.__apiPromise = nativeApi;
  }

  /**
   * ownCodeHash
   *
   * @returns { Result<ReturnTypes.Hash, ReturnTypes.LangError> }
   */
  ownCodeHash(__options?: ContractOptions): Promise<QueryReturnType<Result<ReturnTypes.Hash, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'ownCodeHash', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(42, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * emitTransferEvents
   *
   * @param { Array<ArgumentTypes.TransferEventData> } transferEventData,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  emitTransferEvents(
    transferEventData: Array<ArgumentTypes.TransferEventData>,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(
      this.__apiPromise,
      this.__nativeContract,
      this.__callerAddress,
      'abacusToken::emitTransferEvents',
      [transferEventData],
      __options,
      (result) => {
        return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
      },
    );
  }

  /**
   * emitTransferEventAndDecreaseAllowance
   *
   * @param { ArgumentTypes.TransferEventData } transferEventData,
   * @param { ArgumentTypes.AccountId } from,
   * @param { ArgumentTypes.AccountId } to,
   * @param { (string | number | BN) } decreaseAllowanceBy,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  emitTransferEventAndDecreaseAllowance(
    transferEventData: ArgumentTypes.TransferEventData,
    from: ArgumentTypes.AccountId,
    to: ArgumentTypes.AccountId,
    decreaseAllowanceBy: string | number | BN,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(
      this.__apiPromise,
      this.__nativeContract,
      this.__callerAddress,
      'abacusToken::emitTransferEventAndDecreaseAllowance',
      [transferEventData, from, to, decreaseAllowanceBy],
      __options,
      (result) => {
        return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
      },
    );
  }

  /**
   * getLendingPool
   *
   * @returns { Result<ReturnTypes.AccountId, ReturnTypes.LangError> }
   */
  getLendingPool(__options?: ContractOptions): Promise<QueryReturnType<Result<ReturnTypes.AccountId, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'abacusToken::getLendingPool', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(50, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * totalSupply
   *
   * @returns { Result<BN, ReturnTypes.LangError> }
   */
  totalSupply(__options?: ContractOptions): Promise<QueryReturnType<Result<BN, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22::totalSupply', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * balanceOf
   *
   * @param { ArgumentTypes.AccountId } owner,
   * @returns { Result<BN, ReturnTypes.LangError> }
   */
  balanceOf(owner: ArgumentTypes.AccountId, __options?: ContractOptions): Promise<QueryReturnType<Result<BN, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22::balanceOf', [owner], __options, (result) => {
      return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * allowance
   *
   * @param { ArgumentTypes.AccountId } owner,
   * @param { ArgumentTypes.AccountId } spender,
   * @returns { Result<BN, ReturnTypes.LangError> }
   */
  allowance(
    owner: ArgumentTypes.AccountId,
    spender: ArgumentTypes.AccountId,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<BN, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22::allowance', [owner, spender], __options, (result) => {
      return handleReturnType(result, getTypeDescription(51, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * transfer
   *
   * @param { ArgumentTypes.AccountId } to,
   * @param { (string | number | BN) } value,
   * @param { Array<(number | string | BN)> } data,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  transfer(
    to: ArgumentTypes.AccountId,
    value: string | number | BN,
    data: Array<number | string | BN>,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22::transfer', [to, value, data], __options, (result) => {
      return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * transferFrom
   *
   * @param { ArgumentTypes.AccountId } from,
   * @param { ArgumentTypes.AccountId } to,
   * @param { (string | number | BN) } value,
   * @param { Array<(number | string | BN)> } data,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  transferFrom(
    from: ArgumentTypes.AccountId,
    to: ArgumentTypes.AccountId,
    value: string | number | BN,
    data: Array<number | string | BN>,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(
      this.__apiPromise,
      this.__nativeContract,
      this.__callerAddress,
      'psp22::transferFrom',
      [from, to, value, data],
      __options,
      (result) => {
        return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
      },
    );
  }

  /**
   * approve
   *
   * @param { ArgumentTypes.AccountId } spender,
   * @param { (string | number | BN) } value,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  approve(
    spender: ArgumentTypes.AccountId,
    value: string | number | BN,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22::approve', [spender, value], __options, (result) => {
      return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * increaseAllowance
   *
   * @param { ArgumentTypes.AccountId } spender,
   * @param { (string | number | BN) } deltaValue,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  increaseAllowance(
    spender: ArgumentTypes.AccountId,
    deltaValue: string | number | BN,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(
      this.__apiPromise,
      this.__nativeContract,
      this.__callerAddress,
      'psp22::increaseAllowance',
      [spender, deltaValue],
      __options,
      (result) => {
        return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
      },
    );
  }

  /**
   * decreaseAllowance
   *
   * @param { ArgumentTypes.AccountId } spender,
   * @param { (string | number | BN) } deltaValue,
   * @returns { Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError> }
   */
  decreaseAllowance(
    spender: ArgumentTypes.AccountId,
    deltaValue: string | number | BN,
    __options?: ContractOptions,
  ): Promise<QueryReturnType<Result<Result<null, ReturnTypes.PSP22Error>, ReturnTypes.LangError>>> {
    return queryOkJSON(
      this.__apiPromise,
      this.__nativeContract,
      this.__callerAddress,
      'psp22::decreaseAllowance',
      [spender, deltaValue],
      __options,
      (result) => {
        return handleReturnType(result, getTypeDescription(47, DATA_TYPE_DESCRIPTIONS));
      },
    );
  }

  /**
   * tokenName
   *
   * @returns { Result<string | null, ReturnTypes.LangError> }
   */
  tokenName(__options?: ContractOptions): Promise<QueryReturnType<Result<string | null, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22Metadata::tokenName', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * tokenSymbol
   *
   * @returns { Result<string | null, ReturnTypes.LangError> }
   */
  tokenSymbol(__options?: ContractOptions): Promise<QueryReturnType<Result<string | null, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22Metadata::tokenSymbol', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(53, DATA_TYPE_DESCRIPTIONS));
    });
  }

  /**
   * tokenDecimals
   *
   * @returns { Result<BN, ReturnTypes.LangError> }
   */
  tokenDecimals(__options?: ContractOptions): Promise<QueryReturnType<Result<BN, ReturnTypes.LangError>>> {
    return queryOkJSON(this.__apiPromise, this.__nativeContract, this.__callerAddress, 'psp22Metadata::tokenDecimals', [], __options, (result) => {
      return handleReturnType(result, getTypeDescription(54, DATA_TYPE_DESCRIPTIONS));
    });
  }
}
