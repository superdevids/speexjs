import pc from 'picocolors'
import type { ScanResult, ReplacementSuggestion, SecurityIssue } from '../types.js'

function severityColor(severity: SecurityIssue['severity']): string {
  switch (severity) {
    case 'critical': return pc.bold(pc.red(severity.toUpperCase()))
    case 'high': return pc.red(severity.toUpperCase())
    case 'medium': return pc.yellow(severity.toUpperCase())
    case 'low': return pc.dim(severity.toUpperCase())
  }
}

function confidenceIcon(confidence: ReplacementSuggestion['confidence']): string {
  switch (confidence) {
    case 'high': return pc.green('●')
    case 'medium': return pc.yellow('●')
    case 'low': return pc.red('●')
  }
}

export function generateReport(result: ScanResult, jsonOutput?: boolean): string {
  if (jsonOutput) {
    return JSON.stringify(result, null, 2)
  }

  const lines: string[] = []

  // ┌─┐│└┘─
  lines.push(pc.bold(pc.cyan(`┌${'─'.repeat(58)}┐`)))
  lines.push(pc.bold(pc.cyan(`│${' '.repeat(18)}dep-exray Report${' '.repeat(21)}│`)))
  lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
  lines.push(pc.bold(pc.cyan(`│  ${pc.white('📦 PROJECT:')} ${pc.bold(result.projectName)}${' '.repeat(Math.max(1, 47 - result.projectName.length))}│`)))
  lines.push(pc.bold(pc.cyan(`│  ${pc.white('📊 DEPENDENCIES:')} ${pc.bold(String(result.directDeps))} direct + ${pc.bold(String(result.transitiveDeps))} transitive${' '.repeat(Math.max(1, 27 - String(result.transitiveDeps).length))}│`)))
  lines.push(pc.bold(pc.cyan(`│  ${pc.white('💾 TOTAL SIZE:')} ${pc.bold(result.totalEstimatedSize)}${' '.repeat(Math.max(1, 42 - result.totalEstimatedSize.length))}│`)))
  lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))

  if (result.highImpactReplacements.length > 0) {
    lines.push(pc.bold(pc.cyan(`│  ${pc.green('🟢')} ${pc.bold(pc.green('HIGH IMPACT REPLACEMENTS'))}${' '.repeat(23)}│`)))
    for (const item of result.highImpactReplacements) {
      const autoPr = item.autoPrReady ? pc.green('✓ Auto-PR ready') : pc.dim('Manual review needed')
      const confIcon = confidenceIcon(item.confidence)
      lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.red('✗')} ${pc.bold(item.packageName)} (${item.estimatedSizeReduction})${' '.repeat(Math.max(1, 38 - item.estimatedSizeReduction.length))}│`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.dim('→')} ${pc.cyan(item.replacement)}${' '.repeat(Math.max(1, 51 - item.replacement.length))}│`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.dim('└─')} ${autoPr}  ${confIcon} ${item.confidence}${' '.repeat(Math.max(1, 35))}│`)))
    }
  }

  if (result.mediumImpactReplacements.length > 0) {
    lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
    lines.push(pc.bold(pc.cyan(`│  ${pc.yellow('🟡')} ${pc.bold(pc.yellow('MEDIUM IMPACT REPLACEMENTS'))}${' '.repeat(20)}│`)))
    for (const item of result.mediumImpactReplacements) {
      const autoPr = item.autoPrReady ? pc.green('✓ Auto-PR ready') : pc.dim('Manual review needed')
      const confIcon = confidenceIcon(item.confidence)
      lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.red('✗')} ${pc.bold(item.packageName)} (${item.estimatedSizeReduction})${' '.repeat(Math.max(1, 38 - item.estimatedSizeReduction.length))}│`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.dim('→')} ${pc.cyan(item.replacement)}${' '.repeat(Math.max(1, 51 - item.replacement.length))}│`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.dim('└─')} ${autoPr}  ${confIcon} ${item.confidence}${' '.repeat(Math.max(1, 35))}│`)))
    }
  }

  if (result.securityIssues.length > 0) {
    lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
    lines.push(pc.bold(pc.cyan(`│  ${pc.red('🔴')} ${pc.bold(pc.red('SECURITY ISSUES'))}${' '.repeat(33)}│`)))
    for (const issue of result.securityIssues) {
      lines.push(pc.bold(pc.cyan(`├${'─'.repeat(58)}┤`)))
      lines.push(pc.bold(pc.cyan(`│  ${severityColor(issue.severity)} ${pc.bold(issue.cveId)} in ${issue.packageName}${' '.repeat(Math.max(1, 40 - issue.packageName.length))}│`)))
      lines.push(pc.bold(pc.cyan(`│  ${pc.dim('→')} ${issue.fix}${' '.repeat(Math.max(1, 52 - issue.fix.length))}│`)))
    }
  }

  lines.push(pc.bold(pc.cyan(`└${'─'.repeat(58)}┘`)))

  return lines.join('\n')
}
