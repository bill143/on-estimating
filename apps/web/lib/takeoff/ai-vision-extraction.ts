import Anthropic from "@anthropic-ai/sdk";

/**
 * Type definitions for AI vision extraction service
 */

export type ElementType =
  | "wall"
  | "door"
  | "window"
  | "column"
  | "beam"
  | "fixture"
  | "equipment"
  | "duct"
  | "pipe"
  | "conduit"
  | "symbol"
  | "room"
  | "stair"
  | "elevator";

export type Discipline =
  | "architectural"
  | "structural"
  | "mechanical"
  | "electrical"
  | "plumbing"
  | "civil"
  | "landscape";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedElement {
  type: ElementType;
  description: string;
  quantity: number;
  dimensions?: {
    width?: number;
    height?: number;
    depth?: number;
    length?: number;
    diameter?: number;
    unit: string;
  };
  location?: BoundingBox;
  confidence: number;
  notes?: string;
}

export interface DimensionExtraction {
  length?: number;
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
  area?: number;
  volume?: number;
  unit: string;
  extractionMethod: "scale-based" | "explicit-dimension" | "calculated";
}

export interface ScaleDetection {
  detected: boolean;
  scaleRatio?: number;
  scaleMethod: "explicit" | "reference-object" | "standard-assumption";
  confidence: number;
  notes?: string;
}

export interface ExtractionResult {
  pageNumber: number;
  discipline?: Discipline;
  elements: DetectedElement[];
  dimensions: DimensionExtraction[];
  scale: ScaleDetection;
  totalArea?: number;
  estimatedLinearFeet?: number;
  extractedAt: Date;
  processingTimeMs: number;
  notes?: string;
  rawAnalysis?: string;
}

export interface ProjectContext {
  projectId: string;
  projectName?: string;
  location?: string;
  squareFootage?: number;
  buildingType?: string;
  constructionPhase?: string;
}

export type ExtractionType =
  | "full-analysis"
  | "takeoff-only"
  | "dimension-only"
  | "element-detection-only";

export interface BatchExtractionTask {
  pageNumber: number;
  imageBase64: string;
  discipline?: Discipline;
  extractionType?: ExtractionType;
  context?: ProjectContext;
}

export interface BatchExtractionResult {
  results: ExtractionResult[];
  failedPages: Array<{
    pageNumber: number;
    error: string;
  }>;
  totalProcessed: number;
  totalFailed: number;
  totalTimeMs: number;
}

/**
 * AIVisionExtractionService
 * Handles extraction of construction takeoff data from plan images using Claude's vision API
 * Supports batch processing with rate limiting and exponential backoff retry logic
 */
export class AIVisionExtractionService {
  private client: Anthropic;
  private maxConcurrentRequests = 5;
  private rateLimitDelayMs = 100;
  private maxRetries = 3;
  private baseBackoffMs = 1000;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is required");
    }
    this.client = new Anthropic({ apiKey });
  }

  /** Extract takeoff data from a single plan page image */
  async extractFromPage(
    imageBase64: string,
    pageNumber: number,
    discipline?: Discipline,
    extractionType: ExtractionType = "full-analysis",
    context?: ProjectContext
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildPrompt(discipline, extractionType, context, pageNumber);

      const response = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: imageBase64,
                  },
                },
                { type: "text", text: prompt },
              ],
            },
          ],
        });
      });

      const extractedData = this.parseVisionResponse(response);
      const processingTimeMs = Date.now() - startTime;

      return {
        pageNumber,
        discipline,
        elements: extractedData.elements,
        dimensions: extractedData.dimensions,
        scale: extractedData.scale,
        totalArea: extractedData.totalArea,
        estimatedLinearFeet: extractedData.estimatedLinearFeet,
        extractedAt: new Date(),
        processingTimeMs,
        rawAnalysis: response.content[0].type === "text" ? response.content[0].text : "",
      };
    } catch (error) {
      throw new Error(
        `Failed to extract from page ${pageNumber}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /** Extract dimensions from plan image */
  async extractDimensions(imageBase64: string, scale?: number): Promise<DimensionExtraction[]> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                },
                {
                  type: "text",
                  text: `Extract all visible dimensions from this construction plan.
${scale ? `Use scale ratio ${scale} for conversion.` : ""}
Return JSON with array of dimensions including: length, width, height, depth, diameter, area, volume, unit, and extractionMethod (scale-based, explicit-dimension, or calculated).`,
                },
              ],
            },
          ],
        });
      });

      return this.parseDimensionResponse(response);
    } catch (error) {
      throw new Error(`Failed to extract dimensions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Detect construction elements in plan image */
  async detectElements(imageBase64: string, discipline?: Discipline): Promise<DetectedElement[]> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                },
                {
                  type: "text",
                  text: `Identify all construction elements visible in this plan.
${discipline ? `Focus on ${discipline} discipline elements.` : ""}
For each element, provide: type, description, quantity, dimensions (with unit), location (bounding box as x, y, width, height in % of image), confidence level (0-1), and notes.
Return as JSON array.`,
                },
              ],
            },
          ],
        });
      });

      return this.parseElementResponse(response);
    } catch (error) {
      throw new Error(`Failed to detect elements: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Detect scale information in plan image */
  async detectScale(imageBase64: string): Promise<ScaleDetection> {
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.client.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 512,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
                },
                {
                  type: "text",
                  text: `Analyze this construction plan for scale information.
Determine if a scale is explicitly shown (e.g., "1/4" = 1'"), can be inferred from reference objects, or should use standard assumptions.
Return JSON with: detected (boolean), scaleRatio (if found), scaleMethod (explicit, reference-object, or standard-assumption), confidence (0-1), and notes.`,
                },
              ],
            },
          ],
        });
      });

      return this.parseScaleResponse(response);
    } catch (error) {
      throw new Error(`Failed to detect scale: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** Process multiple pages in batch with controlled concurrency */
  async batchExtract(tasks: BatchExtractionTask[]): Promise<BatchExtractionResult> {
    const startTime = Date.now();
    const results: ExtractionResult[] = [];
    const failedPages: Array<{ pageNumber: number; error: string }> = [];

    for (let i = 0; i < tasks.length; i += this.maxConcurrentRequests) {
      const chunk = tasks.slice(i, i + this.maxConcurrentRequests);

      const chunkPromises = chunk.map((task) =>
        this.extractFromPage(
          task.imageBase64,
          task.pageNumber,
          task.discipline,
          task.extractionType || "full-analysis",
          task.context
        )
          .then((result) => {
            results.push(result);
            return { success: true, pageNumber: task.pageNumber };
          })
          .catch((error) => {
            failedPages.push({
              pageNumber: task.pageNumber,
              error: error instanceof Error ? error.message : String(error),
            });
            return { success: false, pageNumber: task.pageNumber };
          })
      );

      await Promise.all(chunkPromises);

      if (i + this.maxConcurrentRequests < tasks.length) {
        await this.delay(this.rateLimitDelayMs);
      }
    }

    return {
      results: results.sort((a, b) => a.pageNumber - b.pageNumber),
      failedPages,
      totalProcessed: results.length,
      totalFailed: failedPages.length,
      totalTimeMs: Date.now() - startTime,
    };
  }

  /** Build extraction prompt based on analysis parameters */
  private buildPrompt(
    discipline?: Discipline,
    extractionType: ExtractionType = "full-analysis",
    context?: ProjectContext,
    pageNumber?: number
  ): string {
    let prompt = `You are an expert construction estimator analyzing architectural and construction plans.

${pageNumber ? `Page: ${pageNumber}` : ""}

${context ? `Project Context:
- Name: ${context.projectName || "N/A"}
- Location: ${context.location || "N/A"}
- Square Footage: ${context.squareFootage || "N/A"}
- Building Type: ${context.buildingType || "N/A"}
- Phase: ${context.constructionPhase || "N/A"}` : ""}

${discipline ? `Focus on ${discipline} discipline elements.` : "Analyze all visible disciplines."}

${
  extractionType === "full-analysis"
    ? `Perform comprehensive analysis including:
1. Scale detection (explicit, reference-based, or standard assumption)
2. Element identification (walls, doors, windows, columns, beams, fixtures, equipment, ducts, pipes, conduits, symbols, rooms, stairs, elevators)
3. Dimension extraction with units
4. Quantity takeoff
5. Area and linear footage calculations`
    : extractionType === "takeoff-only"
      ? `Focus on quantity takeoff and element counts only.`
      : extractionType === "dimension-only"
        ? `Extract all dimensions and measurements from the plan.`
        : `Identify and catalog all visible construction elements.`
}

Return results as valid JSON with this structure:
{
  "elements": [{ "type": "element_type", "description": "detailed description", "quantity": number, "dimensions": { "length": number, "unit": "feet|inches|meters" }, "confidence": 0.95, "notes": "any relevant notes" }],
  "dimensions": [{ "length": number, "width": number, "unit": "feet", "extractionMethod": "explicit-dimension" }],
  "scale": { "detected": true, "scaleRatio": 0.25, "scaleMethod": "explicit", "confidence": 0.98 },
  "totalArea": number,
  "estimatedLinearFeet": number,
  "summary": "brief analysis summary"
}`;

    return prompt;
  }

  /** Parse vision API response into structured data */
  private parseVisionResponse(response: any): {
    elements: DetectedElement[];
    dimensions: DimensionExtraction[];
    scale: ScaleDetection;
    totalArea?: number;
    estimatedLinearFeet?: number;
  } {
    try {
      const textContent = response.content.find((block: any) => block.type === "text");
      if (!textContent) throw new Error("No text response from vision API");

      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) jsonText = jsonMatch[1];

      const parsed = JSON.parse(jsonText);

      return {
        elements: (parsed.elements || []).map((el: any) => ({
          type: el.type,
          description: el.description,
          quantity: el.quantity,
          dimensions: el.dimensions,
          location: el.location,
          confidence: el.confidence || 0.8,
          notes: el.notes,
        })),
        dimensions: (parsed.dimensions || []).map((dim: any) => ({
          length: dim.length,
          width: dim.width,
          height: dim.height,
          depth: dim.depth,
          diameter: dim.diameter,
          area: dim.area,
          volume: dim.volume,
          unit: dim.unit || "feet",
          extractionMethod: dim.extractionMethod || "explicit-dimension",
        })),
        scale: {
          detected: parsed.scale?.detected || false,
          scaleRatio: parsed.scale?.scaleRatio,
          scaleMethod: parsed.scale?.scaleMethod || "standard-assumption",
          confidence: parsed.scale?.confidence || 0.5,
          notes: parsed.scale?.notes,
        },
        totalArea: parsed.totalArea,
        estimatedLinearFeet: parsed.estimatedLinearFeet,
      };
    } catch (error) {
      throw new Error(`Failed to parse vision response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseDimensionResponse(response: any): DimensionExtraction[] {
    try {
      const textContent = response.content.find((block: any) => block.type === "text");
      if (!textContent) return [];
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) jsonText = jsonMatch[1];
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : parsed.dimensions || [];
    } catch {
      return [];
    }
  }

  private parseElementResponse(response: any): DetectedElement[] {
    try {
      const textContent = response.content.find((block: any) => block.type === "text");
      if (!textContent) return [];
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) jsonText = jsonMatch[1];
      const parsed = JSON.parse(jsonText);
      return Array.isArray(parsed) ? parsed : parsed.elements || [];
    } catch {
      return [];
    }
  }

  private parseScaleResponse(response: any): ScaleDetection {
    try {
      const textContent = response.content.find((block: any) => block.type === "text");
      if (!textContent) return { detected: false, scaleMethod: "standard-assumption", confidence: 0 };
      let jsonText = textContent.text;
      const jsonMatch = jsonText.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) jsonText = jsonMatch[1];
      return JSON.parse(jsonText);
    } catch {
      return { detected: false, scaleMethod: "standard-assumption", confidence: 0 };
    }
  }

  /** Retry logic with exponential backoff */
  private async retryWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries - 1) {
          const delayMs = this.baseBackoffMs * Math.pow(2, attempt);
          await this.delay(delayMs);
        }
      }
    }

    throw lastError || new Error("Operation failed after retries");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
