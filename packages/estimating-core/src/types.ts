export interface LineItem {
  csiCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface AssemblyComponent {
  csiCode: string;
  description: string;
  quantityFormula: string;
  unit: string;
  unitCost: number;
}

export interface Assembly {
  id: string;
  name: string;
  components: AssemblyComponent[];
}
