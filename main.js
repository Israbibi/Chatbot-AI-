const HUGGINGFACE_API_KEY = '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';
const GROQ_API_KEY = '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';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';

let chatHistory = [];
let isTyping = false;
let currentAPI = 'groq'; 
function loadChatHistory() {
    const saved = localStorage.getItem('ChatIB-chat-history');
    if (saved) {
        chatHistory = JSON.parse(saved);
        displayChatHistory();
    }
}
function saveChatHistory() {
    localStorage.setItem('ChatIB-chat-history', JSON.stringify(chatHistory));
}
function loadTheme() {
    const savedTheme = localStorage.getItem('nexus-theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
}
function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('nexus-theme', newTheme);
}
function displayChatHistory() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = '';
    
    if (chatHistory.length === 0) {
        container.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to ChatIB AI</h2>
                <p>Your AI assistant is online. What would you like to do today?</p>
            </div>
        `;
        return;
    }
    
    chatHistory.forEach(message => {
        addMessageToChat(message.content, message.sender, message.timestamp, false);
    });
    
    scrollToBottom();
}

function addMessageToChat(content, sender, timestamp = null, save = true) {
    const container = document.getElementById('chatContainer');
    const welcomeMsg = container.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = timestamp || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content">${content}</div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    scrollToBottom();
    
    if (save) {
        chatHistory.push({
            content: content,
            sender: sender,
            timestamp: time
        });
        saveChatHistory();
    }
}

function showTypingIndicator() {
    const container = document.getElementById('chatContainer');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot';
    typingDiv.id = 'typing-indicator';
    
    typingDiv.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span class="typing-text">ChatIB is thinking...</span>
        </div>
    `;   
    container.appendChild(typingDiv);
    scrollToBottom();
}
function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}
function scrollToBottom() {
    const container = document.getElementById('chatContainer');
    container.scrollTop = container.scrollHeight;
}
async function getGroqResponse(message) {
    try {
        updateAPIStatus('⚡ Thinking...', false);
        
        // Build conversation context
        const conversationHistory = chatHistory
            .slice(-4)
            .map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.content
            }));
        
        conversationHistory.push({
            role: 'user',
            content: message
        });
        
        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [
                    {
                        role: "system",
                        content: "You're ChatIB, a friendly and helpful AI assistant. Keep responses natural, conversational, and to-the-point. Be warm but concise - aim for 1-3 sentences unless more detail is needed."
                    },
                    ...conversationHistory
                ],
                temperature: 0.7,
                max_tokens: 200,
                top_p: 0.9
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.log("Groq API Error, trying Hugging Face...", data.error);
            throw new Error('Groq API failed');
        }
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            updateAPIStatus('✅ Groq Ready', true);
            currentAPI = 'groq';
            return data.choices[0].message.content.trim();
        } else {
            throw new Error('Invalid Groq response');
        }
    } catch (error) {
        console.error("Groq API Error:", error);
        return await getHuggingFaceResponse(message);
    }
}
async function getHuggingFaceResponse(message) {
    try {
        updateAPIStatus('🤗 Thinking...', false);
        let conversationText = '';
        const recentHistory = chatHistory.slice(-3);
        
        recentHistory.forEach(msg => {
            if (msg.sender === 'user') {
                conversationText += `Human: ${msg.content}\n`;
            } else {
                conversationText += `Assistant: ${msg.content}\n`;
            }
        });
         conversationText += `Human: ${message}\nAssistant:`;
        
        const response = await fetch(HUGGINGFACE_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`
            },
            body: JSON.stringify({
                inputs: conversationText,
                parameters: {
                    max_length: 150,
                    temperature: 0.7,
                    do_sample: true,
                    pad_token_id: 50256
                },
                options: {
                    wait_for_model: true
                }
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            console.log("Hugging Face API Error, using local response...", data.error);
            updateAPIStatus('🤖 Local Mode', false);
            currentAPI = 'local';
            return getSmartLocalResponse(message);
        }
        
        if (data[0] && data[0].generated_text) {
            updateAPIStatus('✅ HuggingFace Ready', true);
            currentAPI = 'huggingface';
            const fullText = data[0].generated_text;
            const assistantResponse = fullText.split('Assistant:').pop().split('Human:')[0].trim();
            
            return assistantResponse || getSmartLocalResponse(message);
        } else {
            updateAPIStatus('🤖 Local Mode', false);
            currentAPI = 'local';
            return getSmartLocalResponse(message);
        }
        
    } catch (error) {
        console.error("Hugging Face API Error:", error);
        updateAPIStatus('🤖 Local Mode', false);
        currentAPI = 'local';
        return getSmartLocalResponse(message);
    }
}
async function getAIResponse(message) {
    return await getGroqResponse(message);
}

function getSmartLocalResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.match(/^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))/)) {
        return "Hey there! 👋 I'm ChatIB, your friendly AI companion. What's on your mind today?";
    }
    if (lowerMessage.includes('how are you') || lowerMessage.includes('how do you feel')) {
        return "I'm doing great, thanks for asking! 😊 Ready to help with whatever you need.";
    }
    if (lowerMessage.includes('name') || lowerMessage.includes('who are you')) {
        return "I'm ChatIB - your helpful AI assistant! Think of me as your digital friend who's here to chat, help, and learn with you.";
    }
    if (lowerMessage.includes('help') || lowerMessage.includes('assist')) {
        return "I'd love to help! I can assist with questions, brainstorming, explanations, coding, creative writing, and more. What do you need?";
    }
    if (lowerMessage.includes('joke') || lowerMessage.includes('funny')) {
        const jokes = [
            "Why did the AI go to therapy? It had too many deep learning issues! 😄",
            "What's an AI's favorite snack? Microchips! 🍿",
            "I told my programmer friend a joke about UDP... but I'm not sure if they got it! 😂",
            "Why don't robots ever panic? They have great solid-state drives! 🤖"
        ];
        return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
        return "Take care! 👋 I'll be here whenever you want to chat again.";
    }

    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
        return "You're very welcome! 😊 Happy to help anytime.";
    }
    return `Got it! Let me think about "${message.length > 30 ? message.substring(0, 30) + '...' : message}". Could you give me a bit more context so I can help you better?`;
} function updateAPIStatus(status, isConnected) {
    const statusElement = document.getElementById('apiStatus');
    const dotElement = document.querySelector('.api-dot');
    
    if (statusElement) {
        statusElement.textContent = status;
    }
    
    if (dotElement) {
        dotElement.style.background = isConnected ? '#00ff88' : '#ff6b6b';
    }
}

async function sendMessage() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const message = input.value.trim();
    
    if (!message || isTyping) return;
    if (message.length > 2000) {
        alert('Message too long! Please keep it under 2000 characters.');
        return;
    }
    addMessageToChat(message, 'user');
    input.value = '';
    updateCharCounter();
    isTyping = true;
    sendBtn.disabled = true;
    input.disabled = true;
    showTypingIndicator();
    
    try {
        await new Promise(resolve => setTimeout(resolve, 600));
        
        const response = await getAIResponse(message);
        hideTypingIndicator();
        
        if (response) {
            await typeMessage(response);
        } else {
            addMessageToChat("Sorry, I'm having trouble right now. Could you try again?", 'bot');
        }
        
    } catch (error) {
        console.error('Send message error:', error);
        hideTypingIndicator();
        addMessageToChat("Oops! Something went wrong. Let's try that again! 😊", 'bot');
    } finally {
        isTyping = false;
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
    }
}

async function typeMessage(text) {
    const container = document.getElementById('chatContainer');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot';
    
    const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <div class="message-content"></div>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    container.appendChild(messageDiv);
    const contentDiv = messageDiv.querySelector('.message-content');
    for (let i = 0; i < text.length; i++) {
        contentDiv.textContent += text[i];
        scrollToBottom();
        // Faster typing: 15ms for better mobile experience
        await new Promise(resolve => setTimeout(resolve, 15));
    }
    chatHistory.push({
        content: text,
        sender: 'bot',
        timestamp: time
    });
    saveChatHistory();
}

function clearChat() {
    if (confirm('Clear chat history?')) {
        chatHistory = [];
        localStorage.removeItem('ChatIB-chat-history');
        displayChatHistory();
    }
}

function exportChat() {
    if (chatHistory.length === 0) {
        alert('No chat history to export!');
        return;
    }
    
    let exportText = 'ChatIB AI Chat Export\n';
    exportText += '========================\n\n';
    
    chatHistory.forEach(message => {
        const sender = message.sender === 'user' ? 'YOU' : 'ChatIB';
        exportText += `[${message.timestamp}] ${sender}: ${message.content}\n\n`;
    });
    
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chatib-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
function updateCharCounter() {
    const input = document.getElementById('messageInput');
    const counter = document.getElementById('charCount');
    if (counter && input) {
        counter.textContent = input.value.length;
        
        // Change color based on character count
        if (input.value.length > 1800) {
            counter.style.color = '#ff6b6b';
        } else if (input.value.length > 1500) {
            counter.style.color = '#ffa500';
        } else {
            counter.style.color = 'var(--text-secondary)';
        }
    }
}


document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

document.getElementById('messageInput').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, this.matches('@media (max-width: 768px)') ? 80 : 100) + 'px';
    updateCharCounter();
});

async function testAPIConnections() {
    try {
        updateAPIStatus('Testing APIs...', false);
        const groqTest = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama3-8b-8192",
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 5
            })
        });
        
        if (groqTest.ok) {
            updateAPIStatus('✅ Groq Ready', true);
            currentAPI = 'groq';
            return;
        }
        const hfTest = await fetch(HUGGINGFACE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: "Hello",
                parameters: { max_length: 10 }
            })
        });
        
        if (hfTest.ok) {
            updateAPIStatus('✅ HuggingFace Ready', true);
            currentAPI = 'huggingface';
        } else {
            updateAPIStatus('🤖 Local Mode', false);
            currentAPI = 'local';
        }
        
    } catch (error) {
        updateAPIStatus('🤖 Local Mode', false);
        currentAPI = 'local';
        console.error('API Test Error:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadTheme();
    loadChatHistory();  
    updateCharCounter();
setTimeout(testAPIConnections, 1000);
    document.getElementById('messageInput').focus();
});
if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
    document.getElementById('messageInput').addEventListener('focus', function() {
        this.style.fontSize = '16px';
    });
}

function speakText(text) {
    if (!text.trim()) return;
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1;
    synth.speak(utterance);
}
