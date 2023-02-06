// TODO::think should we emit events on set_as_collateral

#![allow(unused_variables)]
use ink_prelude::vec::Vec;
use openbrush::{
    contracts::traits::psp22::*,
    traits::{
        AccountId,
        Balance,
        Storage,
    },
};

use crate::{
    impls::{
        constants::MATH_ERROR_MESSAGE,
        lending_pool::{
            internal::{
                _accumulate_interest,
                _check_activeness,
                _check_deposit_enabled,
                *,
            },
            storage::lending_pool_storage::LendingPoolStorage,
        },
    },
    traits::{
        block_timestamp_provider::BlockTimestampProviderRef,
        lending_pool::{
            errors::LendingPoolError,
            events::*,
            traits::actions::LendingPoolDeposit,
        },
    },
};

impl<T: Storage<LendingPoolStorage>> LendingPoolDeposit for T {
    default fn deposit(
        &mut self,
        asset: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
        data: Vec<u8>,
    ) -> Result<(), LendingPoolError> {
        //// PULL DATA AND CHECK CONDITIONS
        if amount == 0 {
            return Err(LendingPoolError::AmountNotGreaterThanZero)
        }
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        let mut reserve_data = self.data::<LendingPoolStorage>().get_reserve_data(&asset)?;
        _check_deposit_enabled(&reserve_data)?;
        let mut on_behalf_of_reserve_data = self
            .data::<LendingPoolStorage>()
            .get_or_create_user_reserve(&asset, &on_behalf_of);
        let mut on_behalf_of_config = self
            .data::<LendingPoolStorage>()
            .get_or_create_user_config(&on_behalf_of);

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
        // add to supplies
        if (on_behalf_of_config.deposits >> reserve_data.id) & 1 == 0 {
            on_behalf_of_config.deposits |= 1_u128 << reserve_data.id;
            self.data::<LendingPoolStorage>()
                .insert_user_config(&on_behalf_of, &on_behalf_of_config);
        }
        on_behalf_of_reserve_data.supplied = on_behalf_of_reserve_data
            .supplied
            .checked_add(amount)
            .expect(MATH_ERROR_MESSAGE);
        reserve_data.total_supplied = reserve_data
            .total_supplied
            .checked_add(amount)
            .expect(MATH_ERROR_MESSAGE);
        // recalculate
        reserve_data._recalculate_current_rates()?;

        //// PUSH STORAGE
        ink_env::debug_println!("[deposit] PUSH STORAGE");
        self.data::<LendingPoolStorage>()
            .insert_reserve_data(&asset, &reserve_data);

        self.data::<LendingPoolStorage>()
            .insert_user_reserve(&asset, &on_behalf_of, &on_behalf_of_reserve_data);

        //// TOKEN TRANSFERS
        ink_env::debug_println!("[deposit] TOKEN TRANSFERS");
        PSP22Ref::transfer_from_builder(
            &asset,
            Self::env().caller(),
            Self::env().account_id(),
            amount,
            Vec::<u8>::new(),
        )
        .call_flags(ink_env::CallFlags::default().set_allow_reentry(true))
        .fire()
        .unwrap()?;
        ink_env::debug_println!("[deposit] ABACUS TOKEN EVENTS");
        //// ABACUS TOKEN EVENTS
        // ATOKEN
        _emit_abacus_token_transfer_event(
            &reserve_data.a_token_address,
            &on_behalf_of,
            (interest_on_behalf_of_supply + amount) as i128,
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
            interest_on_behalf_of_stable_borrow as i128,
        )?;

        //// EVENT
        self._emit_deposit_event(asset, Self::env().caller(), on_behalf_of, amount);

        Ok(())
    }

    default fn redeem(
        &mut self,
        asset: AccountId,
        on_behalf_of: AccountId,
        amount_arg: Option<Balance>,
        data: Vec<u8>,
    ) -> Result<Balance, LendingPoolError> {
        //// PULL DATA AND INIT CONDITIONS CHECK
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        let mut reserve_data = self.data::<LendingPoolStorage>().get_reserve_data(&asset)?;
        _check_activeness(&reserve_data)?;
        let mut on_behalf_of_reserve_data = self
            .data::<LendingPoolStorage>()
            .get_user_reserve(&asset, &on_behalf_of)?;
        let mut on_behalf_of_config = self.data::<LendingPoolStorage>().get_user_config(&on_behalf_of)?;

        if on_behalf_of_reserve_data.supplied == 0 {
            return Err(LendingPoolError::NothingToRedeem)
        }

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
        // amount checks
        let amount = match amount_arg {
            Some(v) => v,
            None => on_behalf_of_reserve_data.supplied,
        };
        if amount == 0 {
            return Err(LendingPoolError::AmountNotGreaterThanZero)
        }
        if amount > on_behalf_of_reserve_data.supplied {
            return Err(LendingPoolError::AmountExceedsUserDeposit)
        }
        // sub from user supply
        if amount == on_behalf_of_reserve_data.supplied {
            on_behalf_of_config.deposits &= !(1_u128 << reserve_data.id);
            self.data::<LendingPoolStorage>()
                .insert_user_config(&on_behalf_of, &on_behalf_of_config);
        }
        on_behalf_of_reserve_data.supplied = on_behalf_of_reserve_data.supplied - amount;
        if amount >= reserve_data.total_supplied {
            ink_env::debug_println!(
                "subtracting {} from reserve_data.total_supplied ({}) would cause an underflow",
                amount,
                reserve_data.total_supplied
            );
            reserve_data.total_supplied = 0;
        } else {
            reserve_data.total_supplied = reserve_data.total_supplied - amount;
        }
        // recalculate
        reserve_data._recalculate_current_rates()?;

        //// PUSH STORAGE & FINAL CONDITION CHECK
        self.data::<LendingPoolStorage>()
            .insert_reserve_data(&asset, &reserve_data);
        self.data::<LendingPoolStorage>()
            .insert_user_reserve(&asset, &on_behalf_of, &on_behalf_of_reserve_data);
        // check if there ie enought collateral
        let (collaterized, _) = self._get_user_free_collateral_coefficient_e6(&on_behalf_of, block_timestamp);
        if !collaterized {
            return Err(LendingPoolError::InsufficientUserFreeCollateral)
        }

        //// TOKEN TRANSFERS
        PSP22Ref::transfer(&asset, Self::env().caller(), amount, Vec::<u8>::new())?;

        //// ABACUS TOKEN EVENTS
        // ATOKEN
        _emit_abacus_token_transfer_event_and_decrease_allowance(
            &reserve_data.a_token_address,
            &on_behalf_of,
            (interest_on_behalf_of_supply - amount) as i128,
            &(Self::env().caller()),
            amount,
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
            interest_on_behalf_of_stable_borrow as i128,
        )?;

        //// EVENT
        self._emit_redeem_event(asset, Self::env().caller(), on_behalf_of, amount);

        Ok(amount)
    }
}

impl<T: Storage<LendingPoolStorage>> EmitDepositEvents for T {
    default fn _emit_deposit_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    ) {
    }
    default fn _emit_redeem_event(
        &mut self,
        asset: AccountId,
        caller: AccountId,
        on_behalf_of: AccountId,
        amount: Balance,
    ) {
    }
}
