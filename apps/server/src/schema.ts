import { MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") characterId = "chus";
  @type("string") name = "";
  @type("number") x = 0;
  @type("number") z = 0;
  @type("number") rotation = 0;
  @type("boolean") moving = false;
  @type("string") status = "available";
}

export class OfficeState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}
