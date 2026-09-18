declare module 'soap' {
  export function createClient(
    url: string,
    callback: (err: unknown, client: SoapClient) => void,
  ): void;
  export function createClientAsync(url: string): Promise<SoapClient>;

  export interface SoapClient {
    [method: string]: (
      args: unknown,
      callback?: (err: unknown, result: unknown) => void,
    ) => Promise<unknown[]> | void;
  }
}
