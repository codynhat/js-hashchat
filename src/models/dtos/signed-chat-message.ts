import { Cacao } from "ceramic-cacao";

export interface SignedChatMessage {
  cacao: Cacao;
  jws: string;
}
