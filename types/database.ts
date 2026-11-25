// Hand-written to match supabase/migrations. Regenerate once the project is linked:
//   npx supabase gen types typescript --linked > types/database.ts

export type TransactionType = "income" | "expense";
export type TransactionStatus = "paid" | "planned";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          display_name?: string | null;
          currency?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_pct: number;
          color_index: number;
          sort_order: number;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          target_pct?: number;
          color_index?: number;
          sort_order?: number;
          archived_at?: string | null;
        };
        Update: {
          name?: string;
          target_pct?: number;
          color_index?: number;
          sort_order?: number;
          archived_at?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: TransactionType;
          amount: number;
          description: string;
          category_id: string | null;
          occurred_on: string;
          status: TransactionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: TransactionType;
          amount: number;
          description: string;
          category_id?: string | null;
          occurred_on?: string;
          status?: TransactionStatus;
        };
        Update: {
          type?: TransactionType;
          amount?: number;
          description?: string;
          category_id?: string | null;
          occurred_on?: string;
          status?: TransactionStatus;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      monthly_totals: {
        Args: { p_from: string; p_to: string };
        Returns: { month: string; income: number; spent: number }[];
      };
      seed_demo_data: {
        Args: Record<PropertyKey, never>;
        Returns: undefined;
      };
    };
    Enums: {
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
