// ===== Application State =====
const APP_STATE = {
    theme: localStorage.getItem('theme') || 'light',
    syncScroll: true,
    undoStack: [],
    redoStack: [],
    currentContent: '',
    autosaveTimeout: null,
    isResizing: false,
    isScrollingFromEditor: false,
    startX: 0,
    startWidth: 0
};

// ===== DOM Elements =====
const elements = {
    editor: document.getElementById('editor'),
    preview: document.getElementById('preview'),
    themeToggle: document.getElementById('themeToggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    importBtn: document.getElementById('importBtn'),
    fileInput: document.getElementById('fileInput'),
    exportMdBtn: document.getElementById('exportMdBtn'),
    exportPdfBtn: document.getElementById('exportPdfBtn'),
    undoBtn: document.getElementById('undoBtn'),
    redoBtn: document.getElementById('redoBtn'),
    saveStatus: document.getElementById('saveStatus'),
    shortcutsModal: document.getElementById('shortcutsModal'),
    resizeHandle: document.getElementById('resizeHandle'),
    editorContainer: document.querySelector('.editor-container'),
    previewContainer: document.querySelector('.preview-container')
};

// ===== Configure Marked.js =====
marked.setOptions({
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                console.error('Highlight error:', err);
            }
        }
        return hljs.highlightAuto(code).value;
    },
    breaks: true,
    gfm: true,
    headerIds: true,
    mangle: false,
    pedantic: false,
    sanitize: false,
    smartLists: true,
    smartypants: true,
    xhtml: false
});

// ===== Initialization =====
function init() {
    // Apply saved theme
    applyTheme(APP_STATE.theme);

    // Load saved content
    loadContent();

    // Initialize event listeners
    initEventListeners();

    // Initial render
    updatePreview();

    // Update button states
    updateUndoRedoButtons();

    console.log('Markdown Previewer initialized successfully');
}

// ===== Theme Management =====
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    APP_STATE.theme = theme;
    localStorage.setItem('theme', theme);

    const highlightLight = document.getElementById('highlight-light');
    const highlightDark = document.getElementById('highlight-dark');

    if (theme === 'dark') {
        elements.sunIcon.style.display = 'none';
        elements.moonIcon.style.display = 'block';
        highlightLight.disabled = true;
        highlightDark.disabled = false;
    } else {
        elements.sunIcon.style.display = 'block';
        elements.moonIcon.style.display = 'none';
        highlightLight.disabled = false;
        highlightDark.disabled = true;
    }
}

function toggleTheme() {
    const newTheme = APP_STATE.theme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}

// ===== Markdown Rendering =====
function updatePreview() {
    const markdown = elements.editor.value;
    try {
        // Save current scroll position
        const currentScrollTop = elements.preview.scrollTop;

        const html = marked.parse(markdown);
        elements.preview.innerHTML = html;

        // Re-apply syntax highlighting
        elements.preview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Handle checkboxes in task lists
        elements.preview.querySelectorAll('input[type="checkbox"]').forEach((checkbox, index) => {
            checkbox.disabled = true; // Make checkboxes read-only in preview
        });

        // Restore scroll position (only if not syncing from editor)
        if (!APP_STATE.isScrollingFromEditor) {
            elements.preview.scrollTop = currentScrollTop;
        }
    } catch (error) {
        console.error('Markdown parsing error:', error);
        elements.preview.innerHTML = `<p style="color: red;">Error parsing Markdown: ${error.message}</p>`;
    }
}

// ===== Debounced Preview Update =====
let updateTimeout;
function debouncedUpdatePreview() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updatePreview();
    }, 50);
}

// ===== Undo/Redo System =====
function saveState() {
    const content = elements.editor.value;

    // Don't save if content hasn't changed
    if (content === APP_STATE.currentContent) {
        return;
    }

    // Add current state to undo stack
    if (APP_STATE.currentContent !== '') {
        APP_STATE.undoStack.push(APP_STATE.currentContent);

        // Limit undo stack to 50 items
        if (APP_STATE.undoStack.length > 50) {
            APP_STATE.undoStack.shift();
        }
    }

    APP_STATE.currentContent = content;
    APP_STATE.redoStack = []; // Clear redo stack on new action

    updateUndoRedoButtons();
}

function undo() {
    if (APP_STATE.undoStack.length === 0) {
        return;
    }

    // Save current state to redo stack
    APP_STATE.redoStack.push(APP_STATE.currentContent);

    // Pop from undo stack
    const previousState = APP_STATE.undoStack.pop();
    APP_STATE.currentContent = previousState;

    // Update editor
    elements.editor.value = previousState;
    updatePreview();
    updateUndoRedoButtons();

    // Save to localStorage
    saveContent();
}

function redo() {
    if (APP_STATE.redoStack.length === 0) {
        return;
    }

    // Save current state to undo stack
    APP_STATE.undoStack.push(APP_STATE.currentContent);

    // Pop from redo stack
    const nextState = APP_STATE.redoStack.pop();
    APP_STATE.currentContent = nextState;

    // Update editor
    elements.editor.value = nextState;
    updatePreview();
    updateUndoRedoButtons();

    // Save to localStorage
    saveContent();
}

function updateUndoRedoButtons() {
    elements.undoBtn.disabled = APP_STATE.undoStack.length === 0;
    elements.redoBtn.disabled = APP_STATE.redoStack.length === 0;

    elements.undoBtn.style.opacity = APP_STATE.undoStack.length === 0 ? '0.5' : '1';
    elements.redoBtn.style.opacity = APP_STATE.redoStack.length === 0 ? '0.5' : '1';
}

// ===== Local Storage =====
function saveContent() {
    const content = elements.editor.value;
    localStorage.setItem('markdownContent', content);

    // Show save indicator
    elements.saveStatus.textContent = 'Autosaved';
    elements.saveStatus.classList.add('show');

    setTimeout(() => {
        elements.saveStatus.classList.remove('show');
    }, 2000);
}

function loadContent() {
    const savedContent = localStorage.getItem('markdownContent');

    if (savedContent) {
        elements.editor.value = savedContent;
        APP_STATE.currentContent = savedContent;
    } else {
        // Load default example content
        const defaultContent = `# Welcome to Markdown Previewer

Start typing your **Markdown** here and see the *live preview* instantly!

## Quick Examples

\`\`\`javascript
console.log("Hello, World!");
\`\`\`

- Use **Ctrl+T** to toggle theme
- Use **Ctrl+S** to export as .md
- Use **Ctrl+/** to see all shortcuts
`;
        elements.editor.value = defaultContent;
        APP_STATE.currentContent = defaultContent;
    }
}

function autosave() {
    // Clear existing timeout
    clearTimeout(APP_STATE.autosaveTimeout);

    // Set new timeout
    APP_STATE.autosaveTimeout = setTimeout(() => {
        saveContent();
    }, 1000);
}

// ===== File Operations =====
function importFile() {
    elements.fileInput.click();
}

function handleFileImport(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        const content = e.target.result;

        // Save current state before importing
        saveState();

        elements.editor.value = content;
        APP_STATE.currentContent = content;
        updatePreview();
        saveContent();

        // Reset file input
        elements.fileInput.value = '';
    };

    reader.onerror = function(e) {
        alert('Error reading file: ' + e.target.error);
    };

    reader.readAsText(file);
}

function exportMarkdown() {
    const content = elements.editor.value;
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

function exportPDF() {
    const previewClone = elements.preview.cloneNode(true);

    // Create a temporary container with proper styling
    const container = document.createElement('div');
    container.style.padding = '40px';
    container.style.backgroundColor = 'white';
    container.style.color = '#212529';
    container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.lineHeight = '1.6';
    container.appendChild(previewClone);

    // Configure PDF options
    const opt = {
        margin: 10,
        filename: `markdown-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF
    html2pdf().set(opt).from(container).save();
}

// ===== Scroll Synchronization =====
function syncScroll(source) {
    if (!APP_STATE.syncScroll) {
        return;
    }

    const target = source === elements.editor ? elements.preview : elements.editor;

    const sourceScrollPercent = source.scrollTop / (source.scrollHeight - source.clientHeight);
    const targetScrollTop = sourceScrollPercent * (target.scrollHeight - target.clientHeight);

    // Set flag to prevent preview from restoring its scroll position
    if (source === elements.editor) {
        APP_STATE.isScrollingFromEditor = true;
    }

    target.scrollTop = targetScrollTop;

    // Reset flag after scroll is applied
    setTimeout(() => {
        APP_STATE.isScrollingFromEditor = false;
    }, 100);
}

// ===== Panel Resizing =====
function initResize(e) {
    APP_STATE.isResizing = true;
    APP_STATE.startX = e.clientX;
    APP_STATE.startWidth = elements.editorContainer.offsetWidth;

    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);

    elements.resizeHandle.style.backgroundColor = 'var(--accent-color)';
}

function resize(e) {
    if (!APP_STATE.isResizing) {
        return;
    }

    const dx = e.clientX - APP_STATE.startX;
    const newWidth = APP_STATE.startWidth + dx;
    const containerWidth = elements.editorContainer.parentElement.offsetWidth;

    // Set minimum and maximum widths
    const minWidth = 200;
    const maxWidth = containerWidth - 200;

    if (newWidth >= minWidth && newWidth <= maxWidth) {
        const percentage = (newWidth / containerWidth) * 100;
        elements.editorContainer.style.flex = `0 0 ${percentage}%`;
        elements.previewContainer.style.flex = `1`;
    }
}

function stopResize() {
    APP_STATE.isResizing = false;
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    elements.resizeHandle.style.backgroundColor = '';
}

// ===== Keyboard Shortcuts =====
function handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + O: Import file
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        importFile();
    }

    // Ctrl/Cmd + S: Export Markdown
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        exportMarkdown();
    }

    // Ctrl/Cmd + P: Export PDF
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        exportPDF();
    }

    // Ctrl/Cmd + Z: Undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    }

    // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    }

    // Ctrl/Cmd + T: Toggle theme
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        toggleTheme();
    }

    // Ctrl/Cmd + /: Show shortcuts modal
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        toggleShortcutsModal();
    }

    // Ctrl/Cmd + B: Bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        wrapSelection('**', '**');
    }

    // Ctrl/Cmd + I: Italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        wrapSelection('*', '*');
    }
}

function wrapSelection(before, after) {
    const textarea = elements.editor;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    const newText = beforeText + before + selectedText + after + afterText;

    saveState();
    textarea.value = newText;

    // Set cursor position
    const newCursorPos = start + before.length + selectedText.length + after.length;
    textarea.setSelectionRange(newCursorPos, newCursorPos);

    updatePreview();
    autosave();
}

// ===== Shortcuts Modal =====
function toggleShortcutsModal() {
    elements.shortcutsModal.classList.toggle('show');
}

function closeShortcutsModal(e) {
    if (e.target === elements.shortcutsModal || e.target.classList.contains('modal-close')) {
        elements.shortcutsModal.classList.remove('show');
    }
}

// ===== Event Listeners =====
function initEventListeners() {
    // Editor events
    elements.editor.addEventListener('input', (e) => {
        debouncedUpdatePreview();
        autosave();

        // Don't save state on every keystroke (too expensive)
        // State is saved on specific actions like undo/redo/import
    });

    elements.editor.addEventListener('scroll', () => syncScroll(elements.editor));
    elements.preview.addEventListener('scroll', () => syncScroll(elements.preview));

    // Toolbar events
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.importBtn.addEventListener('click', importFile);
    elements.fileInput.addEventListener('change', handleFileImport);
    elements.exportMdBtn.addEventListener('click', exportMarkdown);
    elements.exportPdfBtn.addEventListener('click', exportPDF);
    elements.undoBtn.addEventListener('click', undo);
    elements.redoBtn.addEventListener('click', redo);

    // Resize handle
    elements.resizeHandle.addEventListener('mousedown', initResize);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Modal events
    elements.shortcutsModal.addEventListener('click', closeShortcutsModal);

    // Before unload - save state
    window.addEventListener('beforeunload', () => {
        saveContent();
    });

    // Save state periodically (every 30 seconds)
    setInterval(() => {
        if (elements.editor.value !== APP_STATE.currentContent) {
            saveState();
        }
    }, 30000);
}

// ===== Start Application =====
// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
