import * as vscode from 'vscode';

/**
 * IDEA Usage Toolkit - 极致 UI 优化版
 * 
 * 1. Ctrl+Click 拦截优化：通过返回当前位置拦截跳转，并建议用户配置。
 * 2. 样式调整：完全单行化，代码前置，模拟 IDEA 高亮。
 * 3. 预览增强：列表在上（悬浮），预览在下（编辑器同步）。
 */

class Logger {
    private static _outputChannel: vscode.OutputChannel;
    static get channel() {
        if (!this._outputChannel) this._outputChannel = vscode.window.createOutputChannel("IDEA Usage Toolkit");
        return this._outputChannel;
    }
    static log(msg: string) { this.channel.appendLine(`[${new Date().toLocaleTimeString()}] ${msg}`); }
    static error(msg: string, err?: any) { this.channel.appendLine(`[${new Date().toLocaleTimeString()}] [错误] ${msg} ${err || ''}`); }
}

async function isMethod(document: vscode.TextDocument, position: vscode.Position): Promise<boolean> {
    try {
        // 使用 DocumentSymbolProvider 获取当前文件的符号结构
        const symbols = await vscode.commands.executeCommand<(vscode.SymbolInformation | vscode.DocumentSymbol)[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (!symbols) return false;

        // 递归查找包含当前位置的符号
        function findSymbolAtPosition(syms: (vscode.SymbolInformation | vscode.DocumentSymbol)[], pos: vscode.Position): any {
            for (const sym of syms) {
                if ('range' in sym) { // DocumentSymbol
                    if (sym.range.contains(pos)) {
                        const child = findSymbolAtPosition(sym.children || [], pos);
                        return child || sym;
                    }
                } else { // SymbolInformation
                    if (sym.location.range.contains(pos)) {
                        return sym;
                    }
                }
            }
            return undefined;
        }

        const sym = findSymbolAtPosition(symbols, position);
        if (sym) {
            const kind = sym.kind;
            // 判定为“类方法性质”的符号
            const valid = [
                vscode.SymbolKind.Function,
                vscode.SymbolKind.Method,
                vscode.SymbolKind.Constructor,
                vscode.SymbolKind.Class,
                vscode.SymbolKind.Interface
            ].includes(kind);

            Logger.log(`Detected symbol: ${sym.name}, Kind: ${kind}, Valid: ${valid}`);
            return valid;
        }

        Logger.log(`No symbol detected at: ${position.line}:${position.character}`);
        return false;
    } catch (e) {
        Logger.error('Symbol detection failed', e);
        return false;
    }
}

async function showUsagesQuickPick() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const position = editor.selection.active;

    // 关键改变：仅对方法生效
    if (!(await isMethod(document, position))) {
        // 如果不是方法，触发 VS Code 原生的 Peek Reference
        await vscode.commands.executeCommand('editor.action.referenceSearch.trigger');
        return;
    }

    const wordRange = document.getWordRangeAtPosition(position);
    const symbolName = wordRange ? document.getText(wordRange) : 'Symbol';

    try {
        // 1. 获取定义/声明位置（用于后续过滤）
        let definitionLocs: vscode.Location[] = [];
        try {
            const defs = await vscode.commands.executeCommand<(vscode.Location | vscode.LocationLink)[]>(
                'vscode.executeDefinitionProvider',
                document.uri,
                position
            );
            if (defs) {
                definitionLocs = defs.map(d => 'uri' in d ? d : new vscode.Location(d.targetUri, d.targetRange));
            }
        } catch { }

        // 2. 获取全量引用
        let refs: vscode.Location[] = [];
        try {
            refs = await vscode.commands.executeCommand<vscode.Location[]>(
                'vscode.executeReferenceProvider',
                document.uri,
                position,
                { includeDeclaration: false }
            ) || [];
        } catch { }

        // 3. 组织列表项：定义位置 vs 引用位置
        const filteredRefs = refs.filter(ref => {
            return !definitionLocs.some(def =>
                def.uri.toString() === ref.uri.toString() &&
                def.range.contains(ref.range)
            );
        });

        if (definitionLocs.length === 0 && filteredRefs.length === 0) {
            vscode.window.showInformationMessage(`未找到 "${symbolName}" 的任何位置`);
            return;
        }

        let isAccepted = false; // 标记是否确认选择

        // 创建自定义项目列表
        const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem & { location?: vscode.Location }>();
        quickPick.placeholder = `找到 ${definitionLocs.length + filteredRefs.length} 处位置`;
        // 彻底禁用了 quickPick.value 的自动填充，从根本上解决“蓝色第二条线”的高亮干扰问题

        // 构建列表项
        const items: (vscode.QuickPickItem & { location?: vscode.Location })[] = [];

        // 方案 B：移除所有分割线，通过图标加强视觉隔离

        // 添加定义内容（文字保持黑色，不置灰）
        for (const loc of definitionLocs) {
            const relPath = vscode.workspace.asRelativePath(loc.uri);
            let snippet = '';
            try {
                const refDoc = await vscode.workspace.openTextDocument(loc.uri);
                snippet = refDoc.lineAt(loc.range.start.line).text.trim();
            } catch { }

            items.push({
                // 使用标准方法图标，视觉上非常有辨识度
                label: `$(symbol-method) ${snippet}`,
                description: `  ·  ${relPath}:${loc.range.start.line + 1}`,
                location: loc,
                alwaysShow: true
            });
        }

        Logger.log(`Building UI: ${definitionLocs.length} definitions, ${filteredRefs.length} usages`);

        // 直接进入引用列表，不再设置隔离线

        // 添加引用
        for (const loc of filteredRefs) {
            const relPath = vscode.workspace.asRelativePath(loc.uri);
            let snippet = '';
            try {
                const refDoc = await vscode.workspace.openTextDocument(loc.uri);
                snippet = refDoc.lineAt(loc.range.start.line).text.trim();
            } catch { }

            items.push({
                label: `$(code) ${snippet}`,
                description: `  ·  ${relPath}:${loc.range.start.line + 1}`,
                location: loc,
                alwaysShow: true
            });
        }

        quickPick.items = items;

        // 记录状态用于回滚
        const originalUri = document.uri;
        const originalSelection = editor.selection;

        // 关键点 3：实现下方预览。
        // QuickPick 悬浮在正上方，编辑器本身就在下方。
        // 当选项改变时，我们让编辑器同步滚动并使用预览标签页。
        quickPick.onDidChangeActive(async (activeItems) => {
            if (activeItems.length > 0) {
                const selected = activeItems[0];
                if (selected && selected.location) {
                    const loc = selected.location;
                    try {
                        const doc = await vscode.workspace.openTextDocument(loc.uri);
                        await vscode.window.showTextDocument(doc, {
                            selection: loc.range,
                            preserveFocus: true,
                            preview: true,
                        });
                    } catch (e) {
                        Logger.error('同步预览失败', e);
                    }
                }
            }
        });

        // 确定跳转
        quickPick.onDidAccept(async () => {
            isAccepted = true;
            const selected = quickPick.selectedItems[0];
            if (selected && selected.location) {
                const loc = selected.location;
                const doc = await vscode.workspace.openTextDocument(loc.uri);
                await vscode.window.showTextDocument(doc, {
                    selection: loc.range,
                    preview: false
                });
            }
            quickPick.dispose();
        });

        // 取消回滚
        quickPick.onDidHide(async () => {
            // 只有当用户没有确认选择（例如按下 Esc）时，才回滚到最初位置
            if (!isAccepted) {
                const currentEditor = vscode.window.activeTextEditor;
                if (currentEditor && (currentEditor.document.uri.toString() !== originalUri.toString() || !currentEditor.selection.isEqual(originalSelection))) {
                    await vscode.window.showTextDocument(originalUri, { selection: originalSelection });
                }
            }
            quickPick.dispose();
        });

        quickPick.show();

    } catch (e) {
        Logger.error('IDEA Usage Toolkit 处理失败', e);
    }
}

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('idea-usage-toolkit.showCallers', showUsagesQuickPick)
    );
    Logger.log('IDEA Usage Toolkit [极致版] 已激活');
}

export function deactivate() { }