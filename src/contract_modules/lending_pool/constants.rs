use pendzl::contracts::access_control::RoleType;

// can mint given asset
pub const MINTER: RoleType = ink::selector_id!("MINTER"); // 4_254_773_782_u32

// can burn given asset
pub const BURNER: RoleType = ink::selector_id!("BURNER"); // 1_711_057_910_u32;

/// pays only 10% of standard flash loan fee
pub const FLASH_BORROWER: RoleType = ink::selector_id!("FLASH_BORROWER"); // 1_112_475_474_u32

/// can add new asset to the market
pub const ASSET_LISTING_ADMIN: RoleType =
    ink::selector_id!("ASSET_LISTING_ADMIN"); // 1_094_072_439_u32

/// can modify reserveData parameters
pub const PARAMETERS_ADMIN: RoleType = ink::selector_id!("PARAMETERS_ADMIN"); // 368_001_360_u32

/// can modify current debt rate in ReserveData of asset that is protocol stablecoin
pub const STABLECOIN_RATE_ADMIN: RoleType =
    ink::selector_id!("STABLECOIN_RATE_ADMIN"); // 2_742_621_032

/// can pause/unpause freeze/unfreeze reserves
pub const EMERGENCY_ADMIN: RoleType = ink::selector_id!("EMERGENCY_ADMIN"); // 297_099_943_u32

/// can assign all the roles
pub const ROLE_ADMIN: RoleType = 0; // 0

/// can modify fee reductions for accounts
pub const FEE_REDUCTION_ADMIN: RoleType =
    ink::selector_id!("FEE_REDUCTION_ADMIN"); // 3_092_744_775_u32

/// can withdraw protocol income
pub const TREASURY: RoleType = ink::selector_id!("TREASURY"); // 2_434_241_257_u32
