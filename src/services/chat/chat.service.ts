import { ServiceResponse } from "../service-response";
import { AuthSession } from "../auth/auth.service";
import { ChatMessage } from "../../models/chat-message.model";
import { JWMPayload } from "../../models/dtos/jwm-payload.dto";

export type UserId = string;

export interface ChatService {
  userId?: UserId;
  authenticate(authSession: AuthSession): Promise<ServiceResponse<UserId>>;
  send(payload: JWMPayload): Promise<ServiceResponse<ChatMessage>>;
  lastMessage(): Promise<ServiceResponse<ChatMessage>>;
}
