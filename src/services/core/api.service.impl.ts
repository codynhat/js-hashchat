import { ServiceResponse } from "../service-response";

export class ApiServiceImpl {
  success<T>(data: T): ServiceResponse<T> {
    return new ServiceResponse<T>({ data });
  }

  error<T>(error: any): ServiceResponse<T> {
    console.error("Error: ", error);
    return new ServiceResponse<T>({ error });
  }
}
