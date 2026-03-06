import { useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Copy,
  CheckCircle2,
  Lock,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

import { useChat } from "@/hooks/use-chat";
import { useToast } from "@/hooks/use-toast";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";

export default function Chat() {

  const [, params] = useRoute("/room/:id");
  const roomId = params?.id || "";

  const { toast } = useToast();

  const {
    messages,
    connectionState,
    peerIsTyping,
    errorMsg,
    sendMessage,
    sendTypingStatus
  } = useChat(roomId);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  /* AUTO SCROLL */

  useEffect(() => {

    if (scrollRef.current) {

      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth"
      });

    }

  }, [messages, peerIsTyping]);

  /* COPY ROOM ID */

  const copyRoomId = () => {

    navigator.clipboard.writeText(roomId);

    setCopied(true);

    toast({
      title: "Room ID copied",
      description: "Share this to establish a secure connection."
    });

    setTimeout(() => setCopied(false), 2000);

  };

  /* STATUS CONFIG */

  const statusConfig = {

    connecting: {
      color: "text-muted-foreground",
      text: "Connecting...",
      icon: Lock
    },

    generating_keys: {
      color: "text-blue-400",
      text: "Generating Keys...",
      icon: Lock
    },

    waiting_for_peer: {
      color: "text-amber-400",
      text: "Awaiting Peer",
      icon: ShieldAlert
    },

    secured: {
      color: "text-primary",
      text: "E2EE Secured",
      icon: ShieldCheck
    },

    disconnected: {
      color: "text-destructive",
      text: "Disconnected",
      icon: ShieldAlert
    },

    error: {
      color: "text-destructive",
      text: "Connection Error",
      icon: ShieldAlert
    }

  };

  const currentStatus = statusConfig[connectionState];
  const StatusIcon = currentStatus.icon;

  /* ERROR SCREEN */

  if (errorMsg) {

    return (

      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">

        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />

        <h2 className="text-xl font-mono font-bold mb-2">
          Connection Failed
        </h2>

        <p className="text-muted-foreground mb-6 text-center">
          {errorMsg}
        </p>

        <Link
          href="/"
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium"
        >
          Return Home
        </Link>

      </div>

    );

  }

  return (

    <div className="h-[100dvh] flex flex-col bg-background">

      {/* HEADER */}

      <header className="flex-none h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4">

        <div className="flex items-center gap-3">

          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex flex-col">

            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={copyRoomId}
            >

              <h1 className="font-mono font-bold text-sm tracking-widest">
                ID: {roomId}
              </h1>

              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}

            </div>

            <div className={`flex items-center gap-1 text-xs ${currentStatus.color}`}>

              <StatusIcon className="w-3 h-3" />
              {currentStatus.text}

            </div>

          </div>

        </div>

      </header>

      {/* CHAT AREA */}

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 bg-grid-pattern"
      >

        <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-4">

          {/* EMPTY STATE */}

          {messages.length === 0 && connectionState === "secured" && (

            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground opacity-60 select-none">

              <ShieldCheck className="w-16 h-16 mb-4 text-primary" />

              <p className="font-mono text-sm max-w-xs">
                Connection secured with end-to-end encryption.
                Messages exist only on these devices.
              </p>

            </div>

          )}

          <AnimatePresence initial={false}>

            {messages.map((msg) => (

              <MessageBubble
                key={msg.id}
                message={msg}
              />

            ))}

          </AnimatePresence>

          {/* TYPING INDICATOR */}

          {peerIsTyping && (

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-muted-foreground text-sm mt-2"
            >

              typing...

            </motion.div>

          )}

        </div>

      </main>

      {/* INPUT */}

      <div className="flex-none">

        <ChatInput
          onSendMessage={(text, timer) =>
            sendMessage({ text }, timer)
          }

          onSendImage={(image, timer) =>
            sendMessage({ image }, timer)
          }

          onTyping={sendTypingStatus}

          disabled={connectionState !== "secured"}
        />

      </div>

    </div>

  );

}