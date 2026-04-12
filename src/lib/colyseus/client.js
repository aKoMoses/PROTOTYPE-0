import { Client } from "@colyseus/sdk";

const COLYSEUS_URL = import.meta.env.VITE_COLYSEUS_URL ?? "ws://localhost:2567";

/** @type {import("@colyseus/sdk").Client|null} */
let _client = null;

/** @type {import("@colyseus/sdk").Room|null} */
let _room = null;

async function joinRoomByName(roomName, options = {}) {
  const client = getColyseusClient();
  _room = await client.joinOrCreate(roomName, options);
  return _room;
}

export function getColyseusClient() {
  if (!_client) _client = new Client(COLYSEUS_URL);
  return _client;
}

/**
 * Join or create a "duel" room on the Colyseus server.
 * @param {{ token?: string, displayName?: string, lobbyRoomId?: string|null }} options
 * @returns {Promise<import("@colyseus/sdk").Room>}
 */
export async function joinDuelRoom(options = {}) {
  return joinRoomByName("duel", options);
}

/**
 * Join or create a "team_duel" room on the Colyseus server.
 * @param {{ token?: string, displayName?: string, lobbyRoomId?: string|null }} options
 * @returns {Promise<import("@colyseus/sdk").Room>}
 */
export async function joinTeamDuelRoom(options = {}) {
  return joinRoomByName("team_duel", options);
}

/**
 * Reconnect to an existing room using a Colyseus reconnection token.
 * @param {string} reconnectionToken
 * @returns {Promise<import("@colyseus/sdk").Room>}
 */
export async function reconnectToRoom(reconnectionToken) {
  const client = getColyseusClient();
  _room = await client.reconnect(reconnectionToken);
  return _room;
}

export function getCurrentRoom() {
  return _room;
}

export function leaveCurrentRoom() {
  if (_room) {
    _room.leave();
    _room = null;
  }
}
