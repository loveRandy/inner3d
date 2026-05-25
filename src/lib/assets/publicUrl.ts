/**
 * 将 public 目录下的绝对路径转为带 CDN base 的 URL。
 * 开发环境 base 为 `/`，生产构建可通过 VITE_CDN_BASE_URL 指向七牛 CDN。
 */
export function publicUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const base = import.meta.env.BASE_URL || '/';
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return `${base}${normalizedPath}`;
}
