// TODO::think should we emit events on set_as_collateral
use crate::{
    impls::{
        constants::MATH_ERROR_MESSAGE,
        lending_pool::{
            internal::{
                Internal,
                *,
            },
            storage::{
                lending_pool_storage::LendingPoolStorage,
                structs::{
                    reserve_data::ReserveData,
                    user_config::UserConfig,
                    user_reserve_data::*,
                },
            },
        },
    },
    traits::{
        block_timestamp_provider::BlockTimestampProviderRef,
        lending_pool::{
            errors::LendingPoolError,
            events::*,
            traits::actions::LendingPoolBorrow,
        },
    },
};
use checked_math::checked_math;
use ink::prelude::vec::Vec;
use openbrush::{
    contracts::traits::psp22::*,
    traits::{
        AccountId,
        Balance,
        Storage,
    },
};

impl<T: Storage<LendingPoolStorage> + BorrowInternal + EmitBorrowEvents> LendingPoolBorrow for T {
    default fn set_as_collateral(
        &mut self,
        asset: AccountId,
        use_as_collateral_to_set: bool,
    ) -> Result<(), LendingPoolError> {
        //// PULL DATA AND INIT CONDITIONS CHECK
        let caller = Self::env().caller();
        let reserve_data = self.data::<LendingPoolStorage>().get_reserve_data(&asset)?;
        let user_reserve_data = self.data::<LendingPoolStorage>().get_user_reserve(&asset, &caller)?;
        _check_enough_supply_to_be_collateral(&reserve_data, &user_reserve_data)?;
        let mut user_config = self.data::<LendingPoolStorage>().get_or_create_user_config(&caller);
        let collateral_coefficient_e6 = reserve_data.collateral_coefficient_e6;
        if use_as_collateral_to_set && collateral_coefficient_e6.is_none() {
            return Err(LendingPoolError::RuleCollateralDisable)
        }
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);

        //// MODIFY PULLED STORAGE
        if use_as_collateral_to_set {
            user_config.collaterals |= 1_u128 << reserve_data.id;
        } else {
            user_config.collaterals &= !(1_u128 << reserve_data.id);
        }

        //// PUSH STORAGE & FINAL CONDION CHECK
        self.data::<LendingPoolStorage>()
            .insert_user_config(&caller, &user_config);
        if !use_as_collateral_to_set {
            let (collaterized, _) = self._get_user_free_collateral_coefficient_e6(&caller, block_timestamp);
            if !collaterized {
                return Err(LendingPoolError::InsufficientUserFreeCollateral)
            }
        }

        Ok(())
    }

    default fn borrow(
        &mut self,
        asset: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
        data: Vec<u8>,
    ) -> Result<(), LendingPoolError> {
        // TODO:: Check the maximum borrow
        if data.len() == 0 {
            return Err(LendingPoolError::UnspecifiedAction)
        }
        //// PULL DATA AND INIT CONDITIONS CHECK
        if amount == 0 {
            return Err(LendingPoolError::AmountNotGreaterThanZero)
        }
        let (mut reserve_data, mut on_behalf_of_reserve_data, mut on_behalf_of_config) =
            self._pull_data_for_borrow(&asset, &on_behalf_of)?;
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        //// MODIFY PULLED STORAGE
        // accumulate
        let (
            interest_on_behalf_of_supply,
            interest_on_behalf_of_variable_borrow,
            interest_on_behalf_of_stable_borrow,
        ): (Balance, Balance, Balance) = _accumulate_interest(
            &mut reserve_data,
            &mut on_behalf_of_reserve_data,
            block_timestamp,
        );
        // modify state
        match data[0] {
            0 => {
                ink::env::debug_println!("(borrow-variable)");
                _check_borrowing_enabled(&reserve_data)?;
                _change_state_borrow_variable(
                    &mut reserve_data,
                    &mut on_behalf_of_reserve_data,
                    &mut on_behalf_of_config,
                    amount,
                );
                _check_enough_variable_debt(&reserve_data, &on_behalf_of_reserve_data)?;
                //// ABACUS TOKEN EVENTS
                // ATOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.a_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_supply as i128,
                )?;
                // VTOKEN
                _emit_abacus_token_transfer_event_and_decrease_allowance(
                    &reserve_data.v_token_address,
                    &on_behalf_of,
                    (interest_on_behalf_of_variable_borrow + amount) as i128,
                    &(Self::env().caller()),
                    amount,
                )?;
                // STOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.s_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_stable_borrow as i128,
                )?;
                self._emit_borrow_variable_event(asset, Self::env().caller(), on_behalf_of, amount);
            }
            1 => {
                _check_borrowing_stable_enabled(&reserve_data)?;
                let new_stable_borrow_rate_e24 = _change_state_borrow_stable(
                    &mut reserve_data,
                    &mut on_behalf_of_reserve_data,
                    &mut on_behalf_of_config,
                    amount,
                )?;
                _check_enough_stable_debt(&reserve_data, &on_behalf_of_reserve_data)?;
                //// ABACUS TOKEN EVENTS
                // ATOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.a_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_supply as i128,
                )?;
                // VTOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.v_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_variable_borrow as i128,
                )?;
                // STOKEN
                _emit_abacus_token_transfer_event_and_decrease_allowance(
                    &reserve_data.s_token_address,
                    &on_behalf_of,
                    (interest_on_behalf_of_stable_borrow + amount) as i128,
                    &(Self::env().caller()),
                    amount,
                )?;
                self._emit_borrow_stable_event(
                    asset,
                    Self::env().caller(),
                    on_behalf_of,
                    amount,
                    new_stable_borrow_rate_e24,
                );
            }
            _ => return Err(LendingPoolError::UnspecifiedAction),
        }

        // recalculate
        reserve_data._recalculate_current_rates()?;
        // PUSH DATA
        self._push_data(
            &asset,
            &on_behalf_of,
            &reserve_data,
            &on_behalf_of_reserve_data,
            &on_behalf_of_config,
        );
        // check if there ie enought collateral
        let (collaterized, collateral_value) =
            self._get_user_free_collateral_coefficient_e6(&on_behalf_of, block_timestamp);
        if !collaterized {
            ink::env::debug_println!("Pool | User is undercollaterized: {}", collateral_value);
            return Err(LendingPoolError::InsufficientUserFreeCollateral)
        }
        //// TOKEN TRANSFER
        PSP22Ref::transfer(&asset, Self::env().caller(), amount, Vec::<u8>::new())?;
        Ok(())
    }

    default fn repay(
        &mut self,
        asset: AccountId,
        on_behalf_of: AccountId,
        amount: Option<Balance>,
        data: Vec<u8>,
    ) -> Result<Balance, LendingPoolError> {
        //// PULL DATA AND INIT CONDITIONS CHECK
        if data.len() == 0 {
            return Err(LendingPoolError::UnspecifiedAction)
        }
        let (mut reserve_data, mut on_behalf_of_reserve_data, mut on_behalf_of_config) =
            self._pull_data_for_repay(&asset, &on_behalf_of)?;
        _check_activeness(&reserve_data)?;
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        // MODIFY PULLED STORAGE & AMOUNT CHECKS
        // accumulate
        let (
            interest_on_behalf_of_supply,
            interest_on_behalf_of_variable_borrow,
            interest_on_behalf_of_stable_borrow,
        ): (Balance, Balance, Balance) = _accumulate_interest(
            &mut reserve_data,
            &mut on_behalf_of_reserve_data,
            block_timestamp,
        );
        let amount_val: Balance;
        match data[0] {
            0 => {
                amount_val = _change_state_repay_variable(
                    &mut reserve_data,
                    &mut on_behalf_of_reserve_data,
                    &mut on_behalf_of_config,
                    amount,
                )?;
                if (on_behalf_of_config.borrows_variable >> reserve_data.id) & 1 == 1 {
                    _check_enough_variable_debt(&reserve_data, &on_behalf_of_reserve_data)?;
                }
                //// ABACUS TOKEN EVENTS
                // ATOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.a_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_supply as i128,
                )?;
                // VTOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.v_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_variable_borrow as i128 - amount_val as i128,
                )?;
                // STOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.s_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_stable_borrow as i128,
                )?;
                //// EVENT
                self._emit_repay_variable_event(asset, Self::env().caller(), on_behalf_of, amount_val);
            }
            1 => {
                amount_val = _change_state_repay_stable(
                    &mut reserve_data,
                    &mut on_behalf_of_reserve_data,
                    &mut on_behalf_of_config,
                    amount,
                )?;
                if (on_behalf_of_config.borrows_stable >> reserve_data.id) & 1 == 1 {
                    _check_enough_stable_debt(&reserve_data, &on_behalf_of_reserve_data)?;
                }
                //// ABACUS TOKEN EVENTS
                // ATOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.a_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_supply as i128,
                )?;
                // VTOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.v_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_variable_borrow as i128,
                )?;
                // STOKEN
                _emit_abacus_token_transfer_event(
                    &reserve_data.s_token_address,
                    &on_behalf_of,
                    interest_on_behalf_of_stable_borrow as i128 - amount_val as i128,
                )?;
                //// EVENT
                self._emit_repay_stable_event(asset, Self::env().caller(), on_behalf_of, amount_val);
            }
            _ => return Err(LendingPoolError::UnspecifiedAction),
        }
        // recalculate
        reserve_data._recalculate_current_rates()?;
        // PUSH DATA
        self._push_data(
            &asset,
            &on_behalf_of,
            &reserve_data,
            &on_behalf_of_reserve_data,
            &on_behalf_of_config,
        );
        // check if there ie enought collateral
        let (collaterized, collateral_value) =
            self._get_user_free_collateral_coefficient_e6(&on_behalf_of, block_timestamp);
        if !collaterized {
            ink::env::debug_println!("Pool | User is undercollaterized: {}", collateral_value);
            return Err(LendingPoolError::InsufficientUserFreeCollateral)
        }
        //// TOKEN TRANSFER
        PSP22Ref::transfer_from_builder(
            &asset,
            Self::env().caller(),
            Self::env().account_id(),
            amount_val,
            Vec::<u8>::new(),
        )
        .call_flags(ink::env::CallFlags::default().set_allow_reentry(true))
        .try_invoke()
        .unwrap()??;
        Ok(amount_val)
    }
}

pub trait BorrowInternal {
    fn _pull_data_for_borrow(
        &self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
    ) -> Result<(ReserveData, UserReserveData, UserConfig), LendingPoolError>;

    fn _pull_data_for_repay(
        &self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
    ) -> Result<(ReserveData, UserReserveData, UserConfig), LendingPoolError>;
    fn _push_data(
        &mut self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
        reserve_data: &ReserveData,
        on_behalf_of_reserve_data: &UserReserveData,
        on_behalf_of_config: &UserConfig,
    );
}

impl<T: Storage<LendingPoolStorage>> BorrowInternal for T {
    fn _pull_data_for_borrow(
        &self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
    ) -> Result<(ReserveData, UserReserveData, UserConfig), LendingPoolError> {
        let reserve_data = self.data::<LendingPoolStorage>().get_reserve_data(asset)?;
        let on_behalf_of_reserve_data = self
            .data::<LendingPoolStorage>()
            .get_or_create_user_reserve(&asset, &on_behalf_of);
        let on_behalf_of_config = self
            .data::<LendingPoolStorage>()
            .get_or_create_user_config(on_behalf_of);
        Ok((reserve_data, on_behalf_of_reserve_data, on_behalf_of_config))
    }

    fn _pull_data_for_repay(
        &self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
    ) -> Result<(ReserveData, UserReserveData, UserConfig), LendingPoolError> {
        let reserve_data = self.data::<LendingPoolStorage>().get_reserve_data(asset)?;
        let on_behalf_of_reserve_data = self
            .data::<LendingPoolStorage>()
            .get_user_reserve(&asset, &on_behalf_of)?;
        let on_behalf_of_config = self.data::<LendingPoolStorage>().get_user_config(on_behalf_of)?;
        Ok((reserve_data, on_behalf_of_reserve_data, on_behalf_of_config))
    }

    fn _push_data(
        &mut self,
        asset: &AccountId,
        on_behalf_of: &AccountId,
        reserve_data: &ReserveData,
        on_behalf_of_reserve_data: &UserReserveData,
        on_behalf_of_config: &UserConfig,
    ) {
        self.data::<LendingPoolStorage>()
            .insert_reserve_data(asset, reserve_data);
        self.data::<LendingPoolStorage>()
            .insert_user_reserve(asset, on_behalf_of, on_behalf_of_reserve_data);
        self.data::<LendingPoolStorage>()
            .insert_user_config(on_behalf_of, on_behalf_of_config);
    }
}

impl<T: Storage<LendingPoolStorage>> EmitBorrowEvents for T {
    #![allow(unused_variables)]
    default fn _emit_borrow_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    ) {
    }
    default fn _emit_repay_variable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    ) {
    }
    default fn _emit_borrow_stable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
        stable_rate: u128,
    ) {
    }
    default fn _emit_repay_stable_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    ) {
    }
}

fn _change_state_borrow_variable(
    reserve_data: &mut ReserveData,
    on_behalf_of_reserve_data: &mut UserReserveData,
    on_behalf_of_config: &mut UserConfig,
    amount: u128,
) {
    // add variable debt
    on_behalf_of_config.borrows_variable |= 1_u128 << reserve_data.id;

    on_behalf_of_reserve_data.variable_borrowed = on_behalf_of_reserve_data
        .variable_borrowed
        .checked_add(amount)
        .expect(MATH_ERROR_MESSAGE);
    reserve_data.total_variable_borrowed = reserve_data
        .total_variable_borrowed
        .checked_add(amount)
        .expect(MATH_ERROR_MESSAGE);
}

fn _change_state_borrow_stable(
    reserve_data: &mut ReserveData,
    on_behalf_of_reserve_data: &mut UserReserveData,
    on_behalf_of_config: &mut UserConfig,
    amount: u128,
) -> Result<u128, LendingPoolError> {
    on_behalf_of_config.borrows_stable |= 1_u128 << reserve_data.id;

    let new_stable_borrow_rate_e24: u128 = reserve_data._after_borrow_stable_borrow_rate_e24(amount)?;
    on_behalf_of_reserve_data.stable_borrow_rate_e24 = {
        let stable_borrow_rate_e24_rounded_down = u128::try_from(
            checked_math!(
                (on_behalf_of_reserve_data.stable_borrow_rate_e24 * on_behalf_of_reserve_data.stable_borrowed
                    + new_stable_borrow_rate_e24 * amount)
                    / (on_behalf_of_reserve_data.stable_borrowed + amount)
            )
            .unwrap(),
        )
        .expect(MATH_ERROR_MESSAGE);
        stable_borrow_rate_e24_rounded_down
            .checked_add(1)
            .expect(MATH_ERROR_MESSAGE)
    };
    on_behalf_of_reserve_data.stable_borrowed = on_behalf_of_reserve_data
        .stable_borrowed
        .checked_add(amount)
        .expect(MATH_ERROR_MESSAGE);
    reserve_data.avarage_stable_rate_e24 = u128::try_from(
        checked_math!(
            (reserve_data.avarage_stable_rate_e24 * reserve_data.sum_stable_debt + new_stable_borrow_rate_e24 * amount)
                / (reserve_data.sum_stable_debt + amount)
        )
        .unwrap(),
    )
    .expect(MATH_ERROR_MESSAGE);
    reserve_data.sum_stable_debt = reserve_data
        .sum_stable_debt
        .checked_add(amount)
        .expect(MATH_ERROR_MESSAGE);
    Ok(new_stable_borrow_rate_e24)
}

fn _change_state_repay_stable(
    reserve_data: &mut ReserveData,
    on_behalf_of_reserve_data: &mut UserReserveData,
    on_behalf_of_config: &mut UserConfig,
    amount: Option<u128>,
) -> Result<u128, LendingPoolError> {
    let amount_val = match amount {
        Some(v) => v,
        None => on_behalf_of_reserve_data.stable_borrowed,
    };
    if amount_val == 0 {
        return Err(LendingPoolError::AmountNotGreaterThanZero)
    }
    if amount_val > on_behalf_of_reserve_data.stable_borrowed {
        return Err(LendingPoolError::AmountExceedsUserDebt)
    }
    if amount_val == on_behalf_of_reserve_data.stable_borrowed {
        on_behalf_of_config.borrows_stable &= !(1_u128 << reserve_data.id);
    }
    on_behalf_of_reserve_data.stable_borrowed = on_behalf_of_reserve_data.stable_borrowed - amount_val;
    reserve_data.avarage_stable_rate_e24 = if reserve_data.sum_stable_debt > amount_val {
        u128::try_from(
            checked_math!(
                (reserve_data.avarage_stable_rate_e24 * reserve_data.sum_stable_debt
                    - on_behalf_of_reserve_data.stable_borrow_rate_e24 * amount_val)
                    / (reserve_data.sum_stable_debt - amount_val)
            )
            .unwrap(),
        )
        .expect(MATH_ERROR_MESSAGE)
    } else {
        0
    };
    if amount_val >= reserve_data.sum_stable_debt {
        reserve_data.sum_stable_debt = 0;
    } else {
        reserve_data.sum_stable_debt = reserve_data.sum_stable_debt - amount_val;
    }
    Ok(amount_val)
}

fn _change_state_repay_variable(
    reserve_data: &mut ReserveData,
    on_behalf_of_reserve_data: &mut UserReserveData,
    on_behalf_of_config: &mut UserConfig,
    amount: Option<u128>,
) -> Result<u128, LendingPoolError> {
    let amount_val = match amount {
        Some(v) => v,
        None => on_behalf_of_reserve_data.variable_borrowed,
    };
    if amount_val == 0 {
        return Err(LendingPoolError::AmountNotGreaterThanZero)
    }
    if amount_val > on_behalf_of_reserve_data.variable_borrowed {
        return Err(LendingPoolError::AmountExceedsUserDebt)
    }
    if amount_val == on_behalf_of_reserve_data.variable_borrowed {
        on_behalf_of_config.borrows_variable &= !(1_u128 << reserve_data.id);
    }
    on_behalf_of_reserve_data.variable_borrowed = on_behalf_of_reserve_data.variable_borrowed - amount_val;
    if amount_val > reserve_data.total_variable_borrowed {
        reserve_data.total_variable_borrowed = 0;
    } else {
        reserve_data.total_variable_borrowed = reserve_data.total_variable_borrowed - amount_val;
    }
    Ok(amount_val)
}
