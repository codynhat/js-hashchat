import { AuthService } from "./auth/auth.service";
import { AuthServiceImpl } from "./auth/auth.service.impl";
import { ChatService } from "./chat/chat.service";
import { ChatServiceImpl } from "./chat/chat.service.impl";
import { EncrypterServiceImpl } from "./auth/encrypter.service.impl";
import { SignerServiceImpl } from "./auth/signer.service.impl";

export class Services {
  authService: AuthService = new AuthServiceImpl();
  chatService: ChatService;

  constructor(chatServiceApiKey: string) {
    const encrypterService = new EncrypterServiceImpl();
    const signerService = new SignerServiceImpl();
    this.chatService = new ChatServiceImpl(
      chatServiceApiKey,
      encrypterService,
      signerService
    );
  }
}
