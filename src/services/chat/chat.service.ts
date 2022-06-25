import { ServiceResponse } from "../service-response";
import { AuthSession } from "../auth/auth.service";

export type UserId = string;

export interface ChatService {
  userId?: UserId;
  authenticate(authSession: AuthSession): Promise<ServiceResponse<UserId>>;
}
