import { useState, useEffect, useRef, useCallback } from "react";
import { wsEvents } from "@shared/routes";
import {
generateKeyPair,
exportPublicKey,
importPublicKey,
deriveSecret,
encryptMessage,
decryptMessage,
} from "@/lib/crypto";

export type ChatMessage = {
id: string;
text?: string;
image?: string;
isMine: boolean;
timestamp: number;
expiresAt: number | null;
};

export type ConnectionState =
| "connecting"
| "waiting_for_peer"
| "generating_keys"
| "secured"
| "disconnected"
| "error";

export function useChat(roomId: string) {

const [messages, setMessages] = useState<ChatMessage[]>([]);
const [connectionState, setConnectionState] =
useState<ConnectionState>("connecting");

const [peerIsTyping, setPeerIsTyping] = useState(false);
const [errorMsg, setErrorMsg] = useState<string | null>(null);

const wsRef = useRef<WebSocket | null>(null);
const keyPairRef = useRef<CryptoKeyPair | null>(null);
const sharedSecretRef = useRef<CryptoKey | null>(null);
const myPublicKeyBase64Ref = useRef<string | null>(null);

/* Voice Call */
const pcRef = useRef<RTCPeerConnection | null>(null);
const localStreamRef = useRef<MediaStream | null>(null);

/* AUTO DELETE */

useEffect(() => {

const interval = setInterval(() => {

const now = Date.now();

setMessages(prev =>
prev.filter(msg =>
msg.expiresAt === null || msg.expiresAt > now
)
);

}, 1000);

return () => clearInterval(interval);

}, []);

/* WEBRTC */

const createPeerConnection = () => {

const pc = new RTCPeerConnection({

iceServers: [

{ urls: "stun:stun.l.google.com:19302" },

{
urls: "turn:openrelay.metered.ca:80",
username: "openrelayproject",
credential: "openrelayproject"
},

{
urls: "turn:openrelay.metered.ca:443",
username: "openrelayproject",
credential: "openrelayproject"
}

]

});

pc.ontrack = (event) => {

const audio = new Audio();
audio.srcObject = event.streams[0];
audio.play();

};

pc.onicecandidate = (event) => {

if (event.candidate && wsRef.current) {

wsRef.current.send(
JSON.stringify({
type: "voiceCandidate",
payload: {
candidate: event.candidate,
roomId
}
})
);

}

};

pcRef.current = pc;

};

/* START VOICE CALL */

const startCall = async () => {

const stream = await navigator.mediaDevices.getUserMedia({
audio: true
});

localStreamRef.current = stream;

createPeerConnection();

stream.getTracks().forEach(track => {
pcRef.current?.addTrack(track, stream);
});

const offer = await pcRef.current!.createOffer();

await pcRef.current!.setLocalDescription(offer);

wsRef.current?.send(JSON.stringify({
type: "voiceOffer",
payload: {
offer,
roomId
}
}));

};

/* END CALL */

const endCall = () => {

pcRef.current?.close();

localStreamRef.current?.getTracks().forEach(t => t.stop());

};

/* WEBSOCKET */

const connect = useCallback(async () => {

if (wsRef.current) return;

try {

setConnectionState("generating_keys");

const keyPair = await generateKeyPair();
keyPairRef.current = keyPair;

myPublicKeyBase64Ref.current =
await exportPublicKey(keyPair.publicKey);

const protocol =
window.location.protocol === "https:" ? "wss:" : "ws:";

const ws = new WebSocket(
`${protocol}//${window.location.host}/ws`
);

wsRef.current = ws;

ws.onopen = () => {

setConnectionState("waiting_for_peer");

ws.send(JSON.stringify({
type: "join",
payload: { roomId }
}));

ws.send(JSON.stringify({
type: "publicKey",
payload: {
roomId,
publicKey: myPublicKeyBase64Ref.current
}
}));

};

ws.onmessage = async (event) => {

const parsed = JSON.parse(event.data);

/* KEY EXCHANGE */

if (parsed.type === "publicKey") {

const data = wsEvents.receive.publicKey.parse(parsed.payload);

if (
keyPairRef.current &&
data.publicKey !== myPublicKeyBase64Ref.current
) {

const peerKey = await importPublicKey(data.publicKey);

const secret = await deriveSecret(
keyPairRef.current.privateKey,
peerKey
);

sharedSecretRef.current = secret;

setConnectionState("secured");

}

}

/* MESSAGE */

else if (parsed.type === "message") {

const data = wsEvents.receive.message.parse(parsed.payload);

if (!sharedSecretRef.current) return;

const decryptedJson = await decryptMessage(
data.encryptedPayload,
data.iv,
sharedSecretRef.current
);

const payload = JSON.parse(decryptedJson);

const expiresAt =
payload.destructTimer
? Date.now() + payload.destructTimer * 1000
: null;

setMessages(prev => [
...prev,
{
id: `${data.timestamp}-${Math.random()}`,
text: payload.text,
image: payload.image,
isMine: false,
timestamp: data.timestamp,
expiresAt
}
]);

}

/* TYPING */

else if (parsed.type === "typing") {

const data = wsEvents.receive.typing.parse(parsed.payload);
setPeerIsTyping(data.isTyping);

}

/* VOICE OFFER */

else if (parsed.type === "voiceOffer") {

createPeerConnection();

const stream = await navigator.mediaDevices.getUserMedia({
audio: true
});

localStreamRef.current = stream;

stream.getTracks().forEach(track => {
pcRef.current?.addTrack(track, stream);
});

await pcRef.current!.setRemoteDescription(
parsed.payload.offer
);

const answer = await pcRef.current!.createAnswer();

await pcRef.current!.setLocalDescription(answer);

wsRef.current?.send(JSON.stringify({
type: "voiceAnswer",
payload: { answer, roomId }
}));

}

/* VOICE ANSWER */

else if (parsed.type === "voiceAnswer") {

await pcRef.current?.setRemoteDescription(
parsed.payload.answer
);

}

/* ICE */

else if (parsed.type === "voiceCandidate") {

await pcRef.current?.addIceCandidate(
parsed.payload.candidate
);

}

};

ws.onclose = () => {

setConnectionState("disconnected");
wsRef.current = null;

};

ws.onerror = () => {

setConnectionState("error");

};

} catch (err) {

console.error(err);
setConnectionState("error");

}

}, [roomId]);

useEffect(() => {

connect();

return () => {

wsRef.current?.close();
endCall();

};

}, [connect]);

/* SEND MESSAGE */

const sendMessage = async (
content: { text?: string; image?: string },
destructTimer: number | null
) => {

if (!wsRef.current || !sharedSecretRef.current) return false;

const innerPayload = JSON.stringify({ ...content, destructTimer });

const { encryptedPayload, iv } =
await encryptMessage(innerPayload, sharedSecretRef.current);

wsRef.current.send(JSON.stringify({
type: "message",
payload: { roomId, encryptedPayload, iv }
}));

const expiresAt =
destructTimer ? Date.now() + destructTimer * 1000 : null;

setMessages(prev => [
...prev,
{
id: `local-${Date.now()}`,
...content,
isMine: true,
timestamp: Date.now(),
expiresAt
}
]);

return true;

};

/* TYPING */

const sendTypingStatus = (isTyping: boolean) => {

wsRef.current?.send(JSON.stringify({
type: "typing",
payload: { roomId, isTyping }
}));

};

return {
messages,
connectionState,
peerIsTyping,
errorMsg,
sendMessage,
sendTypingStatus,
startCall,
endCall
};

}