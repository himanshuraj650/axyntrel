import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { api, wsEvents } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input?.parse(req.body) || {};
      const roomId = input.id || Math.random().toString(36).substring(2, 8).toUpperCase();
      const room = await storage.createRoom({ id: roomId });
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.rooms.get.path, async (req, res) => {
    const room = await storage.getRoom(req.params.id);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  });

  // Setup WebSocket server for signaling
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  
  // roomId -> Set<WebSocket>
  const roomsMap = new Map<string, Set<WebSocket>>();

  wss.on("connection", (ws) => {
    let currentRoomId: string | null = null;

    ws.on("message", (data) => {
      try {
        const rawMessage = JSON.parse(data.toString());
        const type = rawMessage.type;
        const payload = rawMessage.payload;

        if (type === 'join') {
          const parsed = wsEvents.send.join.parse(payload);
          currentRoomId = parsed.roomId;
          
          if (!roomsMap.has(currentRoomId)) {
            roomsMap.set(currentRoomId, new Set());
          }
          const roomClients = roomsMap.get(currentRoomId)!;
          roomClients.add(ws);

          // Broadcast userJoined
          const joinMsg = JSON.stringify({
            type: 'userJoined',
            payload: { clientsCount: roomClients.size }
          });
          roomClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(joinMsg);
            }
          });
        } 
        else if (type === 'publicKey' && currentRoomId) {
          const parsed = wsEvents.send.publicKey.parse(payload);
          // Broadcast to OTHERS in the room
          const msg = JSON.stringify({
            type: 'publicKey',
            payload: { publicKey: parsed.publicKey }
          });
          const roomClients = roomsMap.get(currentRoomId)!;
          roomClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
        }
        else if (type === 'message' && currentRoomId) {
          const parsed = wsEvents.send.message.parse(payload);
          const msg = JSON.stringify({
            type: 'message',
            payload: { 
              encryptedPayload: parsed.encryptedPayload,
              iv: parsed.iv,
              timestamp: Date.now()
            }
          });
          const roomClients = roomsMap.get(currentRoomId)!;
          roomClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
        }
        else if (type === 'typing' && currentRoomId) {
          const parsed = wsEvents.send.typing.parse(payload);
          const msg = JSON.stringify({
            type: 'typing',
            payload: { isTyping: parsed.isTyping }
          });
          const roomClients = roomsMap.get(currentRoomId)!;
          roomClients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(msg);
            }
          });
        }
        else if (type === "callSignal" && currentRoomId) {

  const roomClients = roomsMap.get(currentRoomId)!;

  const msg = JSON.stringify({
    type: "callSignal",
    payload
  });

  // Relay WebRTC signaling to other peers
  roomClients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });

}
      } catch (err) {
        console.error("WS error:", err);
        ws.send(JSON.stringify({ type: 'error', payload: { message: "Invalid message format" } }));
      }
    });

    ws.on("close", () => {
      if (currentRoomId && roomsMap.has(currentRoomId)) {
        const roomClients = roomsMap.get(currentRoomId)!;
        roomClients.delete(ws);
        
        // Broadcast userLeft
        const leaveMsg = JSON.stringify({
          type: 'userLeft',
          payload: { clientsCount: roomClients.size }
        });
        roomClients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(leaveMsg);
          }
        });

        if (roomClients.size === 0) {
          roomsMap.delete(currentRoomId);
        }
      }
    });
  });

  return httpServer;
}