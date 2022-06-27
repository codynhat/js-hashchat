import { ServiceResponse } from "../service-response";
import { JWMPayload } from "../../models";
import { DagJWSResult } from "dids";
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
  ): Promise<ServiceResponse<DagJWSResult>> {
    if (!this.authSession) {
      return this.error<DagJWSResult>(
        new Error("Encrypter not authenticated. Call authenticate() first")
      );
    }

    try {
      const dagJWSResult = await this.authSession.did.createDagJWS(payload);
      return this.success<DagJWSResult>(dagJWSResult);
    } catch (e) {
      return this.error<DagJWSResult>(e);
    }
  }
}
