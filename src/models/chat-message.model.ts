import { Entity } from "./core/entity";
import { HashchatStreamMessage } from "./dtos/hashchat-stream-message.dto";

enum MessageType {
  MESSAGE = "message",
  UNKNOWN = "unknown",
}

export class ChatMessage extends Entity<HashchatStreamMessage> {
  get messageType(): MessageType {
    switch (this.dto.hashchatMessage.type) {
      case "message":
        return MessageType.MESSAGE;
      default:
        return MessageType.UNKNOWN;
    }
  }

  get content(): string | undefined {
    return this.dto.hashchatMessage.body?.content;
  }

  get to(): string | undefined {
    return this.dto.hashchatMessage.to;
  }

  get from(): string | undefined {
    return this.dto.hashchatMessage.from;
  }

  get threadId(): string | undefined {
    return this.dto.hashchatMessage.thread_id;
  }

  get createdTime(): Date | undefined {
    return this.dto.hashchatMessage.created_time
      ? new Date(this.dto.hashchatMessage.created_time)
      : undefined;
  }

  get expiresTime(): Date | undefined {
    return this.dto.hashchatMessage.expires_time
      ? new Date(this.dto.hashchatMessage.expires_time)
      : undefined;
  }

  get replyUrl(): string | undefined {
    return this.dto.hashchatMessage.reply_url;
  }

  get replyTo(): string | undefined {
    return this.dto.hashchatMessage.reply_to;
  }
}
