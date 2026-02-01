# 📄 详设文档 (New) —— `idea-usage-toolkit` (QuickPick 模式)

## 一、功能特性列表 (Feature List)

### 1. 触发系统 (Trigger System)
- **Ctrl + 鼠标左键点击**: 在任何定义（方法、变量、常量等）上点按时，拦截跳转，弹出 QuickPick 列表。
- **Alt + F7**: 在任何位置按下，立即搜索并以 QuickPick 方式展示所有引用。
- **右键菜单**: 编辑器内 `Show Usages (IDEA Style)` 激活同一逻辑。

### 2. UI 展现 (UI/UX - QuickPick Style)
- **极致平铺 (Flat List)**: 拒绝树状折叠，所有引用在 QuickPick 中一键展示，支持模糊搜索内容和路径。
- **全符号对标**: 
    - **方法**: 展示调用处 (Calls)。
    - **常量/变量**: 展示读取与赋值 (Read/Write) 处。
- **带代码预览的列表项**:
    - **Label**: `$(icon) 源码行文本` (带语法语义的预览)。
    - **Description**: `相对路径:行号`。
    - **Detail**: `$(symbol-variable) 符号上下文`。

### 3. 跳转逻辑 (Navigation Logic)
- **0 结果**: 弹出“未找到引用”信息。
- **1 结果**: 极速跳转，不干扰 coding。
- **N 结果**: 展示 QuickPick 列表。
- **智能聚焦**: 列表中通过上下箭头快速预览，点击/回车立即定位。

---

## 二、详细技术实现

### 1. 数据驱动引擎
- 底层依然采用通用引用引擎 `vscode.executeReferenceProvider`。
- 设置 `{ includeDeclaration: false }` 以过滤定义干扰，确保只显示“使用”位置。

### 2. 交互拦截与分发
- **Alt+F7 覆盖**: 在 `package.json` 中配置 `-editor.action.referenceSearch.trigger` 以彻底屏蔽原生视图。
- **Ctrl+Click 接管**: 通过 `DefinitionProvider` 实现。返回当前位置阻止跳转，同时触发 `idea-usage-toolkit.showCallers` 命令。

### 3. UI 渲染模版 (QuickPickItem)
```typescript
{
  label: `$(link-external) ${lineText}`, // 源码片段
  description: `${relativePath}:${line}`, // 位置
  detail: `$(location) Usages of ${symbolName}` // 上下文
}
```
