// ===== STATE =====
let tasks = [];
let currentFilter = 'all';
let searchQuery = '';
let editingId = null;
let dragItem = null;

// ===== DOM REFS =====
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const emptyState = document.getElementById('emptyState');
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const productivityEl = document.getElementById('productivityScore');
const filterBtns = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const categorySelect = document.getElementById('categorySelect');
const dueDateInput = document.getElementById('dueDate');
const voiceBtn = document.getElementById('voiceBtn');
const taskCount = document.getElementById('taskCount');
const prioritySuggestion = document.getElementById('prioritySuggestion');

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    renderTasks();
    updateStats();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupDragAndDrop();
    // Set default date to today
    dueDateInput.value = new Date().toISOString().split('T')[0];
});

// ===== LOCAL STORAGE =====
function loadTasks() {
    const stored = localStorage.getItem('novatodo_tasks');
    if (stored) {
        tasks = JSON.parse(stored);
    }
}

function saveTasks() {
    localStorage.setItem('novatodo_tasks', JSON.stringify(tasks));
}

// ===== RENDER =====
function renderTasks() {
    const filtered = getFilteredTasks();
    
    if (filtered.length === 0) {
        taskList.innerHTML = '';
        emptyState.style.display = 'block';
        taskCount.textContent = '0 tasks';
        return;
    }
    emptyState.style.display = 'none';
    taskCount.textContent = `${filtered.length} task${filtered.length > 1 ? 's' : ''}`;
    
    taskList.innerHTML = filtered.map((task, index) => `
        <li class="task-item ${task.completed ? 'completed' : ''}" draggable="true" data-id="${task.id}" data-index="${index}">
            <div class="task-checkbox" data-id="${task.id}"></div>
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
                <span class="task-category">${getCategoryEmoji(task.category)} ${task.category}</span>
                <span class="task-priority priority-${task.priority}">${task.priority}</span>
                ${task.dueDate ? `<span class="task-due"><i class="far fa-calendar-alt"></i> ${formatDate(task.dueDate)}</span>` : ''}
                <button class="task-delete" data-id="${task.id}" aria-label="Delete task">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </li>
    `).join('');
    
    // Add event listeners
    document.querySelectorAll('.task-checkbox').forEach(el => {
        el.addEventListener('click', toggleTask);
    });
    document.querySelectorAll('.task-delete').forEach(el => {
        el.addEventListener('click', deleteTask);
    });
    // Re-attach drag events
    document.querySelectorAll('.task-item').forEach(el => {
        el.addEventListener('dragstart', dragStart);
        el.addEventListener('dragend', dragEnd);
        el.addEventListener('dragover', dragOver);
        el.addEventListener('drop', drop);
    });
}

function getFilteredTasks() {
    let filtered = tasks;
    
    // Filter
    if (currentFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }
    
    // Search
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(t => t.text.toLowerCase().includes(query));
    }
    
    return filtered;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const productivity = total === 0 ? 0 : Math.round((completed / total) * 100);
    
    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;
    productivityEl.textContent = `${productivity}%`;
}

// ===== CRUD OPERATIONS =====
function addTask() {
    const text = taskInput.value.trim();
    if (!text) {
        showToast('Please enter a task!');
        return;
    }
    
    const category = categorySelect.value;
    const dueDate = dueDateInput.value;
    const priority = detectPriority(text);
    
    const task = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        category: category,
        dueDate: dueDate || null,
        priority: priority,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(task);
    saveTasks();
    renderTasks();
    updateStats();
    taskInput.value = '';
    taskInput.focus();
    showToast(`🎯 Task added! Priority: ${priority}`);
    updatePrioritySuggestion('');
}

function toggleTask(e) {
    const id = e.currentTarget.dataset.id;
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        renderTasks();
        updateStats();
        showToast(task.completed ? '✅ Task completed!' : '↩️ Task reopened');
    }
}

function deleteTask(e) {
    const id = e.currentTarget.dataset.id;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();
    updateStats();
    showToast('🗑️ Task deleted');
}

// ===== AI PRIORITY DETECTION =====
function detectPriority(text) {
    const lower = text.toLowerCase();
    const highKeywords = ['urgent', 'asap', 'deadline', 'emergency', 'critical', 'important', 'must', 'immediate', 'today'];
    const mediumKeywords = ['soon', 'later', 'week', 'need', 'should', 'could'];
    
    if (highKeywords.some(k => lower.includes(k))) return 'high';
    if (mediumKeywords.some(k => lower.includes(k))) return 'medium';
    return 'low';
}

function updatePrioritySuggestion(text) {
    if (!text) {
        prioritySuggestion.innerHTML = `<i class="fas fa-lightbulb"></i><span>AI will suggest priority based on your task</span>`;
        return;
    }
    const priority = detectPriority(text);
    const emoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
    const label = priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low';
    prioritySuggestion.innerHTML = `
        <i class="fas fa-robot"></i>
        <span>AI suggests: <strong class="priority-${priority}">${emoji} ${label} priority</strong></span>
    `;
}

// ===== VOICE INPUT =====
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        taskInput.value = transcript;
        updatePrioritySuggestion(transcript);
        showToast('🎤 Voice captured!');
        voiceBtn.classList.remove('listening');
    };
    recognition.onerror = () => {
        voiceBtn.classList.remove('listening');
        showToast('❌ Voice recognition failed');
    };
    recognition.onend = () => {
        voiceBtn.classList.remove('listening');
    };
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Add task
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // Real-time priority suggestion
    taskInput.addEventListener('input', (e) => {
        updatePrioritySuggestion(e.target.value);
    });
    
    // Filter buttons
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTasks();
        });
    });
    
    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderTasks();
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Voice
    voiceBtn.addEventListener('click', () => {
        if (!recognition) {
            showToast('❌ Voice not supported in this browser');
            return;
        }
        if (voiceBtn.classList.contains('listening')) {
            recognition.stop();
            return;
        }
        voiceBtn.classList.add('listening');
        recognition.start();
        showToast('🎤 Listening...');
    });
    
    // Load theme preference
    const savedTheme = localStorage.getItem('novatodo_theme');
    if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    if (current === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('novatodo_theme', 'dark');
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('novatodo_theme', 'light');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// ===== KEYBOARD SHORTCUTS =====
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+Enter: Add task
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            addTask();
        }
        // Ctrl+Delete: Clear all completed
        if (e.ctrlKey && e.key === 'Delete') {
            e.preventDefault();
            if (confirm('Delete all completed tasks?')) {
                tasks = tasks.filter(t => !t.completed);
                saveTasks();
                renderTasks();
                updateStats();
                showToast('🧹 Cleared completed tasks');
            }
        }
        // Ctrl+F: Focus search
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
        }
        // Escape: Clear search
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchQuery = '';
            renderTasks();
            taskInput.focus();
        }
    });
}

// ===== DRAG & DROP =====
function setupDragAndDrop() {
    // Event listeners are added in renderTasks
}

function dragStart(e) {
    dragItem = e.currentTarget;
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.id);
}

function dragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
}

function dragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget;
    if (target !== dragItem && !target.classList.contains('dragging')) {
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
        target.classList.add('drag-over');
    }
}

function drop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('drag-over');
    
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedIndex = tasks.findIndex(t => t.id === draggedId);
    const targetIndex = tasks.findIndex(t => t.id === target.dataset.id);
    
    if (draggedIndex === -1 || targetIndex === -1 || draggedIndex === targetIndex) return;
    
    // Reorder
    const [removed] = tasks.splice(draggedIndex, 1);
    tasks.splice(targetIndex, 0, removed);
    saveTasks();
    renderTasks();
    showToast('📋 Task reordered');
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getCategoryEmoji(category) {
    const map = {
        'personal': '📝',
        'work': '💼',
        'shopping': '🛒',
        'health': '💪',
        'other': '📌'
    };
    return map[category] || '📌';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Add CSS for drag-over effect
const style = document.createElement('style');
style.textContent = `
    .task-item.drag-over {
        border: 2px dashed var(--accent);
        background: var(--bg-card-hover);
        transform: scale(1.02);
    }
    .task-item.dragging {
        opacity: 0.4;
        transform: scale(0.95);
    }
`;
document.head.appendChild(style);