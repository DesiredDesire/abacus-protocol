use ink::prelude::format;
use pendzl::contracts::{
    access_control::AccessControlError, pausable::PausableError,
    psp22::PSP22Error,
};

use crate::{
    library::math::MathError,
    traits::flash_loan_receiver::FlashLoanReceiverError,
};

#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum LendingPoolError {
    // PSP22Error(PSP22Error),
    FlashLoanReceiverError(FlashLoanReceiverError),

    AccessControlError(AccessControlError),
    PausableError(PausableError),
    MathError(MathError),
    Inactive,
    AlreadySet,
    Freezed,
    AlreadyRegistered,
    AssetNotRegistered,
    AssetIsProtocolStablecoin,
    RuleBorrowDisable,
    RuleCollateralDisable,
    InsufficientCollateral,
    MinimalCollateralDeposit,
    MinimalDebt,
    InsufficientDebt,
    Collaterized,
    InsufficientDeposit,
    MinimumRecieved,
    AmountNotGreaterThanZero,
    AssetPriceNotInitialized,
    NothingToRepay,
    NothingToCompensateWith,
    RepayingWithACollateral,
    TakingNotACollateral,
    FlashLoanAmountsAssetsInconsistentLengths,
    MaxSupplyReached,
    MaxDebtReached,
    MarketRuleInvalidAssetId,
    MarketRuleInvalidId,
    MarketRulePenaltyNotSet,
    PriceMissing,
    AccumulatedAlready,
    PSP22Error,
}

impl From<MathError> for LendingPoolError {
    fn from(error: MathError) -> Self {
        LendingPoolError::MathError(error)
    }
}

impl From<PSP22Error> for LendingPoolError {
    fn from(_error: PSP22Error) -> Self {
        LendingPoolError::PSP22Error
    }
}

impl From<AccessControlError> for LendingPoolError {
    fn from(error: AccessControlError) -> Self {
        LendingPoolError::AccessControlError(error)
    }
}

impl From<PausableError> for LendingPoolError {
    fn from(error: PausableError) -> Self {
        LendingPoolError::PausableError(error)
    }
}

impl From<LendingPoolError> for PSP22Error {
    fn from(error: LendingPoolError) -> Self {
        match error {
            LendingPoolError::MathError(MathError::Underflow) => {
                PSP22Error::InsufficientBalance
            }
            e => PSP22Error::Custom(format!("{:?}", e).into()),
        }
    }
}

impl From<FlashLoanReceiverError> for LendingPoolError {
    fn from(flash_error: FlashLoanReceiverError) -> Self {
        LendingPoolError::FlashLoanReceiverError(flash_error)
    }
}
