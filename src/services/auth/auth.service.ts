import { ServiceResponse } from "../service-response";
import { AccountId } from "caip";

export interface AuthService {
  accountId?: AccountId;
  connect(): Promise<ServiceResponse<AccountId>>;
}
