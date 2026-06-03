/**
 * 回归测试自动化流程
 * 对 5 个已验证技能生成的 HTML 文件执行完整转换流程
 * 输出 CI/CD 测试报告
 */

import fs from 'fs';
import path from 'path';
import { renderSlides } from '../src/render.js';
import { convertToPptx } from '../src/convert.js';
import { comparePptx } from './pptx-diff.js';
import { PATHS, VERIFIED_SKILLS, formatTimestamp, formatSize } from './common.js';

async function testSkill(skill) {
  const htmlPath = path.join(PATHS.SAMPLE, `sample-${skill.name}.html`);
  const pptxPath = htmlPath.replace(/\.html$/, '.pptx');
  const result = {
    name: skill.name,
    mode: skill.mode,
    startedAt: new Date().toISOString(),
  };

  console.log(`\n━━━ 测试技能: ${skill.name} ━━━`);

  // 1. 检查 HTML 文件存在
  if (!fs.existsSync(htmlPath)) {
    result.status = 'failed';
    result.error = `HTML 文件不存在: ${htmlPath}`;
    console.log(`  ✗ ${result.error}`);
    return result;
  }

  // 2. 渲染 + 转换（一次 renderSlides，复用 buffers 避免重复渲染）
  console.log(`  → 渲染截图...`);
  const renderStart = Date.now();
  let buffers;
  try {
    const renderResult = await renderSlides(htmlPath);
    buffers = renderResult.buffers;
    result.renderDuration = Date.now() - renderStart;
    result.slideCount = buffers.length;
    result.resolution = `${renderResult.width}x${renderResult.height}`;
    console.log(`    ✓ ${buffers.length} 页, ${result.renderDuration}ms`);
  } catch (err) {
    result.status = 'failed';
    result.error = `渲染失败: ${err.message}`;
    console.log(`  ✗ ${result.error}`);
    return result;
  }

  // 截图文件大小检查
  const outputDir = path.join(PATHS.OUTPUT, `sample-${skill.name}`);
  if (fs.existsSync(outputDir)) {
    const pngs = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
    result.pngFiles = pngs.length;
    const totalSize = pngs.reduce((sum, f) => {
      return sum + fs.statSync(path.join(outputDir, f)).size;
    }, 0);
    result.pngTotalSize = totalSize;
    console.log(`    ✓ ${pngs.length} PNG, 总大小 ${formatSize(totalSize)}`);
  }

  // 3. 转换 PPTX（复用 buffers）
  console.log(`  → 转换 PPTX...`);
  const convertStart = Date.now();
  try {
    await convertToPptx(buffers, pptxPath);
    result.convertDuration = Date.now() - convertStart;
    console.log(`    ✓ PPTX 生成, ${result.convertDuration}ms`);

    if (fs.existsSync(pptxPath)) {
      result.pptxSize = fs.statSync(pptxPath).size;
      console.log(`    ✓ PPTX 大小: ${formatSize(result.pptxSize)}`);
    }
  } catch (err) {
    result.status = 'failed';
    result.error = `PPTX 转换失败: ${err.message}`;
    console.log(`  ✗ ${result.error}`);
    return result;
  }

  // 4. PPTX 差异对比（与上一版本）
  console.log(`  → PPTX 差异对比...`);
  try {
    const diffResult = await comparePptx(pptxPath);
    result.pptxDiff = diffResult;
    if (diffResult.hasPrevious) {
      console.log(`    ✓ 与上次对比: ${diffResult.summary}`);
    } else {
      console.log(`    · 无上一版本（首次运行）`);
    }
  } catch (err) {
    result.pptxDiffError = err.message;
    console.log(`    ⚠ 差异对比失败: ${err.message}`);
  }

  // 5. 质量评分
  result.scores = {
    renderSuccess: result.slideCount > 0 ? 5 : 0,
    pptxGenerated: result.pptxSize > 0 ? 5 : 0,
    sizeReasonable: result.pptxSize > 50 * 1024 && result.pptxSize < 5 * 1024 * 1024 ? 5 : 3,
    renderFast: result.renderDuration < 60000 ? 5 : 3,
  };
  result.overallScore = Object.values(result.scores).reduce((a, b) => a + b, 0) / Object.keys(result.scores).length;

  result.status = 'passed';
  result.completedAt = new Date().toISOString();

  console.log(`  ✓ 通过 · 总分 ${result.overallScore.toFixed(1)}/5.0`);
  return result;
}

async function main() {
  const startTime = Date.now();
  const testResults = {
    timestamp: new Date().toISOString(),
    timestampLabel: formatTimestamp(new Date()),
    mode: 'regression',
    skills: [],
    summary: { total: 0, passed: 0, failed: 0, duration: 0 },
  };

  console.log('╔════════════════════════════════════════════╗');
  console.log('║     html2ppt 回归测试自动化流程            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n时间戳: ${testResults.timestampLabel}`);
  console.log(`测试技能数: ${VERIFIED_SKILLS.length}`);

  for (const skill of VERIFIED_SKILLS) {
    const result = await testSkill(skill);
    testResults.skills.push(result);
    testResults.summary.total++;
    if (result.status === 'passed') {
      testResults.summary.passed++;
    } else {
      testResults.summary.failed++;
    }
  }

  testResults.summary.duration = Date.now() - startTime;

  // 保存测试报告
  if (!fs.existsSync(PATHS.REPORTS)) fs.mkdirSync(PATHS.REPORTS, { recursive: true });
  const reportPath = path.join(PATHS.REPORTS, `regression-${testResults.timestampLabel}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n报告已保存: ${reportPath}`);

  const latestPath = path.join(PATHS.REPORTS, 'regression-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(testResults, null, 2));

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              测试结果总结                  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`通过: ${testResults.summary.passed}/${testResults.summary.total}`);
  console.log(`失败: ${testResults.summary.failed}/${testResults.summary.total}`);
  console.log(`耗时: ${(testResults.summary.duration / 1000).toFixed(1)}s`);

  if (testResults.summary.failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('测试流程异常:', err);
  process.exit(1);
});