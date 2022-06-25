import { AuthService } from "./auth/auth.service";
import { AuthServiceImpl } from "./auth/auth.service.impl";
import { ChatService } from "./chat/chat.service";
import { ChatServiceImpl } from "./chat/chat.service.impl";

export class Services {
  authService: AuthService = new AuthServiceImpl();
  chatService: ChatService = new ChatServiceImpl();
}

export const services = new Services();
