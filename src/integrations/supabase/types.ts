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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          outcome: string
          resource_id: string | null
          resource_type: string
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_role: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          outcome: string
          resource_id?: string | null
          resource_type: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_role?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          outcome?: string
          resource_id?: string | null
          resource_type?: string
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      affiliate_earnings: {
        Row: {
          affiliate_id: string
          amount: number
          book_id: string
          created_at: string
          id: string
          order_id: string | null
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          book_id: string
          created_at?: string
          id?: string
          order_id?: string | null
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          book_id?: string
          created_at?: string
          id?: string
          order_id?: string | null
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_earnings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_earnings_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_orders: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          order_id: string
          referral_id: string
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          order_id: string
          referral_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          order_id?: string
          referral_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates_referrals: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          entity_id: string | null
          entity_type: string | null
          event_category: string
          event_name: string
          id: string
          ip_address: unknown
          metadata: Json | null
          page_url: string | null
          platform: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_category: string
          event_name: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_url?: string | null
          platform?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string
          event_name?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          page_url?: string | null
          platform?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          starts_at: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          starts_at?: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      article_feedback: {
        Row: {
          article_id: string
          comment: string | null
          created_at: string
          helpful: boolean
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          comment?: string | null
          created_at?: string
          helpful: boolean
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          comment?: string | null
          created_at?: string
          helpful?: boolean
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_images: {
        Row: {
          article_id: string
          caption: string | null
          created_at: string | null
          display_order: number
          id: string
          image_url: string
        }
        Insert: {
          article_id: string
          caption?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url: string
        }
        Update: {
          article_id?: string
          caption?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_images_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_likes: {
        Row: {
          article_id: string
          created_at: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_likes_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_reports: {
        Row: {
          article_id: string
          created_at: string
          description: string | null
          id: string
          reason: string
          reporter_email: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          article_id: string
          created_at?: string
          description?: string | null
          id?: string
          reason: string
          reporter_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          article_id?: string
          created_at?: string
          description?: string | null
          id?: string
          reason?: string
          reporter_email?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_reports_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string | null
          category: string
          content: string
          created_at: string | null
          description: string
          id: string
          platform: string
          read_time: string
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category: string
          content: string
          created_at?: string | null
          description: string
          id?: string
          platform: string
          read_time?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string
          created_at?: string | null
          description?: string
          id?: string
          platform?: string
          read_time?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banking_subaccounts: {
        Row: {
          account_number: string | null
          bank_code: string | null
          business_name: string | null
          created_at: string | null
          encrypted_account_number: string | null
          encrypted_bank_code: string | null
          encrypted_bank_name: string | null
          encrypted_business_name: string | null
          encrypted_email: string | null
          encrypted_subaccount_code: string | null
          encryption_key_hash: string | null
          id: string
          recipient_code: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_number?: string | null
          bank_code?: string | null
          business_name?: string | null
          created_at?: string | null
          encrypted_account_number?: string | null
          encrypted_bank_code?: string | null
          encrypted_bank_name?: string | null
          encrypted_business_name?: string | null
          encrypted_email?: string | null
          encrypted_subaccount_code?: string | null
          encryption_key_hash?: string | null
          id?: string
          recipient_code?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_number?: string | null
          bank_code?: string | null
          business_name?: string | null
          created_at?: string | null
          encrypted_account_number?: string | null
          encrypted_bank_code?: string | null
          encrypted_bank_name?: string | null
          encrypted_business_name?: string | null
          encrypted_email?: string | null
          encrypted_subaccount_code?: string | null
          encryption_key_hash?: string | null
          id?: string
          recipient_code?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          additional_images: string[]
          address_encryption_version: number | null
          affiliate_ref_id: string | null
          author: string
          availability: string | null
          available_quantity: number
          back_cover: string | null
          category: string
          condition: string
          created_at: string
          curriculum: string | null
          description: string
          front_cover: string | null
          genre: string | null
          grade: string | null
          id: string
          image_url: string
          initial_quantity: number
          inside_pages: string | null
          isbn: string | null
          item_type: string | null
          metadata: Json | null
          parcel_size: string | null
          pickup_address_encrypted: string | null
          price: number
          province: string | null
          requires_banking_setup: boolean | null
          seller_id: string
          seller_subaccount_code: string | null
          sold: boolean
          sold_at: string | null
          sold_quantity: number
          subaccount_code: string | null
          title: string
          university: string | null
          university_year: string | null
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[]
          address_encryption_version?: number | null
          affiliate_ref_id?: string | null
          author: string
          availability?: string | null
          available_quantity?: number
          back_cover?: string | null
          category: string
          condition: string
          created_at?: string
          curriculum?: string | null
          description: string
          front_cover?: string | null
          genre?: string | null
          grade?: string | null
          id?: string
          image_url: string
          initial_quantity?: number
          inside_pages?: string | null
          isbn?: string | null
          item_type?: string | null
          metadata?: Json | null
          parcel_size?: string | null
          pickup_address_encrypted?: string | null
          price: number
          province?: string | null
          requires_banking_setup?: boolean | null
          seller_id: string
          seller_subaccount_code?: string | null
          sold?: boolean
          sold_at?: string | null
          sold_quantity?: number
          subaccount_code?: string | null
          title: string
          university?: string | null
          university_year?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[]
          address_encryption_version?: number | null
          affiliate_ref_id?: string | null
          author?: string
          availability?: string | null
          available_quantity?: number
          back_cover?: string | null
          category?: string
          condition?: string
          created_at?: string
          curriculum?: string | null
          description?: string
          front_cover?: string | null
          genre?: string | null
          grade?: string | null
          id?: string
          image_url?: string
          initial_quantity?: number
          inside_pages?: string | null
          isbn?: string | null
          item_type?: string | null
          metadata?: Json | null
          parcel_size?: string | null
          pickup_address_encrypted?: string | null
          price?: number
          province?: string | null
          requires_banking_setup?: boolean | null
          seller_id?: string
          seller_subaccount_code?: string | null
          sold?: boolean
          sold_at?: string | null
          sold_quantity?: number
          subaccount_code?: string | null
          title?: string
          university?: string | null
          university_year?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "books_affiliate_ref_id_fkey"
            columns: ["affiliate_ref_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_books_seller_profile"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_feedback_orders: {
        Row: {
          amount: number | null
          book_id: string | null
          buyer_email: string | null
          buyer_feedback: string | null
          buyer_id: string | null
          buyer_phone: string | null
          buyer_status: string
          commit_deadline: string | null
          committed_at: string | null
          created_at: string | null
          delivery_fee: number | null
          delivery_status: string | null
          id: string
          order_id: string
          payment_reference: string | null
          payment_status: string | null
          platform_fee: number | null
          refund_status: string | null
          refunded_at: string | null
          seller_id: string | null
          status: string | null
          total_amount: number | null
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          book_id?: string | null
          buyer_email?: string | null
          buyer_feedback?: string | null
          buyer_id?: string | null
          buyer_phone?: string | null
          buyer_status: string
          commit_deadline?: string | null
          committed_at?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_status?: string | null
          id?: string
          order_id: string
          payment_reference?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          seller_id?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          book_id?: string | null
          buyer_email?: string | null
          buyer_feedback?: string | null
          buyer_id?: string | null
          buyer_phone?: string | null
          buyer_status?: string
          commit_deadline?: string | null
          committed_at?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          delivery_status?: string | null
          id?: string
          order_id?: string
          payment_reference?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          refund_status?: string | null
          refunded_at?: string | null
          seller_id?: string | null
          status?: string | null
          total_amount?: number | null
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buyer_feedback_orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_feedback_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_feedback_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_feedback_orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_abandonment_logs: {
        Row: {
          created_at: string | null
          email_sent_at: string | null
          id: string
          item_ids: string[]
          item_prices: number[]
          item_titles: string[]
          recovered_at: string | null
          total_value: number | null
          user_email: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          item_ids?: string[]
          item_prices?: number[]
          item_titles?: string[]
          recovered_at?: string | null
          total_value?: number | null
          user_email: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          created_at?: string | null
          email_sent_at?: string | null
          id?: string
          item_ids?: string[]
          item_prices?: number[]
          item_titles?: string[]
          recovered_at?: string | null
          total_value?: number | null
          user_email?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      cashout_request: {
        Row: {
          affiliate_id: string
          amount: number
          contact_email: string | null
          created_at: string
          encrypted_account_number: string | null
          encrypted_bank_code: string | null
          encrypted_bank_name: string | null
          encrypted_business_name: string | null
          encrypted_email: string | null
          encrypted_first_name: string | null
          encrypted_last_name: string | null
          encrypted_phone_number: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          referral_data: Json
          rejection_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          contact_email?: string | null
          created_at?: string
          encrypted_account_number?: string | null
          encrypted_bank_code?: string | null
          encrypted_bank_name?: string | null
          encrypted_business_name?: string | null
          encrypted_email?: string | null
          encrypted_first_name?: string | null
          encrypted_last_name?: string | null
          encrypted_phone_number?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          referral_data?: Json
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          contact_email?: string | null
          created_at?: string
          encrypted_account_number?: string | null
          encrypted_bank_code?: string | null
          encrypted_bank_name?: string | null
          encrypted_business_name?: string | null
          encrypted_email?: string | null
          encrypted_first_name?: string | null
          encrypted_last_name?: string | null
          encrypted_phone_number?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          referral_data?: Json
          rejection_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashout_request_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashout_request_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reports: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          reason: string
          reported_by: string
          status: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          reason: string
          reported_by: string
          status?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          reason?: string
          reported_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string | null
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string | null
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_affiliate_earnings: {
        Row: {
          affiliate_id: string
          amount: number
          coupon_id: string
          coupon_redemption_id: string | null
          created_at: string
          id: string
          order_id: string | null
          reversed_at: string | null
          reversed_reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount?: number
          coupon_id: string
          coupon_redemption_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          coupon_id?: string
          coupon_redemption_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          reversed_at?: string | null
          reversed_reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_affiliate_earnings_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_affiliate_earnings_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_affiliate_earnings_coupon_redemption_id_fkey"
            columns: ["coupon_redemption_id"]
            isOneToOne: false
            referencedRelation: "coupon_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_affiliate_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          discount_applied: number
          id: string
          order_id: string
          redeemed_at: string | null
          user_id: string
        }
        Insert: {
          coupon_id: string
          discount_applied: number
          id?: string
          order_id: string
          redeemed_at?: string | null
          user_id: string
        }
        Update: {
          coupon_id?: string
          discount_applied?: number
          id?: string
          order_id?: string
          redeemed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          affiliate_earning_amount: number | null
          affiliate_id: string | null
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean | null
          max_discount_amount: number | null
          max_order_amount: number | null
          max_uses: number | null
          min_order_amount: number | null
          updated_at: string | null
          usage_count: number | null
          valid_from: string
          valid_until: string
        }
        Insert: {
          affiliate_earning_amount?: number | null
          affiliate_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_order_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          usage_count?: number | null
          valid_from: string
          valid_until: string
        }
        Update: {
          affiliate_earning_amount?: number | null
          affiliate_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean | null
          max_discount_amount?: number | null
          max_order_amount?: number | null
          max_uses?: number | null
          min_order_amount?: number | null
          updated_at?: string | null
          usage_count?: number | null
          valid_from?: string
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content_encrypted: string | null
          conversation_id: string
          created_at: string
          id: string
          is_encrypted: boolean
          is_flagged: boolean
          media_type: string | null
          media_url: string | null
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content_encrypted?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          is_encrypted?: boolean
          is_flagged?: boolean
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content_encrypted?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          is_encrypted?: boolean
          is_flagged?: boolean
          media_type?: string | null
          media_url?: string | null
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_notifications: {
        Row: {
          action_required: boolean | null
          action_type: string | null
          created_at: string | null
          id: string
          message: string
          order_id: string | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          action_required?: boolean | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          message: string
          order_id?: string | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          action_required?: boolean | null
          action_type?: string | null
          created_at?: string | null
          id?: string
          message?: string
          order_id?: string | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_encryption_version: number | null
          amount: number
          book_id: string | null
          buyer_email: string
          buyer_full_name: string | null
          buyer_id: string | null
          buyer_phone_number: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          commit_deadline: string | null
          committed_at: string | null
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          delivery_data: Json | null
          delivery_locker_data: Json | null
          delivery_locker_location_id: string | null
          delivery_locker_provider_slug: string | null
          delivery_option: string | null
          delivery_status: string | null
          delivery_type: string | null
          id: string
          item_id: string | null
          item_type: string | null
          items: Json
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_data: Json | null
          payment_reference: string | null
          payment_status: string | null
          paystack_reference: string | null
          pickup_address_encrypted: string | null
          pickup_locker_data: Json | null
          pickup_locker_location_id: string | null
          pickup_locker_provider_slug: string | null
          pickup_type: string | null
          receipt_html: string | null
          refund_reference: string | null
          refund_status: string | null
          refunded_at: string | null
          selected_courier_name: string | null
          selected_courier_slug: string | null
          selected_service_code: string | null
          selected_service_name: string | null
          selected_shipping_cost: number | null
          seller_email: string | null
          seller_full_name: string | null
          seller_id: string
          seller_phone_number: string | null
          shipping_address_encrypted: string | null
          status: string
          tcg_shipment_id: string | null
          total_amount: number | null
          total_refunded: number | null
          tracking_data: Json | null
          tracking_number: string | null
          updated_at: string
          waybill_url: string | null
        }
        Insert: {
          address_encryption_version?: number | null
          amount: number
          book_id?: string | null
          buyer_email: string
          buyer_full_name?: string | null
          buyer_id?: string | null
          buyer_phone_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commit_deadline?: string | null
          committed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          delivery_data?: Json | null
          delivery_locker_data?: Json | null
          delivery_locker_location_id?: string | null
          delivery_locker_provider_slug?: string | null
          delivery_option?: string | null
          delivery_status?: string | null
          delivery_type?: string | null
          id?: string
          item_id?: string | null
          item_type?: string | null
          items?: Json
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_data?: Json | null
          payment_reference?: string | null
          payment_status?: string | null
          paystack_reference?: string | null
          pickup_address_encrypted?: string | null
          pickup_locker_data?: Json | null
          pickup_locker_location_id?: string | null
          pickup_locker_provider_slug?: string | null
          pickup_type?: string | null
          receipt_html?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          selected_courier_name?: string | null
          selected_courier_slug?: string | null
          selected_service_code?: string | null
          selected_service_name?: string | null
          selected_shipping_cost?: number | null
          seller_email?: string | null
          seller_full_name?: string | null
          seller_id: string
          seller_phone_number?: string | null
          shipping_address_encrypted?: string | null
          status?: string
          tcg_shipment_id?: string | null
          total_amount?: number | null
          total_refunded?: number | null
          tracking_data?: Json | null
          tracking_number?: string | null
          updated_at?: string
          waybill_url?: string | null
        }
        Update: {
          address_encryption_version?: number | null
          amount?: number
          book_id?: string | null
          buyer_email?: string
          buyer_full_name?: string | null
          buyer_id?: string | null
          buyer_phone_number?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          commit_deadline?: string | null
          committed_at?: string | null
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          delivery_data?: Json | null
          delivery_locker_data?: Json | null
          delivery_locker_location_id?: string | null
          delivery_locker_provider_slug?: string | null
          delivery_option?: string | null
          delivery_status?: string | null
          delivery_type?: string | null
          id?: string
          item_id?: string | null
          item_type?: string | null
          items?: Json
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_data?: Json | null
          payment_reference?: string | null
          payment_status?: string | null
          paystack_reference?: string | null
          pickup_address_encrypted?: string | null
          pickup_locker_data?: Json | null
          pickup_locker_location_id?: string | null
          pickup_locker_provider_slug?: string | null
          pickup_type?: string | null
          receipt_html?: string | null
          refund_reference?: string | null
          refund_status?: string | null
          refunded_at?: string | null
          selected_courier_name?: string | null
          selected_courier_slug?: string | null
          selected_service_code?: string | null
          selected_service_name?: string | null
          selected_shipping_cost?: number | null
          seller_email?: string | null
          seller_full_name?: string | null
          seller_id?: string
          seller_phone_number?: string | null
          shipping_address_encrypted?: string | null
          status?: string
          tcg_shipment_id?: string | null
          total_amount?: number | null
          total_refunded?: number | null
          tracking_data?: Json | null
          tracking_number?: string | null
          updated_at?: string
          waybill_url?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          bobpay_response: Json | null
          created_at: string
          currency: string | null
          custom_payment_id: string | null
          id: string
          items: Json | null
          metadata: Json | null
          order_id: string
          payment_method: string
          paystack_response: Json | null
          reference: string
          shipping_address: Json | null
          status: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          amount: number
          bobpay_response?: Json | null
          created_at?: string
          currency?: string | null
          custom_payment_id?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          order_id: string
          payment_method?: string
          paystack_response?: Json | null
          reference: string
          shipping_address?: Json | null
          status?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          amount?: number
          bobpay_response?: Json | null
          created_at?: string
          currency?: string | null
          custom_payment_id?: string | null
          id?: string
          items?: Json | null
          metadata?: Json | null
          order_id?: string
          payment_method?: string
          paystack_response?: Json | null
          reference?: string
          shipping_address?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: string | null
          notes: string | null
          old_status: string | null
          payout_id: string
          performed_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          payout_id: string
          performed_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: string | null
          notes?: string | null
          old_status?: string | null
          payout_id?: string
          performed_by?: string | null
        }
        Relationships: []
      }
      payout_items: {
        Row: {
          book_id: string | null
          book_title: string | null
          commission_amount: number
          created_at: string | null
          id: string
          payout_id: string
          sale_amount: number
          sale_date: string
          seller_amount: number
        }
        Insert: {
          book_id?: string | null
          book_title?: string | null
          commission_amount: number
          created_at?: string | null
          id?: string
          payout_id: string
          sale_amount: number
          sale_date: string
          seller_amount: number
        }
        Update: {
          book_id?: string | null
          book_title?: string | null
          commission_amount?: number
          created_at?: string | null
          id?: string
          payout_id?: string
          sale_amount?: number
          sale_date?: string
          seller_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payout_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          bank_account_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          paid_at: string | null
          requested_at: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          requested_at?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      paystack_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          paystack_response: Json | null
          reference: string
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paystack_response?: Json | null
          reference: string
          status?: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          paystack_response?: Json | null
          reference?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_encryption_version: number | null
          addresses_same: boolean | null
          affiliate_code: string | null
          auto_commit: boolean
          bio: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          email_verification_token: string | null
          email_verified: boolean | null
          encryption_status: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          is_affiliate: boolean
          last_name: string | null
          name: string | null
          phone_number: string | null
          phone_verification_code: string | null
          phone_verified: boolean | null
          pickup_address_encrypted: string | null
          preferred_delivery_locker_data: Json | null
          preferred_delivery_locker_location_id: number | null
          preferred_delivery_locker_provider_slug: string | null
          preferred_delivery_locker_saved_at: string | null
          preferred_pickup_locker_data: Json | null
          preferred_pickup_locker_location_id: number | null
          preferred_pickup_locker_provider_slug: string | null
          preferred_pickup_locker_saved_at: string | null
          preferred_pickup_method: string | null
          profile_picture_url: string | null
          renewal_date: string | null
          role: string | null
          shipping_address_encrypted: string | null
          status: string | null
          subscription_status: string | null
          subscription_tier:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended_at: string | null
          suspension_reason: string | null
          total_affiliate_earnings: number
          updated_at: string
          user_tier: string | null
          verification_expires_at: string | null
        }
        Insert: {
          address_encryption_version?: number | null
          addresses_same?: boolean | null
          affiliate_code?: string | null
          auto_commit?: boolean
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          encryption_status?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          is_affiliate?: boolean
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          phone_verification_code?: string | null
          phone_verified?: boolean | null
          pickup_address_encrypted?: string | null
          preferred_delivery_locker_data?: Json | null
          preferred_delivery_locker_location_id?: number | null
          preferred_delivery_locker_provider_slug?: string | null
          preferred_delivery_locker_saved_at?: string | null
          preferred_pickup_locker_data?: Json | null
          preferred_pickup_locker_location_id?: number | null
          preferred_pickup_locker_provider_slug?: string | null
          preferred_pickup_locker_saved_at?: string | null
          preferred_pickup_method?: string | null
          profile_picture_url?: string | null
          renewal_date?: string | null
          role?: string | null
          shipping_address_encrypted?: string | null
          status?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_affiliate_earnings?: number
          updated_at?: string
          user_tier?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          address_encryption_version?: number | null
          addresses_same?: boolean | null
          affiliate_code?: string | null
          auto_commit?: boolean
          bio?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          email_verification_token?: string | null
          email_verified?: boolean | null
          encryption_status?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          is_affiliate?: boolean
          last_name?: string | null
          name?: string | null
          phone_number?: string | null
          phone_verification_code?: string | null
          phone_verified?: boolean | null
          pickup_address_encrypted?: string | null
          preferred_delivery_locker_data?: Json | null
          preferred_delivery_locker_location_id?: number | null
          preferred_delivery_locker_provider_slug?: string | null
          preferred_delivery_locker_saved_at?: string | null
          preferred_pickup_locker_data?: Json | null
          preferred_pickup_locker_location_id?: number | null
          preferred_pickup_locker_provider_slug?: string | null
          preferred_pickup_locker_saved_at?: string | null
          preferred_pickup_method?: string | null
          profile_picture_url?: string | null
          renewal_date?: string | null
          role?: string | null
          shipping_address_encrypted?: string | null
          status?: string | null
          subscription_status?: string | null
          subscription_tier?:
            | Database["public"]["Enums"]["subscription_tier"]
            | null
          suspended_at?: string | null
          suspension_reason?: string | null
          total_affiliate_earnings?: number
          updated_at?: string
          user_tier?: string | null
          verification_expires_at?: string | null
        }
        Relationships: []
      }
      refund_transactions: {
        Row: {
          amount: number
          bobpay_refund_reference: string | null
          bobpay_response: Json | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          initiated_by: string | null
          order_id: string
          paystack_refund_reference: string | null
          paystack_response: Json | null
          processed_at: string | null
          reason: string
          status: string
          transaction_reference: string
          updated_at: string
        }
        Insert: {
          amount: number
          bobpay_refund_reference?: string | null
          bobpay_response?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          order_id: string
          paystack_refund_reference?: string | null
          paystack_response?: Json | null
          processed_at?: string | null
          reason: string
          status?: string
          transaction_reference: string
          updated_at?: string
        }
        Update: {
          amount?: number
          bobpay_refund_reference?: string | null
          bobpay_response?: Json | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          order_id?: string
          paystack_refund_reference?: string | null
          paystack_response?: Json | null
          processed_at?: string | null
          reason?: string
          status?: string
          transaction_reference?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          book_id: string | null
          book_title: string
          created_at: string
          id: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          seller_name: string
          status: string
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          book_title: string
          created_at?: string
          id?: string
          reason: string
          reported_user_id: string
          reporter_user_id: string
          seller_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          book_title?: string
          created_at?: string
          id?: string
          reason?: string
          reported_user_id?: string
          reporter_user_id?: string
          seller_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_commitments: {
        Row: {
          commitment_deadline: string
          committed_at: string | null
          created_at: string
          id: string
          order_id: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commitment_deadline: string
          committed_at?: string | null
          created_at?: string
          id?: string
          order_id: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commitment_deadline?: string
          committed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_commitments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      school_supplies: {
        Row: {
          additional_images: string[] | null
          affiliate_ref_id: string | null
          availability: string | null
          available_quantity: number
          condition: string
          created_at: string | null
          description: string
          grade: string | null
          id: string
          image_url: string | null
          initial_quantity: number
          metadata: Json | null
          parcel_size: string
          price: number
          province: string | null
          quantity: number
          school_name: string | null
          seller_id: string
          sold: boolean | null
          sold_at: string | null
          sold_quantity: number
          subject: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          affiliate_ref_id?: string | null
          availability?: string | null
          available_quantity?: number
          condition: string
          created_at?: string | null
          description: string
          grade?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          metadata?: Json | null
          parcel_size: string
          price: number
          province?: string | null
          quantity?: number
          school_name?: string | null
          seller_id: string
          sold?: boolean | null
          sold_at?: string | null
          sold_quantity?: number
          subject?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          affiliate_ref_id?: string | null
          availability?: string | null
          available_quantity?: number
          condition?: string
          created_at?: string | null
          description?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          metadata?: Json | null
          parcel_size?: string
          price?: number
          province?: string | null
          quantity?: number
          school_name?: string | null
          seller_id?: string
          sold?: boolean | null
          sold_at?: string | null
          sold_quantity?: number
          subject?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_supplies_affiliate_ref_id_fkey"
            columns: ["affiliate_ref_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_supplies_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          is_anonymous: boolean | null
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          rating: number
          reviewer_id: string
          seller_id: string
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          is_anonymous?: boolean | null
          rating?: number
          reviewer_id?: string
          seller_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          book_id: string
          book_title: string
          buyer_email: string | null
          buyer_id: string
          buyer_phone: string | null
          commission: number
          committed_at: string | null
          created_at: string
          delivery_address: Json | null
          delivery_fee: number | null
          expires_at: string | null
          id: string
          paystack_reference: string | null
          paystack_subaccount_code: string | null
          price: number
          refund_reason: string | null
          refunded: boolean | null
          seller_committed: boolean | null
          seller_id: string
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          book_id: string
          book_title: string
          buyer_email?: string | null
          buyer_id: string
          buyer_phone?: string | null
          commission: number
          committed_at?: string | null
          created_at?: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          expires_at?: string | null
          id?: string
          paystack_reference?: string | null
          paystack_subaccount_code?: string | null
          price: number
          refund_reason?: string | null
          refunded?: boolean | null
          seller_committed?: boolean | null
          seller_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          book_title?: string
          buyer_email?: string | null
          buyer_id?: string
          buyer_phone?: string | null
          commission?: number
          committed_at?: string | null
          created_at?: string
          delivery_address?: Json | null
          delivery_fee?: number | null
          expires_at?: string | null
          id?: string
          paystack_reference?: string | null
          paystack_subaccount_code?: string | null
          price?: number
          refund_reason?: string | null
          refunded?: boolean | null
          seller_committed?: boolean | null
          seller_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      uniforms: {
        Row: {
          additional_images: string[] | null
          affiliate_ref_id: string | null
          availability: string | null
          available_quantity: number
          color: string | null
          condition: string
          created_at: string | null
          description: string
          gender: string | null
          grade: string | null
          id: string
          image_url: string | null
          initial_quantity: number
          metadata: Json | null
          parcel_size: string
          price: number
          province: string | null
          quantity: number
          school_name: string | null
          seller_id: string
          size: string | null
          sold: boolean | null
          sold_at: string | null
          sold_quantity: number
          title: string
          updated_at: string | null
        }
        Insert: {
          additional_images?: string[] | null
          affiliate_ref_id?: string | null
          availability?: string | null
          available_quantity?: number
          color?: string | null
          condition: string
          created_at?: string | null
          description: string
          gender?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          metadata?: Json | null
          parcel_size: string
          price: number
          province?: string | null
          quantity?: number
          school_name?: string | null
          seller_id: string
          size?: string | null
          sold?: boolean | null
          sold_at?: string | null
          sold_quantity?: number
          title: string
          updated_at?: string | null
        }
        Update: {
          additional_images?: string[] | null
          affiliate_ref_id?: string | null
          availability?: string | null
          available_quantity?: number
          color?: string | null
          condition?: string
          created_at?: string | null
          description?: string
          gender?: string | null
          grade?: string | null
          id?: string
          image_url?: string | null
          initial_quantity?: number
          metadata?: Json | null
          parcel_size?: string
          price?: number
          province?: string | null
          quantity?: number
          school_name?: string | null
          seller_id?: string
          size?: string | null
          sold?: boolean | null
          sold_at?: string | null
          sold_quantity?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniforms_affiliate_ref_id_fkey"
            columns: ["affiliate_ref_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uniforms_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      user_wallets: {
        Row: {
          available_balance: number | null
          created_at: string | null
          id: string
          pending_balance: number | null
          total_earned: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          created_at?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_credits: {
        Row: {
          amount: number
          created_at: string
          credited_by: string
          id: string
          notes: string | null
          order_id: string | null
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credited_by: string
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credited_by?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          reason: string | null
          reference_order_id: string | null
          reference_payout_id: string | null
          status: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reference_order_id?: string | null
          reference_payout_id?: string | null
          status?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reason?: string | null
          reference_order_id?: string | null
          reference_payout_id?: string | null
          status?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          name: string | null
          profile_picture_url: string | null
          status: string | null
          user_tier: string | null
        }
        Relationships: []
      }
      refund_summary: {
        Row: {
          amount: number | null
          buyer_email: string | null
          buyer_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string | null
          initiated_by_email: string | null
          order_id: string | null
          paystack_refund_reference: string | null
          processing_hours: number | null
          reason: string | null
          seller_email: string | null
          seller_id: string | null
          status: string | null
          transaction_reference: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _assert_self_or_admin: { Args: { p_user_id: string }; Returns: undefined }
      activate_affiliate: { Args: { user_id: string }; Returns: string }
      add_funds_to_wallet: {
        Args: {
          p_amount: number
          p_order_id: string
          p_reason?: string
          p_seller_id: string
        }
        Returns: boolean
      }
      admin_delete_user: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      admin_delete_user_safe: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      admin_safe_delete_user_comprehensive: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      approve_affiliate_application: {
        Args: { application_id: string }
        Returns: undefined
      }
      approve_seller_payout: {
        Args: { p_notes?: string; p_payout_id: string; p_reviewer_id: string }
        Returns: boolean
      }
      atomic_book_purchase: {
        Args: { p_amount: number; p_book_id: string; p_buyer_id: string }
        Returns: string
      }
      auto_cancel_expired_orders: { Args: never; Returns: undefined }
      auto_process_ready_orders: { Args: never; Returns: undefined }
      calculate_commission: {
        Args: { base_amount: number; user_tier?: string }
        Returns: number
      }
      calculate_payment_split: {
        Args: {
          p_book_amount: number
          p_delivery_amount?: number
          p_platform_commission_rate?: number
        }
        Returns: {
          courier_amount: number
          platform_commission: number
          seller_amount: number
        }[]
      }
      check_refund_eligibility: {
        Args: { p_order_id: string }
        Returns: {
          eligible: boolean
          max_refund_amount: number
          reason: string
        }[]
      }
      clear_user_aps_profile: { Args: { user_id?: string }; Returns: boolean }
      confirm_coupon_affiliate_earning: {
        Args: { p_order_id: string }
        Returns: undefined
      }
      create_buyer_feedback_record: {
        Args: {
          p_buyer_feedback?: string
          p_buyer_status: string
          p_order_id: string
        }
        Returns: string
      }
      create_missing_profiles_for_books: { Args: never; Returns: number }
      create_order_notification: {
        Args: {
          p_message: string
          p_order_id: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: string
      }
      create_payment_split: {
        Args: {
          p_book_amount: number
          p_courier_subaccount: string
          p_delivery_amount?: number
          p_seller_subaccount: string
          p_transaction_id: string
        }
        Returns: string
      }
      create_payout_request: {
        Args: { p_amount: number; p_user_id: string }
        Returns: string
      }
      credit_wallet_on_collection: {
        Args: { p_book_price: number; p_order_id: string; p_seller_id: string }
        Returns: {
          credit_amount: number
          error_message: string
          new_balance: number
          success: boolean
        }[]
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      delete_user_address: {
        Args: { address_type: string; target_user_id: string }
        Returns: Json
      }
      delete_user_profile: { Args: { user_id: string }; Returns: undefined }
      deny_seller_payout: {
        Args: { p_payout_id: string; p_reason: string; p_reviewer_id: string }
        Returns: boolean
      }
      execute_payment_split_after_pickup: {
        Args: { p_transaction_id: string }
        Returns: boolean
      }
      find_orphaned_books: {
        Args: never
        Returns: {
          book_id: string
          book_title: string
          seller_email: string
          seller_id: string
        }[]
      }
      fix_book_quantities: { Args: { p_book_id: string }; Returns: boolean }
      generate_affiliate_code: { Args: never; Returns: string }
      generate_api_key: { Args: { user_id: string }; Returns: string }
      generate_encryption_key_hash: {
        Args: { user_id: string }
        Returns: string
      }
      generate_receipt_number: { Args: never; Returns: string }
      get_affiliate_stats: {
        Args: { p_affiliate_id: string }
        Returns: {
          active_referrals: number
          total_book_sales: number
          total_earnings: number
          total_referrals: number
        }[]
      }
      get_article_like_count: {
        Args: { p_article_id: string }
        Returns: number
      }
      get_bobbox_webhooks: {
        Args: never
        Returns: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed: boolean
          received_at: string
        }[]
      }
      get_complete_schema: { Args: never; Returns: Json }
      get_current_user_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_encrypted_address_data: {
        Args: { address_type?: string; record_id: string; table_name: string }
        Returns: {
          encryption_version: number
          has_encrypted_data: boolean
          has_plaintext_data: boolean
        }[]
      }
      get_orders_for_tracking_update: {
        Args: never
        Returns: {
          buyer_email: string
          courier: string
          delivery_status: string
          order_id: string
          seller_id: string
          tracking_number: string
        }[]
      }
      get_orphaned_data_stats: {
        Args: never
        Returns: {
          orphaned_books_count: number
          users_with_books_no_profile: number
        }[]
      }
      get_payment_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_payment_amount: number
          failed_payments: number
          pending_payments: number
          successful_payments: number
          total_amount: number
          total_payments: number
        }[]
      }
      get_payment_transaction: {
        Args: { p_reference: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          order_id: string
          reference: string
          status: string
          verified_at: string
        }[]
      }
      get_payout_statistics: {
        Args: never
        Returns: {
          approved_count: number
          denied_count: number
          pending_count: number
          total_approved_amount: number
        }[]
      }
      get_public_profiles: {
        Args: never
        Returns: {
          bio: string
          created_at: string
          full_name: string
          id: string
          name: string
          profile_picture_url: string
          status: string
          user_tier: string
        }[]
      }
      get_refund_statistics: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          avg_processing_time: string
          avg_refund_amount: number
          failed_refunds: number
          pending_refunds: number
          processing_refunds: number
          successful_refunds: number
          total_refund_amount: number
          total_refunds: number
        }[]
      }
      get_seller_available_balance: {
        Args: { p_seller_id: string }
        Returns: number
      }
      get_seller_average_rating: {
        Args: { p_seller_id: string }
        Returns: {
          average_rating: number
          review_count: number
        }[]
      }
      get_seller_profile_for_checkout: {
        Args: { seller_user_id: string }
        Returns: {
          email: string
          id: string
          name: string
          pickup_address_encrypted: string
          subaccount_code: string
        }[]
      }
      get_seller_profile_for_delivery: {
        Args: { p_seller_id: string }
        Returns: {
          has_subaccount: boolean
          seller_email: string
          seller_id: string
          seller_name: string
        }[]
      }
      get_seller_subaccount: { Args: { seller_id: string }; Returns: string }
      get_user_aps_profile: { Args: { user_id?: string }; Returns: Json }
      get_user_payment_history: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          order_id: string
          payment_method: string
          reference: string
          status: string
          transaction_id: string
          verified_at: string
        }[]
      }
      get_user_profile: {
        Args: { user_id: string }
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      get_wallet_summary: {
        Args: { p_user_id: string }
        Returns: {
          available_balance: number
          pending_balance: number
          total_earned: number
          total_withdrawn: number
        }[]
      }
      has_completed_order_from_seller: {
        Args: { p_buyer_id: string; p_seller_id: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { role_name: string; user_id: number }; Returns: boolean }
        | { Args: { role_name: string; user_id: string }; Returns: boolean }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_seller_ready_for_orders: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      is_user_admin: { Args: never; Returns: boolean }
      list_all_profiles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          username: string
        }[]
      }
      manually_release_order_stock: {
        Args: { p_order_id: string }
        Returns: Json
      }
      meetup_mark_read: { Args: { p_message_ids: string[] }; Returns: number }
      redact_json_addresses: { Args: { input: Json }; Returns: Json }
      reject_affiliate_application: {
        Args: { application_id: string; reason: string }
        Returns: undefined
      }
      release_book_stock: {
        Args: { p_book_id: string; p_qty?: number }
        Returns: undefined
      }
      reserve_book_stock: {
        Args: { p_book_id: string; p_qty?: number }
        Returns: boolean
      }
      reverse_coupon_affiliate_earning: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: undefined
      }
      safe_delete_user: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      save_user_aps_profile: {
        Args: { profile_data: Json; user_id?: string }
        Returns: boolean
      }
      search_books: {
        Args: {
          category_filter?: string
          max_price?: number
          search_term: string
        }
        Returns: {
          author: string
          category: string
          condition: string
          created_at: string
          description: string
          id: string
          image_url: string
          price: number
          seller_id: string
          title: string
        }[]
      }
      secure_atomic_book_purchase: {
        Args: {
          p_amount: number
          p_book_id: string
          p_book_title: string
          p_buyer_id: string
        }
        Returns: string
      }
      send_commit_reminders: { Args: never; Returns: undefined }
      update_expired_transactions: { Args: never; Returns: undefined }
      update_order_tracking_status: {
        Args: {
          p_new_status: string
          p_order_id: string
          p_tracking_data?: Json
        }
        Returns: boolean
      }
      update_user_profile: {
        Args: { new_email: string; new_name: string; user_id: string }
        Returns: undefined
      }
      validate_aps_profile: { Args: { profile_data: Json }; Returns: boolean }
      validate_book_availability: {
        Args: { book_id: string }
        Returns: boolean
      }
      validate_book_ownership: {
        Args: { book_id: string; user_id: string }
        Returns: boolean
      }
      validate_coupon: {
        Args: { p_code: string; p_subtotal: number }
        Returns: Json
      }
      validate_payment_amount: { Args: { amount: number }; Returns: boolean }
      validate_payout_request: {
        Args: { p_amount: number; p_seller_id: string }
        Returns: {
          message: string
          valid: boolean
        }[]
      }
      validate_refund_amount: {
        Args: { p_amount: number; p_order_id: string }
        Returns: {
          reason: string
          valid: boolean
          validated_amount: number
        }[]
      }
      verify_book_seller_relationship: {
        Args: { p_book_id: string }
        Returns: {
          book_id: string
          book_title: string
          seller_has_address: boolean
          seller_has_subaccount: boolean
          seller_id: string
          seller_name: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      broadcast_priority: "low" | "normal" | "medium" | "high" | "urgent"
      broadcast_target_audience: "all" | "users" | "admin"
      broadcast_type: "info" | "warning" | "success" | "error"
      curriculum_type: "CAPS" | "IEB" | "Cambridge" | "Other"
      meetup_status: "active" | "complete" | "canceled" | "expired"
      message_type: "text" | "time_location" | "system"
      subscription_tier: "free" | "tier1" | "tier2"
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
      app_role: ["admin", "moderator", "user"],
      broadcast_priority: ["low", "normal", "medium", "high", "urgent"],
      broadcast_target_audience: ["all", "users", "admin"],
      broadcast_type: ["info", "warning", "success", "error"],
      curriculum_type: ["CAPS", "IEB", "Cambridge", "Other"],
      meetup_status: ["active", "complete", "canceled", "expired"],
      message_type: ["text", "time_location", "system"],
      subscription_tier: ["free", "tier1", "tier2"],
    },
  },
} as const
