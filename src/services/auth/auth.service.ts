import { ServiceResponse } from "../service-response";
import { AccountId } from "caip";

export type AuthSession = {
  accountId: AccountId;
  accessToken: string;
};

export interface AuthService {
  authSession?: AuthSession;
  connect(): Promise<ServiceResponse<AuthSession>>;
}
