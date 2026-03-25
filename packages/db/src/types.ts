/** Auto-generated Supabase Database types — extend as tables are added */
export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          client: string;
          address: string | null;
          value: number;
          stage: 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
          bid_due_date: string | null;
          trade_scope: string | null;
          notes: string | null;
          assigned_to: string | null;
          confidence: number | null;
          created_at: string;
          updated_at: string;
          owner_id: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          client: string;
          address?: string | null;
          value?: number;
          stage?: 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
          bid_due_date?: string | null;
          trade_scope?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          confidence?: number | null;
          created_at?: string;
          updated_at?: string;
          owner_id: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          name?: string;
          client?: string;
          address?: string | null;
          value?: number;
          stage?: 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
          bid_due_date?: string | null;
          trade_scope?: string | null;
          notes?: string | null;
          assigned_to?: string | null;
          confidence?: number | null;
          updated_at?: string;
          sort_order?: number;
        };
      };
      estimates: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          status: 'draft' | 'in_review' | 'approved' | 'rejected';
          total: number;
          markup_percent: number;
          tax_percent: number;
          created_at: string;
          updated_at: string;
          owner_id: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          status?: 'draft' | 'in_review' | 'approved' | 'rejected';
          total?: number;
          markup_percent?: number;
          tax_percent?: number;
          created_at?: string;
          updated_at?: string;
          owner_id: string;
        };
        Update: {
          name?: string;
          status?: 'draft' | 'in_review' | 'approved' | 'rejected';
          total?: number;
          markup_percent?: number;
          tax_percent?: number;
          updated_at?: string;
        };
      };
      line_items: {
        Row: {
          id: string;
          estimate_id: string;
          csi_code: string;
          description: string;
          quantity: number;
          unit: string;
          unit_cost: number;
          total: number;
          sort_order: number;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          csi_code: string;
          description: string;
          quantity: number;
          unit: string;
          unit_cost: number;
          total?: number;
          sort_order?: number;
          parent_id?: string | null;
        };
        Update: {
          csi_code?: string;
          description?: string;
          quantity?: number;
          unit?: string;
          unit_cost?: number;
          total?: number;
          sort_order?: number;
          parent_id?: string | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      bid_stage: 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
      estimate_status: 'draft' | 'in_review' | 'approved' | 'rejected';
    };
  };
}
