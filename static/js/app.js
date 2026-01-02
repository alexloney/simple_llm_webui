// --- STATE MANAGEMENT ---
let chats = []; 
let currentChatId = null;
let abortController = null;
let activeMenuId = null; 
let draggedItemIndex = null;
// OPTIMISTIC INITIALIZATION: Assume online
let isBackendOnline = true; 

// --- MARKED JS CONFIGURATION (Code Copy + Syntax Highlight) ---
const renderer = {
    code(param0, param1) {
        let text = "";
        let lang = "";

        // Handle object vs string args (Marked.js versions)
        if (typeof param0 === 'object' && param0 !== null) {
            text = param0.text || "";
            lang = param0.lang || "";
        } else {
            text = param0 || "";
            lang = param1 || "";
        }

        const langMatch = (lang || '').match(/\S*/)[0];
        let highlightedContent = "";

        // 1. Try to highlight with highlight.js
        if (window.hljs) {
            try {
                if (langMatch && hljs.getLanguage(langMatch)) {
                    // Specific language
                    highlightedContent = hljs.highlight(text, { language: langMatch }).value;
                } else {
                    // Auto-detection
                    highlightedContent = hljs.highlightAuto(text).value;
                }
            } catch (e) {
                // Fallback to manual escape if hljs fails
                highlightedContent = manualEscape(text);
            }
        } else {
            highlightedContent = manualEscape(text);
        }

        return `
            <div class="code-wrapper">
                <button class="copy-btn" onclick="copyCode(this)">Copy</button>
                <pre><code class="hljs ${langMatch ? 'language-' + langMatch : ''}">${highlightedContent}</code></pre>
            </div>
        `;
    }
};

// Helper for manual escaping (fallback)
function manualEscape(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Apply custom renderer
marked.use({ renderer });

// --- DOM ELEMENTS ---
const pinnedListEl = document.getElementById('pinned-list');
const unpinnedListEl = document.getElementById('unpinned-list');
const pinnedHeaderEl = document.getElementById('pinned-header');
const separatorEl = document.getElementById('list-separator');

const chatContainerEl = document.getElementById('chat-history-container');
const userInput = document.getElementById('user-input');
const personaInput = document.getElementById('persona-input');
const tempInput = document.getElementById('temp-input'); 
const searchInput = document.getElementById('chat-search');

const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menu-btn');

const healthStatusEl = document.getElementById('health-status');
const statusTextEl = document.getElementById('status-text');

// --- INITIALIZATION ---
window.onload = () => {
    loadChats();
    const savedChatId = localStorage.getItem('local_ai_active_chat');
    
    if (chats.length === 0) {
        createNewChat();
    } else {
        const targetId = chats.find(c => c.id === savedChatId) ? savedChatId : chats[0].id;
        switchChat(targetId);
    }
    
    // Trigger immediately, then poll
    checkHealth();
    setInterval(checkHealth, 5000);
};

// --- HEALTH CHECK LOGIC ---
async function checkHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/health', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            setOnlineState(true);
        } else {
            setOnlineState(false);
        }
    } catch (error) {
        setOnlineState(false);
    }
}

function setOnlineState(online) {
    isBackendOnline = online;

    if (online) {
        healthStatusEl.className = 'status-online';
        statusTextEl.textContent = 'LM Studio Online';
        
        // Unlock input if we aren't currently generating
        if (stopBtn.style.display !== 'inline-block') {
            userInput.disabled = false;
            userInput.placeholder = "Type a message...";
            sendBtn.disabled = false;
        }
    } else {
        healthStatusEl.className = 'status-offline';
        statusTextEl.textContent = 'LM Studio Offline';
        
        // Only lock if we are truly offline
        userInput.disabled = true;
        userInput.placeholder = "Waiting for connection...";
        sendBtn.disabled = true;
    }
}

function loadChats() {
    const stored = localStorage.getItem('local_ai_chats');
    if (stored) chats = JSON.parse(stored);
}

function saveChats() {
    sortChats();
    localStorage.setItem('local_ai_chats', JSON.stringify(chats));
    renderChatList();
}

function sortChats() {
    chats.sort((a, b) => {
        if (a.pinned === b.pinned) return 0;
        return a.pinned ? -1 : 1;
    });
}

// --- SIDEBAR & CHAT MANAGEMENT ---
function createNewChat() {
    const newId = Date.now().toString();
    const newChat = {
        id: newId,
        title: "New Conversation",
        pinned: false,
        messages: [],
        persona: ""
    };
    chats.unshift(newChat);
    saveChats();
    switchChat(newId);
    searchInput.value = "";
    if (window.innerWidth <= 768) toggleSidebar(false);
}

// --- SEARCH FUNCTIONALITY ---
function handleSearch() {
    renderChatList();
}

// --- IMPORT / EXPORT FUNCTIONALITY ---
function toggleGlobalMenu(e) {
    e.stopPropagation();
    const menu = document.getElementById('global-menu');
    menu.classList.toggle('show');
    activeMenuId = 'global'; 
}

function exportData() {
    const dataStr = JSON.stringify(chats, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `local_ai_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function triggerImport() {
    document.getElementById('import-file').click();
}

function importData(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedChats = JSON.parse(e.target.result);
            if (Array.isArray(importedChats)) {
                if (confirm("This will overwrite your current chats. Continue?")) {
                    chats = importedChats;
                    saveChats();
                    switchChat(chats[0].id);
                    alert("Import successful!");
                }
            } else {
                alert("Invalid file format.");
            }
        } catch (err) {
            alert("Error parsing JSON file.");
        }
    };
    reader.readAsText(file);
    input.value = ''; 
}

// --- DRAG AND DROP ---
function handleDragStart(e, index) {
    draggedItemIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    document.querySelectorAll('.chat-tab').forEach(el => el.classList.remove('dragging'));

    if (draggedItemIndex === null || draggedItemIndex === targetIndex) return;

    if (chats[draggedItemIndex].pinned !== chats[targetIndex].pinned) return;

    const itemToMove = chats[draggedItemIndex];
    chats.splice(draggedItemIndex, 1); 
    chats.splice(targetIndex, 0, itemToMove); 

    saveChats(); 
    draggedItemIndex = null;
}

// --- INDIVIDUAL MENUS ---
function toggleMenu(e, id) {
    e.stopPropagation(); 
    if (activeMenuId && activeMenuId !== id && activeMenuId !== 'global') {
        document.getElementById(`menu-${activeMenuId}`).classList.remove('show');
    }
    // Close global menu if open
    document.getElementById('global-menu').classList.remove('show');

    const menu = document.getElementById(`menu-${id}`);
    const isHidden = !menu.classList.contains('show');
    if (isHidden) {
        menu.classList.add('show');
        activeMenuId = id;
    } else {
        menu.classList.remove('show');
        activeMenuId = null;
    }
}

function renameChat(e, id) {
    e.stopPropagation();
    const chat = chats.find(c => c.id === id);
    const newName = prompt("Rename chat to:", chat.title);
    if (newName && newName.trim() !== "") {
        chat.title = newName.trim();
        saveChats();
    }
    activeMenuId = null; 
}

function togglePin(e, id) {
    e.stopPropagation();
    const chat = chats.find(c => c.id === id);
    chat.pinned = !chat.pinned;
    saveChats();
    activeMenuId = null;
}

function deleteChat(e, id) {
    e.stopPropagation();
    if (!confirm("Delete this chat?")) return;
    chats = chats.filter(c => c.id !== id);
    saveChats();
    if (chats.length === 0) createNewChat();
    else if (currentChatId === id) switchChat(chats[0].id);
    activeMenuId = null;
}

function renderChatList() {
    pinnedListEl.innerHTML = '';
    unpinnedListEl.innerHTML = '';
    sortChats(); 

    // SEARCH FILTERING
    const query = searchInput.value.toLowerCase();
    const filteredChats = chats.filter(chat => {
        const titleMatch = chat.title.toLowerCase().includes(query);
        const msgMatch = chat.messages.some(m => m.content.toLowerCase().includes(query));
        return titleMatch || msgMatch;
    });

    let hasPinned = false;
    let hasUnpinned = false;

    filteredChats.forEach((chat, index) => {
        const li = document.createElement('li');
        li.className = `chat-tab ${chat.id === currentChatId ? 'active' : ''}`;
        li.onclick = () => switchChat(chat.id);
        
        li.draggable = true;
        
        if (query === "") {
            li.ondragstart = (e) => handleDragStart(e, chats.indexOf(chat));
            li.ondragover = (e) => handleDragOver(e);
            li.ondrop = (e) => handleDrop(e, chats.indexOf(chat));
        } else {
            li.style.cursor = 'pointer'; 
        }

        const pinIcon = chat.pinned ? '<span class="pinned-icon">📌</span>' : '';
        const pinText = chat.pinned ? 'Unpin Chat' : 'Pin Chat';

        li.innerHTML = `
            <div class="chat-title-wrapper">
                ${pinIcon}
                <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${chat.title}</span>
            </div>
            <button class="menu-btn" onclick="toggleMenu(event, '${chat.id}')">⋮</button>
            <div id="menu-${chat.id}" class="dropdown-menu">
                <div class="dropdown-item" onclick="renameChat(event, '${chat.id}')">Rename</div>
                <div class="dropdown-item" onclick="togglePin(event, '${chat.id}')">${pinText}</div>
                <div class="dropdown-item delete" onclick="deleteChat(event, '${chat.id}')">Delete</div>
            </div>
        `;
        
        if (chat.pinned) {
            pinnedListEl.appendChild(li);
            hasPinned = true;
        } else {
            unpinnedListEl.appendChild(li);
            hasUnpinned = true;
        }
    });

    if (hasPinned) {
        pinnedHeaderEl.classList.add('visible');
        separatorEl.classList.add('visible');
    } else {
        pinnedHeaderEl.classList.remove('visible');
        separatorEl.classList.remove('visible');
    }
}

function switchChat(id) {
    currentChatId = id;
    localStorage.setItem('local_ai_active_chat', id);
    const chat = chats.find(c => c.id === id);
    chatContainerEl.innerHTML = '';
    
    if (!chat || chat.messages.length === 0) {
        chatContainerEl.innerHTML = '<div style="text-align:center; margin-top:50px; color:#666;">Start chatting...</div>';
        personaInput.disabled = false;
    } else {
        chat.messages.forEach(msg => {
            let contentToRender;
            if (msg.role === 'user') contentToRender = escapeHtml(msg.content);
            else contentToRender = marked.parse(msg.content);
            appendMessageToDOM(contentToRender, msg.role);
        });
        personaInput.disabled = true;
    }
    personaInput.value = (chat && chat.persona) ? chat.persona : "";
    renderChatList();
    scrollToBottom();
    if (window.innerWidth <= 768) toggleSidebar(false);
}

// --- GLOBAL CLICK HANDLER ---
document.addEventListener('click', (e) => {
    // Close Global Menu
    const globalMenu = document.getElementById('global-menu');
    const globalBtn = document.querySelector(`button[onclick="toggleGlobalMenu(event)"]`);
    if (globalMenu && globalMenu.classList.contains('show') && !globalMenu.contains(e.target) && e.target !== globalBtn) {
        globalMenu.classList.remove('show');
    }

    // Close Individual Menus
    if (activeMenuId && activeMenuId !== 'global') {
        const menu = document.getElementById(`menu-${activeMenuId}`);
        const btn = document.querySelector(`button[onclick="toggleMenu(event, '${activeMenuId}')"]`);
        if (menu && !menu.contains(e.target) && e.target !== btn) {
            menu.classList.remove('show');
            activeMenuId = null;
        }
    }
    
    // Close Sidebar on Mobile
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) toggleSidebar(false);
    }
});

function toggleSidebar(forceState) {
    if (forceState !== undefined) {
        if (forceState) sidebar.classList.add('open');
        else sidebar.classList.remove('open');
    } else {
        sidebar.classList.toggle('open');
    }
}

// --- UTILS: CODE COPY ---
function copyCode(btn) {
    const wrapper = btn.parentElement;
    const codeBlock = wrapper.querySelector('code');
    const text = codeBlock.innerText; // Use innerText to get visual text

    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = originalText, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}


// --- INPUT ---
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') this.style.height = '24px';
});

userInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Rely on 'disabled' state
        if (!sendBtn.disabled) sendMessage();
    }
});

document.getElementById('input-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!sendBtn.disabled) sendMessage();
});

stopBtn.addEventListener('click', () => {
    if (abortController) {
        abortController.abort();
        abortController = null;
        endGenerationState();
        appendMessageToDOM("<i>Stopped by user.</i>", 'bot');
        saveHistory("assistant", "<i>Stopped by user.</i>");
    }
});

async function sendMessage() {
    const text = userInput.value.trim();
    const persona = personaInput.value;
    const tempVal = tempInput.value; 

    if (!text) return;

    const chat = chats.find(c => c.id === currentChatId);
    
    if (chat.messages.length === 0) {
        chat.title = text.substring(0, 30) + (text.length > 30 ? "..." : "");
        chat.persona = persona;
        personaInput.disabled = true; 
        renderChatList();
    }

    appendMessageToDOM(escapeHtml(text), 'user');
    saveHistory('user', text); 
    
    userInput.value = '';
    userInput.style.height = '24px';
    startGenerationState();

    const botMsgDiv = appendMessageToDOM('', 'bot');
    let fullBotResponse = "";

    const historyPayload = chat.messages.map(m => ({ role: m.role, content: m.content }));

    abortController = new AbortController();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: text, 
                persona: persona, 
                history: historyPayload,
                temperature: tempVal 
            }),
            signal: abortController.signal
        });

        if (!response.ok) throw new Error("Backend Error");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            fullBotResponse += chunk;
            botMsgDiv.innerHTML = marked.parse(fullBotResponse);
            scrollToBottom();
        }
        saveHistory('assistant', fullBotResponse);

    } catch (error) {
        if (error.name !== 'AbortError') {
            botMsgDiv.innerHTML = `<span style="color:red">Error: Could not connect to AI.</span>`;
            setOnlineState(false);
        }
    } finally {
        endGenerationState();
        abortController = null;
    }
}

function saveHistory(role, content) {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({ role, content });
        saveChats(); 
    }
}

function appendMessageToDOM(htmlContent, role) {
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.innerHTML = htmlContent;
    chatContainerEl.appendChild(div);
    scrollToBottom();
    return div;
}

function scrollToBottom() {
    chatContainerEl.scrollTop = chatContainerEl.scrollHeight;
}

function startGenerationState() {
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    userInput.disabled = true;
}

function endGenerationState() {
    sendBtn.style.display = 'inline-block';
    stopBtn.style.display = 'none';
    if (isBackendOnline) {
        userInput.disabled = false;
        userInput.focus();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}