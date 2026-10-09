export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string
          deleted_at: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          occurred_at: string
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          deleted_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          occurred_at?: string
          summary: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          occurred_at?: string
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_commands: {
        Row: {
          claimed_at: string | null
          command: string
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string | null
          payload: Json
          provenance: Json
          result: Json
          source: string
          status: string
          updated_at: string
          user_id: string
          workflow: string
        }
        Insert: {
          claimed_at?: string | null
          command: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          provenance?: Json
          result?: Json
          source?: string
          status?: string
          updated_at?: string
          user_id: string
          workflow?: string
        }
        Update: {
          claimed_at?: string | null
          command?: string
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string | null
          payload?: Json
          provenance?: Json
          result?: Json
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
          workflow?: string
        }
        Relationships: []
      }
      agent_notifications: {
        Row: {
          body: string
          channel: string
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          delivered_at: string | null
          delivery_status: string
          id: string
          provenance: Json
          read_at: string | null
          run_id: string | null
          source: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          provenance?: Json
          read_at?: string | null
          run_id?: string | null
          source?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          delivered_at?: string | null
          delivery_status?: string
          id?: string
          provenance?: Json
          read_at?: string | null
          run_id?: string | null
          source?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_notifications_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_owner: {
        Row: {
          bound_at: string
          singleton: boolean
          user_id: string
        }
        Insert: {
          bound_at?: string
          singleton?: boolean
          user_id: string
        }
        Update: {
          bound_at?: string
          singleton?: boolean
          user_id?: string
        }
        Relationships: []
      }
      agent_rate_limits: {
        Row: {
          bucket: string
          created_at: string
          hits: number
          updated_at: string
          window_start: string
        }
        Insert: {
          bucket: string
          created_at?: string
          hits?: number
          updated_at?: string
          window_start: string
        }
        Update: {
          bucket?: string
          created_at?: string
          hits?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      agent_runs: {
        Row: {
          created_at: string
          deleted_at: string | null
          delivery: Json
          error: string
          finished_at: string | null
          id: string
          idempotency_key: string
          next_run_at: string | null
          provenance: Json
          source: string
          started_at: string
          status: string
          updated_at: string
          usage: Json
          user_id: string
          workflow: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          delivery?: Json
          error?: string
          finished_at?: string | null
          id?: string
          idempotency_key: string
          next_run_at?: string | null
          provenance?: Json
          source?: string
          started_at?: string
          status: string
          updated_at?: string
          usage?: Json
          user_id: string
          workflow: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          delivery?: Json
          error?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string
          next_run_at?: string | null
          provenance?: Json
          source?: string
          started_at?: string
          status?: string
          updated_at?: string
          usage?: Json
          user_id?: string
          workflow?: string
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor: string
          created_at: string
          detail: Json
          entity_id: string | null
          entity_type: string
          id: string
          provenance: Json
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          provenance?: Json
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          provenance?: Json
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_preferences: {
        Row: {
          agent_paused: boolean
          avoid_companies: string[]
          briefing_time: string
          created_at: string
          deleted_at: string | null
          focus_skills: string[]
          id: string
          locations: string[]
          min_salary: string
          notes: string
          paused_workflows: string[]
          provenance: Json
          research_sources: string[]
          source: string
          study_minutes: number
          target_roles: string[]
          timezone: string
          updated_at: string
          user_id: string
          work_types: string[]
        }
        Insert: {
          agent_paused?: boolean
          avoid_companies?: string[]
          briefing_time?: string
          created_at?: string
          deleted_at?: string | null
          focus_skills?: string[]
          id?: string
          locations?: string[]
          min_salary?: string
          notes?: string
          paused_workflows?: string[]
          provenance?: Json
          research_sources?: string[]
          source?: string
          study_minutes?: number
          target_roles?: string[]
          timezone?: string
          updated_at?: string
          user_id: string
          work_types?: string[]
        }
        Update: {
          agent_paused?: boolean
          avoid_companies?: string[]
          briefing_time?: string
          created_at?: string
          deleted_at?: string | null
          focus_skills?: string[]
          id?: string
          locations?: string[]
          min_salary?: string
          notes?: string
          paused_workflows?: string[]
          provenance?: Json
          research_sources?: string[]
          source?: string
          study_minutes?: number
          target_roles?: string[]
          timezone?: string
          updated_at?: string
          user_id?: string
          work_types?: string[]
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          id: string
          industry: string
          name: string
          notes: string
          provenance: Json
          run_id: string | null
          source: string
          source_url: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
          website: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string
          name: string
          notes?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          website?: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string
          name?: string
          notes?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company: string
          created_at: string
          date_connected: string | null
          deleted_at: string | null
          email: string
          id: string
          last_interaction: string | null
          linkedin_url: string
          location: string
          name: string
          next_followup: string | null
          notes: string
          relationship_stage: string
          role: string
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string
          created_at?: string
          date_connected?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          last_interaction?: string | null
          linkedin_url?: string
          location?: string
          name: string
          next_followup?: string | null
          notes?: string
          relationship_stage?: string
          role?: string
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string
          created_at?: string
          date_connected?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          last_interaction?: string | null
          linkedin_url?: string
          location?: string
          name?: string
          next_followup?: string | null
          notes?: string
          relationship_stage?: string
          role?: string
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      curriculum_prerequisites: {
        Row: {
          basis: string
          created_at: string
          deleted_at: string | null
          id: string
          prerequisite_topic_id: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          basis?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          prerequisite_topic_id: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          basis?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          prerequisite_topic_id?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_prerequisites_prerequisite_topic_id_fkey"
            columns: ["prerequisite_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_prerequisites_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_sources: {
        Row: {
          active_version_id: string | null
          created_at: string
          deleted_at: string | null
          document_id: string
          id: string
          last_checked_at: string | null
          last_error: string
          last_synced_at: string | null
          status: string
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          active_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_id: string
          id?: string
          last_checked_at?: string | null
          last_error?: string
          last_synced_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          active_version_id?: string | null
          created_at?: string
          deleted_at?: string | null
          document_id?: string
          id?: string
          last_checked_at?: string | null
          last_error?: string
          last_synced_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_sources_active_fk"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_topics: {
        Row: {
          body: string
          completion_criteria: string
          content_hash: string
          created_at: string
          deleted_at: string | null
          description: string
          first_version_id: string | null
          id: string
          interview_notes: string
          last_version_id: string | null
          parent_topic_id: string | null
          practical_exercise: string
          priority: string
          priority_source: string
          recommended_minutes: number
          removed_at: string | null
          sequence: number
          skill_id: string | null
          skill_topic_id: string | null
          source_id: string
          source_reference: string
          stable_topic_id: string
          title: string
          updated_at: string
          user_id: string
          volume: string
          volume_title: string
        }
        Insert: {
          body?: string
          completion_criteria?: string
          content_hash?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          first_version_id?: string | null
          id?: string
          interview_notes?: string
          last_version_id?: string | null
          parent_topic_id?: string | null
          practical_exercise?: string
          priority?: string
          priority_source?: string
          recommended_minutes?: number
          removed_at?: string | null
          sequence?: number
          skill_id?: string | null
          skill_topic_id?: string | null
          source_id: string
          source_reference?: string
          stable_topic_id: string
          title: string
          updated_at?: string
          user_id: string
          volume: string
          volume_title?: string
        }
        Update: {
          body?: string
          completion_criteria?: string
          content_hash?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          first_version_id?: string | null
          id?: string
          interview_notes?: string
          last_version_id?: string | null
          parent_topic_id?: string | null
          practical_exercise?: string
          priority?: string
          priority_source?: string
          recommended_minutes?: number
          removed_at?: string | null
          sequence?: number
          skill_id?: string | null
          skill_topic_id?: string | null
          source_id?: string
          source_reference?: string
          stable_topic_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          volume?: string
          volume_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_topics_first_version_id_fkey"
            columns: ["first_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_last_version_id_fkey"
            columns: ["last_version_id"]
            isOneToOne: false
            referencedRelation: "curriculum_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_skill_topic_id_fkey"
            columns: ["skill_topic_id"]
            isOneToOne: false
            referencedRelation: "skill_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curriculum_topics_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "curriculum_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_versions: {
        Row: {
          applied: boolean
          content_hash: string
          created_at: string
          deleted_at: string | null
          id: string
          report: Json
          source_id: string
          status: string
          topic_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          applied?: boolean
          content_hash: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          report?: Json
          source_id: string
          status: string
          topic_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          applied?: boolean
          content_hash?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          report?: Json
          source_id?: string
          status?: string
          topic_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_versions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "curriculum_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_logs: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          journal: string
          log_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          journal?: string
          log_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          journal?: string
          log_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          id: string
          location: string
          organizer: string
          provenance: Json
          run_id: string | null
          source: string
          source_url: string
          starts_at: string | null
          status: string
          summary: string
          title: string
          updated_at: string
          url: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          location?: string
          organizer?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          starts_at?: string | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
          url?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          location?: string
          organizer?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          starts_at?: string | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          goal_id: string | null
          id: string
          kind: string
          project_id: string | null
          skill_id: string | null
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          goal_id?: string | null
          id?: string
          kind: string
          project_id?: string | null
          skill_id?: string | null
          title: string
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          goal_id?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          skill_id?: string | null
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          action: string
          created_at: string
          deleted_at: string | null
          id: string
          note: string
          provenance: Json
          source: string
          target_id: string | null
          target_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string
          provenance?: Json
          source?: string
          target_id?: string | null
          target_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          note?: string
          provenance?: Json
          source?: string
          target_id?: string | null
          target_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          created_at: string
          deleted_at: string | null
          duration_minutes: number
          ended_at: string | null
          id: string
          note: string
          started_at: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          note?: string
          started_at: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          duration_minutes?: number
          ended_at?: string | null
          id?: string
          note?: string
          started_at?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "focus_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      followups: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          deleted_at: string | null
          due_date: string
          id: string
          note: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          deleted_at?: string | null
          due_date: string
          id?: string
          note?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          note?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          goal_type: string
          id: string
          parent_goal_id: string | null
          reason: string
          status: string
          success_criteria: string
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          goal_type?: string
          id?: string
          parent_goal_id?: string | null
          reason?: string
          status?: string
          success_criteria?: string
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          goal_type?: string
          id?: string
          parent_goal_id?: string | null
          reason?: string
          status?: string
          success_criteria?: string
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_parent_goal_id_fkey"
            columns: ["parent_goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          archived: boolean
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          archived?: boolean
          content: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          archived?: boolean
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_practice: {
        Row: {
          answer: string
          confidence: number
          created_at: string
          deleted_at: string | null
          id: string
          notes: string
          practiced_at: string
          question_id: string
          recommendation_id: string | null
          updated_at: string
          user_id: string
          weaknesses: string
        }
        Insert: {
          answer?: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          practiced_at?: string
          question_id: string
          recommendation_id?: string | null
          updated_at?: string
          user_id: string
          weaknesses?: string
        }
        Update: {
          answer?: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          practiced_at?: string
          question_id?: string
          recommendation_id?: string | null
          updated_at?: string
          user_id?: string
          weaknesses?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_practice_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_practice_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          answer: string
          category: string
          confidence: number
          created_at: string
          deleted_at: string | null
          difficulty: string
          id: string
          last_practiced: string | null
          practice_count: number
          question: string
          recommendation_id: string | null
          skill_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string
          category?: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          difficulty?: string
          id?: string
          last_practiced?: string | null
          practice_count?: number
          question: string
          recommendation_id?: string | null
          skill_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          category?: string
          confidence?: number
          created_at?: string
          deleted_at?: string | null
          difficulty?: string
          id?: string
          last_practiced?: string | null
          practice_count?: number
          question?: string
          recommendation_id?: string | null
          skill_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_stories: {
        Row: {
          action: string
          created_at: string
          deleted_at: string | null
          id: string
          lessons: string
          project_id: string | null
          result: string
          situation: string
          tags: string[]
          task: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lessons?: string
          project_id?: string | null
          result?: string
          situation?: string
          tags?: string[]
          task?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          lessons?: string
          project_id?: string | null
          result?: string
          situation?: string
          tags?: string[]
          task?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_stories_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          company: string
          created_at: string
          date_applied: string | null
          date_found: string | null
          deleted_at: string | null
          followup_date: string | null
          id: string
          job_description: string
          job_url: string
          location: string
          notes: string
          priority: string
          recruiter: string
          recruiter_linkedin: string
          resume_version: string
          role: string
          salary_range: string
          status: string
          updated_at: string
          user_id: string
          work_type: string
        }
        Insert: {
          company: string
          created_at?: string
          date_applied?: string | null
          date_found?: string | null
          deleted_at?: string | null
          followup_date?: string | null
          id?: string
          job_description?: string
          job_url?: string
          location?: string
          notes?: string
          priority?: string
          recruiter?: string
          recruiter_linkedin?: string
          resume_version?: string
          role: string
          salary_range?: string
          status?: string
          updated_at?: string
          user_id: string
          work_type?: string
        }
        Update: {
          company?: string
          created_at?: string
          date_applied?: string | null
          date_found?: string | null
          deleted_at?: string | null
          followup_date?: string | null
          id?: string
          job_description?: string
          job_url?: string
          location?: string
          notes?: string
          priority?: string
          recruiter?: string
          recruiter_linkedin?: string
          resume_version?: string
          role?: string
          salary_range?: string
          status?: string
          updated_at?: string
          user_id?: string
          work_type?: string
        }
        Relationships: []
      }
      job_interviews: {
        Row: {
          application_id: string
          created_at: string
          deleted_at: string | null
          id: string
          notes: string
          scheduled_at: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          scheduled_at?: string | null
          stage: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          scheduled_at?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_leads: {
        Row: {
          application_id: string | null
          company: string
          company_id: string | null
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          fit_is_inference: boolean
          fit_notes: string
          id: string
          location: string
          official_url: string
          posted_at: string | null
          provenance: Json
          run_id: string | null
          salary_range: string
          source: string
          source_url: string
          status: string
          summary: string
          title: string
          updated_at: string
          user_id: string
          verified_at: string | null
          work_type: string
        }
        Insert: {
          application_id?: string | null
          company: string
          company_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          fit_is_inference?: boolean
          fit_notes?: string
          id?: string
          location?: string
          official_url: string
          posted_at?: string | null
          provenance?: Json
          run_id?: string | null
          salary_range?: string
          source?: string
          source_url?: string
          status?: string
          summary?: string
          title: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
          work_type?: string
        }
        Update: {
          application_id?: string | null
          company?: string
          company_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          fit_is_inference?: boolean
          fit_notes?: string
          id?: string
          location?: string
          official_url?: string
          posted_at?: string | null
          provenance?: Json
          run_id?: string | null
          salary_range?: string
          source?: string
          source_url?: string
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_leads_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_leads_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_skill_requirements: {
        Row: {
          application_id: string
          assessment: string
          created_at: string
          deleted_at: string | null
          id: string
          requirement_type: string
          skill_id: string | null
          skill_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id: string
          assessment?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          requirement_type?: string
          skill_id?: string | null
          skill_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string
          assessment?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          requirement_type?: string
          skill_id?: string | null
          skill_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_skill_requirements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_skill_requirements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_assignments: {
        Row: {
          assignment_date: string
          completed_at: string | null
          completion_criteria: string
          created_at: string
          deleted_at: string | null
          help_requested: boolean
          id: string
          idempotency_key: string
          is_inference: boolean
          plan: Json
          planned_minutes: number
          practical_outcome: string
          progress_notes: string
          rationale: string
          recorded_minutes: number
          request_payload: Json | null
          source: string
          status: string
          task_id: string | null
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_date: string
          completed_at?: string | null
          completion_criteria?: string
          created_at?: string
          deleted_at?: string | null
          help_requested?: boolean
          id?: string
          idempotency_key: string
          is_inference?: boolean
          plan?: Json
          planned_minutes?: number
          practical_outcome?: string
          progress_notes?: string
          rationale?: string
          recorded_minutes?: number
          request_payload?: Json | null
          source?: string
          status?: string
          task_id?: string | null
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_date?: string
          completed_at?: string | null
          completion_criteria?: string
          created_at?: string
          deleted_at?: string | null
          help_requested?: boolean
          id?: string
          idempotency_key?: string
          is_inference?: boolean
          plan?: Json
          planned_minutes?: number
          practical_outcome?: string
          progress_notes?: string
          rationale?: string
          recorded_minutes?: number
          request_payload?: Json | null
          source?: string
          status?: string
          task_id?: string | null
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_assignments_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_baselines: {
        Row: {
          basis: string
          created_at: string
          deleted_at: string | null
          id: string
          level: string
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          basis?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level: string
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          basis?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          level?: string
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_baselines_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_feedback: {
        Row: {
          assignment_id: string
          channel: string
          created_at: string
          deleted_at: string | null
          id: string
          idempotency_key: string
          kind: string
          minutes: number | null
          new_date: string | null
          notes: string
          raw_text: string
          request_payload: Json | null
          result: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id: string
          channel: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key: string
          kind: string
          minutes?: number | null
          new_date?: string | null
          notes?: string
          raw_text?: string
          request_payload?: Json | null
          result?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string
          channel?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          idempotency_key?: string
          kind?: string
          minutes?: number | null
          new_date?: string | null
          notes?: string
          raw_text?: string
          request_payload?: Json | null
          result?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_feedback_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "learning_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_preferences: {
        Row: {
          baseline_completed_at: string | null
          created_at: string
          daily_minutes: number
          deleted_at: string | null
          evening_time: string
          guide_url: string
          hermes_last_seen_at: string | null
          id: string
          morning_time: string
          paused: boolean
          sync_time: string
          telegram_status: string
          telegram_status_at: string | null
          timezone: string
          updated_at: string
          user_id: string
          weekly_minutes: number
        }
        Insert: {
          baseline_completed_at?: string | null
          created_at?: string
          daily_minutes?: number
          deleted_at?: string | null
          evening_time?: string
          guide_url?: string
          hermes_last_seen_at?: string | null
          id?: string
          morning_time?: string
          paused?: boolean
          sync_time?: string
          telegram_status?: string
          telegram_status_at?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
          weekly_minutes?: number
        }
        Update: {
          baseline_completed_at?: string | null
          created_at?: string
          daily_minutes?: number
          deleted_at?: string | null
          evening_time?: string
          guide_url?: string
          hermes_last_seen_at?: string | null
          id?: string
          morning_time?: string
          paused?: boolean
          sync_time?: string
          telegram_status?: string
          telegram_status_at?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
          weekly_minutes?: number
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          created_at: string
          deleted_at: string | null
          focus_session_id: string | null
          id: string
          learned: string
          minutes: number
          occurred_at: string
          skill_id: string | null
          task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          focus_session_id?: string | null
          id?: string
          learned?: string
          minutes: number
          occurred_at?: string
          skill_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          focus_session_id?: string | null
          id?: string
          learned?: string
          minutes?: number
          occurred_at?: string
          skill_id?: string | null
          task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_sessions_focus_session_id_fkey"
            columns: ["focus_session_id"]
            isOneToOne: false
            referencedRelation: "focus_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_sessions_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_sessions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          created_at: string
          deleted_at: string | null
          due_date: string | null
          goal_id: string
          id: string
          status: string
          success_criteria: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          goal_id: string
          id?: string
          status?: string
          success_criteria?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          goal_id?: string
          id?: string
          status?: string
          success_criteria?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
        ]
      }
      mock_interviews: {
        Row: {
          created_at: string
          deleted_at: string | null
          feedback: string
          id: string
          occurred_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          feedback?: string
          id?: string
          occurred_at?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          feedback?: string
          id?: string
          occurred_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      network_interactions: {
        Row: {
          contact_id: string
          created_at: string
          deleted_at: string | null
          id: string
          kind: string
          notes: string
          occurred_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind: string
          notes?: string
          occurred_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          kind?: string
          notes?: string
          occurred_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "network_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          deleted_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          source_url: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source_url?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          deleted_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          source_url?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach: {
        Row: {
          channel: string
          contact_id: string | null
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          draft: string
          id: string
          is_inference: boolean
          provenance: Json
          reason: string
          recipient: string
          response_notes: string
          response_received_at: string | null
          run_id: string | null
          sent_at: string | null
          source: string
          source_url: string
          status: string
          subject: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          channel?: string
          contact_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          draft?: string
          id?: string
          is_inference?: boolean
          provenance?: Json
          reason?: string
          recipient?: string
          response_notes?: string
          response_received_at?: string | null
          run_id?: string | null
          sent_at?: string | null
          source?: string
          source_url?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          channel?: string
          contact_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          draft?: string
          id?: string
          is_inference?: boolean
          provenance?: Json
          reason?: string
          recipient?: string
          response_notes?: string
          response_received_at?: string | null
          run_id?: string | null
          sent_at?: string | null
          source?: string
          source_url?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_blocks: {
        Row: {
          block_date: string
          created_at: string
          deleted_at: string | null
          end_time: string
          id: string
          start_time: string
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_date: string
          created_at?: string
          deleted_at?: string | null
          end_time: string
          id?: string
          start_time: string
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_date?: string
          created_at?: string
          deleted_at?: string | null
          end_time?: string
          id?: string
          start_time?: string
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          career_target: string
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          updated_at: string
          weekly_hours: number
        }
        Insert: {
          career_target?: string
          created_at?: string
          display_name?: string
          id: string
          onboarded_at?: string | null
          updated_at?: string
          weekly_hours?: number
        }
        Update: {
          career_target?: string
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          updated_at?: string
          weekly_hours?: number
        }
        Relationships: []
      }
      project_decisions: {
        Row: {
          context: string
          created_at: string
          decision: string
          deleted_at: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          context?: string
          created_at?: string
          decision?: string
          deleted_at?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          context?: string
          created_at?: string
          decision?: string
          deleted_at?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          due_date: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          due_date?: string | null
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          detail: string
          due_date: string | null
          evidence_url: string
          id: string
          is_inference: boolean
          kind: string
          project_id: string
          provenance: Json
          run_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          detail?: string
          due_date?: string | null
          evidence_url?: string
          id?: string
          is_inference?: boolean
          kind?: string
          project_id: string
          provenance?: Json
          run_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          detail?: string
          due_date?: string | null
          evidence_url?: string
          id?: string
          is_inference?: boolean
          kind?: string
          project_id?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          architecture: string
          business_value: string
          created_at: string
          deleted_at: string | null
          deployment_url: string
          description: string
          github_url: string
          id: string
          name: string
          problem: string
          start_date: string | null
          status: string
          target_date: string | null
          technologies: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          architecture?: string
          business_value?: string
          created_at?: string
          deleted_at?: string | null
          deployment_url?: string
          description?: string
          github_url?: string
          id?: string
          name: string
          problem?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          architecture?: string
          business_value?: string
          created_at?: string
          deleted_at?: string | null
          deployment_url?: string
          description?: string
          github_url?: string
          id?: string
          name?: string
          problem?: string
          start_date?: string | null
          status?: string
          target_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          body: string
          briefing_date: string | null
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          document_id: string | null
          id: string
          is_inference: boolean
          kind: string
          priority: number
          provenance: Json
          run_id: string | null
          source: string
          source_url: string
          status: string
          title: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          body?: string
          briefing_date?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          is_inference?: boolean
          kind?: string
          priority?: number
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          body?: string
          briefing_date?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          is_inference?: boolean
          kind?: string
          priority?: number
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          notes: string
          priority: string
          project_id: string | null
          skill_id: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          priority?: string
          project_id?: string | null
          skill_id?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string
          priority?: string
          project_id?: string | null
          skill_id?: string | null
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduler_runs: {
        Row: {
          attempt: number
          attempt_token: string | null
          catch_up: boolean
          created_at: string
          deleted_at: string | null
          detail: Json
          finished_at: string | null
          id: string
          job: string
          lease_until: string | null
          run_date: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt?: number
          attempt_token?: string | null
          catch_up?: boolean
          created_at?: string
          deleted_at?: string | null
          detail?: Json
          finished_at?: string | null
          id?: string
          job: string
          lease_until?: string | null
          run_date: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt?: number
          attempt_token?: string | null
          catch_up?: boolean
          created_at?: string
          deleted_at?: string | null
          detail?: Json
          finished_at?: string | null
          id?: string
          job?: string
          lease_until?: string | null
          run_date?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_topics: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          parent_topic_id: string | null
          skill_id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_topic_id?: string | null
          skill_id: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_topic_id?: string | null
          skill_id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "skill_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_topics_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          hands_on: number
          id: string
          interview: number
          knowledge: number
          last_activity: string | null
          name: string
          production: number
          project_proof: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          hands_on?: number
          id?: string
          interview?: number
          knowledge?: number
          last_activity?: string | null
          name: string
          production?: number
          project_proof?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          hands_on?: number
          id?: string
          interview?: number
          knowledge?: number
          last_activity?: string | null
          name?: string
          production?: number
          project_proof?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      source_documents: {
        Row: {
          agent_summary: string
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          id: string
          kind: string
          processed_at: string | null
          provenance: Json
          run_id: string | null
          source: string
          status: string
          storage_path: string
          summary: string
          title: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          agent_summary?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          processed_at?: string | null
          provenance?: Json
          run_id?: string | null
          source?: string
          status?: string
          storage_path?: string
          summary?: string
          title: string
          updated_at?: string
          url?: string
          user_id: string
        }
        Update: {
          agent_summary?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          id?: string
          kind?: string
          processed_at?: string | null
          provenance?: Json
          run_id?: string | null
          source?: string
          status?: string
          storage_path?: string
          summary?: string
          title?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_documents_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      study_history: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          minutes: number
          notes: string
          occurred_at: string
          provenance: Json
          skill_id: string | null
          source: string
          study_task_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          minutes?: number
          notes?: string
          occurred_at?: string
          provenance?: Json
          skill_id?: string | null
          source?: string
          study_task_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          minutes?: number
          notes?: string
          occurred_at?: string
          provenance?: Json
          skill_id?: string | null
          source?: string
          study_task_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_history_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_history_study_task_id_fkey"
            columns: ["study_task_id"]
            isOneToOne: false
            referencedRelation: "study_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      study_tasks: {
        Row: {
          consolidated_task_id: string | null
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          detail: string
          due_date: string | null
          estimated_minutes: number
          id: string
          is_inference: boolean
          priority: string
          provenance: Json
          resource_url: string
          run_id: string | null
          skill_id: string | null
          source: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consolidated_task_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          detail?: string
          due_date?: string | null
          estimated_minutes?: number
          id?: string
          is_inference?: boolean
          priority?: string
          provenance?: Json
          resource_url?: string
          run_id?: string | null
          skill_id?: string | null
          source?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consolidated_task_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          detail?: string
          due_date?: string | null
          estimated_minutes?: number
          id?: string
          is_inference?: boolean
          priority?: string
          provenance?: Json
          resource_url?: string
          run_id?: string | null
          skill_id?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_tasks_consolidated_task_id_fkey"
            columns: ["consolidated_task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tasks_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_tasks_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      task_dependencies: {
        Row: {
          created_at: string
          deleted_at: string | null
          depends_on_id: string
          id: string
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          depends_on_id: string
          id?: string
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          depends_on_id?: string
          id?: string
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_dependencies_depends_on_id_fkey"
            columns: ["depends_on_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_dependencies_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          task_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          task_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          task_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          actual_minutes: number
          application_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string
          deleted_at: string | null
          description: string
          due_date: string | null
          estimated_minutes: number
          evidence_required: boolean
          goal_id: string | null
          id: string
          milestone_id: string | null
          priority: string
          project_id: string | null
          recurrence: string | null
          scheduled_date: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          skill_id: string | null
          skill_topic_id: string | null
          sort_order: number
          status: string
          tags: string[]
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_minutes?: number
          application_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          estimated_minutes?: number
          evidence_required?: boolean
          goal_id?: string | null
          id?: string
          milestone_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence?: string | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          skill_id?: string | null
          skill_topic_id?: string | null
          sort_order?: number
          status?: string
          tags?: string[]
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_minutes?: number
          application_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          due_date?: string | null
          estimated_minutes?: number
          evidence_required?: boolean
          goal_id?: string | null
          id?: string
          milestone_id?: string | null
          priority?: string
          project_id?: string | null
          recurrence?: string | null
          scheduled_date?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          skill_id?: string | null
          skill_topic_id?: string | null
          sort_order?: number
          status?: string
          tags?: string[]
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_skill_topic_id_fkey"
            columns: ["skill_topic_id"]
            isOneToOne: false
            referencedRelation: "skill_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      telegram_message_map: {
        Row: {
          assignment_id: string | null
          chat_ref: string
          created_at: string
          deleted_at: string | null
          delivery_status: string
          direction: string
          error: string
          finished_at: string | null
          id: string
          idempotency_key: string | null
          kind: string
          message_id: string
          reconciled: boolean
          reply_to_message_id: string
          reservation_token: string | null
          reserved_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assignment_id?: string | null
          chat_ref?: string
          created_at?: string
          deleted_at?: string | null
          delivery_status: string
          direction: string
          error?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          kind: string
          message_id?: string
          reconciled?: boolean
          reply_to_message_id?: string
          reservation_token?: string | null
          reserved_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assignment_id?: string | null
          chat_ref?: string
          created_at?: string
          deleted_at?: string | null
          delivery_status?: string
          direction?: string
          error?: string
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: string
          message_id?: string
          reconciled?: boolean
          reply_to_message_id?: string
          reservation_token?: string | null
          reserved_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "telegram_message_map_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "learning_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      uncertain_claims: {
        Row: {
          claim: string
          confidence: number
          context: string
          created_at: string
          dedupe_key: string | null
          deleted_at: string | null
          document_id: string | null
          id: string
          provenance: Json
          run_id: string | null
          source: string
          source_url: string
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          claim: string
          confidence?: number
          context?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          claim?: string
          confidence?: number
          context?: string
          created_at?: string
          dedupe_key?: string | null
          deleted_at?: string | null
          document_id?: string | null
          id?: string
          provenance?: Json
          run_id?: string | null
          source?: string
          source_url?: string
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uncertain_claims_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "source_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uncertain_claims_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      agent_complete_command: {
        Args: { p_id: string; p_result: Json; p_status: string }
        Returns: Json
      }
      agent_document_result: { Args: { p: Json }; Returns: Json }
      agent_ingest: { Args: { p: Json }; Returns: Json }
      agent_poll: {
        Args: { p_cursor: string; p_limit?: number }
        Returns: Json
      }
      agent_rate_hit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      claim_agent_owner: { Args: never; Returns: string }
      learning_ack_command: {
        Args: {
          p_id: string
          p_result: Json
          p_status: string
          p_user_id: string
        }
        Returns: Json
      }
      learning_apply_curriculum: {
        Args: { p_input: Json; p_source_id: string; p_user_id: string }
        Returns: Json
      }
      learning_apply_feedback: {
        Args: { p_input: Json; p_user_id: string }
        Returns: Json
      }
      learning_assert_user: { Args: { p_user_id: string }; Returns: undefined }
      learning_begin_delivery: {
        Args: { p_input: Json; p_user_id: string }
        Returns: Json
      }
      learning_claim_run: {
        Args: {
          p_catch_up: boolean
          p_job: string
          p_lease_seconds: number
          p_run_date: string
          p_user_id: string
        }
        Returns: Json
      }
      learning_create_assignment: {
        Args: { p_input: Json; p_user_id: string }
        Returns: Json
      }
      learning_finish_delivery: {
        Args: { p_input: Json; p_user_id: string }
        Returns: Json
      }
      learning_finish_run: {
        Args: {
          p_detail: Json
          p_job: string
          p_run_date: string
          p_status: string
          p_token: string
          p_user_id: string
        }
        Returns: Json
      }
      learning_record_delivery: {
        Args: { p_input: Json; p_user_id: string }
        Returns: Json
      }
      learning_record_focus: {
        Args: {
          p_complete: boolean
          p_ended_at: string
          p_minutes: number
          p_session_id: string
          p_started_at: string
          p_task_id: string
          p_user_id: string
        }
        Returns: Json
      }
      learning_valid_timezone: { Args: { p_tz: string }; Returns: boolean }
      mark_job_lead_applied: {
        Args: { p_lead: string; p_notes?: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

