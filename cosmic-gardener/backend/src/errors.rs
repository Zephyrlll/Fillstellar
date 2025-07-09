use thiserror::Error;

#[derive(Error, Debug, PartialEq, Eq)]
pub enum GameError {
    #[error("Invalid resource value: {0}")]
    InvalidResource(String),
    
    #[error("Invalid resource value")]
    InvalidResourceValue,
    
    #[error("Physics calculation error: {0}")]
    PhysicsError(String),
    
    #[error("Validation failed: {0}")]
    ValidationError(String),
    
    #[error("System error: {0}")]
    SystemError(String),
    
    #[error("Insufficient resources")]
    InsufficientResources,
    
    #[error("Celestial body not found")]
    BodyNotFound,
    
    #[error("Maximum number of bodies reached")]
    BodyLimitReached,
    
    #[error("Position is out of bounds")]
    OutOfBounds,
    
    #[error("Objects are too close together")]
    TooClose,
}