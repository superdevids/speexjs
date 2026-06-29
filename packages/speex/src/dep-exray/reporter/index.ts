import type { ScanResult, ReplacementSuggestion, SecurityIssue } from '../types.js'

// ANSI color codes — zero dependencies
const _ = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
}

function style(text: string, codes: string[]): string {
  return codes.join('') + text + _.reset
}

function severityColor(severity: SecurityIssue['severity']): string {
  switch (severity) {
    case 'critical': return style(severity.toUpperCase(), [_.bold, _.red])
    case 'high': return style(severity.toUpperCase(), [_.red])
    case 'medium': return style(severity.toUpperCase(), [_.yellow])
    case 'low': return style(severity.toUpperCase(), [_.dim])
  }
}

function confidenceIcon(confidence: ReplacementSuggestion['confidence']): string {
  switch (confidence) {
    case 'high': return style('●', [_.green])
    case 'medium': return style('●', [_.yellow])
    case 'low': return style('●', [_.red])
  }
}

export function generateReport(result: ScanResult, jsonOutput?: boolean): string {
  if (jsonOutput) {
    return JSON.stringify(result, null, 2)
  }

  const lines: string[] = []

  const t = (text: string, codes: string[] = [_.cyan]) => style(text, [_.bold, ...codes])

  lines.push(t(`┌${'─'.repeat(58)}┐`))
  lines.push(t(`│${' '.repeat(18)}dep-exray Report${' '.repeat(21)}│`))
  lines.push(t(`├${'─'.repeat(58)}┤`))
  lines.push(t(`│  ${style('📦 PROJECT:', [_.white])} ${style(result.projectName, [_.bold])}${' '.repeat(Math.max(1, 47 - result.projectName.length))}│`))
  lines.push(t(`│  ${style('📊 DEPENDENCIES:', [_.white])} ${style(String(result.directDeps), [_.bold])} direct + ${style(String(result.transitiveDeps), [_.bold])} transitive${' '.repeat(Math.max(1, 27 - String(result.transitiveDeps).length))}│`))
  lines.push(t(`│  ${style('💾 TOTAL SIZE:', [_.white])} ${style(result.totalEstimatedSize, [_.bold])}${' '.repeat(Math.max(1, 42 - result.totalEstimatedSize.length))}│`))
  lines.push(t(`├${'─'.repeat(58)}┤`))

  if (result.highImpactReplacements.length > 0) {
    lines.push(t(`│  ${style('🟢', [_.green])} ${style('HIGH IMPACT REPLACEMENTS', [_.bold, _.green])}${' '.repeat(23)}│`))
    for (const item of result.highImpactReplacements) {
      const autoPr = item.autoPrReady ? style('✓ Auto-PR ready', [_.green]) : style('Manual review needed', [_.dim])
      const confIcon = confidenceIcon(item.confidence)
      lines.push(t(`├${'─'.repeat(58)}┤`))
      lines.push(t(`│  ${style('✗', [_.red])} ${style(item.packageName, [_.bold])} (${item.estimatedSizeReduction})${' '.repeat(Math.max(1, 38 - item.estimatedSizeReduction.length))}│`))
      lines.push(t(`│  ${style('→', [_.dim])} ${style(item.replacement, [_.cyan])}${' '.repeat(Math.max(1, 51 - item.replacement.length))}│`))
      lines.push(t(`│  ${style('└─', [_.dim])} ${autoPr}  ${confIcon} ${item.confidence}${' '.repeat(Math.max(1, 35))}│`))
    }
  }

  if (result.mediumImpactReplacements.length > 0) {
    lines.push(t(`├${'─'.repeat(58)}┤`))
    lines.push(t(`│  ${style('🟡', [_.yellow])} ${style('MEDIUM IMPACT REPLACEMENTS', [_.bold, _.yellow])}${' '.repeat(20)}│`))
    for (const item of result.mediumImpactReplacements) {
      const autoPr = item.autoPrReady ? style('✓ Auto-PR ready', [_.green]) : style('Manual review needed', [_.dim])
      const confIcon = confidenceIcon(item.confidence)
      lines.push(t(`├${'─'.repeat(58)}┤`))
      lines.push(t(`│  ${style('✗', [_.red])} ${style(item.packageName, [_.bold])} (${item.estimatedSizeReduction})${' '.repeat(Math.max(1, 38 - item.estimatedSizeReduction.length))}│`))
      lines.push(t(`│  ${style('→', [_.dim])} ${style(item.replacement, [_.cyan])}${' '.repeat(Math.max(1, 51 - item.replacement.length))}│`))
      lines.push(t(`│  ${style('└─', [_.dim])} ${autoPr}  ${confIcon} ${item.confidence}${' '.repeat(Math.max(1, 35))}│`))
    }
  }

  if (result.securityIssues.length > 0) {
    lines.push(t(`├${'─'.repeat(58)}┤`))
    lines.push(t(`│  ${style('🔴', [_.red])} ${style('SECURITY ISSUES', [_.bold, _.red])}${' '.repeat(33)}│`))
    for (const issue of result.securityIssues) {
      lines.push(t(`├${'─'.repeat(58)}┤`))
      lines.push(t(`│  ${severityColor(issue.severity)} ${style(issue.cveId, [_.bold])} in ${issue.packageName}${' '.repeat(Math.max(1, 40 - issue.packageName.length))}│`))
      lines.push(t(`│  ${style('→', [_.dim])} ${issue.fix}${' '.repeat(Math.max(1, 52 - issue.fix.length))}│`))
    }
  }

  lines.push(t(`└${'─'.repeat(58)}┘`))

  return lines.join('\n')
}
