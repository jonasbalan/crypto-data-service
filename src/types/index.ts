/**
 * Declaração de módulos para pacotes sem tipos
 */

// Declaração para o módulo 'ws' se não tiver @types/ws instalado
declare module 'ws' {
  import { EventEmitter } from 'events';
  import * as http from 'http';
  import * as net from 'net';

  class WebSocket extends EventEmitter {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;

    binaryType: string;
    readonly bufferedAmount: number;
    readonly extensions: string;
    readonly protocol: string;
    readonly readyState: number;
    readonly url: string;

    constructor(
      address: string | URL,
      protocols?: string | string[],
      options?: WebSocket.ClientOptions
    );

    close(code?: number, reason?: string): void;
    ping(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    pong(data?: any, mask?: boolean, cb?: (err: Error) => void): void;
    send(data: any, cb?: (err?: Error) => void): void;
    send(
      data: any,
      options: { mask?: boolean; binary?: boolean },
      cb?: (err?: Error) => void
    ): void;
    terminate(): void;

    on(event: 'close', listener: (code: number, reason: string) => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
    on(event: 'message', listener: (data: WebSocket.Data) => void): this;
    on(event: 'open', listener: () => void): this;
    on(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
    on(
      event: 'unexpected-response',
      listener: (request: http.ClientRequest, response: http.IncomingMessage) => void
    ): this;
    on(event: 'upgrade', listener: (response: http.IncomingMessage) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;

    once(event: 'close', listener: (code: number, reason: string) => void): this;
    once(event: 'error', listener: (err: Error) => void): this;
    once(event: 'message', listener: (data: WebSocket.Data) => void): this;
    once(event: 'open', listener: () => void): this;
    once(event: 'ping' | 'pong', listener: (data: Buffer) => void): this;
    once(
      event: 'unexpected-response',
      listener: (request: http.ClientRequest, response: http.IncomingMessage) => void
    ): this;
    once(event: 'upgrade', listener: (response: http.IncomingMessage) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;
  }

  namespace WebSocket {
    type Data = string | Buffer | ArrayBuffer | Buffer[];

    interface ClientOptions {
      followRedirects?: boolean;
      handshakeTimeout?: number;
      maxPayload?: number;
      maxRedirects?: number;
      origin?: string;
      protocolVersion?: number;
      rejectUnauthorized?: boolean;
    }
  }

  export = WebSocket;
}

// Tipos para o Pinecone
declare namespace Pinecone {
  interface PineconeRecord<T = Record<string, any>> {
    id: string;
    values: number[];
    metadata?: T;
  }

  interface QueryRequest<T = Record<string, any>> {
    vector: number[];
    topK: number;
    filter?: T;
    includeMetadata?: boolean;
    includeValues?: boolean;
    namespace?: string;
  }

  interface QueryMatch<T = Record<string, any>> {
    id: string;
    score: number;
    metadata?: T;
    values?: number[];
  }

  interface QueryResponse<T = Record<string, any>> {
    matches: QueryMatch<T>[];
    namespace: string;
  }

  interface UpsertRequest<T = Record<string, any>> {
    vectors: PineconeRecord<T>[];
    namespace?: string;
  }

  interface UpsertResponse {
    upsertedCount: number;
  }

  interface DeleteRequest {
    ids?: string[];
    deleteAll?: boolean;
    namespace?: string;
    filter?: Record<string, any>;
  }

  interface PineconeIndex {
    query<T = Record<string, any>>(request: QueryRequest): Promise<QueryResponse<T>>;
    upsert<T = Record<string, any>>(request: UpsertRequest<T>): Promise<UpsertResponse>;
    delete(request: DeleteRequest): Promise<void>;
  }
} 