import * as vscode from 'vscode'
import type { ScanResult } from './scanner'

export class DiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('dep-exray')
  }

  updateDiagnostics(document: vscode.TextDocument, scanResult?: ScanResult) {
    if (!document.fileName.endsWith('package.json')) return

    const diagnostics: vscode.Diagnostic[] = []
    const text = document.getText()

    try {
      const json = JSON.parse(text)
      const deps = { ...json.dependencies, ...json.devDependencies }

      if (scanResult?.highImpactReplacements) {
        for (const rep of scanResult.highImpactReplacements) {
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${rep.packageName}"`)) {
              const range = new vscode.Range(
                new vscode.Position(i, lines[i].indexOf(`"${rep.packageName}"`)),
                new vscode.Position(i, lines[i].length)
              )
              const diagnostic = new vscode.Diagnostic(
                range,
                `${rep.packageName} \u2192 ${rep.replacement}: ${rep.estimatedSizeReduction}`,
                vscode.DiagnosticSeverity.Hint
              )
              diagnostic.code = 'dep-exray-replacement'
              diagnostics.push(diagnostic)
            }
          }
        }
      }

      if (scanResult?.mediumImpactReplacements) {
        for (const rep of scanResult.mediumImpactReplacements) {
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${rep.packageName}"`)) {
              const range = new vscode.Range(
                new vscode.Position(i, lines[i].indexOf(`"${rep.packageName}"`)),
                new vscode.Position(i, lines[i].length)
              )
              const diagnostic = new vscode.Diagnostic(
                range,
                `${rep.packageName} \u2192 ${rep.replacement}: ${rep.estimatedSizeReduction}`,
                vscode.DiagnosticSeverity.Information
              )
              diagnostic.code = 'dep-exray-replacement'
              diagnostics.push(diagnostic)
            }
          }
        }
      }

      if (scanResult?.securityIssues) {
        for (const issue of scanResult.securityIssues) {
          const lines = text.split('\n')
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(`"${issue.packageName}"`)) {
              const range = new vscode.Range(
                new vscode.Position(i, 0),
                new vscode.Position(i, lines[i].length)
              )
              const diagnostic = new vscode.Diagnostic(
                range,
                `${issue.cveId} (${issue.severity}): ${issue.fix}`,
                vscode.DiagnosticSeverity.Error
              )
              diagnostic.code = 'dep-exray-security'
              diagnostics.push(diagnostic)
            }
          }
        }
      }
    } catch {
      // invalid JSON — skip
    }

    this.diagnosticCollection.set(document.uri, diagnostics)
  }

  dispose() {
    this.diagnosticCollection.dispose()
  }
}
