import "dotenv/config";
import { defineServer, defineRoom } from "colyseus";
import type { Request, Response } from "express";
import cors from "cors";
import { DuelRoom } from "./rooms/DuelRoom";
import { TeamDuelRoom } from "./rooms/TeamDuelRoom";
import { isSupabaseAdminConfigured } from "./lib/supabaseAdmin";

const port = parseInt(process.env.PORT ?? "2567", 10);
const clientOrigin = process.env.CLIENT_ORIGIN ?? "*";

const server = defineServer({
  rooms: {
    duel: defineRoom(DuelRoom).filterBy(["lobbyRoomId"]),
    team_duel: defineRoom(TeamDuelRoom).filterBy(["lobbyRoomId"]),
  },
  express: (app) => {
    app.use(cors({ origin: clientOrigin }));
    app.get("/healthz", (_req: Request, res: Response) => {
      res.json({ status: "ok", uptime: process.uptime() });
    });
  },
});

server.listen(port).then(() => {
  console.log(`[Colyseus] Server listening on http://localhost:${port}`);
  console.log(`[Colyseus] JWT verification: ${process.env.SUPABASE_JWT_SECRET ? "enabled" : "disabled (dev mode)"}`);
  console.log(`[Colyseus] Match persistence: ${isSupabaseAdminConfigured() ? "enabled" : "disabled"}`);
});
