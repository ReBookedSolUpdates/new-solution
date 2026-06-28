import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import SEO from "@/components/SEO";
import ChatList from "@/components/chat/ChatList";
import ChatView from "@/components/chat/ChatView";
import { Conversation } from "@/services/chatService";
import { useIsMobile } from "@/hooks/use-mobile";

const Chats = () => {
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const isMobile = useIsMobile();
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as { conversationId?: string } | null;
    if (state?.conversationId) {
      setPendingConversationId(state.conversationId);
    }
  }, [location.state]);

  // Lock body and main scroll to prevent layout shifts and keyboard jumps
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalBodyHeight = document.body.style.height;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100dvh";

    const mainEl = document.querySelector("main");
    let originalMainOverflow = "";
    let originalMainHeight = "";
    if (mainEl) {
      originalMainOverflow = mainEl.style.overflow;
      originalMainHeight = mainEl.style.height;
      mainEl.style.overflow = "hidden";
      mainEl.style.height = "calc(100dvh - 4rem)";
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.height = originalBodyHeight;
      if (mainEl) {
        mainEl.style.overflow = originalMainOverflow;
        mainEl.style.height = originalMainHeight;
      }
    };
  }, []);

  const showList = !isMobile || !selectedConversation;
  const showChat = !isMobile || !!selectedConversation;

  const handleArchived = () => {
    setSelectedConversation(null);
    setListRefreshKey(k => k + 1);
  };

  return (
    <Layout>
      <SEO
        title="My Chats – ReBooked Solutions"
        description="Chat with buyers and sellers on ReBooked Solutions"
        url="https://www.rebookedsolutions.co.za/chats"
      />
      <div className="container mx-auto max-w-6xl h-[calc(100dvh-4rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex h-full border border-gray-200 rounded-lg overflow-hidden bg-white">
          {/* Chat List */}
          {showList && (
            <div className={`${isMobile ? "w-full" : "w-[340px] border-r border-gray-200"} h-full flex flex-col min-h-0 flex-shrink-0`}>
              <ChatList
                key={listRefreshKey}
                onSelectConversation={setSelectedConversation}
                selectedId={selectedConversation?.id}
                defaultSelectedId={pendingConversationId || undefined}
              />
            </div>
          )}

          {/* Chat View */}
          {showChat && selectedConversation ? (
            <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden">
              <ChatView
                conversation={selectedConversation}
                onBack={() => {
                  setSelectedConversation(null);
                  setListRefreshKey(k => k + 1);
                }}
                onArchived={handleArchived}
              />
            </div>
          ) : (
            !isMobile && (
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Select a conversation to start chatting</p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Chats;
