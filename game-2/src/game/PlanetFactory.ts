import Phaser from 'phaser';
import Planet, { PlanetType } from './Planet.ts';
import StandardPlanet from './planets/StandardPlanet.ts';
import BouncyPlanet from './planets/BouncyPlanet.ts';
import UnstablePlanet from './planets/UnstablePlanet.ts';
import WormholePlanet from './planets/WormholePlanet.ts';
import ShiftGatePlanet from './planets/ShiftGatePlanet.ts';
import PulsarPlanet from './planets/PulsarPlanet.ts';

export class PlanetFactory {
  static create(scene: Phaser.Scene, x: number, y: number, radius: number, type: PlanetType, id: string): Planet {
    switch (type) {
      case 'bouncy':
        return new BouncyPlanet(scene, x, y, radius, id);
      case 'unstable':
        return new UnstablePlanet(scene, x, y, radius, id);
      case 'wormhole':
        return new WormholePlanet(scene, x, y, radius, id);
      case 'shift_gate':
        return new ShiftGatePlanet(scene, x, y, radius, id);
      case 'pulsar':
        return new PulsarPlanet(scene, x, y, radius, id);
      default:
        return new StandardPlanet(scene, x, y, radius, id);
    }
  }
}
export default PlanetFactory;
