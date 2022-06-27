import { ServiceResponse } from "../service-response";
import { JWMPayload } from "../../models";
import { SignedChatMessage } from "../../models/dtos/signed-chat-message.dto";
import { ApiServiceImpl } from "../core/api.service.impl";
import { SignerService } from "./signer.service";
import { AuthSession } from "./auth.service";

export class SignerServiceImpl extends ApiServiceImpl implements SignerService {
  private authSession?: AuthSession;

  authenticate(authSession: AuthSession) {
    this.authSession = authSession;
  }

  async signMessage(
    payload: JWMPayload
  ): Promise<ServiceResponse<SignedChatMessage>> {
    if (!this.authSession) {
      return this.error<SignedChatMessage>(
        new Error("Signer not authenticated. Call authenticate() first")
      );
    }

    try {
      const dagJWS = await this.authSession.did.createJWS(payload);
      const signedChatMessage = {
        jws: dagJWS,
        cacao: this.authSession.cacao,
      };
      return this.success<SignedChatMessage>(signedChatMessage);
    } catch (e) {
      return this.error<SignedChatMessage>(e);
    }
  }

  async verifyMessage(
    signedMessage: SignedChatMessage
  ): Promise<ServiceResponse<JWMPayload>> {
    if (!this.authSession) {
      return this.error<JWMPayload>(
        new Error("Signer not authenticated. Call authenticate() first")
      );
    }

    try {
      const verifyResult = await this.authSession.did.verifyJWS(
        signedMessage.jws,
        { capability: signedMessage.cacao }
      );
      if (verifyResult.payload) {
        return this.success<JWMPayload>(verifyResult.payload as JWMPayload);
      } else {
        return this.error<JWMPayload>(new Error("Failed to validate message"));
      }
    } catch (e) {
      return this.error<JWMPayload>(e);
    }
  }
}
