# 📝 Markdown Previewer

A premium, full-featured Markdown editor with real-time preview, built with vanilla JavaScript. Experience fluid, interactive Markdown editing with a beautiful UI and powerful features.

![Markdown Previewer](https://img.shields.io/badge/markdown-editor-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 👑 N-Queens Problem Solver

**NEW!** Interactive visualization of the classic N-Queens problem using backtracking algorithm.

- **[Open N-Queens Solver](nqueens.html)** - Visual step-by-step solution
- Watch the algorithm work in real-time
- Adjustable board size (4x4 to 12x12)
- Step-by-step explanations
- Auto-play with adjustable speed
- See backtracking in action

## ✨ Features

### Core Functionality
- **Live Preview** - See your Markdown rendered in real-time as you type
- **GitHub-Flavored Markdown** - Full GFM support including tables, task lists, and strikethrough
- **Syntax Highlighting** - Beautiful code blocks with automatic language detection
- **Synchronized Scrolling** - Editor and preview scroll together seamlessly

### Editor Features
- **Undo/Redo** - Full history support with 50-level undo stack
- **Autosave** - Your work is automatically saved to local storage
- **File Import** - Load .md and .txt files directly
- **Export Options** - Save as Markdown (.md) or PDF

### UI/UX
- **Dual Themes** - Switch between light and dark mode
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile
- **Premium Animations** - Smooth transitions and delightful micro-interactions
- **Resizable Panels** - Adjust editor and preview widths to your preference
- **Keyboard Shortcuts** - Speed up your workflow with powerful shortcuts

### Performance
- **Debounced Rendering** - Optimized for large files without lag
- **Local Storage** - Instant load times with persistent content
- **Efficient Updates** - Smart re-rendering only when needed

## 🚀 Getting Started

### Quick Start

1. **Clone or download** this repository
2. **Open `index.html`** in your web browser
3. **Start typing** Markdown in the editor
4. **See the magic** happen in real-time!

No build process, no dependencies to install - just open and use!

### Browser Compatibility

Works in all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Import file |
| `Ctrl+S` | Export as Markdown |
| `Ctrl+P` | Export as PDF |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+B` | Bold text |
| `Ctrl+I` | Italic text |
| `Ctrl+T` | Toggle theme |
| `Ctrl+/` | Show keyboard shortcuts |

*Note: Use `Cmd` instead of `Ctrl` on macOS*

## 📚 Markdown Support

### Text Formatting
- **Bold**: `**text**` or `__text__`
- *Italic*: `*text*` or `_text_`
- ~~Strikethrough~~: `~~text~~`
- `Inline code`: `` `code` ``

### Headings
```markdown
# H1
## H2
### H3
#### H4
##### H5
###### H6
```

### Lists

**Unordered:**
```markdown
- Item 1
- Item 2
  - Nested item
```

**Ordered:**
```markdown
1. First
2. Second
3. Third
```

**Task Lists:**
```markdown
- [x] Completed task
- [ ] Incomplete task
```

### Code Blocks

````markdown
```javascript
function hello() {
    console.log("Hello, World!");
}
```
````

### Tables

```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

### Links & Images

```markdown
[Link text](https://example.com)
![Alt text](image-url.jpg)
```

### Blockquotes

```markdown
> This is a quote
>
> — Author
```

### Horizontal Rules

```markdown
---
```

## 🎨 Themes

The app includes two beautiful themes:

- **Light Theme** - Clean and professional
- **Dark Theme** - Easy on the eyes for extended sessions

Switch between themes using the theme toggle button or press `Ctrl+T`.

## 💾 Data Persistence

All your content is automatically saved to your browser's local storage:

- **Autosave** - Triggered 1 second after you stop typing
- **Persistent** - Content survives browser restarts
- **Privacy** - Everything stays on your device

## 📱 Responsive Design

The app adapts to your screen size:

- **Desktop** - Side-by-side editor and preview with resizable panels
- **Tablet** - Optimized layout with touch-friendly controls
- **Mobile** - Stacked layout with easy switching between editor and preview

## 🏗️ Architecture

Built with a modular, component-based approach:

```
MarkDownPreviewer/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling with CSS variables
├── app.js              # Application logic and state management
└── README.md           # Documentation
```

### Key Components

1. **State Management** - Centralized app state
2. **Event System** - Clean event delegation
3. **Storage Layer** - LocalStorage abstraction
4. **Render Engine** - Optimized Markdown parsing
5. **Theme System** - CSS variables for easy theming

## 🔧 Technologies Used

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript** - No framework dependencies
- **Marked.js** - Markdown parsing (v11.1.1)
- **Highlight.js** - Syntax highlighting (v11.9.0)
- **html2pdf.js** - PDF export functionality (v0.10.1)

## 🚀 Performance Optimizations

- **Debounced rendering** - Prevents excessive re-renders
- **Lazy syntax highlighting** - Only highlights visible code blocks
- **Efficient state management** - Minimal re-renders
- **Optimized selectors** - Fast DOM queries
- **CSS containment** - Improved paint performance

## 🎯 Use Cases

Perfect for:

- 📖 Writing documentation
- 📝 Taking notes
- 📄 Creating README files
- 📧 Drafting emails
- 📊 Creating reports
- 🎓 Educational content
- 💼 Technical writing

## 🔮 Future Enhancements

Potential features for future versions:

- [ ] LaTeX/Math support
- [ ] Diagram rendering (Mermaid)
- [ ] Collaborative editing
- [ ] Cloud sync
- [ ] Custom themes
- [ ] Plugin system
- [ ] Vim/Emacs keybindings
- [ ] Multiple document tabs
- [ ] Version history
- [ ] Spell checker

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- **Marked.js** - For excellent Markdown parsing
- **Highlight.js** - For beautiful syntax highlighting
- **html2pdf.js** - For PDF export functionality
- The open-source community for inspiration

## 📧 Support

If you encounter any issues or have questions:

1. Check the keyboard shortcuts (`Ctrl+/`)
2. Review this README
3. Open an issue on GitHub

---

**Made with ❤️ for the Markdown community**

Happy writing! 🚀
