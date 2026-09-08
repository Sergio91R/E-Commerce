/**
 * El frontend reutiliza los mismos contratos que el backend
 * (packages/shared-types) para garantizar tipado de extremo a extremo:
 * si el backend cambia un DTO, TypeScript rompe la compilación acá
 * también, en vez de fallar silenciosamente en tiempo de ejecución.
 */
export * from '@shared/index';
