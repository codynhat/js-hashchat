import { Entity } from "./core/entity";
import { JWMPayload } from "./dtos/jwm-payload.dto";

enum MessageType {
  MESSAGE = "message",
  UNKNOWN = "unknown",
}

export class ChatMessage extends Entity<JWMPayload> {
  get messageType(): MessageType {
    switch (this.dto.type) {
      case "message":
        return MessageType.MESSAGE;
      default:
        return MessageType.UNKNOWN;
    }
  }

  get content(): string | undefined {
    return this.dto.body?.content;
  }

  get to(): string | undefined {
    return this.dto.to;
  }

  get from(): string | undefined {
    return this.dto.from;
  }

  get threadId(): string | undefined {
    return this.dto.thread_id;
  }

  get createdTime(): Date | undefined {
    return this.dto.created_time ? new Date(this.dto.created_time) : undefined;
  }

  get expiresTime(): Date | undefined {
    return this.dto.expires_time ? new Date(this.dto.expires_time) : undefined;
  }

  get replyUrl(): string | undefined {
    return this.dto.reply_url;
  }

  get replyTo(): string | undefined {
    return this.dto.reply_to;
  }
}
