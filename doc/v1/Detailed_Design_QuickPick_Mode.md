# 📄 Detailed Design: QuickPick Interaction Mode (Current Implementation)

## 1. Positioning & Goals
This document specifies the Phase 1 implementation (QuickPick Mode) of the `IDEA Usage Toolkit`.
**Main Objective**: To replicate the core mental model of IntelliJ IDEA's `Show Usages` while maintaining the low performance overhead of VS Code's native components.

## 2. Current Core Features

### 2.1 Context-Aware Interception
*   **Selective Takeover**: The extension does not intercept every reference search. It uses the `isMethod` algorithm to determine the cursor position:
    *   **Target Symbols**: Active only when the symbol is a `Method`, `Function`, `Constructor`, `Class`, or `Interface`.
    *   **Automatic Fallback**: If the cursor is on a variable or unsupported symbol, it manually triggers `editor.action.referenceSearch.trigger` to show VS Code's native Peek view.
*   **Keybinding Overriding**: By using `-editor.action.referenceSearch.trigger` in `package.json`, we resolve conflicts with VS Code's default keybindings.

### 2.2 True Flattened Search UI
*   **Hierarchy Elimination**: Completely abandons the "group by file" tree structure used by VS Code.
*   **Source-Level Labels**: Each item in the QuickPick shows the **actual trimmed source code line** as its primary label.
*   **Semantic Iconography**:
    *   `$(symbol-method)` for definitions/declarations.
    *   `$(code)` for calls and usages.

### 2.3 Synchronized Live Preview
*   **Instant Sync**: As users navigate the QuickPick list using arrow keys, the background editor scrolls to the relevant location in real-time.
*   **Preview Mode Safety**: Leverages `preview: true` and `preserveFocus: true` to ensure that no permanent tabs are opened during navigation and focus remains within the search box.

### 2.4 State Rollback Mechanism
*   **Lossless Cancelation**: The extension records the initial `URI` and `Selection` at the start of the search.
*   **Auto-Restoration**: If the user cancels (e.g., via `Esc`), the editor automatically scrolls back to the original coordinates, solving the "preview disorientation" problem.

---

## 3. Detailed Functional Logic

### 3.1 Symbol Detection (`isMethod`)
1.  Calls `vscode.executeDocumentSymbolProvider` to get the symbol tree.
2.  Performs a **recursive search** to find the narrowest symbol range containing the current cursor `Position`.
3.  Matches against a whitelist of `SymbolKind` values.

### 3.2 Data Engine Workflow
1.  **Concurrent Retrieval**:
    *   `vscode.executeDefinitionProvider` -> Locate symbol declaration.
    *   `vscode.executeReferenceProvider` -> Fetch all usages.
2.  **Filtering Logic**:
    *   Compares `Location` (URI + Range) of definitions vs. references.
    *   **Deduplication**: Ensures the definition point itself is excluded from the "Usages" list (standard VS Code APIs often include it).
3.  **UI Construction**:
    *   Header: Displays definition position (pinned to top).
    *   Body: Displays all actual usage/call sites.

---

## 4. UI/UX Specifications
*   **Placeholder**: Dynamically displays `Found X results`.
*   **Item Label**: `$(icon) ${SourceText}`.
*   **Item Description**: `· ${RelativePath}:${1-based LineNumber}`.
*   **Item AlwaysShow**: Set to `true` to prevent fuzzy searching from hiding critical context.

---

## 5. Constraints & Future Roadmap
*   **Current Limitation**: QuickPick constraints limit code previews to single-line snippets.
*   **Roadmap**: This implementation will be retained as a "Lite Mode" once we introduce the more advanced IDEA-style floating panels (Webview/Overlay).
