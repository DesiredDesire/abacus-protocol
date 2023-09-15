use openbrush::traits::{AccountId, Balance};

use crate::impls::lending_pool::storage::lending_pool_storage::RuleId;

#[openbrush::trait_definition]
pub trait EmitDepositEvents {
    fn _emit_deposit_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
    fn _emit_redeem_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
}

#[openbrush::trait_definition]
pub trait EmitBorrowEvents {
    fn _emit_market_rule_chosen(
        &mut self,
        user: &AccountId,
        market_rule_id: &RuleId,
    );
    fn _emit_collateral_set_event(
        &mut self,
        asset: AccountId,
        user: AccountId,
        set: bool,
    );
    fn _emit_borrow_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
    fn _emit_repay_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    );
}

#[openbrush::trait_definition]
pub trait EmitConfigureEvents {
    fn _emit_choose_rule_event(&mut self, caller: AccountId, rule_id: u64);
}

#[openbrush::trait_definition]
pub trait EmitFlashEvents {
    fn _emit_flash_loan_event(
        &mut self,
        receiver_address: AccountId,
        caller: AccountId,
        asset: AccountId,
        amount: u128,
        fee: u128,
    );
}

#[openbrush::trait_definition]
pub trait EmitLiquidateEvents {
    fn _emit_liquidation_variable_event(
        &mut self,
        liquidator: AccountId,
        user: AccountId,
        asset_to_rapay: AccountId,
        asset_to_take: AccountId,
        amount_repaid: Balance,
        amount_taken: Balance,
    );
}

#[openbrush::trait_definition]
pub trait EmitMaintainEvents {
    fn _emit_accumulate_interest_event(&mut self, asset: &AccountId);
    fn _emit_accumulate_user_interest_event(
        &mut self,
        asset: &AccountId,
        user: &AccountId,
    );
    fn _emit_rebalance_rate_event(
        &mut self,
        asset: &AccountId,
        user: &AccountId,
    );
}

#[openbrush::trait_definition]
pub trait EmitManageEvents {
    fn _emit_asset_registered_event(
        &mut self,
        asset: &AccountId,
        decimals: u128,
        a_token_address: &AccountId,
        v_token_address: &AccountId,
    );

    fn _emit_reserve_activated_event(
        &mut self,
        asset: &AccountId,
        active: bool,
    );
    fn _emit_reserve_freezed_event(&mut self, asset: &AccountId, freezed: bool);

    fn _emit_reserve_parameters_changed_event(
        &mut self,
        asset: &AccountId,
        interest_rate_model: &[u128; 7],
        maximal_total_supply: Option<Balance>,
        maximal_total_debt: Option<Balance>,
        minimal_collateral: Balance,
        minimal_debt: Balance,
        income_for_suppliers_part_e6: u128,
        flash_loan_fee_e6: u128,
    );

    fn _emit_asset_rules_changed(
        &mut self,
        market_rule_id: &u32,
        asset: &AccountId,
        collateral_coefficient_e6: &Option<u128>,
        borrow_coefficient_e6: &Option<u128>,
        penalty_e6: &Option<u128>,
    );

    fn _emit_income_taken(&mut self, asset: &AccountId);
}
