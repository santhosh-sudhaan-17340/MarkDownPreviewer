# Markdown File Previewer

A modern, feature-rich markdown file previewer with live editing and real-time preview.

## Features

- **Live Preview**: See your markdown rendered in real-time as you type
- **Syntax Highlighting**: Code blocks are automatically highlighted
- **File Management**: Upload `.md` files and download your work
- **Auto-save**: Content is automatically saved to local storage
- **Dark/Light Theme**: Toggle between light and dark modes
- **Copy HTML**: Copy the rendered HTML to your clipboard
- **Word Count**: Track words and characters as you write
- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + S` - Download markdown file
  - `Ctrl/Cmd + K` - Clear content
  - `Tab` - Insert 4 spaces in editor
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Usage

1. Open `index.html` in your web browser
2. Start typing markdown in the left panel
3. See the live preview in the right panel

### Uploading Files

Click the "📁 Upload .md" button to load an existing markdown file.

### Downloading Files

Click the "💾 Download" button to save your markdown content as a `.md` file.

### Theme Toggle

Click the "🌓 Theme" button to switch between light and dark modes.

### Clearing Content

Click the "🗑️ Clear" button to remove all content (with confirmation).

## Technologies Used

- **HTML5**: Structure
- **CSS3**: Styling with CSS custom properties for theming
- **JavaScript (ES6+)**: Functionality
- **[marked.js](https://marked.js.org/)**: Markdown parsing
- **[highlight.js](https://highlightjs.org/)**: Syntax highlighting

## File Structure

```
MarkDownPreviewer/
├── index.html      # Main HTML file
├── app.js          # JavaScript functionality
├── style.css       # Styles and theming
└── README.md       # This file
```

## Browser Support

Works on all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

## License

MIT License - Feel free to use and modify!
