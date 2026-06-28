import React, { useEffect, useRef } from "react";
import { ChatMessage } from "@/types/chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { AlertCircle, Loader2, Send, Trash2, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  onClearHistory: () => void;
  onClearError: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isLoading,
  error,
  onSendMessage,
  onClearHistory,
  onClearError,
}) => {
  const [inputValue, setInputValue] = React.useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="relative bg-primary px-5 py-4 text-primary-foreground">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary-foreground/15 backdrop-blur-sm">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">ReBooked Genius mini</h2>
              <p className="text-[11px] opacity-80 font-medium">Online · Ready to help</p>
            </div>
          </div>
          <button
            onClick={onClearHistory}
            className="p-2 rounded-lg hover:bg-primary-foreground/10 transition-colors"
            title="Clear chat history"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-muted/30">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Bot size={28} className="text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">Hi there! 👋</p>
            <p className="text-xs text-muted-foreground max-w-[250px] leading-relaxed">
              I can help with buying & selling textbooks, delivery, payments, and more. Ask me anything!
            </p>
            <div className="mt-5 flex flex-wrap gap-2 justify-center max-w-xs">
              {["How do I sell a book?", "Delivery options", "Payment methods"].map((q) => (
                <button
                  key={q}
                  onClick={() => onSendMessage(q)}
                  className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-background text-foreground hover:bg-accent transition-colors font-medium"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Bot size={14} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                      : "bg-card text-card-foreground rounded-2xl rounded-bl-md border border-border shadow-sm"
                  }`}
                >
                  <div className="break-words">
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    )}
                  </div>
                  <p
                    className={`text-[10px] mt-1.5 ${
                      message.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center mt-0.5">
                    <User size={14} className="text-primary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="flex gap-2.5 justify-start"
            >
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <Bot size={14} className="text-primary" />
              </div>
              <div className="bg-card text-card-foreground px-4 py-3 rounded-2xl rounded-bl-md border border-border shadow-sm">
                <div className="flex items-center gap-1.5">
                  <motion.div
                    className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
                  />
                  <motion.div
                    className="w-1.5 h-1.5 bg-primary/60 rounded-full"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3.5 py-2.5 rounded-2xl rounded-bl-md max-w-[80%]">
                <div className="flex gap-2">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="break-words">{error}</p>
                    <button
                      onClick={onClearError}
                      className="mt-1 font-medium underline underline-offset-2 hover:no-underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background px-4 py-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-10 rounded-xl border-border bg-muted/50 text-sm placeholder:text-muted-foreground focus-visible:ring-primary"
            autoFocus
          />
          <Button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            size="icon"
            className="h-10 w-10 rounded-xl shrink-0"
          >
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          ReBooked Solutions Terms And Conditions Apply · Messages saved 30 days
        </p>
      </div>
    </div>
  );
};
