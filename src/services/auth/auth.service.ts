import { ServiceResponse } from "../service-response";
import { AccountId } from "caip";
import { DID } from "dids";
import { Cacao } from "ceramic-cacao";

export type AuthSession = {
  accountId: AccountId;
  accessToken: string;
  did: DID;
  cacao: Cacao;
};

export interface AuthService {
  authSession?: AuthSession;
  connect(): Promise<ServiceResponse<AuthSession>>;
}
