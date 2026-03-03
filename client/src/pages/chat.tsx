import { useEffect, useRef } from "react";
import { useRoute } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, ShieldCheck, Copy, CheckCircle2, Lock, ArrowLeft, Phone, PhoneOff, X, Mic, MicOff } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageBubble } from "@/components/chat/message-bubble";
import { Link } from "wouter";
import { useState } from "react";

export default function Chat() {
  const [, params] = useRoute("/room/:id");
  const roomId = params?.id || "";
  const { toast } = useToast();
  
  const { 
    messages, 
    connectionState, 
    peerIsTyping, 
    errorMsg, 
    callState,
    sendMessage, 
    sendTypingStatus,
    startCall,
    endCall
  } = useChat(roomId);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && callState.localStream) {
      localVideoRef.current.srcObject = callState.localStream;
    }
  }, [callState.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && callState.remoteStream) {
      remoteVideoRef.current.srcObject = callState.remoteStream;
    }
  }, [callState.remoteStream]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, peerIsTyping]);

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast({ title: "Room ID copied", description: "Share this to establish a secure connection." });
    setTimeout(() => setCopied(false), 2000);
  };

  // Status visual mapping
  const statusConfig = {
    connecting: { color: "text-muted-foreground", bg: "bg-muted", text: "Connecting...", icon: Lock },
    generating_keys: { color: "text-blue-400", bg: "bg-blue-400/10", text: "Generating Keys...", icon: Lock },
    waiting_for_peer: { color: "text-amber-400", bg: "bg-amber-400/10", text: "Awaiting Peer", icon: ShieldAlert },
    secured: { color: "text-primary", bg: "bg-primary/10 border-primary/20", text: "E2EE Secured", icon: ShieldCheck },
    disconnected: { color: "text-destructive", bg: "bg-destructive/10", text: "Disconnected", icon: ShieldAlert },
    error: { color: "text-destructive", bg: "bg-destructive/10", text: "Connection Error", icon: ShieldAlert },
  };

  const currentStatus = statusConfig[connectionState];
  const StatusIcon = currentStatus.icon;

  if (errorMsg) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-background">
        <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-xl font-mono font-bold mb-2">Connection Failed</h2>
        <p className="text-muted-foreground mb-6 text-center">{errorMsg}</p>
        <Link href="/" className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover-elevate">
          Return Home
        </Link>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-background relative">
      
      {/* Header */}
      <header className="flex-none h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors p-2 -ml-2 rounded-lg hover:bg-accent">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={copyRoomId}>
              <h1 className="font-mono font-bold text-sm tracking-widest text-foreground">
                ID: {roomId}
              </h1>
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            
            <div className={`flex items-center gap-1.5 text-[11px] font-medium font-mono uppercase tracking-wider ${currentStatus.color}`}>
              <StatusIcon className="w-3 h-3" />
              <span className={connectionState === "secured" ? "animate-pulse" : ""}>
                {currentStatus.text}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {connectionState === "secured" && (
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => startCall(true)}
                className="text-primary"
                title="Video Call"
              >
                <Phone className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => startCall(false)}
                className="text-primary"
                title="Voice Call"
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Call Overlay */}
      {callState.isCalling && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-2xl aspect-video bg-card rounded-2xl overflow-hidden shadow-2xl border border-border">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 right-4 w-32 md:w-48 aspect-video bg-background rounded-lg overflow-hidden border border-border shadow-lg">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <Button 
            variant="destructive" 
            size="lg" 
            onClick={endCall}
            className="mt-8 rounded-full h-16 w-16 p-0"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      )}

      {/* Main Chat Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-grid-pattern scroll-smooth"
      >
        <div className="max-w-3xl mx-auto flex flex-col min-h-full pb-4">
          
          {messages.length === 0 && connectionState === "secured" && (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 select-none">
              <ShieldCheck className="w-16 h-16 mb-4 text-primary" />
              <p className="font-mono text-sm max-w-xs">Connection secured with end-to-end encryption. Messages exist only on these devices.</p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {peerIsTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 mt-4 text-muted-foreground/70"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
            </motion.div>
          )}
        </div>
      </main>

      {/* Input Area */}
      <div className="flex-none z-10">
        <ChatInput 
          onSendMessage={(text, timer) => sendMessage({ text }, timer)}
          onSendImage={(image, timer) => sendMessage({ image }, timer)}
          onTyping={sendTypingStatus}
          disabled={connectionState !== "secured"}
        />
      </div>

    </div>
  );
}
