use abax_library::structs::{
    ReserveAbacusTokens, ReserveData, ReserveFees, ReserveIndexes,
    ReserveRestrictions, UserConfig, UserReserveData,
};
use ink::{
    contract_ref, env::DefaultEnvironment, prelude::vec::Vec,
    primitives::AccountId,
};

use crate::lending_pool::{
    DecimalMultiplier, InterestRateModel, MarketRule, RuleId,
};

pub type LendingPoolViewRef =
    contract_ref!(LendingPoolView, DefaultEnvironment);

/// Trait containing non-mutable messages - this trait should not be called by other smart contracts.
/// The main use of this trait is to read data from the `LendingPool`'s storage to the off-chain world.
#[ink::trait_definition]
pub trait LendingPoolView {
    #[ink(message)]
    fn view_flash_loan_fee_e6(&self) -> u128;
    #[ink(message)]
    fn view_asset_id(&self, asset: AccountId) -> Option<RuleId>;
    #[ink(message)]
    fn view_registered_assets(&self) -> Vec<AccountId>;
    #[ink(message)]
    fn view_reserve_data(&self, asset: AccountId) -> Option<ReserveData>;
    #[ink(message)]
    fn view_unupdated_reserve_indexes(
        &self,
        asset: AccountId,
    ) -> Option<ReserveIndexes>;
    #[ink(message)]
    fn view_reserve_indexes(&self, asset: AccountId) -> Option<ReserveIndexes>;
    #[ink(message)]
    fn view_reserve_fees(&self, asset: AccountId) -> Option<ReserveFees>;
    #[ink(message)]
    fn view_interest_rate_model(
        &self,
        asset: AccountId,
    ) -> Option<InterestRateModel>;
    #[ink(message)]
    fn view_reserve_restrictions(
        &self,
        asset: AccountId,
    ) -> Option<ReserveRestrictions>;
    #[ink(message)]
    fn view_reserve_tokens(
        &self,
        asset: AccountId,
    ) -> Option<ReserveAbacusTokens>;
    #[ink(message)]
    fn view_reserve_decimal_multiplier(
        &self,
        asset: AccountId,
    ) -> Option<DecimalMultiplier>;
    #[ink(message)]
    fn view_unupdated_user_reserve_data(
        &self,
        asset: AccountId,
        account: AccountId,
    ) -> UserReserveData;
    #[ink(message)]
    fn view_user_reserve_data(
        &self,
        asset: AccountId,
        account: AccountId,
    ) -> UserReserveData;
    #[ink(message)]
    fn view_user_config(&self, user: AccountId) -> UserConfig;
    #[ink(message)]
    fn view_market_rule(&self, market_rule_id: RuleId) -> Option<MarketRule>;
    #[ink(message)]
    fn get_user_free_collateral_coefficient(
        &self,
        user_address: AccountId,
    ) -> (bool, u128);

    #[ink(message)]
    fn view_protocol_income(
        &self,
        assets: Option<Vec<AccountId>>,
    ) -> Vec<(AccountId, i128)>;
}
