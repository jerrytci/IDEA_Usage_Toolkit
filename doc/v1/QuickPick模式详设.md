# 📄 详细设计文档：QuickPick 交互模式 (当前实现版)

## 1. 项目定位与目标
本方案是 `IDEA Usage Toolkit` 的第一阶段实现（QuickPick 模式）。
**核心目标**：在不引入复杂 Webview 性能开销的前提下，通过对 VS Code 原生组件的极致调教，复刻 IntelliJ IDEA 的 `Show Usages` (快捷键 `Alt+F7`，当前配置为 `Alt+X`) 的核心心智模型。

## 2. 当前核心特性 (Current Features)

### 2.1 智能上下文拦截 (Smart Interception)
*   **按需接管**：插件并非盲目拦截所有引用搜索。通过内置的 `isMethod` 算法判定光标位置：
    *   **判定目标**：仅当符号属于 `Method`, `Function`, `Constructor`, `Class`, `Interface` 时激活本插件。
    *   **自动退避**：若光标位于普通变量或不支持的符号上，自动调用 `editor.action.referenceSearch.trigger` 触发 VS Code 原生 Peek 视图。
*   **快捷键重定义**：在 `package.json` 中配置 `-editor.action.referenceSearch.trigger`，有效解决了 VS Code 原生快捷键冲突。

### 2.2 真正的“平铺式”搜索 (Flattened Search)
*   **消除层级**：彻底抛弃 VS Code 默认的“按文件折叠”树状结构。
*   **源码级预览**：列表每一项（Label）显示的是经过 `trim()` 处理的**真实源码行**，而非文件名。
*   **语义图标化**：
    *   使用 `$(symbol-method)` 标识“定义/声明”。
    *   使用 `$(code)` 标识“调用/引用”。

### 2.3 非侵入式同步预览 (Synchronized Live Preview)
*   **即时联动**：用户在 QuickPick 列表中通过上下键选择时，后台编辑器会实时滚动到对应位置。
*   **预览模式保护**：使用 `preview: true` 和 `preserveFocus: true`，确保预览过程不打开多余 Tab，且焦点始终留在搜索框内。

### 2.4 现场回滚机制 (State Rollback)
*   **无损撤销**：插件在搜索启动时记录原始的 `URI` 和 `Selection`。
*   **自动恢复**：若用户按下 `Esc` 或点击外部关闭搜索，编辑器将自动滚回初始坐标，解决“预览导致迷失方向”的痛点。

---

## 3. 功能逻辑详细分解

### 3.1 符号判定流程 (`isMethod`)
1.  调用 `vscode.executeDocumentSymbolProvider` 获取当前文件的符号树。
2.  执行**递归搜索**算法，查找包含当前光标 `Position` 的最小闭包符号。
3.  匹配 `SymbolKind` 白名单。

### 3.2 数据引擎工作流
1.  **并行检索**：
    *   `vscode.executeDefinitionProvider` -> 获取符号定义。
    *   `vscode.executeReferenceProvider` -> 获取所有引用。
2.  **数据过滤算法**：
    *   对比定义与引用的 `Location` (URI + Range)。
    *   **去重逻辑**：确保“引用列表”中不包含“定义点”本身（VS Code 默认 API 通常会返回定义点）。
3.  **UI 构建**：
    *   第一部分：展示定义位置（置顶）。
    *   第二部分：展示所有实际调用位置。

---

## 4. UI 交互交互规范
*   **QuickPick Placeholder**: 动态显示 `找到 X 处位置`。
*   **Item Label**: `$(icon) ${源码文本}`。
*   **Item Description**: `· ${相对路径}:${1-based行号}`。
*   **Item AlwaysShow**: 设置为 `true`，防止模糊搜索导致关键位置被过滤掉。

---

## 5. 技术约束与未来演进
*   **当前限制**：基于 QuickPick 的限制，无法实现跨行的代码预览（仅单行）。
*   **未来演进**：本项目后续将支持更接近 IDEA 风格的浮动面板（Floating Overlay/Webview），届时本方案将作为“轻量级模式”保留。
