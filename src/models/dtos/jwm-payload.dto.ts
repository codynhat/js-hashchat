/* Payload of plaintext message */
export interface JWMPayload {
  id?: string;
  type?: string;
  body?: Record<string, any>;
  to?: string;
  from?: string;
  thread_id?: string;
  created_time?: string;
  expires_time?: string;
  reply_url?: string;
  reply_to?: string;
}
