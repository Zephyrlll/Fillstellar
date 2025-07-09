pub mod resources;
pub mod celestial_bodies;
pub mod game_loop;
pub mod physics;
pub mod validation;
pub mod persistence;

pub use resources::ResourceManager;
pub use celestial_bodies::CelestialBodyManager;
pub use game_loop::GameLoop;
pub use physics::PhysicsEngine;
pub use validation::ValidationEngine;
pub use persistence::PersistenceManager;