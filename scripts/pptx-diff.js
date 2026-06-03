/**
 * PPTX 内部 XML 差异对比工具
 * 使用 adm-zip 解压 PPTX（ZIP 格式）并对比每个 XML/媒体文件
 */

import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { ROOT, PATHS } from './common.js';

/**
 * 清理超过 N 天的旧快照（默认保留最近 7 天）
 */
function cleanOldSnapshots(maxAgeDays = 7) {
  const snapshotDir = path.join(PATHS.REPORTS, 'pptx-snapshots');
  if (!fs.existsSync(snapshotDir)) return;

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const entries = fs.readdirSync(snapshotDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const fullPath = path.join(snapshotDir, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  }
}

/**
 * 解压 PPTX 文件
 */
function unzipPptx(pptxPath, targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  const zip = new AdmZip(pptxPath);
  zip.extractAllTo(targetDir, true);
}

/**
 * 递归列出所有文件
 */
function listFiles(dir, prefix = '') {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  for (const item of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const relPath = path.join(prefix, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...listFiles(fullPath, relPath));
    } else {
      files.push({ path: relPath.replace(/\\/g, '/'), size: stat.size, fullPath });
    }
  }
  return files;
}

/**
 * 对比两个目录的文件差异
 */
function diffDirectories(currentDir, previousDir) {
  const currentFiles = listFiles(currentDir);
  const previousFiles = listFiles(previousDir);

  const currentMap = new Map(currentFiles.map(f => [f.path, f]));
  const previousMap = new Map(previousFiles.map(f => [f.path, f]));

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  for (const [filePath, fileInfo] of currentMap) {
    if (!previousMap.has(filePath)) {
      added.push({ path: filePath, size: fileInfo.size });
    } else {
      const prevFile = previousMap.get(filePath);
      if (prevFile.size !== fileInfo.size) {
        modified.push({
          path: filePath,
          currentSize: fileInfo.size,
          previousSize: prevFile.size,
          delta: fileInfo.size - prevFile.size,
        });
      } else {
        unchanged.push({ path: filePath, size: fileInfo.size });
      }
    }
  }

  for (const [filePath, fileInfo] of previousMap) {
    if (!currentMap.has(filePath)) {
      removed.push({ path: filePath, size: fileInfo.size });
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * 加载上一版本的 PPTX 快照
 */
function loadPreviousSnapshot() {
  const snapshotDir = path.join(PATHS.REPORTS, 'pptx-snapshots');
  const indexPath = path.join(snapshotDir, 'index.json');
  if (!fs.existsSync(indexPath)) return null;

  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    return index;
  } catch {
    return null;
  }
}

/**
 * 保存当前 PPTX 快照
 */
function saveCurrentSnapshot(snapshot) {
  const snapshotDir = path.join(PATHS.REPORTS, 'pptx-snapshots');
  if (!fs.existsSync(snapshotDir)) fs.mkdirSync(snapshotDir, { recursive: true });

  const indexPath = path.join(snapshotDir, 'index.json');
  let index = [];
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch {}
  }

  index.push(snapshot);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

/**
 * 复制 PPTX 内的所有文件到快照目录
 */
function archivePptxContents(pptxPath, snapshotId) {
  const snapshotDir = path.join(PATHS.REPORTS, 'pptx-snapshots', snapshotId);
  unzipPptx(pptxPath, snapshotDir);
  return snapshotDir;
}

/**
 * 主对比函数
 */
export async function comparePptx(pptxPath) {
  const skillName = path.basename(pptxPath, '.pptx');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const currentSnapshotId = `${skillName}-${timestamp}`;

  // 1. 解压当前 PPTX
  const tempDir = path.join(PATHS.TMP, `pptx-${currentSnapshotId}`);
  try {
    unzipPptx(pptxPath, tempDir);
  } catch (err) {
    throw new Error(`无法解压 PPTX: ${err.message}`);
  }

  // 2. 加载上一版本
  const previousIndex = loadPreviousSnapshot();
  const previousEntry = previousIndex?.find(s => s.skill === skillName);

  const result = {
    skill: skillName,
    currentSnapshotId,
    hasPrevious: !!previousEntry,
    timestamp: new Date().toISOString(),
  };

  if (previousEntry) {
    const previousDir = path.join(PATHS.REPORTS, 'pptx-snapshots', previousEntry.snapshotId);
    if (!fs.existsSync(previousDir)) {
      result.hasPrevious = false;
      result.summary = '上一版本快照不存在，已建立新基线';
    } else {
      const diff = diffDirectories(tempDir, previousDir);

      result.added = diff.added;
      result.removed = diff.removed;
      result.modified = diff.modified;
      result.unchangedCount = diff.unchanged.length;

      const totalChanges = diff.added.length + diff.removed.length + diff.modified.length;
      result.summary = totalChanges === 0
        ? '无变化'
        : `+${diff.added.length} 新增, -${diff.removed.length} 删除, ~${diff.modified.length} 修改`;
    }
  } else {
    result.summary = '首次运行，无基线对比';
    result.added = [];
    result.removed = [];
    result.modified = [];
    result.unchangedCount = 0;
  }

  // 3. 归档当前快照
  archivePptxContents(pptxPath, currentSnapshotId);

  // 4. 更新索引
  saveCurrentSnapshot({
    skill: skillName,
    snapshotId: currentSnapshotId,
    timestamp: result.timestamp,
    pptxPath,
  });

  // 5. 清理临时文件和旧快照
  fs.rmSync(tempDir, { recursive: true, force: true });
  cleanOldSnapshots(7);

  return result;
}