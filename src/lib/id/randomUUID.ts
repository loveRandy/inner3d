import { v4 as uuidv4 } from 'uuid';

/**
 * 生成 UUID。crypto.randomUUID 仅在 HTTPS / localhost 可用，
 * HTTP 部署时需使用 uuid 包作为 fallback。
 */
export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // 非安全上下文下 randomUUID 可能抛错
    }
  }
  return uuidv4();
}
