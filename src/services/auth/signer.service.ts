import { ServiceResponse } from "../service-response";
import { JWMPayload } from "../../models";
import { AuthSession } from "./auth.service";
import { SignedChatMessage } from "../../models/dtos/signed-chat-message.dto";

export interface SignerService {
  authenticate(authSession: AuthSession): void;
  signMessage(payload: JWMPayload): Promise<ServiceResponse<SignedChatMessage>>;
  verifyMessage(
    signedMessage: SignedChatMessage
  ): Promise<ServiceResponse<JWMPayload>>;
}
