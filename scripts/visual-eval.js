/**
 * 集成图像理解工具 - 自动评估每页截图质量
 * 基于文件元数据 + 内容启发式分析
 */

import fs from 'fs';
import path from 'path';
import { PATHS } from './common.js';

/**
 * 评估单张图片（基于文件大小和内容启发式）
 */
async function evaluateImage(imagePath, slideNumber) {
  const result = {
    slideNumber,
    imagePath,
    scores: {},
  };

  if (!fs.existsSync(imagePath)) {
    result.error = '文件不存在';
    return result;
  }

  const stats = fs.statSync(imagePath);
  result.size = stats.size;
  result.sizeKB = (stats.size / 1024).toFixed(1);

  // 内容评分（基于文件大小启发式）
  if (stats.size < 5000) {
    result.scores.content = 0;
    result.scores.contentLabel = '⚠ 疑似空白';
    result.warning = '文件过小，可能为空白页';
  } else if (stats.size < 30000) {
    result.scores.content = 3;
    result.scores.contentLabel = '内容较少';
    result.warning = '内容偏少，建议检查';
  } else if (stats.size < 100000) {
    result.scores.content = 4;
    result.scores.contentLabel = '内容正常';
  } else {
    result.scores.content = 5;
    result.scores.contentLabel = '内容丰富';
  }

  // 文件名一致性
  const fileName = path.basename(imagePath);
  if (/^slide-\d{3}\.png$/.test(fileName)) {
    result.scores.naming = 5;
  } else {
    result.scores.naming = 3;
  }

  // 总体评分
  result.overallScore = (result.scores.content + result.scores.naming) / 2;
  result.timestamp = new Date().toISOString();

  return result;
}

/**
 * 评估某个技能的所有截图
 */
export async function evaluateSkill(skillName) {
  const outputDir = path.join(PATHS.OUTPUT, `sample-${skillName}`);
  if (!fs.existsSync(outputDir)) {
    return {
      skill: skillName,
      error: `输出目录不存在: ${outputDir}`,
      slides: [],
      slideCount: 0,
      warnings: 0,
      averageScore: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const pngFiles = fs.readdirSync(outputDir)
    .filter(f => f.endsWith('.png'))
    .sort();

  console.log(`  → 评估 ${pngFiles.length} 张截图...`);

  const slides = [];
  for (let i = 0; i < pngFiles.length; i++) {
    const imagePath = path.join(outputDir, pngFiles[i]);
    const slideNumber = i + 1;
    const evalResult = await evaluateImage(imagePath, slideNumber);
    slides.push(evalResult);
  }

  const totalScore = slides.reduce((sum, s) => sum + (s.overallScore || 0), 0);
  const avgScore = slides.length > 0 ? totalScore / slides.length : 0;

  return {
    skill: skillName,
    slideCount: slides.length,
    slides,
    averageScore: avgScore,
    warnings: slides.filter(s => s.warning).length,
    timestamp: new Date().toISOString(),
  };
}

