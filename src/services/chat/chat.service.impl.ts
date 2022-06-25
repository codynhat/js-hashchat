import { ServiceResponse } from "../service-response";
import { ApiServiceImpl } from "../core/api.service.impl";
import { ChatService, UserId } from "./chat.service";
import { AuthSession } from "../auth/auth.service";

export class ChatServiceImpl extends ApiServiceImpl implements ChatService {
  userId?: UserId;
  private userToken?: string;

  async authenticate(
    authSession: AuthSession
  ): Promise<ServiceResponse<UserId>> {
    try {
      const response = await this.post<Record<string, string>>(
        `${this.urls.worker}/token/${authSession.accountId.toString()}`,
        undefined,
        {
          headers: {
            "x-lit-token": authSession.accessToken,
          },
        }
      );

      this.userId = response.data["userId"];
      this.userToken = response.data["token"];
      return this.success<UserId>(this.userId);
    } catch (e) {
      return this.error<UserId>(e);
    }
  }
}
