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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: string
          created_at: string | null
          description: string
          icon_name: string | null
          id: string
          name: string
          points: number | null
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          category: string
          created_at?: string | null
          description: string
          icon_name?: string | null
          id?: string
          name: string
          points?: number | null
          requirement_type: string
          requirement_value: number
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string
          icon_name?: string | null
          id?: string
          name?: string
          points?: number | null
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          ai_model: string | null
          created_at: string | null
          id: string
          knowledge_context: Json | null
          subject_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string | null
          id?: string
          knowledge_context?: Json | null
          subject_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string | null
          id?: string
          knowledge_context?: Json | null
          subject_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string | null
          created_by: string | null
          curriculum: string | null
          description: string | null
          duration_minutes: number | null
          grade: number | null
          id: string
          is_premium: boolean | null
          is_published: boolean | null
          linked_exam_id: string | null
          order_index: number | null
          parent_lesson_id: string | null
          rich_content: string | null
          subject_id: string | null
          thumbnail_url: string | null
          title: string
          topic: string | null
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          curriculum?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          linked_exam_id?: string | null
          order_index?: number | null
          parent_lesson_id?: string | null
          rich_content?: string | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title: string
          topic?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          created_by?: string | null
          curriculum?: string | null
          description?: string | null
          duration_minutes?: number | null
          grade?: number | null
          id?: string
          is_premium?: boolean | null
          is_published?: boolean | null
          linked_exam_id?: string | null
          order_index?: number | null
          parent_lesson_id?: string | null
          rich_content?: string | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          topic?: string | null
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_parent_lesson_id_fkey"
            columns: ["parent_lesson_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string | null
          created_by: string | null
          curriculum: Database["public"]["Enums"]["curriculum_type"] | null
          description: string | null
          file_url: string | null
          grade: number | null
          id: string
          is_past_paper: boolean | null
          is_published: boolean | null
          paper_number: number | null
          subject_id: string | null
          title: string
          updated_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          curriculum?: Database["public"]["Enums"]["curriculum_type"] | null
          description?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          is_past_paper?: boolean | null
          is_published?: boolean | null
          paper_number?: number | null
          subject_id?: string | null
          title: string
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          curriculum?: Database["public"]["Enums"]["curriculum_type"] | null
          description?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          is_past_paper?: boolean | null
          is_published?: boolean | null
          paper_number?: number | null
          subject_id?: string | null
          title?: string
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_ai_generated: boolean
          mastered_cards: number | null
          source_knowledge_id: string | null
          subject_id: string | null
          title: string
          total_cards: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          mastered_cards?: number | null
          source_knowledge_id?: string | null
          subject_id?: string | null
          title: string
          total_cards?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          mastered_cards?: number | null
          source_knowledge_id?: string | null
          subject_id?: string | null
          title?: string
          total_cards?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string | null
          deck_id: string
          difficulty: string | null
          front: string
          hint: string | null
          id: string
          is_mastered: boolean
          next_review_at: string | null
          times_correct: number
          times_reviewed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string | null
          deck_id: string
          difficulty?: string | null
          front: string
          hint?: string | null
          id?: string
          is_mastered?: boolean
          next_review_at?: string | null
          times_correct?: number
          times_reviewed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string | null
          deck_id?: string
          difficulty?: string | null
          front?: string
          hint?: string | null
          id?: string
          is_mastered?: boolean
          next_review_at?: string | null
          times_correct?: number
          times_reviewed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string | null
          completed_sections: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          lesson_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_sections?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_sections?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_sections: {
        Row: {
          content: string
          content_type: string | null
          content_url: string | null
          created_at: string | null
          duration_minutes: number | null
          id: string
          lesson_id: string
          order_index: number
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id: string
          order_index?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_type?: string | null
          content_url?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_id?: string
          order_index?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_sections_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_minutes: number | null
          id: string
          is_ai_generated: boolean | null
          order_index: number | null
          subject_id: string | null
          title: string
          total_sections: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_ai_generated?: boolean | null
          order_index?: number | null
          subject_id?: string | null
          title: string
          total_sections?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_ai_generated?: boolean | null
          order_index?: number | null
          subject_id?: string | null
          title?: string
          total_sections?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_data_attempts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          data_question_id: string
          id: string
          is_correct: boolean | null
          started_at: string | null
          time_taken_seconds: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          data_question_id: string
          id?: string
          is_correct?: boolean | null
          started_at?: string | null
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          data_question_id?: string
          id?: string
          is_correct?: boolean | null
          started_at?: string | null
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nbt_data_attempts_data_question_id_fkey"
            columns: ["data_question_id"]
            isOneToOne: false
            referencedRelation: "nbt_data_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_data_interpretation: {
        Row: {
          collection_id: string | null
          created_at: string | null
          data_image_type: string | null
          data_image_url: string
          description: string | null
          difficulty: string
          id: string
          is_official: boolean | null
          is_published: boolean | null
          order_index: number | null
          question_count: number | null
          section: string
          tags: string[] | null
          title: string
          topic: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          data_image_type?: string | null
          data_image_url: string
          description?: string | null
          difficulty: string
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          question_count?: number | null
          section: string
          tags?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          data_image_type?: string | null
          data_image_url?: string
          description?: string | null
          difficulty?: string
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          question_count?: number | null
          section?: string
          tags?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nbt_data_interpretation_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nbt_question_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_data_questions: {
        Row: {
          correct_answer: string
          correct_answer_index: number | null
          created_at: string | null
          data_interpretation_id: string
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question_text: string
          question_type: string
          user_id: string | null
        }
        Insert: {
          correct_answer: string
          correct_answer_index?: number | null
          created_at?: string | null
          data_interpretation_id: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text: string
          question_type: string
          user_id?: string | null
        }
        Update: {
          correct_answer?: string
          correct_answer_index?: number | null
          created_at?: string | null
          data_interpretation_id?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_text?: string
          question_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nbt_data_questions_data_interpretation_id_fkey"
            columns: ["data_interpretation_id"]
            isOneToOne: false
            referencedRelation: "nbt_data_interpretation"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_practice_attempts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_correct: boolean | null
          question_id: string
          section: string
          started_at: string | null
          time_taken_seconds: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          section: string
          started_at?: string | null
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          section?: string
          started_at?: string | null
          time_taken_seconds?: number | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nbt_practice_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "nbt_practice_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_practice_questions: {
        Row: {
          collection_id: string | null
          correct_answer: string
          correct_answer_index: number | null
          created_at: string | null
          difficulty: string
          explanation: string | null
          hint: string | null
          id: string
          is_official: boolean | null
          is_published: boolean | null
          options: Json | null
          order_index: number | null
          points: number | null
          question_image_url: string | null
          question_text: string
          question_type: string
          section: string
          tags: string[] | null
          title: string
          topic: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          collection_id?: string | null
          correct_answer: string
          correct_answer_index?: number | null
          created_at?: string | null
          difficulty: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_image_url?: string | null
          question_text: string
          question_type: string
          section: string
          tags?: string[] | null
          title: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          collection_id?: string | null
          correct_answer?: string
          correct_answer_index?: number | null
          created_at?: string | null
          difficulty?: string
          explanation?: string | null
          hint?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question_image_url?: string | null
          question_text?: string
          question_type?: string
          section?: string
          tags?: string[] | null
          title?: string
          topic?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nbt_practice_questions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "nbt_question_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_practice_tests: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_official: boolean | null
          is_published: boolean | null
          passing_score: number | null
          section: string | null
          time_limit_minutes: number | null
          title: string
          total_questions: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          section?: string | null
          time_limit_minutes?: number | null
          title: string
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          passing_score?: number | null
          section?: string | null
          time_limit_minutes?: number | null
          title?: string
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nbt_question_collections: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          id: string
          is_official: boolean | null
          is_published: boolean | null
          order_index: number | null
          question_count: number | null
          section: string
          tags: string[] | null
          title: string
          topic: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          question_count?: number | null
          section: string
          tags?: string[] | null
          title: string
          topic: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          question_count?: number | null
          section?: string
          tags?: string[] | null
          title?: string
          topic?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nbt_study_materials: {
        Row: {
          content: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          file_size: number | null
          file_type: string | null
          id: string
          is_official: boolean | null
          is_published: boolean | null
          material_type: string
          order_index: number | null
          section: string
          tags: string[] | null
          title: string
          topic: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          material_type: string
          order_index?: number | null
          section: string
          tags?: string[] | null
          title: string
          topic: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_official?: boolean | null
          is_published?: boolean | null
          material_type?: string
          order_index?: number | null
          section?: string
          tags?: string[] | null
          title?: string
          topic?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nbt_test_attempts: {
        Row: {
          answered_questions: number | null
          answers: Json | null
          completed_at: string | null
          correct_answers: number | null
          created_at: string | null
          id: string
          max_score: number | null
          percentage: number | null
          section: string | null
          started_at: string | null
          status: string | null
          test_id: string
          time_taken_seconds: number | null
          total_score: number | null
          user_id: string
        }
        Insert: {
          answered_questions?: number | null
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          section?: string | null
          started_at?: string | null
          status?: string | null
          test_id: string
          time_taken_seconds?: number | null
          total_score?: number | null
          user_id: string
        }
        Update: {
          answered_questions?: number | null
          answers?: Json | null
          completed_at?: string | null
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          section?: string | null
          started_at?: string | null
          status?: string | null
          test_id?: string
          time_taken_seconds?: number | null
          total_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nbt_test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "nbt_practice_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_test_questions: {
        Row: {
          created_at: string | null
          id: string
          order_index: number | null
          question_id: string
          test_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          question_id: string
          test_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_index?: number | null
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nbt_test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "nbt_practice_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nbt_test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "nbt_practice_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      nbt_user_progress: {
        Row: {
          aql_attempts: number | null
          aql_average_score: number | null
          aql_correct: number | null
          best_test_score: number | null
          created_at: string | null
          id: string
          last_attempted_at: string | null
          mat_attempts: number | null
          mat_average_score: number | null
          mat_correct: number | null
          ql_attempts: number | null
          ql_average_score: number | null
          ql_correct: number | null
          total_test_attempts: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aql_attempts?: number | null
          aql_average_score?: number | null
          aql_correct?: number | null
          best_test_score?: number | null
          created_at?: string | null
          id?: string
          last_attempted_at?: string | null
          mat_attempts?: number | null
          mat_average_score?: number | null
          mat_correct?: number | null
          ql_attempts?: number | null
          ql_average_score?: number | null
          ql_correct?: number | null
          total_test_attempts?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aql_attempts?: number | null
          aql_average_score?: number | null
          aql_correct?: number | null
          best_test_score?: number | null
          created_at?: string | null
          id?: string
          last_attempted_at?: string | null
          mat_attempts?: number | null
          mat_average_score?: number | null
          mat_correct?: number | null
          ql_attempts?: number | null
          ql_average_score?: number | null
          ql_correct?: number | null
          total_test_attempts?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      past_paper_attempts: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_id: string
          id: string
          max_score: number | null
          notes: string | null
          score: number | null
          time_taken_minutes: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_id: string
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          time_taken_minutes?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string
          id?: string
          max_score?: number | null
          notes?: string | null
          score?: number | null
          time_taken_minutes?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "past_paper_attempts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          payment_method: string | null
          payment_type: string
          status: string | null
          subscription_plan: string | null
          transaction_reference: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_type: string
          status?: string | null
          subscription_plan?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_method?: string | null
          payment_type?: string
          status?: string | null
          subscription_plan?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pdf_annotations: {
        Row: {
          annotation_type: string
          color: string | null
          content: string | null
          created_at: string | null
          document_id: string | null
          file_url: string | null
          id: string
          page_number: number
          position: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          annotation_type: string
          color?: string | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          page_number: number
          position: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          annotation_type?: string
          color?: string | null
          content?: string | null
          created_at?: string | null
          document_id?: string | null
          file_url?: string | null
          id?: string
          page_number?: number
          position?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_processing_jobs: {
        Row: {
          completed_at: string | null
          course_name: string | null
          created_at: string | null
          curriculum_type: string | null
          detected_section: string | null
          error_message: string | null
          file_name: string
          file_url: string
          grade_level: string | null
          id: string
          learning_objectives: string[] | null
          status: string
          topics: string[] | null
          total_lessons: number | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          course_name?: string | null
          created_at?: string | null
          curriculum_type?: string | null
          detected_section?: string | null
          error_message?: string | null
          file_name: string
          file_url: string
          grade_level?: string | null
          id?: string
          learning_objectives?: string[] | null
          status?: string
          topics?: string[] | null
          total_lessons?: number | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          course_name?: string | null
          created_at?: string | null
          curriculum_type?: string | null
          detected_section?: string | null
          error_message?: string | null
          file_name?: string
          file_url?: string
          grade_level?: string | null
          id?: string
          learning_objectives?: string[] | null
          status?: string
          topics?: string[] | null
          total_lessons?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          curriculum: Database["public"]["Enums"]["curriculum_type"] | null
          exam_board: string | null
          full_name: string | null
          grade: number | null
          id: string
          is_active: boolean | null
          is_suspended: boolean | null
          language: string | null
          last_login_at: string | null
          login_count: number | null
          payment_method: string | null
          phone: string | null
          preferred_theme: string | null
          renewal_date: string | null
          school: string | null
          subjects: string[] | null
          subscription_plan: string | null
          suspended_at: string | null
          suspended_reason: string | null
          total_study_minutes: number | null
          updated_at: string | null
          user_id: string
          user_initials: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          curriculum?: Database["public"]["Enums"]["curriculum_type"] | null
          exam_board?: string | null
          full_name?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          language?: string | null
          last_login_at?: string | null
          login_count?: number | null
          payment_method?: string | null
          phone?: string | null
          preferred_theme?: string | null
          renewal_date?: string | null
          school?: string | null
          subjects?: string[] | null
          subscription_plan?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          total_study_minutes?: number | null
          updated_at?: string | null
          user_id: string
          user_initials?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          curriculum?: Database["public"]["Enums"]["curriculum_type"] | null
          exam_board?: string | null
          full_name?: string | null
          grade?: number | null
          id?: string
          is_active?: boolean | null
          is_suspended?: boolean | null
          language?: string | null
          last_login_at?: string | null
          login_count?: number | null
          payment_method?: string | null
          phone?: string | null
          preferred_theme?: string | null
          renewal_date?: string | null
          school?: string | null
          subjects?: string[] | null
          subscription_plan?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          total_study_minutes?: number | null
          updated_at?: string | null
          user_id?: string
          user_initials?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          id: string
          max_score: number | null
          percentage: number | null
          quiz_id: string
          score: number | null
          started_at: string | null
          time_taken_seconds: number | null
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          quiz_id: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          id?: string
          max_score?: number | null
          percentage?: number | null
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          time_taken_seconds?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          explanation: string | null
          id: string
          options: Json | null
          order_index: number | null
          points: number | null
          question: string
          question_type: string
          quiz_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question: string
          question_type?: string
          quiz_id: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number | null
          points?: number | null
          question?: string
          question_type?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_ai_generated: boolean
          source_knowledge_id: string | null
          subject_id: string | null
          time_limit_minutes: number | null
          title: string
          total_questions: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          source_knowledge_id?: string | null
          subject_id?: string | null
          time_limit_minutes?: number | null
          title: string
          total_questions?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_ai_generated?: boolean
          source_knowledge_id?: string | null
          subject_id?: string | null
          time_limit_minutes?: number | null
          title?: string
          total_questions?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          priority: string | null
          reminder_type: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          reminder_type: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          priority?: string | null
          reminder_type?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_analytics: {
        Row: {
          average_score: number | null
          created_at: string | null
          date: string
          id: string
          pages_completed: number | null
          sessions_count: number | null
          tests_attempted: number | null
          total_study_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          average_score?: number | null
          created_at?: string | null
          date: string
          id?: string
          pages_completed?: number | null
          sessions_count?: number | null
          tests_attempted?: number | null
          total_study_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          average_score?: number | null
          created_at?: string | null
          date?: string
          id?: string
          pages_completed?: number | null
          sessions_count?: number | null
          tests_attempted?: number | null
          total_study_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          break_time_minutes: number | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          started_at: string | null
          status: string | null
          subject_id: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          break_time_minutes?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          subject_id?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          break_time_minutes?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          started_at?: string | null
          status?: string | null
          subject_id?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          color: string | null
          created_at: string | null
          curriculum: Database["public"]["Enums"]["curriculum_type"]
          grade: number | null
          icon_name: string | null
          id: string
          name: string
        }
        Insert: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          curriculum: Database["public"]["Enums"]["curriculum_type"]
          grade?: number | null
          icon_name?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string | null
          color?: string | null
          created_at?: string | null
          curriculum?: Database["public"]["Enums"]["curriculum_type"]
          grade?: number | null
          icon_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          message: string
          response: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          response?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          response?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          message: string
          priority: string | null
          target_curricula: string[] | null
          target_grades: number[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          priority?: string | null
          target_curricula?: string[] | null
          target_grades?: number[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          priority?: string | null
          target_curricula?: string[] | null
          target_grades?: number[] | null
          title?: string
        }
        Relationships: []
      }
      upcoming_events: {
        Row: {
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          event_type: string
          id: string
          is_online: boolean | null
          location: string | null
          scheduled_date: string
          status: string | null
          subject_id: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type: string
          id?: string
          is_online?: boolean | null
          location?: string | null
          scheduled_date: string
          status?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          event_type?: string
          id?: string
          is_online?: boolean | null
          location?: string | null
          scheduled_date?: string
          status?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upcoming_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          level: number | null
          longest_streak: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
          xp_to_next_level: number | null
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
          xp_to_next_level?: number | null
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          level?: number | null
          longest_streak?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
          xp_to_next_level?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subjects: {
        Row: {
          created_at: string | null
          id: string
          subject_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          subject_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      whiteboards: {
        Row: {
          canvas_data: Json | null
          created_at: string | null
          id: string
          is_shared: boolean | null
          subject_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          canvas_data?: Json | null
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          canvas_data?: Json | null
          created_at?: string | null
          id?: string
          is_shared?: boolean | null
          subject_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whiteboards_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      chat_history: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          role: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "student"
      curriculum_type: "CAPS" | "IEB" | "Cambridge"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "student"],
      curriculum_type: ["CAPS", "IEB", "Cambridge"],
    },
  },
} as const
