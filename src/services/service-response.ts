export class ServiceResponse<T> {
  data?: T;
  error?: any;

  constructor({ data, error }: { data?: T; error?: any }) {
    this.data = data;
    this.error = error;
  }

  getData(): T {
    return this.data as T;
  }

  getError(): any {
    return this.error;
  }
}
