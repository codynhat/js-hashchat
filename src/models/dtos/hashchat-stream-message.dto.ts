import { JWE } from "did-jwt";

/* Hashchat specific message stored in Stream */
export interface HashchatStreamMessage {
  hashchatMessage: JWE;
}
