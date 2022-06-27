import { ServiceResponse } from "../service-response";
import { JWMPayload } from "../../models";
import { AuthSession } from "./auth.service";
import { DagJWSResult } from "dids";

export interface SignerService {
  authenticate(authSession: AuthSession): void;
  signMessage(payload: JWMPayload): Promise<ServiceResponse<DagJWSResult>>;
}
