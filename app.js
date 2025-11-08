// Markdown File Previewer - JavaScript

// DOM Elements
const markdownInput = document.getElementById('markdown-input');
const previewContent = document.getElementById('preview-content');
const fileUpload = document.getElementById('file-upload');
const downloadBtn = document.getElementById('download-btn');
const clearBtn = document.getElementById('clear-btn');
const toggleTheme = document.getElementById('toggle-theme');
const copyHtmlBtn = document.getElementById('copy-html');
const wordCount = document.getElementById('word-count');

// Configure marked.js
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                console.error(err);
            }
        }
        return hljs.highlightAuto(code).value;
    }
});

// Local storage keys
const STORAGE_KEY = 'markdown-content';
const THEME_KEY = 'theme-preference';

// Initialize the app
function init() {
    // Load saved content from local storage
    const savedContent = localStorage.getItem(STORAGE_KEY);
    if (savedContent) {
        markdownInput.value = savedContent;
    }

    // Load theme preference
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
    }

    // Initial render
    updatePreview();
    updateWordCount();
}

// Update preview with markdown rendering
function updatePreview() {
    const markdownText = markdownInput.value;

    try {
        // Parse markdown to HTML
        const html = marked.parse(markdownText);
        previewContent.innerHTML = html;

        // Re-apply syntax highlighting to code blocks
        previewContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    } catch (error) {
        previewContent.innerHTML = `<div class="error">Error rendering markdown: ${error.message}</div>`;
    }
}

// Update word count
function updateWordCount() {
    const text = markdownInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    wordCount.textContent = `${words} words, ${chars} chars`;
}

// Auto-save to local storage
function autoSave() {
    localStorage.setItem(STORAGE_KEY, markdownInput.value);
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        markdownInput.value = e.target.result;
        updatePreview();
        updateWordCount();
        autoSave();
    };
    reader.readAsText(file);

    // Reset file input
    event.target.value = '';
}

// Download markdown file
function downloadMarkdown() {
    const content = markdownInput.value;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `markdown-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Clear content
function clearContent() {
    if (confirm('Are you sure you want to clear all content?')) {
        markdownInput.value = '';
        updatePreview();
        updateWordCount();
        localStorage.removeItem(STORAGE_KEY);
    }
}

// Toggle theme
function toggleThemeMode() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
}

// Copy HTML to clipboard
function copyHTML() {
    const html = previewContent.innerHTML;
    navigator.clipboard.writeText(html).then(() => {
        // Visual feedback
        const originalText = copyHtmlBtn.textContent;
        copyHtmlBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyHtmlBtn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy HTML: ' + err.message);
    });
}

// Event Listeners
markdownInput.addEventListener('input', () => {
    updatePreview();
    updateWordCount();
    autoSave();
});

fileUpload.addEventListener('change', handleFileUpload);
downloadBtn.addEventListener('click', downloadMarkdown);
clearBtn.addEventListener('click', clearContent);
toggleTheme.addEventListener('click', toggleThemeMode);
copyHtmlBtn.addEventListener('click', copyHTML);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + S to download
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        downloadMarkdown();
    }

    // Ctrl/Cmd + K to clear
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        clearContent();
    }
});

// Tab key handling in textarea
markdownInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = markdownInput.selectionStart;
        const end = markdownInput.selectionEnd;

        // Insert tab character
        markdownInput.value = markdownInput.value.substring(0, start) + '    ' + markdownInput.value.substring(end);

        // Put cursor after the tab
        markdownInput.selectionStart = markdownInput.selectionEnd = start + 4;

        updatePreview();
        updateWordCount();
    }
});

// Initialize on page load
init();
