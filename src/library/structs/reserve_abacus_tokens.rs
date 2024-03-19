/// Stores AccountIds of PSP22(PSP55) contracts that are wrappers of deposit(debt).
#[derive(Debug, Encode, Decode, Clone, Copy)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ReserveAbacusTokens {
    /// adress of wrapping deposit aToken
    pub a_token_address: AccountId,
    /// address of wrapping debt vToken
    pub v_token_address: AccountId,
}

impl ReserveAbacusTokens {
    pub fn new(
        a_token_address: &AccountId,
        v_token_address: &AccountId,
    ) -> Self {
        ReserveAbacusTokens {
            a_token_address: *a_token_address,
            v_token_address: *v_token_address,
        }
    }
}
