import type { ValidationResult } from './validation-engine';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export enum LinkType {
  DIMENSION_TO_LINEITEM = 'DIMENSION_TO_LINEITEM',
  AREA_TO_MATERIAL = 'AREA_TO_MATERIAL',
  PERIMETER_TO_MATERIAL = 'PERIMETER_TO_MATERIAL',
  QUANTITY_CASCADE = 'QUANTITY_CASCADE',
  MATERIAL_SUBSTITUTION = 'MATERIAL_SUBSTITUTION',
  WASTE_FACTOR_DEPENDENCY = 'WASTE_FACTOR_DEPENDENCY',
  SCHEDULE_DEPENDENCY = 'SCHEDULE_DEPENDENCY',
}

export enum LinkStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BROKEN = 'BROKEN',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
}

export interface DependencyNode {
  id: string;
  type: 'DIMENSION' | 'AREA' | 'MATERIAL' | 'LINEITEM' | 'QUANTITY';
  name: string;
  value: number | string;
  lastUpdated: Date;
  dependents: Set<string>;
  dependencies: Set<string>;
}
export interface DynamicLink {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  linkType: LinkType;
  status: LinkStatus;
  formula?: string;
  multiplier?: number;
  wastePercentage?: number;
  validationRequired: boolean;
  lastValidated?: Date;
  validationResult?: ValidationResult;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CascadeUpdate {
  sourceNodeId: string;
  targetNodeIds: string[];
  originalValue: number;
  newValue: number;
  affectedLinks: string[];
  timestamp: Date;
  propagationDepth: number;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  links: Map<string, DynamicLink>;
  adjacencyList: Map<string, Set<string>>;
  reverseAdjacencyList: Map<string, Set<string>>;
}
export interface LinkValidationError {
  linkId: string;
  errorType: 'CIRCULAR_DEPENDENCY' | 'MISSING_NODE' | 'INVALID_FORMULA' | 'TYPE_MISMATCH' | 'STALE_DATA';
  message: string;
  severity: 'WARNING' | 'ERROR';
  timestamp: Date;
}

// ============================================================================
// DYNAMIC LINKER CLASS
// ============================================================================

export class DynamicLinker {
  private dependencyGraph: DependencyGraph;
  private linkHistory: Map<string, CascadeUpdate[]>;
  private validationErrors: Map<string, LinkValidationError[]>;
  private updateListeners: Map<string, Set<(update: CascadeUpdate) => void>>;

  constructor() {
    this.dependencyGraph = {
      nodes: new Map(),
      links: new Map(),
      adjacencyList: new Map(),
      reverseAdjacencyList: new Map(),
    };
    this.linkHistory = new Map();
    this.validationErrors = new Map();
    this.updateListeners = new Map();
  }
  // =========================================================================
  // NODE MANAGEMENT
  // =========================================================================

  /**
   * Create or update a dependency node in the graph
   */
  createNode(
    id: string,
    type: 'DIMENSION' | 'AREA' | 'MATERIAL' | 'LINEITEM' | 'QUANTITY',
    name: string,
    value: number | string
  ): DependencyNode {
    const node: DependencyNode = {
      id,
      type,
      name,
      value,
      lastUpdated: new Date(),
      dependents: new Set(),
      dependencies: new Set(),
    };

    this.dependencyGraph.nodes.set(id, node);

    if (!this.dependencyGraph.adjacencyList.has(id)) {
      this.dependencyGraph.adjacencyList.set(id, new Set());
    }
    if (!this.dependencyGraph.reverseAdjacencyList.has(id)) {
      this.dependencyGraph.reverseAdjacencyList.set(id, new Set());
    }

    return node;
  }
  /**
   * Get a node from the dependency graph
   */
  getNode(nodeId: string): DependencyNode | undefined {
    return this.dependencyGraph.nodes.get(nodeId);
  }

  /**
   * Update a node's value and trigger cascade updates
   */
  updateNodeValue(nodeId: string, newValue: number | string): CascadeUpdate | null {
    const node = this.dependencyGraph.nodes.get(nodeId);
    if (!node) {
      return null;
    }

    const originalValue = typeof node.value === 'number' ? node.value : 0;
    const numericNewValue = typeof newValue === 'number' ? newValue : 0;

    node.value = newValue;
    node.lastUpdated = new Date();

    // Trigger cascade updates to dependent nodes
    const affectedNodes = this.propagateUpdates(nodeId, numericNewValue, 0);

    const cascadeUpdate: CascadeUpdate = {
      sourceNodeId: nodeId,
      targetNodeIds: affectedNodes,
      originalValue,
      newValue: numericNewValue,
      affectedLinks: Array.from(this.dependencyGraph.links.values())
        .filter((link) => affectedNodes.includes(link.targetNodeId) || affectedNodes.includes(link.sourceNodeId))
        .map((link) => link.id),
      timestamp: new Date(),
      propagationDepth: 0,
    };
    // Record in history
    if (!this.linkHistory.has(nodeId)) {
      this.linkHistory.set(nodeId, []);
    }
    this.linkHistory.get(nodeId)!.push(cascadeUpdate);

    // Notify listeners
    this.notifyListeners(nodeId, cascadeUpdate);

    return cascadeUpdate;
  }

  // =========================================================================
  // LINK MANAGEMENT
  // =========================================================================

  /**
   * Create a dynamic link between two nodes
   */
  createLink(
    sourceNodeId: string,
    targetNodeId: string,
    linkType: LinkType,
    options?: {
      formula?: string;
      multiplier?: number;
      wastePercentage?: number;
      validationRequired?: boolean;
      metadata?: Record<string, unknown>;
    }
  ): DynamicLink {    // Validate nodes exist
    if (!this.dependencyGraph.nodes.has(sourceNodeId) || !this.dependencyGraph.nodes.has(targetNodeId)) {
      throw new Error(`One or both nodes do not exist: ${sourceNodeId}, ${targetNodeId}`);
    }

    // Check for circular dependencies
    if (this.wouldCreateCircularDependency(sourceNodeId, targetNodeId)) {
      throw new Error(`Creating link would result in circular dependency: ${sourceNodeId} -> ${targetNodeId}`);
    }

    const linkId = `link_${sourceNodeId}_${targetNodeId}_${Date.now()}`;
    const link: DynamicLink = {
      id: linkId,
      sourceNodeId,
      targetNodeId,
      linkType,
      status: LinkStatus.ACTIVE,
      formula: options?.formula,
      multiplier: options?.multiplier ?? 1,
      wastePercentage: options?.wastePercentage ?? 0,
      validationRequired: options?.validationRequired ?? true,
      metadata: options?.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dependencyGraph.links.set(linkId, link);
    // Update adjacency lists
    this.dependencyGraph.adjacencyList.get(sourceNodeId)!.add(targetNodeId);
    this.dependencyGraph.reverseAdjacencyList.get(targetNodeId)!.add(sourceNodeId);

    // Update node relationships
    const sourceNode = this.dependencyGraph.nodes.get(sourceNodeId)!;
    const targetNode = this.dependencyGraph.nodes.get(targetNodeId)!;

    sourceNode.dependents.add(targetNodeId);
    targetNode.dependencies.add(sourceNodeId);

    return link;
  }

  /**
   * Get a link by ID
   */
  getLink(linkId: string): DynamicLink | undefined {
    return this.dependencyGraph.links.get(linkId);
  }

  /**
   * Get all links for a node (incoming and outgoing)
   */
  getNodeLinks(nodeId: string): DynamicLink[] {
    return Array.from(this.dependencyGraph.links.values()).filter(
      (link) => link.sourceNodeId === nodeId || link.targetNodeId === nodeId
    );
  }
  /**
   * Update a link's properties
   */
  updateLink(linkId: string, updates: Partial<DynamicLink>): DynamicLink | null {
    const link = this.dependencyGraph.links.get(linkId);
    if (!link) {
      return null;
    }

    Object.assign(link, { ...updates, updatedAt: new Date() });
    return link;
  }

  /**
   * Delete a link and handle dependent relationships
   */
  deleteLink(linkId: string): boolean {
    const link = this.dependencyGraph.links.get(linkId);
    if (!link) {
      return false;
    }

    // Remove from adjacency lists
    this.dependencyGraph.adjacencyList.get(link.sourceNodeId)!.delete(link.targetNodeId);
    this.dependencyGraph.reverseAdjacencyList.get(link.targetNodeId)!.delete(link.sourceNodeId);

    // Update node relationships
    const sourceNode = this.dependencyGraph.nodes.get(link.sourceNodeId);
    const targetNode = this.dependencyGraph.nodes.get(link.targetNodeId);
    if (sourceNode) {
      sourceNode.dependents.delete(link.targetNodeId);
    }
    if (targetNode) {
      targetNode.dependencies.delete(link.sourceNodeId);
    }

    this.dependencyGraph.links.delete(linkId);
    return true;
  }

  // =========================================================================
  // CASCADE UPDATES AND PROPAGATION
  // =========================================================================

  /**
   * Propagate value updates through the dependency graph
   */
  private propagateUpdates(nodeId: string, value: number, depth: number, visited = new Set<string>()): string[] {
    if (visited.has(nodeId) || depth > 50) {
      return [];
    }

    visited.add(nodeId);
    const affectedNodes: string[] = [nodeId];

    const dependents = this.dependencyGraph.adjacencyList.get(nodeId) || new Set();
    for (const dependentId of dependents) {
      const dependentNode = this.dependencyGraph.nodes.get(dependentId);
      if (!dependentNode) continue;

      // Find the link between these nodes
      const link = Array.from(this.dependencyGraph.links.values()).find(
        (l) => l.sourceNodeId === nodeId && l.targetNodeId === dependentId
      );

      if (!link) continue;

      // Calculate new value based on link configuration
      let newValue = value * (link.multiplier || 1);

      if (link.formula) {
        // Apply formula if present
        try {
          newValue = this.applyFormula(link.formula, { sourceValue: value });
        } catch (error) {
          this.recordValidationError(link.id, 'INVALID_FORMULA', `Formula evaluation failed: ${error}`);
        }
      }

      if (link.wastePercentage && link.wastePercentage > 0) {
        newValue *= 1 + link.wastePercentage / 100;
      }

      dependentNode.value = newValue;
      dependentNode.lastUpdated = new Date();
      // Recursively propagate to next level
      const childAffected = this.propagateUpdates(dependentId, newValue, depth + 1, visited);
      affectedNodes.push(...childAffected);
    }

    return affectedNodes;
  }

  /**
   * Apply a formula to calculate derived values
   */
  private applyFormula(formula: string, context: Record<string, number>): number {
    // Simple formula evaluation with context variables
    let result = formula;

    for (const [key, value] of Object.entries(context)) {
      result = result.replace(new RegExp(`\\b${key}\\b`, 'g'), value.toString());
    }

    // Safely evaluate basic mathematical expressions
    try {
      // eslint-disable-next-line no-eval
      return Number(eval(result));
    } catch (error) {
      throw new Error(`Invalid formula: ${formula}`);
    }
  }

  // =========================================================================
  // DEPENDENCY GRAPH VALIDATION
  // =========================================================================
  /**
   * Check if creating a link would result in circular dependency
   */
  private wouldCreateCircularDependency(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>();
    return this.hasPathBFS(targetId, sourceId, visited);
  }

  /**
   * BFS to find path between nodes
   */
  private hasPathBFS(startId: string, endId: string, visited: Set<string>): boolean {
    if (startId === endId) {
      return true;
    }

    const queue = [startId];
    visited.add(startId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.dependencyGraph.adjacencyList.get(current) || new Set();

      for (const neighbor of neighbors) {
        if (neighbor === endId) {
          return true;
        }

        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return false;
  }
  /**
   * Validate all links in the dependency graph
   */
  validateAllLinks(): Map<string, LinkValidationError[]> {
    const errors = new Map<string, LinkValidationError[]>();

    for (const link of this.dependencyGraph.links.values()) {
      const linkErrors: LinkValidationError[] = [];

      // Check if both nodes exist
      if (!this.dependencyGraph.nodes.has(link.sourceNodeId)) {
        linkErrors.push({
          linkId: link.id,
          errorType: 'MISSING_NODE',
          message: `Source node ${link.sourceNodeId} does not exist`,
          severity: 'ERROR',
          timestamp: new Date(),
        });
      }

      if (!this.dependencyGraph.nodes.has(link.targetNodeId)) {
        linkErrors.push({
          linkId: link.id,
          errorType: 'MISSING_NODE',
          message: `Target node ${link.targetNodeId} does not exist`,
          severity: 'ERROR',
          timestamp: new Date(),
        });
      }
      // Validate formula if present
      if (link.formula) {
        try {
          this.applyFormula(link.formula, { sourceValue: 1 });
        } catch (error) {
          linkErrors.push({
            linkId: link.id,
            errorType: 'INVALID_FORMULA',
            message: `Invalid formula: ${error}`,
            severity: 'ERROR',
            timestamp: new Date(),
          });
        }
      }

      // Check node type compatibility
      const sourceNode = this.dependencyGraph.nodes.get(link.sourceNodeId);
      const targetNode = this.dependencyGraph.nodes.get(link.targetNodeId);

      if (sourceNode && targetNode && !this.areTypesCompatible(sourceNode.type, targetNode.type, link.linkType)) {
        linkErrors.push({
          linkId: link.id,
          errorType: 'TYPE_MISMATCH',
          message: `Incompatible node types: ${sourceNode.type} -> ${targetNode.type}`,
          severity: 'WARNING',
          timestamp: new Date(),
        });
      }

      if (linkErrors.length > 0) {
        errors.set(link.id, linkErrors);
      }
    }
    this.validationErrors = errors;
    return errors;
  }

  /**
   * Check if two node types are compatible for a given link type
   */
  private areTypesCompatible(sourceType: string, targetType: string, linkType: LinkType): boolean {
    const compatibilityMap: Record<LinkType, Array<[string, string]>> = {
      [LinkType.DIMENSION_TO_LINEITEM]: [['DIMENSION', 'LINEITEM']],
      [LinkType.AREA_TO_MATERIAL]: [['AREA', 'MATERIAL']],
      [LinkType.PERIMETER_TO_MATERIAL]: [['DIMENSION', 'MATERIAL']],
      [LinkType.QUANTITY_CASCADE]: [['QUANTITY', 'QUANTITY']],
      [LinkType.MATERIAL_SUBSTITUTION]: [['MATERIAL', 'MATERIAL']],
      [LinkType.WASTE_FACTOR_DEPENDENCY]: [['MATERIAL', 'QUANTITY']],
      [LinkType.SCHEDULE_DEPENDENCY]: [
        ['LINEITEM', 'LINEITEM'],
        ['QUANTITY', 'QUANTITY'],
      ],
    };

    const validPairs = compatibilityMap[linkType] || [];
    return validPairs.some(([source, target]) => sourceType === source && targetType === target);
  }

  /**
   * Record a validation error
   */
  private recordValidationError(linkId: string, errorType: any, message: string): void {
    if (!this.validationErrors.has(linkId)) {
      this.validationErrors.set(linkId, []);
    }
    this.validationErrors.get(linkId)!.push({
      linkId,
      errorType,
      message,
      severity: errorType === 'INVALID_FORMULA' ? 'ERROR' : 'WARNING',
      timestamp: new Date(),
    });
  }

  // =========================================================================
  // LISTENERS AND NOTIFICATIONS
  // =========================================================================

  /**
   * Subscribe to updates for a specific node
   */
  subscribe(nodeId: string, listener: (update: CascadeUpdate) => void): () => void {
    if (!this.updateListeners.has(nodeId)) {
      this.updateListeners.set(nodeId, new Set());
    }

    this.updateListeners.get(nodeId)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.updateListeners.get(nodeId)!.delete(listener);
    };
  }
  /**
   * Notify all listeners of an update
   */
  private notifyListeners(nodeId: string, update: CascadeUpdate): void {
    const listeners = this.updateListeners.get(nodeId);
    if (listeners) {
      for (const listener of listeners) {
        listener(update);
      }
    }
  }

  // =========================================================================
  // GRAPH INSPECTION
  // =========================================================================

  /**
   * Get all nodes in the dependency graph
   */
  getAllNodes(): DependencyNode[] {
    return Array.from(this.dependencyGraph.nodes.values());
  }

  /**
   * Get all links in the dependency graph
   */
  getAllLinks(): DynamicLink[] {
    return Array.from(this.dependencyGraph.links.values());
  }
  /**
   * Get the dependency chain for a node (all ancestors)
   */
  getDependencyChain(nodeId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    this.collectDependencies(nodeId, chain, visited);
    return chain;
  }

  /**
   * Recursively collect all dependencies
   */
  private collectDependencies(nodeId: string, chain: string[], visited: Set<string>): void {
    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    const dependencies = this.dependencyGraph.reverseAdjacencyList.get(nodeId) || new Set();

    for (const depId of dependencies) {
      chain.push(depId);
      this.collectDependencies(depId, chain, visited);
    }
  }
  /**
   * Get graph statistics
   */
  getGraphStats(): {
    nodeCount: number;
    linkCount: number;
    errorCount: number;
    activeLinks: number;
    brokenLinks: number;
  } {
    const links = Array.from(this.dependencyGraph.links.values());
    return {
      nodeCount: this.dependencyGraph.nodes.size,
      linkCount: links.length,
      errorCount: Array.from(this.validationErrors.values()).reduce((sum, errors) => sum + errors.length, 0),
      activeLinks: links.filter((l) => l.status === LinkStatus.ACTIVE).length,
      brokenLinks: links.filter((l) => l.status === LinkStatus.BROKEN).length,
    };
  }
  /**
   * Export the entire dependency graph for serialization
   */
  exportGraph(): {
    nodes: Array<Omit<DependencyNode, 'dependents' | 'dependencies'> & {
      dependents: string[];
      dependencies: string[];
    }>;
    links: DynamicLink[];
  } {
    return {
      nodes: Array.from(this.dependencyGraph.nodes.values()).map((node) => ({
        id: node.id,
        type: node.type,
        name: node.name,
        value: node.value,
        lastUpdated: node.lastUpdated,
        dependents: Array.from(node.dependents),
        dependencies: Array.from(node.dependencies),
      })),
      links: Array.from(this.dependencyGraph.links.values()),
    };
  }
  /**
   * Import a previously exported dependency graph
   */
  importGraph(data: ReturnType<DynamicLinker['exportGraph']>): void {
    this.dependencyGraph.nodes.clear();
    this.dependencyGraph.links.clear();
    this.dependencyGraph.adjacencyList.clear();
    this.dependencyGraph.reverseAdjacencyList.clear();

    // Import nodes
    for (const nodeData of data.nodes) {
      this.createNode(nodeData.id, nodeData.type, nodeData.name, nodeData.value);
    }

    // Import links
    for (const link of data.links) {
      this.dependencyGraph.links.set(link.id, link);
      this.dependencyGraph.adjacencyList.get(link.sourceNodeId)!.add(link.targetNodeId);
      this.dependencyGraph.reverseAdjacencyList.get(link.targetNodeId)!.add(link.sourceNodeId);
    }
  }
}