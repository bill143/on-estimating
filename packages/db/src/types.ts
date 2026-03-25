/** Supabase Database types — matches migrations 001 + 002 */
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
          overhead_percent: number;
          profit_percent: number;
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
          overhead_percent?: number;
          profit_percent?: number;
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
          overhead_percent?: number;
          profit_percent?: number;
          updated_at?: string;
        };
      };
      line_items: {
        Row: {
          id: string;
          estimate_id: string;
          row_type: 'division_header' | 'subsection_header' | 'item_note' | 'line_item' | 'subtotal';
          csi_code: string;
          description: string;
          quantity: number;
          unit: string;
          unit_cost: number;
          sheet_no: string;
          detail_no: string;
          waste_percent: number;
          material_unit_cost: number;
          labor_unit_cost: number;
          total_cost: number;
          sort_order: number;
          parent_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          row_type?: 'division_header' | 'subsection_header' | 'item_note' | 'line_item' | 'subtotal';
          csi_code: string;
          description: string;
          quantity?: number;
          unit?: string;
          unit_cost?: number;
          sheet_no?: string;
          detail_no?: string;
          waste_percent?: number;
          material_unit_cost?: number;
          labor_unit_cost?: number;
          total_cost?: number;
          sort_order?: number;
          parent_id?: string | null;
        };
        Update: {
          row_type?: 'division_header' | 'subsection_header' | 'item_note' | 'line_item' | 'subtotal';
          csi_code?: string;
          description?: string;
          quantity?: number;
          unit?: string;
          unit_cost?: number;
          sheet_no?: string;
          detail_no?: string;
          waste_percent?: number;
          material_unit_cost?: number;
          labor_unit_cost?: number;
          total_cost?: number;
          sort_order?: number;
          parent_id?: string | null;
        };
      };
      alternates: {
        Row: {
          id: string;
          estimate_id: string;
          name: string;
          description: string;
          amount: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          estimate_id: string;
          name: string;
          description?: string;
          amount?: number;
          sort_order?: number;
        };
        Update: {
          name?: string;
          description?: string;
          amount?: number;
          sort_order?: number;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      bid_stage: 'lead' | 'estimating' | 'review' | 'submitted' | 'won' | 'lost';
      estimate_status: 'draft' | 'in_review' | 'approved' | 'rejected';
      row_type: 'division_header' | 'subsection_header' | 'item_note' | 'line_item' | 'subtotal';
    };
  };
}
