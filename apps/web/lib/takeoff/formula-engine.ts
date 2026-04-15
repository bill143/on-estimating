/**
 * NEXUS ON Estimating — Formula Calculation Engine
 * Secure formula evaluation for construction quantity calculations.
 * Uses mathjs for safe expression parsing — no eval/injection possible.
 */

import { create, all, MathJsInstance } from 'mathjs';

export interface FormulaValidation {
  valid: boolean;
  errors: string[];
  requiredVariables?: string[];
}

export interface FormulaResult {
  success: boolean;
  result: number | null;
  error: string | null;
  formula?: string;
  variables: Record<string, number>;
  computeTime?: number;
}

/** Whitelist of allowed mathjs functions for construction formulas */
const ALLOWED_FUNCTIONS = new Set([
  'add', 'subtract', 'multiply', 'divide',
  'pow', 'sqrt', 'abs', 'ceil', 'floor', 'round',
  'min', 'max', 'sum',
  'pi', 'sin', 'cos', 'tan', 'atan2',
  'log', 'log10',
]);
// Blocked patterns to prevent injection attacks
const BLOCKED_PATTERNS = [
  /import\s/i, /export\s/i, /function\s/i, /class\s/i,
  /new\s/i, /delete\s/i, /void\s/i, /typeof\s/i,
  /instanceof\s/i, /eval\s*\(/i, /Function\s*\(/i,
  /constructor/i, /prototype/i, /\.__proto__/i,
];

/**
 * FormulaEngine class: Secure formula evaluation engine for construction calculations
 * Uses mathjs for safe expression parsing without eval() or injection vulnerability
 */
export class FormulaEngine {
  private mathInstance: MathJsInstance;
  private variables: Record<string, number> = {};
  private lastError: string | null = null;

  constructor() {
    this.mathInstance = create(all);
    this.registerConstructionFunctions();
  }

  /**
   * Sanitizes formula input to prevent injection attacks
   */
  private sanitizeFormula(formula: string): string {
    const sanitized = formula.replace(/\s+/g, ' ').trim();

    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error(`Blocked pattern detected: ${pattern.source}`);
      }
    }

    return sanitized;
  }
  private validateVariableName(name: string): boolean {
    const validNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return validNamePattern.test(name);
  }

  private registerConstructionFunctions(): void {
    this.mathInstance.import(
      {
        calculateMaterialNeeded: (length: number, width: number, height: number, wastePercent: number = 0.1): number => {
          return length * width * height * (1 + wastePercent);
        },
        calculateLaborCost: (hours: number, ratePerHour: number): number => {
          return Math.max(0, hours * ratePerHour);
        },
        calculateSquareFootage: (length: number, width: number): number => {
          return Math.max(0, length * width);
        },
        calculateLinearFootage: (length: number): number => {
          return Math.max(0, length);
        },
        calculateAreaPerUnit: (totalArea: number, unitCount: number): number => {
          return unitCount > 0 ? totalArea / unitCount : 0;
        },
      },
      { override: true }
    );
  }
  public registerVariable(name: string, value: number): FormulaValidation {
    if (!this.validateVariableName(name)) {
      this.lastError = `Invalid variable name: "${name}". Must start with letter or underscore.`;
      return { valid: false, errors: [this.lastError] };
    }

    if (typeof value !== 'number' || isNaN(value)) {
      this.lastError = `Invalid variable value for "${name}": must be a valid number.`;
      return { valid: false, errors: [this.lastError] };
    }

    this.variables[name] = value;
    return { valid: true, errors: [] };
  }

  public evaluateFormula(formula: string): FormulaResult {
    const start = Date.now();
    const validation = this.validateFormula(formula);
    if (!validation.valid) {
      return {
        success: false,
        result: null,
        error: validation.errors[0] || 'Formula validation failed',
        formula,
        variables: { ...this.variables },
        computeTime: Date.now() - start,
      };
    }
    try {
      const sanitized = this.sanitizeFormula(formula);
      const result = this.mathInstance.evaluate(sanitized, this.variables);

      if (typeof result !== 'number' || isNaN(result)) {
        this.lastError = 'Formula evaluation resulted in non-numeric value';
        return {
          success: false,
          result: null,
          error: this.lastError,
          formula,
          variables: { ...this.variables },
          computeTime: Date.now() - start,
        };
      }

      return {
        success: true,
        result,
        error: null,
        formula,
        variables: { ...this.variables },
        computeTime: Date.now() - start,
      };
    } catch (error) {
      this.lastError = `Formula evaluation error: ${error instanceof Error ? error.message : String(error)}`;
      return {
        success: false,
        result: null,
        error: this.lastError,
        formula,
        variables: { ...this.variables },
        computeTime: Date.now() - start,
      };
    }
  }
  public validateFormula(formula: string): FormulaValidation {
    const errors: string[] = [];

    if (!formula || typeof formula !== 'string') {
      errors.push('Formula must be a non-empty string');
      return { valid: false, errors };
    }

    if (formula.trim().length === 0) {
      errors.push('Formula cannot be empty or whitespace only');
      return { valid: false, errors };
    }

    try {
      const sanitized = this.sanitizeFormula(formula);
      this.mathInstance.compile(sanitized);
    } catch (error) {
      errors.push(`Invalid formula syntax: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getVariables(): Record<string, number> {
    return { ...this.variables };
  }

  public clearVariables(): void {
    this.variables = {};
    this.lastError = null;
  }
}