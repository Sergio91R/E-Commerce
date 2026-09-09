/**
 * Declaración de tipos mínima para `node:sqlite` (SQLite síncrono de la
 * librería estándar de Node, estable desde Node 22.5 / 24). Se declara
 * aquí porque `@types/node@20` todavía no lo incluye; solo se tipa la
 * porción de la API que este proyecto usa, para no perder el tipado
 * estricto ni recurrir a `any`.
 */
declare module 'node:sqlite' {
  export interface StatementResultingChanges {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: Array<string | number | bigint | null>): StatementResultingChanges;
    get(...params: Array<string | number | bigint | null>): unknown;
    all(...params: Array<string | number | bigint | null>): unknown[];
  }

  export interface DatabaseSyncOptions {
    open?: boolean;
    readOnly?: boolean;
  }

  export class DatabaseSync {
    constructor(path: string, options?: DatabaseSyncOptions);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    open(): void;
    close(): void;
  }
}
