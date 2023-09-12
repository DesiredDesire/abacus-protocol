#![cfg_attr(not(feature = "std"), no_std, no_main)]

#[openbrush::implementation(Ownable)]
#[openbrush::contract]
pub mod block_timestamp_provider {
    use lending_project::traits::block_timestamp_provider::*;
    use openbrush::{
        contracts::ownable::{OwnableError, *},
        modifiers,
        traits::{DefaultEnv, Storage},
    };

    #[ink(storage)]
    #[derive(Default, Storage)]
    pub struct BlockTimestampProvider {
        #[storage_field]
        ownable: ownable::Data,
        should_return_mock_value: bool,
        mock_timestamp: u64,
        speed_multiplier: u64,
        starting_timestamp: u64,
    }

    impl BlockTimestampProvider {
        #[ink(constructor)]
        pub fn new(init_should_return_mock_value: bool, owner: AccountId, speed_multiplier: u64) -> Self {
            let mut instance = Self::default();
            instance.should_return_mock_value = init_should_return_mock_value;
            instance.speed_multiplier = speed_multiplier;
            instance.starting_timestamp = <BlockTimestampProvider as DefaultEnv>::env().block_timestamp();
            ownable::Internal::_init_with_owner(&mut instance, owner);
            instance
        }
    }

    impl BlockTimestampProviderInterface for BlockTimestampProvider {
        #[ink(message)]
        fn get_block_timestamp(&self) -> u64 {
            if self.should_return_mock_value {
                return self.mock_timestamp;
            }
            let current_timestamp = Self::env().block_timestamp();
            if self.speed_multiplier != 1 {
                let time_passed = current_timestamp - self.starting_timestamp;
                return self.starting_timestamp + time_passed * self.speed_multiplier;
            }
            current_timestamp
        }
        #[ink(message)]
        #[modifiers(only_owner)]
        fn set_block_timestamp(&mut self, timestamp: u64) -> Result<(), OwnableError> {
            self.mock_timestamp = timestamp;
            Ok(())
        }
        #[ink(message)]
        #[modifiers(only_owner)]
        fn set_speed_multiplier(&mut self, speed_multiplier: u64) -> Result<(), OwnableError> {
            self.speed_multiplier = speed_multiplier;
            Ok(())
        }
        #[ink(message)]
        fn get_speed_multiplier(&mut self) -> u64 {
            self.speed_multiplier
        }
        #[ink(message)]
        #[modifiers(only_owner)]
        fn increase_block_timestamp(&mut self, delta_timestamp: u64) -> Result<(), OwnableError> {
            self.mock_timestamp += delta_timestamp;
            Ok(())
        }
        #[ink(message)]
        #[modifiers(only_owner)]
        fn set_should_return_mock_value(&mut self, should_return_mock_value: bool) -> Result<(), OwnableError> {
            self.should_return_mock_value = should_return_mock_value;
            Ok(())
        }

        #[ink(message)]
        fn get_should_return_mock_value(&self) -> bool {
            self.should_return_mock_value
        }
    }
}
