/**
 * CI/CD 自动化流程
 * 集成：回归测试 + PPTX 差异对比 + 图像理解评估 + 兼容性报告生成
 *
 * 流程：
 * 1. 运行回归测试（5 个已验证技能，并行执行）
 * 2. PPTX 内部 XML 差异对比
 * 3. 集成图像理解工具评估每页截图
 * 4. 生成带时间戳的兼容性评估报告
 */

import fs from 'fs';
import path from 'path';
import { renderSlides } from '../src/render.js';
import { convertToPptx } from '../src/convert.js';
import { comparePptx } from './pptx-diff.js';
import { evaluateSkill } from './visual-eval.js';
import { PATHS, VERIFIED_SKILLS, formatTimestamp, formatSize } from './common.js';

/**
 * 阶段 1: 回归测试（并行执行）
 */
async function runRegressionTest() {
  console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃  阶段 1/4: 回归测试 (并行)                  ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

  // 并行渲染所有技能
  const tasks = VERIFIED_SKILLS.map(async (skill) => {
    const htmlPath = path.join(PATHS.SAMPLE, `sample-${skill.name}.html`);
    const pptxPath = htmlPath.replace(/\.html$/, '.pptx');

    const result = {
      name: skill.name,
      style: skill.style,
      verified: skill.verified,
    };

    if (!fs.existsSync(htmlPath)) {
      result.status = 'skip';
      result.reason = 'HTML 文件不存在';
      console.log(`  · ${skill.name}: 跳过 (无 HTML)`);
      return result;
    }

    const startTime = Date.now();
    try {
      const { buffers, width, height } = await renderSlides(htmlPath);
      await convertToPptx(buffers, pptxPath);
      result.status = 'passed';
      result.slideCount = buffers.length;
      result.resolution = `${width}x${height}`;
      result.pptxSize = fs.statSync(pptxPath).size;
      result.duration = Date.now() - startTime;
      console.log(`  ✓ ${skill.name}: ${result.slideCount} 页, ${formatSize(result.pptxSize)}, ${result.duration}ms`);
    } catch (err) {
      result.status = 'failed';
      result.error = err.message;
      console.log(`  ✗ ${skill.name}: ${err.message}`);
    }
    return result;
  });

  return Promise.all(tasks);
}

/**
 * 阶段 2: PPTX 差异对比
 * 返回 { diffs, warnings }
 */
async function runPptxDiff(regressionResults) {
  console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃  阶段 2/4: PPTX XML 差异对比                ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

  const diffs = [];
  const warnings = [];

  for (const r of regressionResults) {
    if (r.status !== 'passed') continue;
    const pptxPath = path.join(PATHS.SAMPLE, `sample-${r.name}.pptx`);
    try {
      const diff = await comparePptx(pptxPath);
      diffs.push({ skill: r.name, ...diff });
      console.log(`  · ${r.name}: ${diff.summary}`);
    } catch (err) {
      const warning = `⚠ ${r.name}: PPTX 差异对比失败 - ${err.message}`;
      warnings.push({ skill: r.name, error: err.message });
      console.log(`  ${warning}`);
    }
  }
  return { diffs, warnings };
}

/**
 * 阶段 3: 图像理解质量评估
 */
async function runVisualEvaluation() {
  console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃  阶段 3/4: 图像理解质量评估                 ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

  const evaluations = [];
  for (const skill of VERIFIED_SKILLS) {
    try {
      const evalResult = await evaluateSkill(skill.name);
      evaluations.push(evalResult);
      const score = evalResult.averageScore?.toFixed(2) || 'N/A';
      const warn = evalResult.warnings || 0;
      console.log(`  · ${skill.name}: 平均分 ${score}/5.0, ${warn} 个警告, ${evalResult.slideCount} 页`);
    } catch (err) {
      console.log(`  ✗ ${skill.name}: 评估失败 - ${err.message}`);
    }
  }
  return evaluations;
}

/**
 * 阶段 4: 生成兼容性评估报告
 */
function generateCompatibilityReport(regression, diffs, evaluations, timestamp, warnings) {
  const report = [];
  report.push('# html2ppt 兼容性评估报告');
  report.push('');
  report.push(`**生成时间**: ${new Date().toISOString()}`);
  report.push(`**时间戳**: ${timestamp}`);
  report.push(`**测试模式**: CI/CD 自动化流程`);
  report.push('');

  // 概览
  report.push('## 概览');
  report.push('');
  const passed = regression.filter(r => r.status === 'passed').length;
  const failed = regression.filter(r => r.status === 'failed').length;
  const skipped = regression.filter(r => r.status === 'skip').length;
  report.push(`- 测试技能数: ${VERIFIED_SKILLS.length}`);
  report.push(`- 通过: ${passed} ✅`);
  if (failed > 0) report.push(`- 失败: ${failed} ❌`);
  if (skipped > 0) report.push(`- 跳过: ${skipped} ⏭`);
  if (warnings.length > 0) report.push(`- 警告: ${warnings.length} ⚠`);
  report.push('');

  // 警告详情
  if (warnings.length > 0) {
    report.push('## ⚠ 警告');
    report.push('');
    for (const w of warnings) {
      report.push(`- **${w.skill}**: ${w.error}`);
    }
    report.push('');
  }

  // 详细结果
  report.push('## 详细结果');
  report.push('');
  report.push('| 技能 | 风格 | 状态 | 页数 | 分辨率 | PPTX 大小 | 平均分 | 差异 |');
  report.push('|------|------|------|------|--------|----------|--------|------|');

  for (const r of regression) {
    const evalResult = evaluations.find(e => e.skill === r.name);
    const diffResult = diffs.find(d => d.skill === r.name);
    const score = evalResult?.averageScore?.toFixed(1) || '-';
    const diffSummary = diffResult?.summary || '-';
    const pptxSize = r.pptxSize ? formatSize(r.pptxSize) : '-';
    const status = r.status === 'passed' ? '✅' : (r.status === 'failed' ? '❌' : '⏭');
    report.push(`| ${r.name} | ${r.style} | ${status} | ${r.slideCount || '-'} | ${r.resolution || '-'} | ${pptxSize} | ${score} | ${diffSummary} |`);
  }
  report.push('');

  // PPTX 差异详情
  if (diffs.length > 0) {
    report.push('## PPTX 内部差异详情');
    report.push('');
    for (const d of diffs) {
      report.push(`### ${d.skill}`);
      report.push('');
      if (d.hasPrevious) {
        report.push(`- 新增文件: ${d.added?.length || 0}`);
        report.push(`- 删除文件: ${d.removed?.length || 0}`);
        report.push(`- 修改文件: ${d.modified?.length || 0}`);
        report.push(`- 未变文件: ${d.unchangedCount || 0}`);
        if (d.modified && d.modified.length > 0) {
          report.push('');
          report.push('**修改的文件**:');
          for (const m of d.modified.slice(0, 10)) {
            report.push(`- \`${m.path}\`: ${formatSize(m.previousSize)} → ${formatSize(m.currentSize)} (${m.delta > 0 ? '+' : ''}${formatSize(Math.abs(m.delta))})`);
          }
        }
      } else {
        report.push('- 首次运行，已建立基线快照');
      }
      report.push('');
    }
  }

  // 图像理解详情
  report.push('## 图像理解评估详情');
  report.push('');
  for (const e of evaluations) {
    if (!e.slides || e.slides.length === 0) continue;
    report.push(`### ${e.skill}`);
    report.push('');
    report.push(`- 总页数: ${e.slideCount}`);
    report.push(`- 平均分: ${e.averageScore?.toFixed(2) || 'N/A'}/5.0`);
    report.push(`- 警告数: ${e.warnings || 0}`);
    report.push('');
    report.push('| 页码 | 文件 | 大小 | 内容评分 | 状态 |');
    report.push('|------|------|------|---------|------|');
    for (const s of e.slides || []) {
      const contentScore = s.scores?.content || '-';
      const label = s.scores?.contentLabel || '-';
      const warn = s.warning ? '⚠' : '✓';
      report.push(`| ${s.slideNumber} | ${path.basename(s.imagePath)} | ${s.sizeKB} KB | ${contentScore} | ${warn} ${label} |`);
    }
    report.push('');
  }

  // 总结
  report.push('## 总结');
  report.push('');
  if (failed === 0) {
    report.push('✅ **所有已验证技能兼容性测试通过**');
  } else {
    report.push(`❌ **${failed} 个技能测试失败，需要修复**`);
  }
  if (warnings.length > 0) {
    report.push(`⚠ **${warnings.length} 个警告需要关注**`);
  }
  report.push('');
  report.push('### 改进建议');
  report.push('');
  for (const e of evaluations) {
    if (e.warnings > 0) {
      report.push(`- ⚠ ${e.skill}: ${e.warnings} 个页面有警告，建议检查`);
    }
  }
  for (const w of warnings) {
    report.push(`- ⚠ ${w.skill}: PPTX 差异对比异常，建议排查`);
  }

  return report.join('\n');
}

/**
 * 主流程
 */
async function main() {
  const startTime = Date.now();
  const now = new Date();
  const timestamp = formatTimestamp(now);

  console.log('╔════════════════════════════════════════════╗');
  console.log('║   html2ppt CI/CD 自动化测试流程            ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n时间戳: ${timestamp}`);
  console.log(`日期: ${now.toISOString()}`);

  // 阶段 1: 回归测试（并行）
  const regressionResults = await runRegressionTest();

  // 阶段 2: PPTX 差异对比
  const { diffs, warnings } = await runPptxDiff(regressionResults);

  // 阶段 3: 图像理解评估
  const evaluations = await runVisualEvaluation();

  // 阶段 4: 生成报告
  console.log('\n┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓');
  console.log('┃  阶段 4/4: 生成兼容性报告                   ┃');
  console.log('┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛');

  if (!fs.existsSync(PATHS.REPORTS)) fs.mkdirSync(PATHS.REPORTS, { recursive: true });

  const reportContent = generateCompatibilityReport(regressionResults, diffs, evaluations, timestamp, warnings);
  const reportPath = path.join(PATHS.REPORTS, `compatibility-${timestamp}.md`);
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`\n报告已生成: ${reportPath}`);

  // 保存 JSON 版本供后续处理
  const jsonData = {
    timestamp,
    date: now.toISOString(),
    duration: Date.now() - startTime,
    regression: regressionResults,
    diffs,
    warnings,
    evaluations,
  };
  const jsonPath = path.join(PATHS.REPORTS, `compatibility-${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));

  // 同时更新 latest
  fs.writeFileSync(path.join(PATHS.REPORTS, 'compatibility-latest.md'), reportContent);
  fs.writeFileSync(path.join(PATHS.REPORTS, 'compatibility-latest.json'), JSON.stringify(jsonData, null, 2));

  // 总结
  const passed = regressionResults.filter(r => r.status === 'passed').length;
  const failed = regressionResults.filter(r => r.status === 'failed').length;
  const totalDuration = Date.now() - startTime;

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║              CI/CD 流程总结                 ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`通过: ${passed}/${VERIFIED_SKILLS.length}`);
  console.log(`失败: ${failed}/${VERIFIED_SKILLS.length}`);
  if (warnings.length > 0) console.log(`警告: ${warnings.length}`);
  console.log(`总耗时: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`报告路径: ${reportPath}`);

  // 失败时退出码非零
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('CI/CD 流程异常:', err);
  process.exit(1);
});