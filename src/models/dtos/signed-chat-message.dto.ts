import { DagJWS } from "dids";
import { Cacao } from "ceramic-cacao";

export interface SignedChatMessage {
  jws: DagJWS;
  cacao: Cacao;
}
