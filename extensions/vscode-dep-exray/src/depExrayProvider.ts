import * as vscode from 'vscode'
import type { ScanResult } from './scanner'

export class DepExrayItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    iconId?: string,
    command?: vscode.Command
  ) {
    super(label, collapsibleState)
    this.description = description
    this.tooltip = description
    this.iconPath = iconId ? new vscode.ThemeIcon(iconId) : undefined
    this.command = command
  }
}

export class DepExrayTreeDataProvider implements vscode.TreeDataProvider<DepExrayItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<DepExrayItem | undefined>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private scanResult: ScanResult | null = null

  update(result: ScanResult) {
    this.scanResult = result
    this._onDidChangeTreeData.fire(undefined)
  }

  getTreeItem(element: DepExrayItem): vscode.TreeItem {
    return element
  }

  getChildren(element?: DepExrayItem): Thenable<DepExrayItem[]> {
    if (!this.scanResult) {
      return Promise.resolve([
        new DepExrayItem(
          'Run scan to see results',
          'Click dep-exray: Scan Dependencies in command palette',
          vscode.TreeItemCollapsibleState.None,
          'search'
        )
      ])
    }

    if (!element) {
      const items: DepExrayItem[] = []

      items.push(new DepExrayItem(
        this.scanResult.projectName,
        `${this.scanResult.directDeps} direct + ${this.scanResult.transitiveDeps} transitive | ${this.scanResult.totalEstimatedSize}`,
        vscode.TreeItemCollapsibleState.None,
        'package'
      ))

      if (this.scanResult.highImpactReplacements.length > 0) {
        items.push(new DepExrayItem(
          `High Impact Replacements (${this.scanResult.highImpactReplacements.length})`,
          '',
          vscode.TreeItemCollapsibleState.Expanded,
          'lightbulb'
        ))
      }

      if (this.scanResult.mediumImpactReplacements.length > 0) {
        items.push(new DepExrayItem(
          `Medium Impact (${this.scanResult.mediumImpactReplacements.length})`,
          '',
          vscode.TreeItemCollapsibleState.Collapsed,
          'info'
        ))
      }

      if (this.scanResult.securityIssues.length > 0) {
        items.push(new DepExrayItem(
          `Security Issues (${this.scanResult.securityIssues.length})`,
          '',
          vscode.TreeItemCollapsibleState.Expanded,
          'error'
        ))
      }

      return Promise.resolve(items)
    }

    if (element.label?.toString().includes('High Impact')) {
      return Promise.resolve(
        this.scanResult!.highImpactReplacements.map(r => new DepExrayItem(
          `${r.packageName} \u2192 ${r.replacement}`,
          r.estimatedSizeReduction,
          vscode.TreeItemCollapsibleState.None,
          'replace',
          {
            command: 'dep-exray.applyReplacement',
            title: 'Apply Replacement',
            arguments: [r.packageName, r.replacement],
          }
        ))
      )
    }

    if (element.label?.toString().includes('Medium Impact')) {
      return Promise.resolve(
        this.scanResult!.mediumImpactReplacements.map(r => new DepExrayItem(
          `${r.packageName} \u2192 ${r.replacement}`,
          r.estimatedSizeReduction,
          vscode.TreeItemCollapsibleState.None,
          'info'
        ))
      )
    }

    if (element.label?.toString().includes('Security Issues')) {
      return Promise.resolve(
        this.scanResult!.securityIssues.map(s => new DepExrayItem(
          `${s.cveId} (${s.severity})`,
          s.fix,
          vscode.TreeItemCollapsibleState.None,
          'error'
        ))
      )
    }

    return Promise.resolve([])
  }
}
