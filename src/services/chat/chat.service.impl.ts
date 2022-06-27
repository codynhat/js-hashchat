import { ServiceResponse } from "../service-response";
import { ApiServiceImpl } from "../core/api.service.impl";
import { ChatService, UserId } from "./chat.service";
import { AuthSession } from "../auth/auth.service";
import { ChatMessage } from "../../models/chat-message.model";
import { JWMPayload } from "../../models/dtos/jwm-payload.dto";
import { StreamChat, Channel } from "stream-chat";

export class ChatServiceImpl extends ApiServiceImpl implements ChatService {
  userId?: UserId;
  private userToken?: string;
  private authSession?: AuthSession;
  private streamClient: StreamChat;

  constructor(apiKey: string) {
    super();
    this.streamClient = StreamChat.getInstance(apiKey, {
      enableInsights: true,
      enableWSFallback: true,
    });
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
      this.authSession = authSession;

      await this.streamClient.connectUser(
        {
          id: this.userId,
        },
        this.userToken
      );

      return this.success<UserId>(this.userId);
    } catch (e) {
      return this.error<UserId>(e);
    }
  }

  async send(payload: JWMPayload): Promise<ServiceResponse<ChatMessage>> {
    try {
      payload.id = payload.id ?? crypto.randomUUID();

      const message = new ChatMessage({
        hashchatMessage: payload,
      });

      // FIXME: Just using a single test channel for now
      const channel = this.streamClient.channel(
        "messaging",
        "test-channel-codynhat"
      );

      await channel.sendMessage({ ...message.getDto() });
      return this.success<ChatMessage>(message);
    } catch (e) {
      return this.error<ChatMessage>(e);
    }
  }
}
