export type PlanetType = 'rocky' | 'gas_giant' | 'ice' | 'volcanic' | 'oceanic';
export type PlanetState = 'dead' | 'colonizing' | 'alive';

export interface PlanetCfg {
  radius: number;
  baseColor: number;
  highlightColor: number;
  shadowColor: number;
  glowColor: number;
  hasRing: boolean;
  ringColor: number;
  shootRange: number;
  shootInterval: number;
  bulletDamage: number;
  genEnergy: number;
  selfHeal: boolean;   // true = slowly heals if vitality >= 50%
  healRate: number;    // vitality % per second
}

export const SHOOT_THRESHOLD = 0.80; // planet shoots when vitality >= 80%

export const PLANET_CFG: Record<PlanetType, PlanetCfg> = {
  rocky:     { radius:14, baseColor:0x9B7355, highlightColor:0xD4A574, shadowColor:0x4A3020, glowColor:0xFF9944, hasRing:false, ringColor:0,       shootRange:180, shootInterval:2400, bulletDamage:14, genEnergy:2.5, selfHeal:false, healRate:0   },
  gas_giant: { radius:20, baseColor:0xE8A030, highlightColor:0xFFD080, shadowColor:0x7A4500, glowColor:0xFFAA00, hasRing:true,  ringColor:0xCC8800, shootRange:220, shootInterval:3200, bulletDamage:9,  genEnergy:4.0, selfHeal:false, healRate:0   },
  ice:       { radius:11, baseColor:0x88CCFF, highlightColor:0xDDEEFF, shadowColor:0x3366AA, glowColor:0x44DDFF, hasRing:false, ringColor:0,       shootRange:160, shootInterval:1800, bulletDamage:16, genEnergy:2.0, selfHeal:false, healRate:0   },
  volcanic:  { radius:15, baseColor:0xCC3300, highlightColor:0xFF6622, shadowColor:0x550000, glowColor:0xFF4400, hasRing:false, ringColor:0,       shootRange:190, shootInterval:1600, bulletDamage:22, genEnergy:3.5, selfHeal:false, healRate:0   },
  oceanic:   { radius:17, baseColor:0x1155CC, highlightColor:0x4488FF, shadowColor:0x002266, glowColor:0x0077FF, hasRing:false, ringColor:0,       shootRange:200, shootInterval:2000, bulletDamage:14, genEnergy:3.0, selfHeal:true,  healRate:1.5 },
};

export const ENEMY_CFG = {
  radius:   10,
  hp:       280,
  speed:    48,
  shootRange:   190,
  shootInterval: 2200,
  bulletDamage:  14,
  bulletSpeed:   170,
  color:    0xFF2244,
  glowColor:0x880022,
};

export const BRIDGE_SPEED    = 220; // logical px/s build speed
export const PACKET_SPEED    = 165; // logical px/s travel speed
export const PACKET_ENERGY   = 18;  // vitality per packet
export const PACKETS_PER_SEND = 5;
export const VITALITY_MAX    = 100;
export const VITALITY_DAMAGE_MULT = 1.0;

export const BULLET_SPEED_PLANET = 240;
export const BULLET_SPEED_ENEMY  = 170;
export const BULLET_RADIUS       = 4;
