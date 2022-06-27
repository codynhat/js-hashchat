import { ServiceResponse } from "../service-response";
import { AuthSession } from "./auth.service";
import { Channel } from "stream-chat";
import { JWE } from "did-jwt";

export interface EncrypterService {
  authenticate(authSession: AuthSession): void;

  encryptMessage(
    channel: Channel,
    profileTokenId: string,
    payload: Record<string, any>
  ): Promise<ServiceResponse<JWE>>;

  decryptMessage(
    channel: Channel,
    message: JWE
  ): Promise<ServiceResponse<Record<string, any>>>;
}
