// ===== The Silent Listener - Main JavaScript =====
// Version: 1.0.0
// Last Updated: December 2024

// ===== কনফিগারেশন =====
const CONFIG = {
    // Google Apps Script URL (আপনার একটুয়াল URL দিয়ে পরিবর্তন করুন)
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyPzg1wg9SQGyQdjc0CZIH65MtbCxg5REwkTImSV41c1unOk7ZNYWtfYysMWVLyqUXa/exec",
    
    // App Settings
    APP_NAME: "The Silent Listener",
    VERSION: "1.0.0",
    AUTO_SAVE_INTERVAL: 10000, // 10 seconds
    MAX_SESSION_HISTORY: 50,
    
    // Notification Settings
    NOTIFICATION_DURATION: 5000, // 5 seconds
    NOTIFICATION_TYPES: {
        INFO: 'info',
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning'
    },
    
    // Theme Settings
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    },
    
    // Sound Settings
    SOUNDS: {
        RAIN: 'rain',
        WAVES: 'waves',
        FOREST: 'forest'
    },
    
    // Privacy Levels
    PRIVACY: {
        PRIVATE: 'private',
        ANONYMOUS: 'anonymous',
        NAMED: 'named',
        PUBLIC: 'public'
    }
};

// ===== গ্লোবাল স্টেট ম্যানেজমেন্ট =====
class AppState {
    constructor() {
        this.currentPage = 'home';
        this.userProfile = {
            name: localStorage.getItem('userName') || '',
            theme: localStorage.getItem('theme') || CONFIG.THEMES.LIGHT,
            mood: localStorage.getItem('daily_mood') || null,
            moodDate: localStorage.getItem('mood_date') || null,
            sessionHistory: JSON.parse(localStorage.getItem('sessionHistory')) || [],
            lastVisit: localStorage.getItem('lastVisit') || null,
            reviewCount: parseInt(localStorage.getItem('reviewCount')) || 0,
            shareCount: parseInt(localStorage.getItem('shareCount')) || 0
        };
        
        this.writingStartTime = null;
        this.wordCountInterval = null;
        this.activeSound = null;
        this.breathingInterval = null;
        this.breathingPhase = 'in'; // 'in', 'hold', 'out'
        this.breathingTime = 0;
    }
    
    saveToLocalStorage() {
        localStorage.setItem('userName', this.userProfile.name);
        localStorage.setItem('theme', this.userProfile.theme);
        localStorage.setItem('daily_mood', this.userProfile.mood);
        localStorage.setItem('mood_date', this.userProfile.moodDate);
        localStorage.setItem('sessionHistory', JSON.stringify(this.userProfile.sessionHistory));
        localStorage.setItem('lastVisit', this.userProfile.lastVisit);
        localStorage.setItem('reviewCount', this.userProfile.reviewCount);
        localStorage.setItem('shareCount', this.userProfile.shareCount);
    }
    
    addToHistory(pageId, action = 'view') {
        this.userProfile.sessionHistory.push({
            page: pageId,
            action: action,
            timestamp: new Date().toISOString()
        });
        
        if (this.userProfile.sessionHistory.length > CONFIG.MAX_SESSION_HISTORY) {
            this.userProfile.sessionHistory.shift();
        }
        
        this.saveToLocalStorage();
    }
    
    incrementReviewCount() {
        this.userProfile.reviewCount++;
        this.saveToLocalStorage();
    }
    
    incrementShareCount() {
        this.userProfile.shareCount++;
        this.saveToLocalStorage();
    }
    
    getMoodEmoji(mood) {
        const moodEmojis = {
            'happy': '😊',
            'neutral': '😐',
            'sad': '😔',
            'anxious': '😰'
        };
        return moodEmojis[mood] || '😐';
    }
}

// ===== ডিওএম ম্যানেজমেন্ট =====
class DOMManager {
    constructor() {
        this.elements = {
            // Core Elements
            notification: document.getElementById('notification'),
            loadingOverlay: document.getElementById('loading-overlay'),
            themeToggle: document.querySelector('.theme-toggle'),
            mobileThemeToggle: document.querySelector('.mobile-menu .theme-toggle'),
            menuToggle: document.querySelector('.menu-toggle'),
            mobileMenu: document.querySelector('.mobile-menu'),
            
            // Form Elements
            sessionForm: document.getElementById('session-form'),
            contactMethod: document.getElementById('contact-method'),
            telegramField: document.getElementById('telegram-field'),
            emailField: document.getElementById('email-field'),
            
            // Writing Elements
            freeWriting: document.getElementById('free-writing'),
            shareText: document.getElementById('share-text'),
            reviewText: document.getElementById('review-text'),
            reviewerName: document.getElementById('reviewer-name'),
            
            // Buttons
            startBreathing: document.getElementById('start-breathing'),
            clearWriting: document.getElementById('clear-writing'),
            saveWriting: document.getElementById('save-writing'),
            submitWriting: document.getElementById('submit-writing'),
            clearShare: document.getElementById('clear-share'),
            saveShare: document.getElementById('save-share'),
            submitShare: document.getElementById('submit-share'),
            submitReview: document.getElementById('submit-review'),
            
            // Stats Elements
            wordCountEl: document.getElementById('word-count'),
            charCountEl: document.getElementById('char-count'),
            timeCountEl: document.getElementById('time-count'),
            shareWordCount: document.getElementById('share-word-count'),
            shareCharCount: document.getElementById('share-char-count'),
            shareTimeCount: document.getElementById('share-time-count'),
            charCount: document.querySelector('.char-count')
        };
    }
    
    showNotification(message, type = CONFIG.NOTIFICATION_TYPES.INFO) {
        const notification = this.elements.notification;
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, CONFIG.NOTIFICATION_DURATION);
    }
    
    showLoading() {
        this.elements.loadingOverlay.classList.add('active');
    }
    
    hideLoading() {
        this.elements.loadingOverlay.classList.remove('active');
    }
    
    updateWritingStats(text, type = 'free') {
        if (!text) {
            const words = 0;
            const chars = 0;
            
            if (type === 'free') {
                this.elements.wordCountEl.textContent = 'শব্দ: ০';
                this.elements.charCountEl.textContent = 'অক্ষর: ০';
            } else if (type === 'share') {
                this.elements.shareWordCount.textContent = 'শব্দ: ০';
                this.elements.shareCharCount.textContent = 'অক্ষর: ০';
            } else if (type === 'review') {
                this.elements.charCount.textContent = '০/৫০০';
            }
            return;
        }
        
        const words = text.trim().split(/\s+/).filter(word => word.length > 0);
        const chars = text.length;
        
        if (type === 'free') {
            this.elements.wordCountEl.textContent = `শব্দ: ${words.length}`;
            this.elements.charCountEl.textContent = `অক্ষর: ${chars}`;
            
            // Update time
            if (!appState.writingStartTime) {
                appState.writingStartTime = new Date();
            }
            
            const now = new Date();
            const diffMs = now - appState.writingStartTime;
            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            
            this.elements.timeCountEl.textContent = `সময়: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
        } else if (type === 'share') {
            this.elements.shareWordCount.textContent = `শব্দ: ${words.length}`;
            this.elements.shareCharCount.textContent = `অক্ষর: ${chars}`;
            
            // Update time for share
            const now = new Date();
            const startTime = appState.writingStartTime || now;
            const diffMs = now - startTime;
            const minutes = Math.floor(diffMs / 60000);
            const seconds = Math.floor((diffMs % 60000) / 1000);
            
            this.elements.shareTimeCount.textContent = `সময়: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            
        } else if (type === 'review') {
            this.elements.charCount.textContent = `${chars}/৫০০`;
        }
    }
    
    toggleElementVisibility(element, show) {
        if (element) {
            element.style.display = show ? 'block' : 'none';
        }
    }
    
    setActiveButton(buttons, activeBtn) {
        buttons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    scrollToElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

// ===== পেজ ম্যানেজমেন্ট =====
class PageManager {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
        this.validPages = ['home', 'about', 'how-it-works', 'sessions', 'reviews', 'share', 'resources', 'start'];
    }
    
    showPage(pageId) {
        if (!this.validPages.includes(pageId) || this.appState.currentPage === pageId) {
            return;
        }
        
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // Show selected page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.appState.currentPage = pageId;
            this.appState.addToHistory(pageId);
            
            // Update URL hash
            window.location.hash = pageId;
            
            // Close mobile menu
            this.dom.elements.menuToggle.classList.remove('active');
            this.dom.elements.mobileMenu.classList.remove('active');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }
    
    loadPageFromHash() {
        const hash = window.location.hash.substring(1);
        
        if (hash && this.validPages.includes(hash)) {
            this.showPage(hash);
        } else {
            this.showPage('home');
        }
    }
    
    setupNavigation() {
        // Nav links
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                if (link.getAttribute('href') !== '#') {
                    e.preventDefault();
                    const pageId = link.getAttribute('href').substring(1);
                    this.showPage(pageId);
                }
            });
        });
        
        // Mobile menu links
        document.querySelectorAll('.mobile-menu a:not(.theme-toggle)').forEach(link => {
            link.addEventListener('click', () => {
                this.dom.elements.menuToggle.classList.remove('active');
                this.dom.elements.mobileMenu.classList.remove('active');
            });
        });
    }
}

// ===== থিম ম্যানেজার =====
class ThemeManager {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
    }
    
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || CONFIG.THEMES.LIGHT;
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.appState.userProfile.theme = savedTheme;
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === CONFIG.THEMES.LIGHT ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT;
        
        document.documentElement.setAttribute('data-theme', newTheme);
        this.appState.userProfile.theme = newTheme;
        localStorage.setItem('theme', newTheme);
        
        this.dom.showNotification(`থিম পরিবর্তন করা হয়েছে: ${newTheme === 'dark' ? 'ডার্ক' : 'লাইট'}`, CONFIG.NOTIFICATION_TYPES.SUCCESS);
    }
    
    setupThemeToggle() {
        if (this.dom.elements.themeToggle) {
            this.dom.elements.themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
        
        if (this.dom.elements.mobileThemeToggle) {
            this.dom.elements.mobileThemeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    }
}

// ===== মুড ট্র্যাকার =====
class MoodTracker {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
    }
    
    init() {
        this.setupMoodSelection();
        this.setupBreathingExercise();
        this.checkDailyMood();
    }
    
    setupMoodSelection() {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mood = e.currentTarget.dataset.mood;
                this.selectMood(mood);
            });
        });
    }
    
    selectMood(mood) {
        // Update UI
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
        
        // Save to state
        this.appState.userProfile.mood = mood;
        this.appState.userProfile.moodDate = new Date().toDateString();
        this.appState.saveToLocalStorage();
        
        // Show notification
        const moodNames = {
            'happy': 'ভালো',
            'neutral': 'স্বাভাবিক',
            'sad': 'খারাপ',
            'anxious': 'উদ্বিগ্ন'
        };
        
        this.dom.showNotification(`আপনার মুড সেভ করা হয়েছে: ${moodNames[mood]}`, CONFIG.NOTIFICATION_TYPES.SUCCESS);
    }
    
    checkDailyMood() {
        const today = new Date().toDateString();
        if (this.appState.userProfile.moodDate !== today) {
            this.appState.userProfile.mood = null;
            this.appState.userProfile.moodDate = null;
            this.appState.saveToLocalStorage();
            
            // Reset UI
            document.querySelectorAll('.mood-btn').forEach(btn => {
                btn.classList.remove('active');
            });
        } else if (this.appState.userProfile.mood) {
            // Restore selected mood
            const activeBtn = document.querySelector(`.mood-btn[data-mood="${this.appState.userProfile.mood}"]`);
            if (activeBtn) {
                activeBtn.classList.add('active');
            }
        }
    }
    
    setupBreathingExercise() {
        if (!this.dom.elements.startBreathing) return;
        
        this.dom.elements.startBreathing.addEventListener('click', () => {
            this.startBreathingExercise();
        });
    }
    
    startBreathingExercise() {
        const breathCircle = document.querySelector('.breath-circle');
        const instruction = document.querySelector('.breath-instruction');
        const startBtn = this.dom.elements.startBreathing;
        
        if (appState.breathingInterval) {
            // Stop breathing exercise
            clearInterval(appState.breathingInterval);
            appState.breathingInterval = null;
            appState.breathingPhase = 'in';
            appState.breathingTime = 0;
            
            breathCircle.style.animation = 'breath 8s infinite ease-in-out';
            instruction.textContent = 'শ্বাস নিন... ধরে রাখুন... ছাড়ুন...';
            startBtn.innerHTML = '<i class="fas fa-play"></i> শুরু করুন';
            startBtn.classList.remove('btn-secondary');
            startBtn.classList.add('btn-primary');
            
            this.dom.showNotification('শ্বাস ব্যায়াম বন্ধ করা হয়েছে', CONFIG.NOTIFICATION_TYPES.INFO);
        } else {
            // Start breathing exercise
            startBtn.innerHTML = '<i class="fas fa-stop"></i> বন্ধ করুন';
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
            
            // Reset animation
            breathCircle.style.animation = 'none';
            void breathCircle.offsetWidth; // Trigger reflow
            breathCircle.style.animation = 'breath 8s infinite ease-in-out';
            
            // Start timed breathing
            appState.breathingTime = 0;
            appState.breathingInterval = setInterval(() => {
                appState.breathingTime++;
                const cycleTime = appState.breathingTime % 8;
                
                if (cycleTime < 4) {
                    // Breathe in (4 seconds)
                    appState.breathingPhase = 'in';
                    instruction.textContent = 'শ্বাস নিন...';
                } else if (cycleTime < 6) {
                    // Hold (2 seconds)
                    appState.breathingPhase = 'hold';
                    instruction.textContent = 'ধরে রাখুন...';
                } else {
                    // Breathe out (2 seconds)
                    appState.breathingPhase = 'out';
                    instruction.textContent = 'ছাড়ুন...';
                }
            }, 1000);
            
            this.dom.showNotification('শ্বাস ব্যায়াম শুরু হয়েছে! ১ মিনিটের জন্য চালু থাকবে', CONFIG.NOTIFICATION_TYPES.INFO);
            
            // Auto stop after 1 minute
            setTimeout(() => {
                if (appState.breathingInterval) {
                    this.startBreathingExercise(); // This will stop it
                }
            }, 60000);
        }
    }
}

// ===== রাইটিং ম্যানেজার =====
class WritingManager {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
        this.autoSaveTimer = null;
        this.shareAutoSaveTimer = null;
    }
    
    init() {
        this.setupFreeWriting();
        this.setupShareWriting();
        this.setupReviewWriting();
        this.loadDrafts();
    }
    
    setupFreeWriting() {
        if (!this.dom.elements.freeWriting) return;
        
        // Typing event
        this.dom.elements.freeWriting.addEventListener('input', () => {
            this.handleFreeWritingInput();
        });
        
        // Clear button
        if (this.dom.elements.clearWriting) {
            this.dom.elements.clearWriting.addEventListener('click', () => {
                this.clearWriting('free');
            });
        }
        
        // Save button
        if (this.dom.elements.saveWriting) {
            this.dom.elements.saveWriting.addEventListener('click', () => {
                this.saveWriting('free');
            });
        }
        
        // Submit button
        if (this.dom.elements.submitWriting) {
            this.dom.elements.submitWriting.addEventListener('click', () => {
                this.submitWriting('free');
            });
        }
    }
    
    setupShareWriting() {
        if (!this.dom.elements.shareText) return;
        
        // Typing event
        this.dom.elements.shareText.addEventListener('input', () => {
            this.handleShareWritingInput();
        });
        
        // Clear button
        if (this.dom.elements.clearShare) {
            this.dom.elements.clearShare.addEventListener('click', () => {
                this.clearWriting('share');
            });
        }
        
        // Save button
        if (this.dom.elements.saveShare) {
            this.dom.elements.saveShare.addEventListener('click', () => {
                this.saveWriting('share');
            });
        }
        
        // Submit button
        if (this.dom.elements.submitShare) {
            this.dom.elements.submitShare.addEventListener('click', () => {
                this.submitShareWriting();
            });
        }
        
        // Privacy options
        document.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const privacy = e.currentTarget.dataset.share;
                this.selectSharePrivacy(privacy);
            });
        });
    }
    
    setupReviewWriting() {
        if (!this.dom.elements.reviewText) return;
        
        // Typing event
        this.dom.elements.reviewText.addEventListener('input', () => {
            this.handleReviewWritingInput();
        });
        
        // Privacy options
        document.querySelectorAll('.privacy-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const privacy = e.currentTarget.dataset.privacy;
                this.selectReviewPrivacy(privacy);
            });
        });
        
        // Emoji selection
        document.querySelectorAll('.emoji-option').forEach(emoji => {
            emoji.addEventListener('click', (e) => {
                this.selectReviewEmoji(e.currentTarget.dataset.emoji);
            });
        });
        
        // Submit button
        if (this.dom.elements.submitReview) {
            this.dom.elements.submitReview.addEventListener('click', () => {
                this.submitReview();
            });
        }
    }
    
    handleFreeWritingInput() {
        const text = this.dom.elements.freeWriting.value;
        this.dom.updateWritingStats(text, 'free');
        
        // Auto-save
        clearTimeout(this.autoSaveTimer);
        this.autoSaveTimer = setTimeout(() => {
            localStorage.setItem('freeWritingDraft', text);
        }, CONFIG.AUTO_SAVE_INTERVAL);
    }
    
    handleShareWritingInput() {
        const text = this.dom.elements.shareText.value;
        this.dom.updateWritingStats(text, 'share');
        
        // Auto-save
        clearTimeout(this.shareAutoSaveTimer);
        this.shareAutoSaveTimer = setTimeout(() => {
            localStorage.setItem('shareWritingDraft', text);
        }, CONFIG.AUTO_SAVE_INTERVAL);
    }
    
    handleReviewWritingInput() {
        const text = this.dom.elements.reviewText.value;
        this.dom.updateWritingStats(text, 'review');
    }
    
    loadDrafts() {
        // Load free writing draft
        const freeDraft = localStorage.getItem('freeWritingDraft');
        if (freeDraft && this.dom.elements.freeWriting) {
            this.dom.elements.freeWriting.value = freeDraft;
            this.dom.updateWritingStats(freeDraft, 'free');
        }
        
        // Load share writing draft
        const shareDraft = localStorage.getItem('shareWritingDraft');
        if (shareDraft && this.dom.elements.shareText) {
            this.dom.elements.shareText.value = shareDraft;
            this.dom.updateWritingStats(shareDraft, 'share');
        }
    }
    
    clearWriting(type) {
        let textArea, confirmMsg;
        
        if (type === 'free') {
            textArea = this.dom.elements.freeWriting;
            confirmMsg = 'আপনি কি নিশ্চিত যে আপনি লিখাটি মুছতে চান?';
        } else if (type === 'share') {
            textArea = this.dom.elements.shareText;
            confirmMsg = 'আপনি কি নিশ্চিত যে আপনি শেয়ার লিখাটি মুছতে চান?';
        }
        
        if (textArea && textArea.value.trim() && confirm(confirmMsg)) {
            textArea.value = '';
            
            if (type === 'free') {
                localStorage.removeItem('freeWritingDraft');
                this.dom.updateWritingStats('', 'free');
                this.appState.writingStartTime = null;
            } else if (type === 'share') {
                localStorage.removeItem('shareWritingDraft');
                this.dom.updateWritingStats('', 'share');
            }
            
            this.dom.showNotification('লেখা মুছে ফেলা হয়েছে', CONFIG.NOTIFICATION_TYPES.SUCCESS);
        }
    }
    
    saveWriting(type) {
        let text, filename;
        
        if (type === 'free') {
            text = this.dom.elements.freeWriting.value.trim();
            filename = `silent-listener-${Date.now()}.txt`;
        } else if (type === 'share') {
            text = this.dom.elements.shareText.value.trim();
            filename = `silent-share-${Date.now()}.txt`;
        }
        
        if (text) {
            const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.dom.showNotification('আপনার লেখা ডাউনলোড হয়ে গেছে', CONFIG.NOTIFICATION_TYPES.SUCCESS);
        } else {
            this.dom.showNotification('লেখা কিছু নেই ডাউনলোড করার জন্য', CONFIG.NOTIFICATION_TYPES.WARNING);
        }
    }
    
    submitWriting(type) {
        let text, textArea, submitBtn;
        
        if (type === 'free') {
            text = this.dom.elements.freeWriting.value.trim();
            textArea = this.dom.elements.freeWriting;
            submitBtn = this.dom.elements.submitWriting;
        }
        
        if (text) {
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> প্রক্রিয়াকরণ হচ্ছে...';
            submitBtn.disabled = true;
            
            // Simulate processing
            setTimeout(() => {
                textArea.value = '';
                
                if (type === 'free') {
                    localStorage.removeItem('freeWritingDraft');
                    this.dom.updateWritingStats('', 'free');
                    this.appState.writingStartTime = null;
                }
                
                submitBtn.innerHTML = '<i class="fas fa-check"></i> ছেড়ে দেওয়া হয়েছে ✓';
                
                setTimeout(() => {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }, 2000);
                
                this.dom.showNotification('আপনার কথা ছেড়ে দেওয়া হয়েছে। ধন্যবাদ।', CONFIG.NOTIFICATION_TYPES.SUCCESS);
            }, 1500);
        } else {
            this.dom.showNotification('কিছু লিখুন প্রথমে', CONFIG.NOTIFICATION_TYPES.WARNING);
        }
    }
    
    selectSharePrivacy(privacy) {
        document.querySelectorAll('.share-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const selectedOption = document.querySelector(`.share-option[data-share="${privacy}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
    }
    
    selectReviewPrivacy(privacy) {
        document.querySelectorAll('.privacy-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const selectedOption = document.querySelector(`.privacy-option[data-privacy="${privacy}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            
            // Show/hide named options
            const namedOptions = document.querySelector('.named-options');
            if (namedOptions) {
                if (privacy === 'named') {
                    namedOptions.style.display = 'block';
                } else {
                    namedOptions.style.display = 'none';
                }
            }
        }
    }
    
    selectReviewEmoji(emoji) {
        document.querySelectorAll('.emoji-option').forEach(option => {
            option.classList.remove('active');
        });
        
        const selectedEmoji = document.querySelector(`.emoji-option[data-emoji="${emoji}"]`);
        if (selectedEmoji) {
            selectedEmoji.classList.add('active');
        }
    }
    
    async submitShareWriting() {
        const text = this.dom.elements.shareText.value.trim();
        const privacyElement = document.querySelector('.share-option.active');
        const privacy = privacyElement ? privacyElement.dataset.share : CONFIG.PRIVACY.PRIVATE;
        
        if (!text) {
            this.dom.showNotification('কিছু লিখুন প্রথমে', CONFIG.NOTIFICATION_TYPES.WARNING);
            return;
        }
        
        const submitBtn = this.dom.elements.submitShare;
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> শেয়ার করা হচ্ছে...';
        submitBtn.disabled = true;
        this.dom.showLoading();
        
        try {
            if (privacy === CONFIG.PRIVACY.PUBLIC) {
                // Send to Google Sheets for public sharing
                const shareData = {
                    type: 'public_share',
                    text: text,
                    timestamp: new Date().toLocaleString('bn-BD', { timeZone: "Asia/Dhaka" }),
                    privacy: privacy,
                    mood: this.appState.userProfile.mood || 'neutral'
                };
                
                if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
                    await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(shareData)
                    });
                    
                    this.dom.showNotification('আপনার কথা নামহীনভাবে শেয়ার করা হয়েছে!', CONFIG.NOTIFICATION_TYPES.SUCCESS);
                    this.appState.incrementShareCount();
                } else {
                    console.log('Share Data (Demo):', shareData);
                    this.dom.showNotification('ডেমো: আপনার কথা শেয়ার করা হয়েছে', CONFIG.NOTIFICATION_TYPES.SUCCESS);
                }
            } else {
                // Private mode - just clear
                this.dom.showNotification('আপনার কথা সংরক্ষণ করা হয়েছে (শুধু আপনার জন্য)', CONFIG.NOTIFICATION_TYPES.SUCCESS);
            }
            
            // Clear textarea
            this.dom.elements.shareText.value = '';
            localStorage.removeItem('shareWritingDraft');
            this.dom.updateWritingStats('', 'share');
            
        } catch (error) {
            console.error('Error sharing:', error);
            this.dom.showNotification('সংযোগ সমস্যা। পরে আবার চেষ্টা করুন।', CONFIG.NOTIFICATION_TYPES.ERROR);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.dom.hideLoading();
        }
    }
    
    async submitReview() {
        const text = this.dom.elements.reviewText.value.trim();
        const privacyElement = document.querySelector('.privacy-option.active');
        const privacy = privacyElement ? privacyElement.dataset.privacy : CONFIG.PRIVACY.ANONYMOUS;
        const name = privacy === CONFIG.PRIVACY.NAMED ? this.dom.elements.reviewerName.value.trim() : '';
        const emojiElement = document.querySelector('.emoji-option.active');
        const emoji = emojiElement ? emojiElement.dataset.emoji : '😊';
        
        if (!text) {
            this.dom.showNotification('রিভিউ লিখুন প্রথমে', CONFIG.NOTIFICATION_TYPES.WARNING);
            return;
        }
        
        if (text.length > 500) {
            this.dom.showNotification('রিভিউ ৫০০ অক্ষরের মধ্যে রাখুন', CONFIG.NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        const submitBtn = this.dom.elements.submitReview;
        const originalText = submitBtn.innerHTML;
        
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> জমা করা হচ্ছে...';
        submitBtn.disabled = true;
        this.dom.showLoading();
        
        try {
            const reviewData = {
                type: 'review',
                text: text,
                privacy: privacy,
                name: name || 'নামহীন ব্যক্তি',
                emoji: emoji,
                mood: this.appState.userProfile.mood || 'neutral',
                timestamp: new Date().toLocaleString('bn-BD', { timeZone: "Asia/Dhaka" })
            };
            
            if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
                await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reviewData)
                });
                
                this.dom.showNotification('রিভিউ সাবমিট করা হয়েছে! ধন্যবাদ।', CONFIG.NOTIFICATION_TYPES.SUCCESS);
                this.appState.incrementReviewCount();
                
                // Clear form
                this.dom.elements.reviewText.value = '';
                if (this.dom.elements.reviewerName) {
                    this.dom.elements.reviewerName.value = '';
                }
                this.dom.updateWritingStats('', 'review');
                
                // Reset emoji selection
                document.querySelectorAll('.emoji-option').forEach(option => {
                    option.classList.remove('active');
                });
                
            } else {
                console.log('Review Data (Demo):', reviewData);
                this.dom.showNotification('ডেমো: রিভিউ রেকর্ড করা হয়েছে', CONFIG.NOTIFICATION_TYPES.SUCCESS);
            }
            
        } catch (error) {
            console.error('Error submitting review:', error);
            this.dom.showNotification('সংযোগ সমস্যা। পরে আবার চেষ্টা করুন।', CONFIG.NOTIFICATION_TYPES.ERROR);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.dom.hideLoading();
        }
    }
}

// ===== ফর্ম হ্যান্ডলার =====
class FormHandler {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
    }
    
    init() {
        this.setupContactMethodToggle();
        this.setupSessionForm();
    }
    
    setupContactMethodToggle() {
        if (!this.dom.elements.contactMethod) return;
        
        this.dom.elements.contactMethod.addEventListener('change', function() {
            const method = this.value;
            const telegramInput = document.getElementById('telegram-username');
            const emailInput = document.getElementById('email');
            
            if (method === 'telegram') {
                domManager.toggleElementVisibility(domManager.elements.telegramField, true);
                domManager.toggleElementVisibility(domManager.elements.emailField, false);
                if (telegramInput) telegramInput.required = true;
                if (emailInput) emailInput.required = false;
            } else {
                domManager.toggleElementVisibility(domManager.elements.telegramField, false);
                domManager.toggleElementVisibility(domManager.elements.emailField, true);
                if (telegramInput) telegramInput.required = false;
                if (emailInput) emailInput.required = true;
            }
        });
    }
    
    setupSessionForm() {
        if (!this.dom.elements.sessionForm) return;
        
        this.dom.elements.sessionForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSessionFormSubmit(e);
        });
    }
    
    validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                field.style.borderColor = '#ef4444';
            } else {
                field.style.borderColor = '';
            }
        });
        
        // Email validation
        const emailField = document.getElementById('email');
        if (emailField && emailField.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(emailField.value)) {
                isValid = false;
                emailField.style.borderColor = '#ef4444';
                this.dom.showNotification('দয়া করে একটি বৈধ ইমেইল ঠিকানা দিন', CONFIG.NOTIFICATION_TYPES.ERROR);
            }
        }
        
        return isValid;
    }
    
    async handleSessionFormSubmit(e) {
        const form = e.target;
        const submitBtn = form.querySelector('.submit-btn');
        
        if (!this.validateForm(form)) {
            this.dom.showNotification('দয়া করে সমস্ত প্রয়োজনীয় তথ্য পূরণ করুন', CONFIG.NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        // Loading state
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> পাঠানো হচ্ছে...';
        submitBtn.disabled = true;
        this.dom.showLoading();
        
        try {
            // Collect form data
            const formData = {
                name: document.getElementById('preferred-name').value.trim() || 'Anonymous',
                sessionType: document.getElementById('session-type').value,
                contactMethod: document.getElementById('contact-method').value,
                contactInfo: document.getElementById('contact-method').value === 'telegram' 
                    ? document.getElementById('telegram-username').value.trim()
                    : document.getElementById('email').value.trim(),
                message: document.getElementById('message').value.trim(),
                preferredTime: document.getElementById('preferred-time').value.trim(),
                timestamp: new Date().toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
                userAgent: navigator.userAgent.substring(0, 100),
                theme: this.appState.userProfile.theme,
                page: this.appState.currentPage,
                type: 'session_request'
            };
            
            // Send to Google Apps Script
            if (CONFIG.GOOGLE_SCRIPT_URL && CONFIG.GOOGLE_SCRIPT_URL !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") {
                await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    payload: JSON.stringify(formData)
                });
                
                this.dom.showNotification('আপনার অনুরোধ সফলভাবে জমা হয়েছে! ২৪ ঘন্টার মধ্যে যোগাযোগ করা হবে।', CONFIG.NOTIFICATION_TYPES.SUCCESS);
            } else {
                // Demo mode
                console.log('Form Data (Demo Mode):', formData);
                this.dom.showNotification('ডেমো মোড: আপনার অনুরোধ রেকর্ড করা হয়েছে। আসলে Google Apps Script URL সেট করুন।', CONFIG.NOTIFICATION_TYPES.SUCCESS);
            }
            
            // Save user name if provided
            if (formData.name !== 'Anonymous') {
                this.appState.userProfile.name = formData.name;
            }
            
            // Add to session history
            this.appState.userProfile.sessionHistory.push({
                type: 'session_request',
                data: { ...formData, message: formData.message ? '**প্রাইভেট**' : 'None' },
                timestamp: new Date().toISOString()
            });
            
            this.appState.saveToLocalStorage();
            
            // Reset form
            form.reset();
            
        } catch (error) {
            console.error('Error:', error);
            this.dom.showNotification('সংযোগ সমস্যা। দয়া করে আবার চেষ্টা করুন।', CONFIG.NOTIFICATION_TYPES.ERROR);
            
            // Fallback: Email option
            const emailBody = `নতুন সেশন অনুরোধ:\n\nনাম: ${formData.name}\nসেশন: ${formData.sessionType}\nযোগাযোগ: ${formData.contactMethod} - ${formData.contactInfo}\nপছন্দের সময়: ${formData.preferredTime || 'None'}\nবার্তা: ${formData.message || 'None'}`;
            window.open(`mailto:your-email@example.com?subject=Session Request - The Silent Listener&body=${encodeURIComponent(emailBody)}`, '_blank');
            
        } finally {
            // Reset loading state
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            this.dom.hideLoading();
        }
    }
}

// ===== সাউন্ড ম্যানেজার =====
class SoundManager {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
        this.sounds = {};
    }
    
    init() {
        this.setupSoundButtons();
        this.createSoundObjects();
    }
    
    createSoundObjects() {
        // Create audio objects for each sound
        this.sounds[CONFIG.SOUNDS.RAIN] = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-rain-loop-1249.mp3');
        this.sounds[CONFIG.SOUNDS.WAVES] = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-ocean-waves-loop-1248.mp3');
        this.sounds[CONFIG.SOUNDS.FOREST] = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-forest-ambience-1237.mp3');
        
        // Set loop and volume
        Object.values(this.sounds).forEach(sound => {
            sound.loop = true;
            sound.volume = 0.5;
        });
    }
    
    setupSoundButtons() {
        document.querySelectorAll('.play-sound').forEach(button => {
            button.addEventListener('click', (e) => {
                const soundType = e.currentTarget.dataset.sound;
                this.toggleSound(soundType, e.currentTarget);
            });
        });
    }
    
    toggleSound(soundType, button) {
        const sound = this.sounds[soundType];
        
        if (!sound) {
            this.dom.showNotification('সাউন্ড লোড করা যায়নি', CONFIG.NOTIFICATION_TYPES.ERROR);
            return;
        }
        
        if (this.appState.activeSound === soundType) {
            // Stop current sound
            sound.pause();
            sound.currentTime = 0;
            this.appState.activeSound = null;
            
            button.innerHTML = '<i class="fas fa-play"></i> শুনুন';
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline');
            
            this.dom.showNotification('সাউন্ড বন্ধ করা হয়েছে', CONFIG.NOTIFICATION_TYPES.INFO);
        } else {
            // Stop any playing sound first
            if (this.appState.activeSound) {
                const currentSound = this.sounds[this.appState.activeSound];
                if (currentSound) {
                    currentSound.pause();
                    currentSound.currentTime = 0;
                }
                
                // Update previous button
                const prevButton = document.querySelector(`.play-sound[data-sound="${this.appState.activeSound}"]`);
                if (prevButton) {
                    prevButton.innerHTML = '<i class="fas fa-play"></i> শুনুন';
                    prevButton.classList.remove('btn-primary');
                    prevButton.classList.add('btn-outline');
                }
            }
            
            // Play new sound
            sound.play().catch(error => {
                console.error('Error playing sound:', error);
                this.dom.showNotification('সাউন্ড চালু করা যায়নি', CONFIG.NOTIFICATION_TYPES.ERROR);
                return;
            });
            
            this.appState.activeSound = soundType;
            
            button.innerHTML = '<i class="fas fa-stop"></i> বন্ধ করুন';
            button.classList.remove('btn-outline');
            button.classList.add('btn-primary');
            
            const soundNames = {
                'rain': 'বৃষ্টি',
                'waves': 'সমুদ্র',
                'forest': 'বন'
            };
            
            this.dom.showNotification(`${soundNames[soundType]} সাউন্ড চালু করা হয়েছে`, CONFIG.NOTIFICATION_TYPES.SUCCESS);
            
            // Auto stop after 30 minutes
            setTimeout(() => {
                if (this.appState.activeSound === soundType) {
                    this.toggleSound(soundType, button);
                }
            }, 30 * 60 * 1000);
        }
    }
    
    stopAllSounds() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
        
        this.appState.activeSound = null;
        
        // Update all buttons
        document.querySelectorAll('.play-sound').forEach(button => {
            button.innerHTML = '<i class="fas fa-play"></i> শুনুন';
            button.classList.remove('btn-primary');
            button.classList.add('btn-outline');
        });
    }
}

// ===== এফএকিউ ম্যানেজার =====
class FAQManager {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
    }
    
    init() {
        this.setupFAQAccordion();
    }
    
    setupFAQAccordion() {
        document.querySelectorAll('.faq-question').forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentElement;
                const isActive = faqItem.classList.contains('active');
                
                // Close all FAQ items
                document.querySelectorAll('.faq-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                // Open clicked item if it was closed
                if (!isActive) {
                    faqItem.classList.add('active');
                }
            });
        });
    }
}

// ===== ইমার্জেন্সি ডিটেকশন =====
class EmergencyDetection {
    constructor(domManager, appState) {
        this.dom = domManager;
        this.appState = appState;
        this.emergencyKeywords = [
            'আত্মহত্যা', 'মারা যাই', 'মরতে', 'খুন', 'হত্যা', 'মারি',
            'suicide', 'kill', 'die', 'dead', 'end my life', 'want to die'
        ];
    }
    
    init() {
        this.setupTextAnalysis();
    }
    
    setupTextAnalysis() {
        // Monitor writing areas for emergency keywords
        const textAreas = [
            this.dom.elements.freeWriting,
            this.dom.elements.shareText,
            this.dom.elements.reviewText,
            document.getElementById('message')
        ];
        
        textAreas.forEach(textArea => {
            if (textArea) {
                textArea.addEventListener('input', (e) => {
                    this.analyzeText(e.target.value);
                });
            }
        });
    }
    
    analyzeText(text) {
        const lowerText = text.toLowerCase();
        
        for (const keyword of this.emergencyKeywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                this.showEmergencyAlert();
                break;
            }
        }
    }
    
    showEmergencyAlert() {
        // Don't show too frequently
        const lastAlert = localStorage.getItem('lastEmergencyAlert');
        const now = Date.now();
        
        if (lastAlert && (now - parseInt(lastAlert)) < 300000) { // 5 minutes
            return;
        }
        
        localStorage.setItem('lastEmergencyAlert', now.toString());
        
        const alertHTML = `
            <div class="emergency-alert" style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 10001;
                max-width: 400px;
                width: 90%;
                text-align: center;
                border: 4px solid #ef4444;
            ">
                <h3 style="color: #dc2626; margin-bottom: 1rem;">🚨 জরুরি সহায়তা প্রয়োজন?</h3>
                <p style="margin-bottom: 1.5rem;">আপনি যদি নিজের বা অন্যের নিরাপত্তা নিয়ে উদ্বিগ্ন হন, দয়া করে অবিলম্বে সাহায্য নিন:</p>
                
                <div style="margin: 1.5rem 0;">
                    <div style="font-size: 2rem; font-weight: bold; color: #dc2626; margin: 1rem 0;">৩৩৩</div>
                    <p>বাংলাদেশ জাতীয় হেল্পলাইন</p>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button onclick="this.parentElement.parentElement.remove()" style="
                        padding: 0.75rem 1.5rem;
                        background: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        আমি ঠিক আছি
                    </button>
                    <button onclick="window.open('tel:333')" style="
                        padding: 0.75rem 1.5rem;
                        background: #ef4444;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    ">
                        কল করুন
                    </button>
                </div>
            </div>
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
            " onclick="this.remove(); this.previousElementSibling.remove()"></div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHTML);
    }
}

// ===== মেইন অ্যাপ্লিকেশন =====
class TheSilentListenerApp {
    constructor() {
        console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} ইনিশিয়ালাইজিং...`);
        
        this.appState = new AppState();
        this.domManager = new DOMManager();
        this.pageManager = new PageManager(this.domManager, this.appState);
        this.themeManager = new ThemeManager(this.domManager, this.appState);
        this.moodTracker = new MoodTracker(this.domManager, this.appState);
        this.writingManager = new WritingManager(this.domManager, this.appState);
        this.formHandler = new FormHandler(this.domManager, this.appState);
        this.soundManager = new SoundManager(this.domManager, this.appState);
        this.faqManager = new FAQManager(this.domManager, this.appState);
        this.emergencyDetection = new EmergencyDetection(this.domManager, this.appState);
    }
    
    init() {
        try {
            // Initialize theme
            this.themeManager.initTheme();
            
            // Load page from URL hash
            this.pageManager.loadPageFromHash();
            
            // Setup navigation
            this.pageManager.setupNavigation();
            
            // Setup theme toggle
            this.themeManager.setupThemeToggle();
            
            // Setup mobile menu
            this.setupMobileMenu();
            
            // Initialize mood tracker
            this.moodTracker.init();
            
            // Initialize writing manager
            this.writingManager.init();
            
            // Initialize form handler
            this.formHandler.init();
            
            // Initialize sound manager
            this.soundManager.init();
            
            // Initialize FAQ manager
            this.faqManager.init();
            
            // Initialize emergency detection
            this.emergencyDetection.init();
            
            // Setup hash change listener
            window.addEventListener('hashchange', () => {
                this.pageManager.loadPageFromHash();
            });
            
            // Setup offline detection
            this.setupOfflineDetection();
            
            // Welcome notification
            this.showWelcomeNotification();
            
            // Update last visit
            this.appState.userProfile.lastVisit = new Date().toISOString();
            this.appState.saveToLocalStorage();
            
            console.log(`${CONFIG.APP_NAME} সফলভাবে ইনিশিয়ালাইজ হয়েছে`);
            
        } catch (error) {
            console.error('অ্যাপ ইনিশিয়ালাইজেশনে ত্রুটি:', error);
            this.domManager.showNotification('অ্যাপলিকেশনে একটি ত্রুটি হয়েছে। পৃষ্ঠাটি রিফ্রেশ করুন।', CONFIG.NOTIFICATION_TYPES.ERROR);
        }
    }
    
    setupMobileMenu() {
        if (this.domManager.elements.menuToggle) {
            this.domManager.elements.menuToggle.addEventListener('click', () => {
                this.domManager.elements.menuToggle.classList.toggle('active');
                this.domManager.elements.mobileMenu.classList.toggle('active');
            });
        }
    }
    
    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.domManager.showNotification('ইন্টারনেট সংযোগ পুনরুদ্ধার করা হয়েছে', CONFIG.NOTIFICATION_TYPES.SUCCESS);
        });
        
        window.addEventListener('offline', () => {
            this.domManager.showNotification('আপনি অফলাইন। সংযোগ পুনরুদ্ধার করুন।', CONFIG.NOTIFICATION_TYPES.WARNING);
        });
    }
    
    showWelcomeNotification() {
        const lastVisit = this.appState.userProfile.lastVisit;
        if (!lastVisit) {
            setTimeout(() => {
                this.domManager.showNotification('স্বাগতম! কথা বলা বা না বলা — সবই গ্রহণযোগ্য।', CONFIG.NOTIFICATION_TYPES.INFO);
            }, 1000);
        } else {
            const daysAgo = Math.floor((new Date() - new Date(lastVisit)) / (1000 * 60 * 60 * 24));
            if (daysAgo > 7) {
                setTimeout(() => {
                    this.domManager.showNotification('আবারও স্বাগতম! ভালো লাগছে আপনাকে আবার দেখে।', CONFIG.NOTIFICATION_TYPES.INFO);
                }, 1000);
            }
        }
    }
}

// ===== গ্লোবাল ফাংশন =====
window.showPage = function(pageId) {
    if (window.app && window.app.pageManager) {
        window.app.pageManager.showPage(pageId);
    }
};

window.toggleTheme = function() {
    if (window.app && window.app.themeManager) {
        window.app.themeManager.toggleTheme();
    }
};

// ===== অ্যাপ্লিকেশন চালু =====
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TheSilentListenerApp();
    window.app.init();
});
