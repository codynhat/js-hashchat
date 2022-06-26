/**
 * Base class for DTO's that holds the state of the object without
 * any modifications
 */
export abstract class Entity<T extends Record<string, any>> {
  private readonly _id: string;

  /**
   * Raw data as received from the network
   * This is immutable and existence checks must be done before
   * accessing any nested properties.
   * Only used properties in the app can be exposed by data models.
   */
  protected readonly dto: T;

  constructor(dto: T, keyId?: string) {
    this._id = dto[keyId ?? "id"];
    this.dto = dto;
  }

  get id(): string {
    return this._id;
  }

  /**
   * @returns T - Raw data of this model
   */
  getDto(): T {
    return { ...this.dto };
  }
}
