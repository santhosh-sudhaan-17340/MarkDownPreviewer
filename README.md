# Markdown Previewer

A simple, clean, and responsive Markdown preview web app with a split layout. Type or paste Markdown on the left side and see a live formatted preview on the right side.

## Features

- **Live Preview**: Instant rendering as you type
- **Split Layout**: Clean interface with input on the left and preview on the right
- **Dark Mode**: Toggle between light and dark themes
- **Copy HTML**: Export the rendered HTML to clipboard
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **GitHub Flavored Markdown**: Full support for GFM syntax
- **No Build Required**: Pure HTML/CSS/JS - works instantly

## Demo

Visit the live demo: [https://santhosh-sudhaan-17340.github.io/MarkDownPreviewer/](https://santhosh-sudhaan-17340.github.io/MarkDownPreviewer/)

## Technologies Used

- **HTML5**: Structure
- **Tailwind CSS**: Styling (via CDN)
- **JavaScript**: Functionality
- **marked.js**: Markdown parsing

## Getting Started

### Local Development

Simply open `index.html` in your web browser:

```bash
# Clone the repository
git clone https://github.com/santhosh-sudhaan-17340/MarkDownPreviewer.git

# Navigate to the directory
cd MarkDownPreviewer

# Open in browser
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

Or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server

# Then visit http://localhost:8000
```

### Deployment on GitHub Pages

This project is configured for GitHub Pages deployment:

1. Go to repository Settings
2. Navigate to Pages section
3. Select "Deploy from a branch"
4. Choose `main` branch and `/` (root) folder
5. Save and wait for deployment

## Usage

1. **Type Markdown**: Enter or paste your Markdown text in the left panel
2. **View Preview**: See the formatted output in real-time on the right panel
3. **Toggle Dark Mode**: Click the moon/sun icon to switch themes
4. **Copy HTML**: Click "Copy HTML" to copy the rendered HTML to clipboard

## Supported Markdown Syntax

- Headers (H1-H6)
- Bold and italic text
- Links and images
- Ordered and unordered lists
- Code blocks with syntax highlighting
- Inline code
- Blockquotes
- Tables
- Horizontal rules
- And more!

## Browser Support

Works on all modern browsers:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## Author

Created as a simple and elegant Markdown preview tool.
