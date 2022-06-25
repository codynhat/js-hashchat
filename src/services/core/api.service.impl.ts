import { ServiceResponse } from "../service-response";
import axios, { AxiosResponse } from "axios";

const WORKER_ENDPOINT = "https://hashchat-worker.codynhat.workers.dev";

export class ApiServiceImpl {
  protected readonly urls = {
    worker: WORKER_ENDPOINT,
  };

  success<T>(data: T): ServiceResponse<T> {
    return new ServiceResponse<T>({ data });
  }

  error<T>(error: any): ServiceResponse<T> {
    console.error("Error: ", error);
    return new ServiceResponse<T>({ error });
  }

  get<T>(
    url: string,
    params?: Record<string, any>,
    headers?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    let urlWithQuery = url;

    if (params) {
      urlWithQuery = urlWithQuery + "?";

      Object.keys(params).map(
        (key, index) =>
          (urlWithQuery = `${urlWithQuery}${index ? "&" : ""}${key}=${
            params[key]
          }`)
      );
    }
    return axios.get<T>(urlWithQuery, headers);
  }

  post<T>(
    url: string,
    data?: Record<string, any>,
    headers?: Record<string, any>
  ): Promise<AxiosResponse<T>> {
    let urlWithQuery = url;

    return axios.post<T>(urlWithQuery, data, { headers: headers });
  }
}
