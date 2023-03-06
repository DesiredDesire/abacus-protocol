// TODO::tothink should transfer emit event inside lendingpool?

use openbrush::traits::{
    AccountId,
    Balance,
    Storage,
};

use ink::prelude::*;

use crate::{
    impls::lending_pool::{
        internal::{
            _check_borrowing_enabled,
            *,
        },
        storage::{
            lending_pool_storage::LendingPoolStorage,
            structs::user_reserve_data::UserReserveData,
        },
    },
    traits::{
        abacus_token::traits::abacus_token::{
            AbacusTokenRef,
            TransferEventData,
        },
        block_timestamp_provider::BlockTimestampProviderRef,
        lending_pool::{
            errors::LendingPoolTokenInterfaceError,
            traits::v_token_interface::LendingPoolVTokenInterface,
        },
    },
};

impl<T: Storage<LendingPoolStorage>> LendingPoolVTokenInterface for T {
    default fn total_variable_debt_of(&self, underlying_asset: AccountId) -> Balance {
        let mut reserve_data = self
            .data::<LendingPoolStorage>()
            .get_reserve_data(&underlying_asset)
            .unwrap_or_default();
        if reserve_data.total_variable_borrowed == 0 {
            return 0
        }

        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        reserve_data._accumulate_interest(block_timestamp);
        reserve_data.total_variable_borrowed
    }

    fn user_variable_debt_of(&self, underlying_asset: AccountId, user: AccountId) -> Balance {
        let mut user_reserve_data = self
            .data::<LendingPoolStorage>()
            .get_user_reserve(&underlying_asset, &user)
            .unwrap_or_default();
        if user_reserve_data.variable_borrowed == 0 {
            return 0
        }
        let mut reserve_data = self
            .data::<LendingPoolStorage>()
            .get_reserve_data(&underlying_asset)
            .unwrap_or_default();

        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        reserve_data._accumulate_interest(block_timestamp);
        user_reserve_data._accumulate_user_interest(&mut reserve_data);
        user_reserve_data.variable_borrowed
    }

    fn transfer_variable_debt_from_to(
        &mut self,
        underlying_asset: AccountId,
        from: AccountId,
        to: AccountId,
        amount: Balance,
    ) -> Result<(Balance, Balance), LendingPoolTokenInterfaceError> {
        // pull reserve_data
        let mut reserve_data = self
            .data::<LendingPoolStorage>()
            .get_reserve_data(&underlying_asset)
            .ok_or(LendingPoolTokenInterfaceError::AssetNotRegistered)?;
        if reserve_data.v_token_address != Self::env().caller() {
            return Err(LendingPoolTokenInterfaceError::WrongCaller)
        }
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        let mut from_user_reserve_data: UserReserveData = self
            .data::<LendingPoolStorage>()
            .get_user_reserve(&underlying_asset, &from)
            .ok_or(LendingPoolTokenInterfaceError::InsufficientBalance)?;
        let mut to_user_reserve_data: UserReserveData = self
            .data::<LendingPoolStorage>()
            .get_user_reserve(&underlying_asset, &to)
            .unwrap_or_default();
        // check if rules allow user "to" to take debt
        let mut from_config = self
            .data::<LendingPoolStorage>()
            .get_user_config(&from)
            .ok_or(LendingPoolTokenInterfaceError::InsufficientBalance)?;
        let mut to_config = self
            .data::<LendingPoolStorage>()
            .get_user_config(&to)
            .ok_or(LendingPoolTokenInterfaceError::InsufficientCollateral)?;
        match _check_borrowing_enabled(&reserve_data) {
            Err(_) => return Err(LendingPoolTokenInterfaceError::TransfersDisabled),
            Ok(_) => (),
        };

        // MODIFY PULLED STORAGE & AMOUNT CHECKS
        // accumulate reserve
        reserve_data._accumulate_interest(block_timestamp);
        let (interest_from_supply, interest_from_variable_borrow, interest_from_stable_borrow): (
            Balance,
            Balance,
            Balance,
        ) = from_user_reserve_data._accumulate_user_interest(&mut reserve_data);
        let (interest_to_supply, interest_to_variable_borrow, interest_to_stable_borrow): (Balance, Balance, Balance) =
            to_user_reserve_data._accumulate_user_interest(&mut reserve_data);

        if from_user_reserve_data.variable_borrowed < amount {
            return Err(LendingPoolTokenInterfaceError::InsufficientBalance)
        }
        _decrease_user_variable_debt(&reserve_data, &mut from_user_reserve_data, &mut from_config, amount);
        _increase_user_variable_debt(&reserve_data, &mut to_user_reserve_data, &mut to_config, amount);

        match _check_enough_variable_debt(&reserve_data, &from_user_reserve_data) {
            Err(_) => return Err(LendingPoolTokenInterfaceError::MinimalDebt),
            Ok(_) => (),
        };
        match _check_enough_variable_debt(&reserve_data, &to_user_reserve_data) {
            Err(_) => return Err(LendingPoolTokenInterfaceError::MinimalDebt),
            Ok(_) => (),
        };

        //// PUSH STORAGE & FINAL CONDITION CHECK
        self.data::<LendingPoolStorage>()
            .insert_reserve_data(&underlying_asset, &reserve_data);
        self.data::<LendingPoolStorage>()
            .insert_user_reserve(&underlying_asset, &from, &from_user_reserve_data);
        self.data::<LendingPoolStorage>()
            .insert_user_reserve(&underlying_asset, &to, &to_user_reserve_data);
        self.data::<LendingPoolStorage>().insert_user_config(&to, &to_config);
        self.data::<LendingPoolStorage>()
            .insert_user_config(&from, &from_config);
        // check if there ie enought collateral
        match self._check_user_free_collateral(&to, block_timestamp) {
            Err(_) => return Err(LendingPoolTokenInterfaceError::InsufficientCollateral),
            Ok(_) => (),
        }

        //// ABACUS TOKEN EVENTS
        if interest_from_supply != 0 || interest_to_supply != 0 {
            AbacusTokenRef::emit_transfer_events(
                &reserve_data.a_token_address,
                vec![
                    TransferEventData {
                        from: None,
                        to: Some(from),
                        amount: interest_from_supply,
                    },
                    TransferEventData {
                        from: None,
                        to: Some(to),
                        amount: interest_to_supply,
                    },
                ],
            )?;
        }
        if interest_from_stable_borrow != 0 || interest_to_stable_borrow != 0 {
            AbacusTokenRef::emit_transfer_events(
                &reserve_data.s_token_address,
                vec![
                    TransferEventData {
                        from: None,
                        to: Some(from),
                        amount: interest_from_stable_borrow,
                    },
                    TransferEventData {
                        from: None,
                        to: Some(to),
                        amount: interest_to_stable_borrow,
                    },
                ],
            )?;
        }

        //// EVENT
        // TODO add transfer emit event

        Ok((interest_from_variable_borrow, interest_to_variable_borrow))
    }
}
