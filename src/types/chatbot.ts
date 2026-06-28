export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  storedAt?: string;
}

export interface ChatContextMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatStorageData {
  chatbot_messages: ChatMessage[];
  session_id: string;
  last_cleared: string;
  current_conversation: ChatContextMessage[];
}

export interface ChatSubmitRequest {
  message: string;
  conversation_history: ChatContextMessage[];
  session_id: string | null;
  page_url: string;
  is_logged_in: boolean;
  user_id: string | null;
}

export interface ChatSubmitResponse {
  success: boolean;
  response: string;
  is_flagged: boolean;
  flag_reason: string | null;
  message_id: string;
}

export interface ChatHistoryRequest {
  user_id: string;
  limit?: number;
}

export interface ChatHistoryMessage {
  id: string;
  user_message: string;
  bot_response: string;
  timestamp: string;
  page_url: string;
}

export interface ChatHistoryResponse {
  messages: ChatHistoryMessage[];
  total: number;
}

export interface ModerationResult {
  is_flagged: boolean;
  reason: string | null;
}
