import { round } from 'mathjs';

export class Calculator {
  static extendedCost(quantity: number, unitCost: number): number {
    return round(quantity * unitCost, 2) as number;
  }

  static calculateTotal(
    subTotal: number,
    overheadPercent: number,
    taxRate: number
  ): { overhead: number; tax: number; grandTotal: number } {
    const overhead = round(subTotal * (overheadPercent / 100), 2) as number;
    const taxable = subTotal + overhead;
    const tax = round(taxable * (taxRate / 100), 2) as number;
    const grandTotal = round(taxable + tax, 2) as number;
    return { overhead, tax, grandTotal };
  }

  static evaluateFormula(formula: string, variables: Record<string, number>): number {
    const scope = {
      ...variables,
      PI: Math.PI,
      ceil: Math.ceil,
      floor: Math.floor,
      round: Math.round,
      sqrt: Math.sqrt,
      abs: Math.abs,
      max: Math.max,
      min: Math.min,
    };
    try {
      const fn = new Function(...Object.keys(scope), `return ${formula}`);
      return fn(...Object.values(scope));
    } catch {
      return 0;
    }
  }
}
