use crate::{
    impls::lending_pool::{
        internal::InternalIncome,
        storage::{
            lending_pool_storage::LendingPoolStorage,
            structs::reserve_data::ReserveData,
        },
    },
    traits::lending_pool::{errors::LendingPoolError, events::*},
};
use ink::prelude::{vec, vec::Vec};
use openbrush::{
    contracts::{access_control::*, psp22::PSP22Ref},
    traits::{AccountId, Balance, Storage},
};

use super::{
    internal::TimestampMock,
    storage::{
        lending_pool_storage::MarketRule,
        structs::{
            asset_rules::AssetRules,
            reserve_data::{
                ReserveAbacusTokens, ReserveDataParameters, ReservePrice,
                ReserveRestrictions,
            },
        },
    },
};

/// pays only 10% of standard flash loan fee
pub const FLASH_BORROWER: RoleType = ink::selector_id!("FLASH_BORROWER"); // 1_112_475_474_u32
/// can add new asset to the market
pub const ASSET_LISTING_ADMIN: RoleType =
    ink::selector_id!("ASSET_LISTING_ADMIN"); // 1_094_072_439_u32
/// can modify reserveData parameters
pub const PARAMETERS_ADMIN: RoleType = ink::selector_id!("PARAMETERS_ADMIN"); // 368_001_360_u32
/// can pause/unpause freeze/unfreeze reserves
pub const EMERGENCY_ADMIN: RoleType = ink::selector_id!("EMERGENCY_ADMIN"); // 297_099_943_u32
/// can do what ASSET_LISTING_ADMIN, PARAMETERS_ADMIN and EMERGANCY_ADMIN can do
pub const GLOBAL_ADMIN: RoleType = ink::selector_id!("GLOBAL_ADMIN"); // 2_459_877_095_u32
/// can assign all the roles
pub const ROLE_ADMIN: RoleType = 0; // 0
/// can withdraw protocol income
pub const TREASURY: RoleType = ink::selector_id!("TREASURY"); // 2_434_241_257_u32

pub trait LendingPoolManageImpl:
    Storage<LendingPoolStorage>
    + Storage<access_control::Data>
    + InternalIncome
    + EmitManageEvents
    + AccessControlImpl
{
    /// used for testing
    fn set_block_timestamp_provider(
        &mut self,
        provider_address: AccountId,
    ) -> Result<(), LendingPoolError> {
        self.data::<LendingPoolStorage>()
            .block_timestamp_provider
            .set(&provider_address);
        Ok(())
    }

    fn register_asset(
        &mut self,
        asset: AccountId,
        decimals: u128,
        collateral_coefficient_e6: Option<u128>,
        borrow_coefficient_e6: Option<u128>,
        penalty_e6: Option<u128>,
        maximal_total_supply: Option<Balance>,
        maximal_total_debt: Option<Balance>,
        minimal_collateral: Balance,
        minimal_debt: Balance,
        income_for_suppliers_part_e6: u128,
        flash_loan_fee_e6: u128,
        interest_rate_model: [u128; 7],
        a_token_address: AccountId,
        v_token_address: AccountId,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(ASSET_LISTING_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }

        let timestamp = self._timestamp();

        self.data::<LendingPoolStorage>()
            .account_for_register_asset(
                &asset,
                &ReserveData::new(
                    &interest_rate_model,
                    &income_for_suppliers_part_e6,
                    &flash_loan_fee_e6,
                    &timestamp,
                ),
                &ReserveRestrictions::new(
                    &maximal_total_supply,
                    &maximal_total_debt,
                    &minimal_collateral,
                    &minimal_debt,
                ),
                &ReservePrice::new(&decimals),
                &ReserveAbacusTokens::new(&a_token_address, &v_token_address),
            )?;

        self._emit_asset_registered_event(
            &asset,
            decimals,
            &a_token_address,
            &v_token_address,
        );
        self._emit_reserve_parameters_changed_event(
            &asset,
            &interest_rate_model,
            maximal_total_supply,
            maximal_total_debt,
            minimal_collateral,
            minimal_debt,
            income_for_suppliers_part_e6,
            flash_loan_fee_e6,
        );
        self._emit_asset_rules_changed(
            &0,
            &asset,
            &collateral_coefficient_e6,
            &borrow_coefficient_e6,
            &penalty_e6,
        );
        Ok(())
    }

    fn set_reserve_is_active(
        &mut self,
        asset: AccountId,
        active: bool,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(EMERGENCY_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }
        self.data::<LendingPoolStorage>()
            .account_for_changing_activity(&asset, active)?;

        self._emit_reserve_activated_event(&asset, active);

        Ok(())
    }

    fn set_reserve_is_freezed(
        &mut self,
        asset: AccountId,
        freeze: bool,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(EMERGENCY_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }
        self.data::<LendingPoolStorage>()
            .account_for_changing_is_freezed(&asset, freeze)?;
        self._emit_reserve_freezed_event(&asset, freeze);
        Ok(())
    }

    fn set_reserve_restrictions(
        &mut self,
        asset: AccountId,
        maximal_total_supply: Option<Balance>,
        maximal_total_debt: Option<Balance>,
        minimal_collateral: Balance,
        minimal_debt: Balance,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(PARAMETERS_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }
        self.data::<LendingPoolStorage>()
            .account_for_reserve_restricitions_change(
                &asset,
                &ReserveRestrictions {
                    maximal_total_supply,
                    maximal_total_debt,
                    minimal_collateral,
                    minimal_debt,
                },
            )?;

        Ok(())
    }

    fn set_reserve_parameters(
        &mut self,
        asset: AccountId,
        interest_rate_model: [u128; 7],
        income_for_suppliers_part_e6: u128,
        flash_loan_fee_e6: u128,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(PARAMETERS_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }
        let timestamp = self._timestamp();
        self.data::<LendingPoolStorage>()
            .account_for_reserve_data_parameters_change(
                &asset,
                &ReserveDataParameters {
                    interest_rate_model,
                    income_for_suppliers_part_e6,
                    flash_loan_fee_e6,
                },
                &timestamp,
            )?;
        Ok(())
    }

    fn add_market_rule(
        &mut self,
        market_rule_id: u32,
        market_rule: MarketRule,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(PARAMETERS_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }

        self.data::<LendingPoolStorage>()
            .account_for_add_market_rule(&market_rule)?;

        let registerd_assets = self
            .data::<LendingPoolStorage>()
            .get_all_registered_assets();

        for asset_id in 0..market_rule.len() {
            match market_rule[asset_id] {
                Some(asset_rules) => {
                    self._emit_asset_rules_changed(
                        &market_rule_id,
                        &registerd_assets[asset_id],
                        &asset_rules.collateral_coefficient_e6,
                        &asset_rules.borrow_coefficient_e6,
                        &asset_rules.penalty_e6,
                    );
                }
                None => (),
            }
        }

        Ok(())
    }

    fn modify_asset_rule(
        &mut self,
        market_rule_id: u32,
        asset: AccountId,
        collateral_coefficient_e6: Option<u128>,
        borrow_coefficient_e6: Option<u128>,
        penalty_e6: Option<u128>,
    ) -> Result<(), LendingPoolError> {
        let caller = Self::env().caller();
        if !(self.has_role(PARAMETERS_ADMIN, caller.into())
            || self.has_role(GLOBAL_ADMIN, caller.into()))
        {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }

        self.data::<LendingPoolStorage>()
            .account_for_asset_rule_change(
                &market_rule_id,
                &asset,
                &AssetRules {
                    collateral_coefficient_e6,
                    borrow_coefficient_e6,
                    penalty_e6,
                },
            )?;

        self._emit_asset_rules_changed(
            &market_rule_id,
            &asset,
            &collateral_coefficient_e6,
            &borrow_coefficient_e6,
            &penalty_e6,
        );

        Ok(())
    }

    fn take_protocol_income(
        &mut self,
        assets: Option<Vec<AccountId>>,
        to: AccountId,
    ) -> Result<Vec<(AccountId, i128)>, LendingPoolError> {
        let caller = Self::env().caller();
        if !self._has_role(TREASURY, &Some(caller)) {
            return Err(LendingPoolError::from(
                AccessControlError::MissingRole,
            ));
        }
        let assets_and_amounts = match assets {
            Some(assets_vec) => self._get_protocol_income(&assets_vec)?,
            None => {
                let registered_assets = self
                    .data::<LendingPoolStorage>()
                    .get_all_registered_assets();
                self._get_protocol_income(&registered_assets)?
            }
        };

        for asset_and_amount in
            assets_and_amounts.iter().take_while(|x| x.1.is_positive())
        {
            PSP22Ref::transfer(
                &asset_and_amount.0,
                to,
                asset_and_amount.1 as Balance,
                vec![],
            )?;
            self._emit_income_taken(&asset_and_amount.0);
        }

        Ok(assets_and_amounts)
    }
}
