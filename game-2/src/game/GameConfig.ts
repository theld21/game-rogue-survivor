export const GAME_CONFIG = {
  // Player Configuration
  PLAYER: {
    BASE_ORBIT_SPEED: 2.5,          // Rad/s (reduced from 3.2 to prevent motion sickness)
    CONTRACT_MULTIPLIER: 1.5,       // Faster speed when contracted (reduced from 1.8)
    JUMP_SPEED: 500,                // Launch speed
    DASH_SPEED: 850,                // Velocity of short impulse
    DASH_DURATION: 150,             // Milliseconds dash lasts
    DASH_RESTORE_SPEED: 480,        // Velocity after dash resolves
    JUMP_SHRINK_RADIUS_FACTOR: 0.45, // Target orbit radius ratio on contract
    MAGNET_RANGE: 240,              // Distance magnet attracts items
    MAGNET_DURATION: 4800,          // Duration of magnet effect (ms)
    DEEP_SPACE_THRESHOLD: 350,      // Max distance (px) from nearest planet before dying
    DOUBLE_TAP_WINDOW: 220,         // Window in ms to buffer double taps
    SLOW_ANOMALY_MULTIPLIER: 0.55,  // Speed multiplier when slowed
    SLOW_ANOMALY_DURATION: 3500,    // Duration of slow effect in ms
    VOLATILE_MINE_FUSE: 1200,       // Mine countdown fuse in ms
    VOLATILE_MINE_RADIUS: 100,      // Mine explosion damage radius in px
  },

  // Level & Planets Config
  PLANETS: {
    GRAVITY_CONSTANT: 3500,         // G constant for physical gravity pulling
    BASE_SPEED_MULTIPLIER: 1.0,
    SHIFT_GATE_GREEN_SPEED: 2.0,
    SHIFT_GATE_ORANGE_SPEED: -0.8,
    BOUNCY_FORCE_MULTIPLIER: 1.15,
    SHIFT_GATE_CYCLE_TIME: 2000,    // Gate color alternation (ms)
    WORMHOLE_WARP_COOLDOWN: 1000,   // Link lock delay (ms)
    MIN_SEPARATION: 140,            // Min spacing between planet surfaces to avoid overlaps
  },

  // Hazards Configurations
  HAZARDS: {
    LASER_CYCLE_TIME: 2000,         // Laser toggle duration (ms)
    BLACK_HOLE_PULL: 18000,         // Gravity multiplier
    DEBRIS_SPEED: 60,               // Default rotation speed
    METEOR_SPEED: 220,              // Speed of flying meteors
  },

  // Items spawn chance and multipliers
  ITEMS: {
    SPAWN_CHANCES: {
      SHIELD: 0.05,
      MAGNET: 0.10,
      GOLD_CORE: 0.13,
      SHARD: 0.72
    },
    VALUES: {
      SHARD_SCORE: 150,
      GOLD_CORE_SCORE: 500,
      GOLD_CORE_SHARDS: 3,
    }
  }
};
