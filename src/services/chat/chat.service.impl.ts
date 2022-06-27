import { ServiceResponse } from "../service-response";
import { ApiServiceImpl } from "../core/api.service.impl";
import { ChatService, UserId } from "./chat.service";
import { AuthSession } from "../auth/auth.service";
import { ChatMessage } from "../../models/chat-message.model";
import { JWMPayload } from "../../models/dtos/jwm-payload.dto";
import { StreamChat } from "stream-chat";
import { SignerService } from "../auth/signer.service";
import { EncrypterService } from "../auth/encrypter.service";
import { HashchatStreamMessage } from "../../models/dtos/hashchat-stream-message.dto";
import { JWE } from "did-jwt";
import { SignedChatMessage } from "../../models/dtos/signed-chat-message.dto";

export class ChatServiceImpl extends ApiServiceImpl implements ChatService {
  userId?: UserId;
  private userToken?: string;
  private streamClient: StreamChat;
  private readonly encrypterService: EncrypterService;
  private readonly signerService: SignerService;

  constructor(
    apiKey: string,
    encrypterService: EncrypterService,
    signerService: SignerService
  ) {
    super();
    this.streamClient = StreamChat.getInstance(apiKey, {
      enableInsights: true,
      enableWSFallback: true,
    });
    this.encrypterService = encrypterService;
    this.signerService = signerService;
  }

  async authenticate(
    authSession: AuthSession
  ): Promise<ServiceResponse<UserId>> {
    try {
      const response = await this.post<Record<string, string>>(
        `${this.urls.worker}/token/${authSession.accountId.toString()}`,
        undefined,
        {
          "x-lit-token": authSession.accessToken,
        }
      );

      this.userId = response.data["userId"];
      this.userToken = response.data["token"];

      await this.streamClient.connectUser(
        {
          id: this.userId,
        },
        this.userToken
      );

      this.encrypterService.authenticate(authSession);
      this.signerService.authenticate(authSession);
      return this.success<UserId>(this.userId);
    } catch (e) {
      return this.error<UserId>(e);
    }
  }

  async send(payload: JWMPayload): Promise<ServiceResponse<ChatMessage>> {
    try {
      const messageId = payload.id ?? crypto.randomUUID();
      payload.id = messageId;

      const chatMessage = new ChatMessage(payload);

      // FIXME: Just using a single test channel for now
      const channel = this.streamClient.channel(
        "messaging",
        "test-channel-codynhat"
      );

      const signedMessageResult = await this.signerService.signMessage(payload);
      if (!signedMessageResult.data) {
        return this.error<ChatMessage>(signedMessageResult.error);
      }
      const encryptedMessageResult = await this.encrypterService.encryptMessage(
        channel,
        "",
        signedMessageResult.data
      );
      if (!encryptedMessageResult.data) {
        return this.error<ChatMessage>(encryptedMessageResult.error);
      }

      const streamMessage = {
        hashchatMessage: encryptedMessageResult.data,
      };

      await channel.sendMessage({ id: messageId, ...streamMessage });
      return this.success<ChatMessage>(chatMessage);
    } catch (e) {
      return this.error<ChatMessage>(e);
    }
  }

  async lastMessage(): Promise<ServiceResponse<ChatMessage>> {
    try {
      // FIXME: Just using a single test channel for now
      const channel = this.streamClient.channel(
        "messaging",
        "test-channel-codynhat"
      );
      await channel.watch();

      const lastMessage: HashchatStreamMessage = {
        hashchatMessage: channel.lastMessage().hashchatMessage as JWE,
      };

      const decryptedMessageResult = await this.encrypterService.decryptMessage(
        channel,
        lastMessage.hashchatMessage
      );
      if (!decryptedMessageResult.data) {
        return this.error<ChatMessage>(decryptedMessageResult.error);
      }
      const decryptedMessage = decryptedMessageResult.data as SignedChatMessage;
      const verifiedMessageResult = await this.signerService.verifyMessage(
        decryptedMessage
      );
      if (!verifiedMessageResult.data) {
        return this.error<ChatMessage>(verifiedMessageResult.error);
      }

      const chatMessage = new ChatMessage(verifiedMessageResult.data);
      return this.success<ChatMessage>(chatMessage);
    } catch (e) {
      return this.error<ChatMessage>(e);
    }
  }
}
