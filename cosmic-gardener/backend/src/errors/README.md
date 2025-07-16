# Unified Error Handling System

This directory contains the unified error handling system for the Cosmic Gardener backend.

## Overview

The error handling system is based on the `thiserror` crate and provides:
- A single `GameError` enum that covers all error cases
- A `Result<T>` type alias for consistent error handling
- Integration with actix-web for HTTP response generation
- Proper error propagation with the `?` operator

## Usage

### Basic Usage

```rust
use crate::errors::{GameError, Result};

fn example_function() -> Result<String> {
    // Automatic error conversion with ?
    let data = database_operation()?;
    
    // Manual error creation
    if data.is_empty() {
        return Err(GameError::not_found("Data not found"));
    }
    
    Ok(data)
}
```

### Error Types

The `GameError` enum includes variants for:
- Database errors
- Authentication/Authorization errors
- Validation errors
- Game-specific errors (resources, physics, etc.)
- Network/WebSocket errors
- System errors

### HTTP Response Generation

The `GameError` automatically implements `ResponseError` trait, converting errors to appropriate HTTP responses:

```rust
// In handlers
pub async fn handler() -> Result<HttpResponse> {
    let result = some_operation()?; // Automatic error handling
    Ok(HttpResponse::Ok().json(result))
}
```

### Logging

Following CLAUDE.md guidelines, all error handling includes proper logging:

```rust
match operation() {
    Ok(result) => result,
    Err(e) => {
        error!("[CONTEXT] Operation failed: {}", e);
        return Err(e);
    }
}
```

## Migration from Old System

The old error handling was split across three files:
- `error.rs` (AppError)
- `errors.rs` (GameError) 
- `shared/errors.rs` (Error)

All functionality has been consolidated into this unified system in `errors/mod.rs`.