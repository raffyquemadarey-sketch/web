/**
 * Supabase schema types.
 *
 * Hand-written in the shape `supabase gen types typescript` emits, so
 * regenerating is a small diff rather than a rewrite:
 *   supabase gen types typescript --project-id <ref> --schema public > src/lib/supabase/database.types.ts
 *
 * Column types therefore match the generator, not the app: `format` and
 * `play_type` are plain `string`, and the collection columns are `Json`.
 * Narrowing back to the app's unions is `@/lib/quick-play/session-row`'s job.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          role?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
        };
        Relationships: [];
      };
      quick_play_sessions: {
        Row: {
          assigned_player_names: Json;
          court_count: number;
          created_at: string;
          created_by: string | null;
          decisions: Json;
          format: string;
          id: string;
          match_minutes: number;
          play_type: string;
          roster: Json;
          session_minutes: number;
          team_count: number;
          team_players: Json;
          teams: Json;
          title: string;
          updated_at: string;
        };
        Insert: {
          assigned_player_names?: Json;
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          decisions?: Json;
          format?: string;
          id?: string;
          match_minutes?: number;
          play_type?: string;
          roster?: Json;
          session_minutes?: number;
          team_count?: number;
          team_players?: Json;
          teams?: Json;
          title?: string;
          updated_at?: string;
        };
        Update: {
          assigned_player_names?: Json;
          court_count?: number;
          created_at?: string;
          created_by?: string | null;
          decisions?: Json;
          format?: string;
          id?: string;
          match_minutes?: number;
          play_type?: string;
          roster?: Json;
          session_minutes?: number;
          team_count?: number;
          team_players?: Json;
          teams?: Json;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
