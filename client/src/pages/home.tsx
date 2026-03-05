import { useState } from "react";
import { useLocation } from "wouter";
import { Shield, Key, Terminal, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateRoom } from "@/hooks/use-rooms";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeCanvas } from "qrcode.react";
import { Scanner } from "@yudiel/react-qr-scanner";

export default function Home() {
  const [, setLocation] = useLocation();
  const createRoom = useCreateRoom();

  const [joinId, setJoinId] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrRoomId, setQrRoomId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleCreate = async () => {
    setIsGenerating(true);
    try {
      const room = await createRoom.mutateAsync();
      setLocation(`/room/${room.id}`);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinId.trim()) {
      setLocation(`/room/${joinId.trim()}`);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 bg-grid-pattern relative overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md space-y-8 z-10"
      >

        {/* Header */}
        <div className="text-center space-y-4">

          <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-card border border-border shadow-2xl mb-2">
            <Shield className="w-12 h-12 text-primary animate-pulse-glow" />
          </div>

          <h1 className="text-4xl font-bold font-mono tracking-tighter text-foreground">
            Axyntrel
          </h1>

          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            Peer-to-peer ephemeral chat. Zero knowledge. True end-to-end encryption via Web Crypto API.
          </p>

          {/* Encryption Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <div className="flex items-center gap-2 text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              End-to-End Encryption Active
            </div>
          </motion.div>

        </div>

        {/* Main Card */}
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-2xl space-y-6">

          <div className="space-y-4">

            {/* Create Room */}
            <Button
              onClick={handleCreate}
              disabled={isGenerating}
              className="w-full h-14 text-base font-mono font-semibold rounded-xl bg-primary text-primary-foreground"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Key className="w-5 h-5 mr-2" />
              )}
              Initialize Secure Room
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground font-mono">
                  or
                </span>
              </div>
            </div>

            {/* Join Room */}
            <form onSubmit={handleJoin} className="flex gap-2">
              <div className="relative flex-1">
                <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  placeholder="ENTER ROOM ID"
                  className="pl-9 h-12 font-mono text-center tracking-widest rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={!joinId.trim()}
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <ArrowRight className="w-5 h-5" />
              </Button>
            </form>

            {/* Generate QR Room */}
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const room = await createRoom.mutateAsync();
                setQrRoomId(room.id);
              }}
            >
              Create QR Room
            </Button>

            {/* Scan QR */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowScanner(true)}
            >
              Scan QR Code
            </Button>
          </div>

          {/* Security Info */}
          <div className="pt-4 border-t border-border/30">
            <ul className="text-[11px] font-mono text-muted-foreground/70 space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                Keys generated locally (ECDH P-256)
              </li>

              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                No messages stored on servers
              </li>

              <li className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                AES-GCM encrypted transport
              </li>
            </ul>
          </div>
        </div>

        {/* QR Section */}
        <AnimatePresence>
          {qrRoomId && (
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.4 }}
              className="mt-6"
            >

              <div className="p-6 bg-card border border-border rounded-2xl text-center space-y-4">

                <h2 className="font-mono text-sm uppercase text-muted-foreground">
                  Scan To Join Secure Room
                </h2>

                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <QRCodeCanvas
                      value={`${window.location.origin}/room/${qrRoomId}`}
                      size={200}
                    />
                  </div>
                </div>

                {/* Room Code + Copy */}
                <div className="flex items-center justify-between bg-muted p-2 rounded font-mono text-lg tracking-widest">
                  {qrRoomId}

                  <button
                    onClick={() => navigator.clipboard.writeText(qrRoomId)}
                    className="text-xs text-primary"
                  >
                    Copy
                  </button>
                </div>

                <Button
                  onClick={() => setLocation(`/room/${qrRoomId}`)}
                  className="w-full"
                >
                  Enter Room
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setQrRoomId(null)}
                >
                  Close
                </Button>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scanner Modal */}
        {showScanner && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">

            <div className="bg-card p-6 rounded-2xl space-y-4 w-full max-w-sm">

              <h2 className="text-center font-mono text-sm uppercase">
                Scan Room QR
              </h2>

              <Scanner
                onScan={(result) => {
                  if (result?.[0]?.rawValue) {
                    const url = new URL(result[0].rawValue);
                    const id = url.pathname.split("/room/")[1];
                    setShowScanner(false);
                    setLocation(`/room/${id}`);
                  }
                }}
                onError={(err) => console.log(err)}
              />

              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowScanner(false)}
              >
                Close
              </Button>

            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}