export class MasonryCalculator {
  /** Standard 8x8x16 CMU blocks needed */
  static blockCount(wallAreaSqFt: number, wasteFactor = 0.05): number {
    const blocksPerSqFt = 1.125;
    return Math.ceil(wallAreaSqFt * blocksPerSqFt * (1 + wasteFactor));
  }

  /** Standard modular bricks needed */
  static brickCount(wallAreaSqFt: number, wasteFactor = 0.05): number {
    const bricksPerSqFt = 6.75;
    return Math.ceil(wallAreaSqFt * bricksPerSqFt * (1 + wasteFactor));
  }

  /** 80lb mortar bags needed */
  static mortarBags(unitCount: number, type: 'brick' | 'block'): number {
    const unitsPerBag = type === 'block' ? 38 : 135;
    return Math.ceil(unitCount / unitsPerBag);
  }

  /** Tons of sand for mortar */
  static sandTons(bagCount: number): number {
    return Math.round((bagCount / 35) * 100) / 100;
  }
}
