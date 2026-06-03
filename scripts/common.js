/**
 * 公共模块：统一常量、工具函数
 * 供 CI/CD、回归测试、PPTX 差异对比、图像评估等模块共享
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT = path.join(__dirname, '..');

// 路径常量
export const PATHS = {
  SAMPLE: path.join(ROOT, 'sample'),
  OUTPUT: path.join(ROOT, 'output'),
  REPORTS: path.join(ROOT, 'docs', 'reports'),
  TMP: path.join(ROOT, '.tmp'),
};

// 已验证技能列表
export const VERIFIED_SKILLS = [
  { name: 'frontend-slides', mode: 'slide', style: '动画丰富', verified: '2026-06-03' },
  { name: 'guizang-ppt-skill', mode: 'slide', style: '瑞士极简', verified: '2026-06-03' },
  { name: 'html-ppt-skill', mode: 'slide', style: 'Tokyo Night', verified: '2026-06-03' },
  { name: 'cjl-slides', mode: 'slide', style: 'Pitch.com 商务', verified: '2026-06-03' },
  { name: 'markdown-slides', mode: 'slide', style: 'Dark Terminal', verified: '2026-06-03' },
];

// 渲染配置
export const RENDER = {
  VIEWPORT: { width: 1280, height: 720 },
  RETRY: 3,
  TIMEOUT: 5000,
};

export function formatTimestamp(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}