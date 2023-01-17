use crate::{
    impls::lending_pool::storage::{
        lending_pool_storage::LendingPoolStorage,
        structs::{
            reserve_data::ReserveData,
            user_reserve_data::*,
        },
    },
    traits::{
        block_timestamp_provider::BlockTimestampProviderRef,
        lending_pool::traits::view::LendingPoolView,
    },
};

use openbrush::traits::{
    AccountId,
    Storage,
};

use ink_prelude::vec::Vec;

use super::internal::{
    Internal,
    InternalIncome,
};

impl<T: Storage<LendingPoolStorage>> LendingPoolView for T {
    default fn view_registered_asset(&self) -> Vec<AccountId> {
        self.data::<LendingPoolStorage>().registered_assets.to_vec()
    }
    default fn view_reserve_data(&self, asset: AccountId) -> Option<ReserveData> {
        self.data::<LendingPoolStorage>().get_reserve_data(&asset).ok()
    }

    default fn view_user_reserve_data(&self, asset: AccountId, user: AccountId) -> Option<UserReserveData> {
        self.data::<LendingPoolStorage>().get_user_reserve(&asset, &user).ok()
    }

    default fn get_user_free_collateral_coefficient(&self, user_address: AccountId) -> (bool, u128) {
        let block_timestamp =
            BlockTimestampProviderRef::get_block_timestamp(&self.data::<LendingPoolStorage>().block_timestamp_provider);
        self._get_user_free_collateral_coefficient_e6(&user_address, block_timestamp)
    }

    default fn get_block_timestamp_provider_address(&self) -> AccountId {
        self.data::<LendingPoolStorage>().block_timestamp_provider
    }
    default fn get_reserve_token_price_e8(&self, reserve_token_address: AccountId) -> Option<u128> {
        match self
            .data::<LendingPoolStorage>()
            .get_reserve_data(&reserve_token_address)
        {
            Ok(v) => v.token_price_e8,
            _ => None,
        }
    }
    default fn view_protocol_income(&self, assets: Option<Vec<AccountId>>) -> Vec<(AccountId, i128)> {
        match assets {
            Some(assets_vec) => self._get_protocol_income(&assets_vec),
            None => {
                let registered_assets = self.data::<LendingPoolStorage>().get_all_registered_assets();
                self._get_protocol_income(&registered_assets)
            }
        }
    }
}
