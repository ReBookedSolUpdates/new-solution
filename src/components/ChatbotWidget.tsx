import React, { useEffect } from "react";
import { useChatbot } from "@/hooks/useChatbot";
import { ChatInterface } from "./ChatInterface";
import { MessageCircle, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export const ChatbotWidget: React.FC = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const chatbot = useChatbot(user?.id);

  const isCheckoutPage =
    pathname.includes("/checkout") ||
    pathname.includes("/checkout-cart") ||
    pathname.includes("/payment-confirmation") ||
    pathname.includes("/order-success");

  useEffect(() => {
    if (isCheckoutPage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && chatbot.isOpen) chatbot.close();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chatbot.isOpen, chatbot.close, isCheckoutPage]);

  if (isCheckoutPage) return null;

  return (
    <>
      {/* Floating Action Button */}
      <motion.button
        onClick={chatbot.toggleOpen}
        className="fixed bottom-5 right-5 z-[101] w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={chatbot.isOpen ? { rotate: 90 } : { rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        title={chatbot.isOpen ? "Close assistant" : "Open ReBooked Genius mini"}
        aria-label={chatbot.isOpen ? "Close assistant" : "Open ReBooked Genius mini"}
      >
        <AnimatePresence mode="wait" initial={false}>
          {chatbot.isOpen ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
            >
              <MessageCircle size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {chatbot.isOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] sm:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={chatbot.close}
              aria-hidden="true"
            />

            {/* Chat window */}
            <motion.div
              className="fixed bottom-20 right-5 left-5 sm:bottom-24 sm:right-5 sm:left-auto sm:w-[340px] h-[60vh] sm:h-[650px] max-h-[calc(100vh-120px)] mx-auto sm:mx-0 z-[100] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl flex flex-col"
              initial={{ opacity: 0, y: 40, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
            >
              <ChatInterface
                messages={chatbot.messages}
                isLoading={chatbot.isLoading}
                error={chatbot.error}
                onSendMessage={chatbot.sendMessage}
                onClearHistory={chatbot.clearHistory}
                onClearError={chatbot.clearError}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
