# 📖 IDEA Usage Toolkit User Guide

`IDEA Usage Toolkit` brings the classic "Show Usages" experience from IntelliJ IDEA to VS Code. With a minimalist QuickPick interface, it allows you to rapidly preview and navigate to any call site of a method, class, or symbol without ever switching to the sidebar.

---

## 1. Quick Start

### How to Trigger
*   **Keyboard Shortcut**: Place your cursor on a method or class name and press `Alt + X` (Windows/Linux).
*   **Mouse Interaction (Experimental)**: `Ctrl + Click` on a symbol name.
*   **Context Menu**: Right-click in the editor and select `Show Usages (IDEA Style)`.

---

## 2. Key Features

![Show Usages Mockup](images/quickpick_usage_mockup.png)
*Figure 1: Flattened usage search interface in QuickPick style.*

### 2.1 Flattened List
Unlike VS Code's traditional "group-by-file" tree structure, we use a **fully flattened layout**:
*   **Direct Code Preview**: Each line shows the actual source code snippet of the usage.
*   **Instant Semantic Filtering**: With distinct icons, you can scan through dozens of results and find the logic you need in a glance.

### 2.2 Live Sync Preview
One of the most powerful features of this extension:
1.  Once the search box pops up, use **Arrow Keys (↑/↓)** to cycle through options.
2.  The editor in the background will **jump and highlight** the location in real-time.
3.  **Zero-Cluster Navigation**: No temporary tabs are accumulated at the top of your editor during the preview process.

### 2.3 Context Safety & Rollback
*   **Confirm Jump**: Press `Enter` to finalize the navigation.
*   **Smart Rollback**: Press `Esc` or click outside the search box, and the editor will **instantly scroll back to your original position** where you started the search. This is perfect for the "quick peek and back" workflow.

---

## 3. Frequently Asked Questions (FAQ)

*   **Q: Why does the shortcut sometimes not work?**
    *   The extension is optimized for "Callable Symbols" (Methods, Classes, Interfaces). For plain variables, it automatically falls back to VS Code's native reference view to ensure compatibility.
*   **Q: Does it support Java / TS / Python?**
    *   Yes! As long as you have the respective language extension installed (e.g., Language Support for Java), this toolkit leverages that data to provide the search results.

---

## 4. Pro-Tips
For the best experience, the plugin already overrides the default `Alt + X` behavior. No manual configuration is required unless you wish to bind it to a different key.

The "Show Usages" experience is designed to be as non-intrusive as possible, keeping your focus on the code.
