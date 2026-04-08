import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
// @ts-expect-error pdf-parse has no type declarations in this version
import pdf from 'pdf-parse';
import { prisma } from '@/lib/prisma';

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  isScanned: boolean;
  hasText: boolean;
}

export interface PlanMetadata {
  planId: string;
  projectId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  uploadedBy: string;
  pageCount: number;
  pages: PageInfo[];
  hasScale: boolean;
  estimatedScale?: string;
  disciplines?: string[];
  tags?: string[];
}

export interface UploadResult {
  planId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  signedUrl: string;
  thumbnailUrl: string;
  metadata: PlanMetadata;
}

export interface PlanFile {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  pageCount: number;
  createdAt: Date;
  updatedAt: Date;
  uploadedBy: string;
}

export class PlanUploadService {
  private supabase;
  private readonly bucketName = 'plan-sets';
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB
  private readonly supportedFormats = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'tif', 'dwg', 'dxf'];
  private readonly thumbnailWidth = 300;
  private readonly thumbnailHeight = 400;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async uploadPlan(
    file: File,
    projectId: string,
    userId: string,
    disciplines?: string[],
    tags?: string[]
  ): Promise<UploadResult> {
    try {
      this.validateFile(file);

      const buffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const planPath = `${projectId}/${planId}`;
      const filePath = `${planPath}/original${this.getFileExtension(file.name)}`;

      const { error: uploadError } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: this.getMimeType(file.name),
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      const pageCount = this.isPdf(file.name) ? await this.extractPageCount(fileBuffer) : 1;
      const pages = this.isPdf(file.name)
        ? await this.extractPages(fileBuffer)
        : [{ pageNumber: 1, width: 0, height: 0, isScanned: true, hasText: false }];

      let thumbnailUrl = '';
      try {
        const thumbnailPath = `${planPath}/thumbnail.webp`;
        const thumbnailBuffer = await this.generateThumbnail(fileBuffer, file.name);

        if (thumbnailBuffer) {
          const { error: thumbError } = await this.supabase.storage
            .from(this.bucketName)
            .upload(thumbnailPath, thumbnailBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });

          if (!thumbError) {
            thumbnailUrl = await this.getSignedUrl(thumbnailPath);
          }
        }
      } catch (thumbError) {
        console.warn('Failed to generate thumbnail:', thumbError);
      }

      const signedUrl = await this.getSignedUrl(filePath);

      const metadata: PlanMetadata = {
        planId,
        projectId,
        fileName: file.name,
        fileType: this.getFileExtension(file.name).substring(1),
        fileSize: file.size,
        uploadedAt: new Date(),
        uploadedBy: userId,
        pageCount,
        pages,
        hasScale: false,
        disciplines: disciplines || [],
        tags: tags || [],
      };

      await prisma.plan.create({
        data: {
          id: planId,
          projectId,
          fileName: file.name,
          fileSize: file.size,
          fileType: metadata.fileType,
          pageCount,
          uploadedBy: userId,
          storagePath: filePath,
          metadata: metadata as any,
          disciplines: disciplines || [],
          tags: tags || [],
        },
      });

      return {
        planId,
        fileName: file.name,
        fileSize: file.size,
        pageCount,
        signedUrl,
        thumbnailUrl,
        metadata,
      };
    } catch (error) {
      throw new Error(`Plan upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getSignedUrl(storagePath: string, expiryHours: number = 24): Promise<string> {
    try {
      const expirySeconds = expiryHours * 60 * 60;

      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(storagePath, expirySeconds);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data?.signedUrl || '';
    } catch (error) {
      throw new Error(
        `Signed URL generation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async deletePlan(projectId: string, planId: string): Promise<void> {
    try {
      const planPath = `${projectId}/${planId}`;

      const { data: files, error: listError } = await this.supabase.storage
        .from(this.bucketName)
        .list(planPath);

      if (listError) {
        throw new Error(`Failed to list plan files: ${listError.message}`);
      }

      if (files && files.length > 0) {
        const filePaths = files.map((file) => `${planPath}/${file.name}`);

        const { error: deleteError } = await this.supabase.storage
          .from(this.bucketName)
          .remove(filePaths);

        if (deleteError) {
          throw new Error(`Failed to delete plan files: ${deleteError.message}`);
        }
      }

      await prisma.plan.delete({
        where: { id: planId },
      });
    } catch (error) {
      throw new Error(
        `Plan deletion failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listProjectPlans(projectId: string): Promise<PlanFile[]> {
    try {
      const plans = await prisma.plan.findMany({
        where: { projectId },
        select: {
          id: true,
          projectId: true,
          fileName: true,
          fileSize: true,
          fileType: true,
          pageCount: true,
          createdAt: true,
          updatedAt: true,
          uploadedBy: true,
        },
      });

      return plans as PlanFile[];
    } catch (error) {
      throw new Error(
        `Failed to list plans: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async extractPageCount(buffer: Buffer): Promise<number> {
    try {
      const data = await pdf(buffer);
      return data.numpages;
    } catch (error) {
      console.warn('Failed to extract page count:', error);
      return 1;
    }
  }

  private async extractPages(buffer: Buffer): Promise<PageInfo[]> {
    try {
      const data = await pdf(buffer);
      const pages: PageInfo[] = [];

      for (let i = 1; i <= data.numpages; i++) {
        pages.push({
          pageNumber: i,
          width: data.pages?.[i - 1]?.width || 0,
          height: data.pages?.[i - 1]?.height || 0,
          isScanned: true,
          hasText: data.text.length > 0,
        });
      }

      return pages;
    } catch (error) {
      console.warn('Failed to extract pages:', error);
      return [{ pageNumber: 1, width: 0, height: 0, isScanned: true, hasText: false }];
    }
  }

  private async generateThumbnail(buffer: Buffer, fileName: string): Promise<Buffer | null> {
    try {
      if (this.isPdf(fileName)) {
        const placeholder = await sharp({
          create: {
            width: this.thumbnailWidth,
            height: this.thumbnailHeight,
            channels: 3,
            background: { r: 240, g: 240, b: 240 },
          },
        }).webp().toBuffer();

        return placeholder;
      }

      const thumbnail = await sharp(buffer)
        .resize(this.thumbnailWidth, this.thumbnailHeight, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .webp()
        .toBuffer();

      return thumbnail;
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      return null;
    }
  }

  private validateFile(file: File): void {
    if (file.size > this.maxFileSize) {
      throw new Error(
        `File size exceeds maximum of ${this.maxFileSize / 1024 / 1024}MB. Received: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
    }

    if (!this.isSupportedFileType(file.name)) {
      throw new Error(
        `File type not supported. Supported formats: ${this.supportedFormats.join(', ')}`
      );
    }
  }

  private isSupportedFileType(fileName: string): boolean {
    const extension = this.getFileExtension(fileName).substring(1).toLowerCase();
    return this.supportedFormats.includes(extension);
  }

  private getFileExtension(fileName: string): string {
    return fileName.substring(fileName.lastIndexOf('.'));
  }

  private getMimeType(fileName: string): string {
    const extension = this.getFileExtension(fileName).substring(1).toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      tiff: 'image/tiff',
      tif: 'image/tiff',
      dwg: 'application/vnd.autodesk.autocad.drawing',
      dxf: 'application/vnd.dxf',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }

  private isPdf(fileName: string): boolean {
    return this.getFileExtension(fileName).substring(1).toLowerCase() === 'pdf';
  }
}
