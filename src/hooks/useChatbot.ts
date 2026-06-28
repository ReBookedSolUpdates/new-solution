import { useState, useCallback, useEffect, useRef } from "react";
import { ChatMessage, ChatContextMessage, ChatSubmitRequest, ChatSubmitResponse, ChatHistoryResponse } from "@/types/chatbot";
import { chatStorage } from "@/utils/chatStorage";
import { callEdgeFunction } from "@/utils/edgeFunctionClient";
import debugLogger from "@/utils/debugLogger";
import { supabase } from "@/lib/supabase";

export const useChatbot = (userId: string | null | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<ChatStorageData>(() => chatStorage.getOrCreateData(userId));

  // Fetch chat history from database for logged-in users
  const loadChatHistory = useCallback(async () => {
    if (!userId) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) return;

      const response = await callEdgeFunction<ChatHistoryResponse>("chat-history", {
        method: "POST",
        body: { user_id: userId, limit: 50 },
        headers: {
          "Authorization": `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (!response.success) {
        debugLogger.warn("useChatbot", "Failed to fetch chat history:", response.error);
        return;
      }

      const historyData = response.data;
      if (!historyData?.messages || historyData.messages.length === 0) return;

      // Convert history messages to ChatMessage format
      const historyMessages: ChatMessage[] = historyData.messages.flatMap((msg) => [
        {
          id: `${msg.id}_user`,
          role: "user" as const,
          content: msg.user_message,
          timestamp: msg.timestamp,
          storedAt: msg.timestamp,
        },
        {
          id: `${msg.id}_bot`,
          role: "assistant" as const,
          content: msg.bot_response,
          timestamp: msg.timestamp,
          storedAt: msg.timestamp,
        },
      ]);

      // Update local storage with history - effectively syncing it
      // We'll replace the local cache with history for this user to ensure consistency
      setData((prevData) => {
        const newData = { ...prevData, chatbot_messages: [] };
        historyMessages.forEach((msg) => {
          chatStorage.addMessage(msg, newData, userId);
        });
        return newData;
      });

      // Update conversation context with history
      const contextMessages = historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      setData((prevData) => {
        const newData = { ...prevData };
        chatStorage.setCurrentConversation(contextMessages, newData);
        return newData;
      });

      setMessages((prev) => {
        // Combine existing messages with history, avoiding duplicates
        const existingIds = new Set(prev.map((m) => m.id));
        const newMessages = historyMessages.filter((msg) => !existingIds.has(msg.id));
        return [...newMessages, ...prev];
      });

      debugLogger.info("useChatbot", `Loaded ${historyMessages.length} messages from chat history`);
    } catch (err) {
      debugLogger.warn("useChatbot", "Error loading chat history:", err);
      // Don't throw - this is optional functionality
    }
  }, [userId]);

  // Initialize messages from storage on mount and when userId changes
  useEffect(() => {
    const freshData = chatStorage.getOrCreateData(userId);
    setData(freshData);

    const storedMessages = chatStorage.getMessages(freshData, userId);
    setMessages(storedMessages);

    // Load chat history if user is logged in
    if (userId) {
      loadChatHistory();
    }
  }, [userId, loadChatHistory]);

  // Send message to chatbot
  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) return;

      setError(null);

      // Add user message to UI immediately
      const userMsgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const userChatMessage: ChatMessage = {
        id: userMsgId,
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
        storedAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userChatMessage]);

      setData((prevData) => {
        const newData = { ...prevData };
        chatStorage.addMessage(userChatMessage, newData, userId);

        // Update current conversation with user message
        const currentConversation = chatStorage.getCurrentConversation(newData);
        currentConversation.push({ role: "user", content: userMessage });
        chatStorage.setCurrentConversation(currentConversation, newData);

        return newData;
      });

      setIsLoading(true);

      try {
        // Prepare request
        const contextMessages = chatStorage.getConversationContext(data, 10);
        const currentPageUrl = window.location.pathname || "/";
        const isLoggedIn = !!userId;

        const request: ChatSubmitRequest = {
          message: userMessage,
          conversation_history: contextMessages,
          session_id: chatStorage.getSessionId(data),
          page_url: currentPageUrl,
          is_logged_in: isLoggedIn,
          user_id: userId || null,
        };

        // Call Edge Function
        const response = await callEdgeFunction<ChatSubmitResponse>("chat-submit", {
          method: "POST",
          body: request,
        });

        // Check wrapper-level success first
        if (!response.success) {
          const errorMsg = response.error || "Failed to connect to chatbot service";
          debugLogger.error("useChatbot", "Edge Function error:", {
            error: response.error,
            details: response.details,
          });
          throw new Error(errorMsg);
        }

        // Extract the actual ChatSubmitResponse from wrapper
        const responseData = response.data;

        if (!responseData) {
          throw new Error("No response received from chatbot service");
        }

        // Check chatbot-level success
        if (!responseData.success) {
          setError(`This message was flagged for safety reasons: ${responseData.flag_reason || "Content policy violation"}`);
          setIsLoading(false);
          return;
        }

        // If response was flagged, notify user
        if (responseData.is_flagged) {
          setError(`This message was flagged for safety reasons: ${responseData.flag_reason || "Content policy violation"}`);
        }

        // Add bot message to UI
        const botChatMessage: ChatMessage = {
          id: responseData.message_id,
          role: "assistant",
          content: responseData.response,
          timestamp: new Date().toISOString(),
          storedAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botChatMessage]);

        setData((prevData) => {
          const newData = { ...prevData };
          chatStorage.addMessage(botChatMessage, newData, userId);

          // Update current conversation with bot response
          const updatedConversation = chatStorage.getCurrentConversation(newData);
          updatedConversation.push({ role: "assistant", content: responseData.response });
          chatStorage.setCurrentConversation(updatedConversation, newData);

          return newData;
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to send message. Please try again.";
        setError(errorMessage);
        debugLogger.error("useChatbot", "Chatbot error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [userId],
  );

  // Toggle widget visibility
  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      // Clear current conversation when closing the widget
      if (!newState) {
        setData((prevData) => {
          const newData = { ...prevData };
          chatStorage.clearCurrentConversation(newData);
          return newData;
        });
      }
      return newState;
    });
  }, []);

  // Close widget
  const close = useCallback(() => {
    setIsOpen(false);
    setData((prevData) => {
      const newData = { ...prevData };
      chatStorage.clearCurrentConversation(newData);
      return newData;
    });
  }, []);

  // Open widget
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Clear chat history
  const clearHistory = useCallback(() => {
    setData((prevData) => {
      const newData = { ...prevData };
      chatStorage.clearMessages(newData, userId);
      chatStorage.clearCurrentConversation(newData);
      return newData;
    });
    setMessages([]);
  }, [userId]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    isOpen,
    sendMessage,
    toggleOpen,
    close,
    open,
    clearHistory,
    clearError,
  };
};
