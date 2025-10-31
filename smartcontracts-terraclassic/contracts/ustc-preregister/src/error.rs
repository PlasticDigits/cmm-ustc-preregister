use cosmwasm_std::StdError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    
    #[error("Unauthorized: Only owner can call this function")]
    Unauthorized {},
    
    #[error("Invalid amount: Amount must be greater than zero")]
    InvalidAmount {},
    
    #[error("Insufficient balance: User does not have enough balance")]
    InsufficientBalance {},
    
    #[error("Invalid denomination: Expected {expected}, got {got}")]
    InvalidDenom { expected: String, got: String },
    
    #[error("User not found")]
    UserNotFound {},
    
    #[error("No balance to withdraw")]
    NoBalanceToWithdraw {},
    
    #[error("Index inconsistency: Expected user at index not found")]
    IndexInconsistency {},
    
    #[error("User not found in index for pagination")]
    StartAfterUserNotFound {},
    
    #[error("Index conversion failed: Index out of valid range")]
    IndexConversionFailed {},
}

