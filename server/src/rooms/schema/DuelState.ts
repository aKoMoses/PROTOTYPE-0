import { Schema, MapSchema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("float32") x: number = 800;
  @type("float32") y: number = 450;
  @type("float32") hp: number = 280;
  @type("float32") facing: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") connected: boolean = true;
  @type("boolean") isBot: boolean = false;
  @type("int8") team: number = 0;
  @type("int8") roundScore: number = 0;
  @type("string") displayName: string = "";
}

export class DuelState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();

  /** waiting | countdown | active | round_end | match_end */
  @type("string") phase: string = "waiting";

  @type("int8") round: number = 1;

  /** milliseconds remaining in the current timed phase */
  @type("int32") phaseTimer: number = 0;

  /** sessionId of the match winner (populated on match_end) */
  @type("string") winnerId: string = "";

  /** team index of the match winner (populated on match_end) */
  @type("int8") winnerTeam: number = -1;
}
