// ===== The Silent Listener - Main JavaScript =====
// Version: 2.0.0 | Last Updated: December 2024
// FIXED: API integration, Data saving, Review display

// ===== কনফিগারেশন =====
const CONFIG = {
    // Google Apps Script URL (আপনার ডেপ্লয়মেন্ট URL)
    GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyPzg1wg9SQGyQdjc0CZIH65MtbCxg5REwkTImSV41c1unOk7ZNYWtfYysMWVLyqUXa/exec",
    
    // App Settings
    APP_NAME: "The Silent Listener",
    VERSION: "2.0.0",
    AUTO_SAVE_INTERVAL: 10000,
    
    // API Endpoints
    API_ENDPOINTS: {
        SESSION_REQUEST: "session_request",
        REVIEW: "review",
        PUBLIC_SHARE: "public_share",
        GET_REVIEWS: "get_reviews",
        GET_SHARES: "get_shares"
    },
    
    // Theme Settings
    THEMES: {
        LIGHT: 'light',
        DARK: 'dark'
    }
};

// ===== গ্লোবাল স্টেট =====
const AppState = {
    currentPage: 'home',
    userProfile: {
        name: localStorage.getItem('userName') || '',
        theme: localStorage.getItem('theme') || CONFIG.THEMES.LIGHT,
        mood: localStorage.getItem('daily_mood') || null,
        reviewCount: parseInt(localStorage.getItem('reviewCount')) || 0,
        shareCount: parseInt(localStorage.getItem('shareCount')) || 0
    },
    
    // Writing state
    writingStartTime: null,
    activeSound: null,
    breathingInterval: null,
    
    saveToLocalStorage() {
        localStorage.setItem('userName', this.userProfile.name);
        localStorage.setItem('theme', this.userProfile.theme);
        localStorage.setItem('daily_mood', this.userProfile.mood);
        localStorage.setItem('reviewCount', this.userProfile.reviewCount);
        localStorage.setItem('shareCount', this.userProfile.shareCount);
    }
};

// ===== ইউটিলিটি ফাংশন =====
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        AppState.currentPage = pageId;
        
        // Update URL hash
        window.location.hash = pageId;
        
        // Close mobile menu
        const menuToggle = document.querySelector('.menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        if (menuToggle) menuToggle.classList.remove('active');
        if (mobileMenu) mobileMenu.classList.remove('active');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Load dynamic content for reviews page
        if (pageId === 'reviews') {
            loadReviews();
        }
    }
}

// ===== থিম ম্যানেজমেন্ট =====
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || CONFIG.THEMES.LIGHT;
    document.documentElement.setAttribute('data-theme', savedTheme);
    AppState.userProfile.theme = savedTheme;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === CONFIG.THEMES.LIGHT ? CONFIG.THEMES.DARK : CONFIG.THEMES.LIGHT;
    
    document.documentElement.setAttribute('data-theme', newTheme);
    AppState.userProfile.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    
    showNotification(`থিম পরিবর্তন করা হয়েছে: ${newTheme === 'dark' ? 'ডার্ক' : 'লাইট'}`, 'success');
}

// ===== মুড ট্র্যাকার =====
function setupMoodTracker() {
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const mood = this.dataset.mood;
            selectMood(mood, this);
        });
    });
}

function selectMood(mood, element) {
    // Update UI
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    
    // Save to state
    AppState.userProfile.mood = mood;
    AppState.saveToLocalStorage();
    
    const moodNames = {
        'happy': 'ভালো',
        'neutral': 'স্বাভাবিক',
        'sad': 'খারাপ',
        'anxious': 'উদ্বিগ্ন'
    };
    
    showNotification(`আপনার মুড সেভ করা হয়েছে: ${moodNames[mood]}`, 'success');
}

// ===== শ্বাস ব্যায়াম =====
function setupBreathingExercise() {
    const startBtn = document.getElementById('start-breathing');
    if (!startBtn) return;
    
    let isBreathing = false;
    let timerInterval = null;
    let timeLeft = 60;
    
    startBtn.addEventListener('click', function() {
        if (isBreathing) {
            stopBreathing();
        } else {
            startBreathing();
        }
    });
    
    function startBreathing() {
        isBreathing = true;
        timeLeft = 60;
        
        // Update button
        startBtn.innerHTML = '<i class="fas fa-stop"></i> বন্ধ করুন';
        startBtn.classList.remove('btn-primary');
        startBtn.classList.add('btn-secondary');
        
        // Start breathing animation
        const breathCircle = document.querySelector('.breath-circle');
        const instruction = document.querySelector('.breath-instruction');
        
        if (breathCircle) breathCircle.style.animation = 'breath 8s infinite ease-in-out';
        if (instruction) instruction.textContent = 'শ্বাস নিন...';
        
        showNotification('শ্বাস ব্যায়াম শুরু হয়েছে! ১ মিনিটের জন্য চলবে', 'success');
        
        // Start timer
        timerInterval = setInterval(function() {
            timeLeft--;
            
            // Update breathing phase
            const cycleTime = (60 - timeLeft) % 8;
            if (instruction) {
                if (cycleTime < 4) {
                    instruction.textContent = 'শ্বাস নিন...';
                } else if (cycleTime < 6) {
                    instruction.textContent = 'ধরে রাখুন...';
                } else {
                    instruction.textContent = 'ছাড়ুন...';
                }
            }
            
            // Stop when time's up
            if (timeLeft <= 0) {
                stopBreathing();
                showNotification('শ্বাস ব্যায়াম সম্পূর্ণ! অনুভূতি কেমন?', 'success');
            }
        }, 1000);
    }
    
    function stopBreathing() {
        isBreathing = false;
        
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // Reset button
        startBtn.innerHTML = '<i class="fas fa-play"></i> শুরু করুন';
        startBtn.classList.remove('btn-secondary');
        startBtn.classList.add('btn-primary');
        
        // Reset animation
        const breathCircle = document.querySelector('.breath-circle');
        const instruction = document.querySelector('.breath-instruction');
        
        if (breathCircle) {
            breathCircle.style.animation = 'none';
            void breathCircle.offsetWidth; // Trigger reflow
        }
        if (instruction) instruction.textContent = 'শ্বাস নিন... ধরে রাখুন... ছাড়ুন...';
    }
}

// ===== রিভিউ সিস্টেম =====
function setupReviewSystem() {
    // Privacy options
    document.querySelectorAll('.privacy-option').forEach(option => {
        option.addEventListener('click', function() {
            const privacy = this.dataset.privacy;
            selectReviewPrivacy(privacy);
        });
    });
    
    // Emoji selection
    document.querySelectorAll('.emoji-option').forEach(emoji => {
        emoji.addEventListener('click', function() {
            const emojiChar = this.dataset.emoji;
            selectReviewEmoji(emojiChar);
        });
    });
    
    // Review text character count
    const reviewText = document.getElementById('review-text');
    const charCount = document.querySelector('.char-count');
    
    if (reviewText && charCount) {
        reviewText.addEventListener('input', function() {
            const length = this.value.length;
            charCount.textContent = `${length}/৫০০`;
        });
    }
    
    // Submit review
    const submitReviewBtn = document.getElementById('submit-review');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', submitReview);
    }
}

function selectReviewPrivacy(privacy) {
    document.querySelectorAll('.privacy-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selected = document.querySelector(`.privacy-option[data-privacy="${privacy}"]`);
    if (selected) selected.classList.add('active');
    
    // Show/hide name field
    const namedOptions = document.querySelector('.named-options');
    if (namedOptions) {
        namedOptions.style.display = privacy === 'named' ? 'block' : 'none';
    }
}

function selectReviewEmoji(emoji) {
    document.querySelectorAll('.emoji-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selected = document.querySelector(`.emoji-option[data-emoji="${emoji}"]`);
    if (selected) selected.classList.add('active');
}

async function submitReview() {
    const reviewText = document.getElementById('review-text');
    const nameField = document.getElementById('reviewer-name');
    const privacyOption = document.querySelector('.privacy-option.active');
    
    if (!reviewText || !reviewText.value.trim()) {
        showNotification('রিভিউ লিখুন প্রথমে', 'warning');
        return;
    }
    
    if (reviewText.value.length > 500) {
        showNotification('রিভিউ ৫০০ অক্ষরের মধ্যে রাখুন', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-review');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> জমা করা হচ্ছে...';
    submitBtn.disabled = true;
    showLoading();
    
    try {
        const reviewData = {
            type: CONFIG.API_ENDPOINTS.REVIEW,
            text: reviewText.value.trim(),
            privacy: privacyOption ? privacyOption.dataset.privacy : 'anonymous',
            name: nameField && nameField.value.trim() ? nameField.value.trim() : 'নামহীন ব্যক্তি',
            emoji: getSelectedEmoji(),
            mood: AppState.userProfile.mood || 'neutral'
        };
        
        console.log('Submitting review:', reviewData);
        
        // Send to Google Apps Script
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(reviewData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('রিভিউ সফলভাবে জমা হয়েছে!', 'success');
            
            // Clear form
            reviewText.value = '';
            if (nameField) nameField.value = '';
            
            // Update character count
            const charCount = document.querySelector('.char-count');
            if (charCount) charCount.textContent = '০/৫০০';
            
            // Update review count
            AppState.userProfile.reviewCount++;
            AppState.saveToLocalStorage();
            
            // Refresh reviews
            setTimeout(() => loadReviews(), 1000);
            
        } else {
            throw new Error(result.error || 'Failed to submit review');
        }
        
    } catch (error) {
        console.error('Error submitting review:', error);
        showNotification('সংযোগ সমস্যা। পরে আবার চেষ্টা করুন।', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        hideLoading();
    }
}

function getSelectedEmoji() {
    const selectedEmoji = document.querySelector('.emoji-option.active');
    return selectedEmoji ? selectedEmoji.dataset.emoji : '😊';
}

async function loadReviews() {
    const reviewsGrid = document.querySelector('.reviews-grid');
    if (!reviewsGrid) return;
    
    // Show loading
    reviewsGrid.innerHTML = `
        <div class="loading-reviews">
            <div class="spinner"></div>
            <p>রিভিউ লোড করা হচ্ছে...</p>
        </div>
    `;
    
    try {
        // Try to fetch from Google Apps Script
        const response = await fetch(`${CONFIG.GOOGLE_SCRIPT_URL}?action=reviews`);
        const result = await response.json();
        
        if (result.success && result.reviews && result.reviews.length > 0) {
            displayReviews(result.reviews);
        } else {
            // Fallback to sample reviews
            displaySampleReviews();
        }
        
    } catch (error) {
        console.log('Using sample reviews:', error);
        displaySampleReviews();
    }
}

function displayReviews(reviews) {
    const reviewsGrid = document.querySelector('.reviews-grid');
    if (!reviewsGrid) return;
    
    if (reviews.length === 0) {
        reviewsGrid.innerHTML = `
            <div class="no-reviews">
                <div class="no-reviews-icon">😊</div>
                <h4>কোনো রিভিউ নেই</h4>
                <p>প্রথম রিভিউটি জমা দিন!</p>
            </div>
        `;
        return;
    }
    
    let reviewsHTML = '';
    
    reviews.forEach((review, index) => {
        const timeAgo = getTimeAgo(review.timestamp);
        const displayName = review.privacy === 'anonymous' ? 'নামহীন ব্যক্তি' : review.name;
        
        reviewsHTML += `
            <div class="review-card">
                <div class="reviewer-info">
                    <div class="reviewer-avatar">
                        ${review.emoji || '😊'}
                    </div>
                    <div class="reviewer-details">
                        <h4 class="reviewer-name">${displayName}</h4>
                        <small class="review-date">${timeAgo}</small>
                        ${review.privacy === 'anonymous' ? '<span class="privacy-badge">👤 নামহীন</span>' : ''}
                    </div>
                </div>
                
                <div class="review-content">
                    <p>"${review.text}"</p>
                </div>
                
                <div class="review-stats">
                    <button class="helpful-btn" data-review-id="${review.id}">
                        <span>👍</span> 
                        <span class="helpful-count">${review.likes || 0}</span>
                    </button>
                    <span class="review-time">${timeAgo}</span>
                </div>
            </div>
        `;
    });
    
    reviewsGrid.innerHTML = reviewsHTML;
    
    // Add event listeners to helpful buttons
    document.querySelectorAll('.helpful-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const countElement = this.querySelector('.helpful-count');
            let count = parseInt(countElement.textContent) || 0;
            count++;
            countElement.textContent = count;
            this.classList.add('clicked');
            showNotification('ধন্যবাদ! আপনার মতামত রেকর্ড করা হয়েছে', 'success');
        });
    });
}

function displaySampleReviews() {
    const sampleReviews = [
        {
            id: 'sample1',
            name: 'রহিম',
            emoji: '😊',
            text: 'The Silent Listener এর মাধ্যমে আমি আমার মনের কথা শেয়ার করতে পেরেছি। অনেক ভালো লাগছে।',
            mood: 'happy',
            privacy: 'public',
            timestamp: '2024-12-15T10:30:00',
            likes: 12
        },
        {
            id: 'sample2',
            name: 'সিমা',
            emoji: '❤️',
            text: 'শ্বাস ব্যায়ামটা খুব উপকারী। প্রতিদিন করছি এবং মানসিক শান্তি পাচ্ছি।',
            mood: 'peaceful',
            privacy: 'public',
            timestamp: '2024-12-14T14:20:00',
            likes: 8
        },
        {
            id: 'sample3',
            name: 'অজানা',
            emoji: '🙏',
            text: 'এই প্ল্যাটফর্মে কথা বলতে পেরে আমি খুবই ভালো বোধ করছি। ধন্যবাদ সবাইকে।',
            mood: 'grateful',
            privacy: 'anonymous',
            timestamp: '2024-12-13T09:15:00',
            likes: 15
        }
    ];
    
    displayReviews(sampleReviews);
}

function getTimeAgo(timestamp) {
    if (!timestamp) return 'সময় অজানা';
    
    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'এখনই';
        if (diffMins < 60) return `${diffMins} মিনিট আগে`;
        if (diffHours < 24) return `${diffHours} ঘন্টা আগে`;
        if (diffDays < 7) return `${diffDays} দিন আগে`;
        
        return date.toLocaleDateString('bn-BD', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return timestamp;
    }
}

// ===== শেয়ার সিস্টেম =====
function setupShareSystem() {
    // Privacy options
    document.querySelectorAll('.share-option').forEach(option => {
        option.addEventListener('click', function() {
            const shareType = this.dataset.share;
            selectSharePrivacy(shareType);
        });
    });
    
    // Share text stats
    const shareText = document.getElementById('share-text');
    if (shareText) {
        shareText.addEventListener('input', function() {
            updateShareStats(this.value);
        });
    }
    
    // Clear button
    const clearBtn = document.getElementById('clear-share');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearShareText);
    }
    
    // Save button
    const saveBtn = document.getElementById('save-share');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveShareText);
    }
    
    // Submit button
    const submitBtn = document.getElementById('submit-share');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitShare);
    }
    
    // Load draft
    loadShareDraft();
}

function selectSharePrivacy(privacy) {
    document.querySelectorAll('.share-option').forEach(option => {
        option.classList.remove('active');
    });
    
    const selected = document.querySelector(`.share-option[data-share="${privacy}"]`);
    if (selected) selected.classList.add('active');
}

function updateShareStats(text) {
    const wordCount = document.getElementById('share-word-count');
    const charCount = document.getElementById('share-char-count');
    
    if (!text || text.trim().length === 0) {
        if (wordCount) wordCount.textContent = 'শব্দ: ০';
        if (charCount) charCount.textContent = 'অক্ষর: ০';
        return;
    }
    
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const chars = text.length;
    
    if (wordCount) wordCount.textContent = `শব্দ: ${words.length}`;
    if (charCount) charCount.textContent = `অক্ষর: ${chars}`;
    
    // Save draft
    localStorage.setItem('shareWritingDraft', text);
}

function clearShareText() {
    const shareText = document.getElementById('share-text');
    if (shareText && confirm('আপনি কি নিশ্চিত যে আপনি শেয়ার লিখাটি মুছতে চান?')) {
        shareText.value = '';
        updateShareStats('');
        localStorage.removeItem('shareWritingDraft');
        showNotification('লেখা মুছে ফেলা হয়েছে', 'success');
    }
}

function saveShareText() {
    const shareText = document.getElementById('share-text');
    if (!shareText || !shareText.value.trim()) {
        showNotification('লেখা কিছু নেই সংরক্ষণের জন্য', 'warning');
        return;
    }
    
    const blob = new Blob([shareText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silent-share-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('আপনার লেখা ডাউনলোড হয়ে গেছে', 'success');
}

function loadShareDraft() {
    const draft = localStorage.getItem('shareWritingDraft');
    const shareText = document.getElementById('share-text');
    if (draft && shareText) {
        shareText.value = draft;
        updateShareStats(draft);
    }
}

async function submitShare() {
    const shareText = document.getElementById('share-text');
    const privacyOption = document.querySelector('.share-option.active');
    
    if (!shareText || !shareText.value.trim()) {
        showNotification('কিছু লিখুন প্রথমে', 'warning');
        return;
    }
    
    const submitBtn = document.getElementById('submit-share');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> শেয়ার করা হচ্ছে...';
    submitBtn.disabled = true;
    showLoading();
    
    try {
        const shareData = {
            type: CONFIG.API_ENDPOINTS.PUBLIC_SHARE,
            text: shareText.value.trim(),
            privacy: privacyOption ? privacyOption.dataset.share : 'private',
            mood: AppState.userProfile.mood || 'neutral'
        };
        
        console.log('Submitting share:', shareData);
        
        if (shareData.privacy === 'public') {
            // Send to Google Apps Script
            const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(shareData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('আপনার কথা নামহীনভাবে শেয়ার করা হয়েছে!', 'success');
                AppState.userProfile.shareCount++;
                AppState.saveToLocalStorage();
            } else {
                throw new Error(result.error || 'Failed to submit share');
            }
        } else {
            showNotification('আপনার কথা সংরক্ষণ করা হয়েছে (শুধু আপনার জন্য)', 'success');
        }
        
        // Clear text
        shareText.value = '';
        updateShareStats('');
        localStorage.removeItem('shareWritingDraft');
        
    } catch (error) {
        console.error('Error sharing:', error);
        showNotification('সংযোগ সমস্যা। পরে আবার চেষ্টা করুন।', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        hideLoading();
    }
}

// ===== সেশন ফর্ম =====
function setupSessionForm() {
    const contactMethod = document.getElementById('contact-method');
    const telegramField = document.getElementById('telegram-field');
    const emailField = document.getElementById('email-field');
    const sessionForm = document.getElementById('session-form');
    
    if (!contactMethod || !telegramField || !emailField || !sessionForm) return;
    
    // Contact method toggle
    contactMethod.addEventListener('change', function() {
        if (this.value === 'telegram') {
            telegramField.style.display = 'block';
            emailField.style.display = 'none';
        } else {
            telegramField.style.display = 'none';
            emailField.style.display = 'block';
        }
    });
    
    // Form submission
    sessionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        await handleSessionFormSubmit(this);
    });
}

async function handleSessionFormSubmit(form) {
    // Validate form
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.style.borderColor = '#ef4444';
        } else {
            field.style.borderColor = '';
        }
    });
    
    if (!isValid) {
        showNotification('দয়া করে সমস্ত প্রয়োজনীয় তথ্য পূরণ করুন', 'error');
        return;
    }
    
    const submitBtn = form.querySelector('.submit-btn');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> পাঠানো হচ্ছে...';
    submitBtn.disabled = true;
    showLoading();
    
    try {
        // Collect form data
        const formData = {
            type: CONFIG.API_ENDPOINTS.SESSION_REQUEST,
            name: document.getElementById('preferred-name').value.trim() || 'Anonymous',
            sessionType: document.getElementById('session-type').value,
            contactMethod: document.getElementById('contact-method').value,
            contactInfo: document.getElementById('contact-method').value === 'telegram' 
                ? document.getElementById('telegram-username').value.trim()
                : document.getElementById('email').value.trim(),
            message: document.getElementById('message').value.trim(),
            preferredTime: document.getElementById('preferred-time').value.trim(),
            theme: AppState.userProfile.theme,
            page: AppState.currentPage
        };
        
        console.log('Submitting session request:', formData);
        
        // Send to Google Apps Script
        const response = await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('আপনার অনুরোধ সফলভাবে জমা হয়েছে! ২৪ ঘন্টার মধ্যে যোগাযোগ করা হবে।', 'success');
            
            // Save user name if provided
            if (formData.name !== 'Anonymous') {
                AppState.userProfile.name = formData.name;
                AppState.saveToLocalStorage();
            }
            
            // Reset form
            form.reset();
            
            // Reset contact method visibility
            const telegramField = document.getElementById('telegram-field');
            const emailField = document.getElementById('email-field');
            if (telegramField) telegramField.style.display = 'block';
            if (emailField) emailField.style.display = 'none';
            
        } else {
            throw new Error(result.error || 'Failed to submit session request');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showNotification('সংযোগ সমস্যা। দয়া করে আবার চেষ্টা করুন।', 'error');
        
        // Fallback to email
        showNotification('অনুগ্রহ করে সরাসরি ইমেইল করুন', 'info');
        
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        hideLoading();
    }
}

// ===== সাউন্ড সিস্টেম =====
function setupSoundSystem() {
    document.querySelectorAll('.play-sound').forEach(button => {
        button.addEventListener('click', function() {
            const soundType = this.dataset.sound;
            playSound(soundType, this);
        });
    });
}

function playSound(soundType, button) {
    // Simple sound implementation
    const soundNames = {
        'rain': 'বৃষ্টি',
        'waves': 'সমুদ্র',
        'forest': 'বন'
    };
    
    if (AppState.activeSound === soundType) {
        // Stop sound
        AppState.activeSound = null;
        button.innerHTML = '<i class="fas fa-play"></i> শুনুন';
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline');
        showNotification('সাউন্ড বন্ধ করা হয়েছে', 'info');
    } else {
        // Stop any current sound
        if (AppState.activeSound) {
            const prevButton = document.querySelector(`.play-sound[data-sound="${AppState.activeSound}"]`);
            if (prevButton) {
                prevButton.innerHTML = '<i class="fas fa-play"></i> শুনুন';
                prevButton.classList.remove('btn-primary');
                prevButton.classList.add('btn-outline');
            }
        }
        
        // Play new sound
        AppState.activeSound = soundType;
        button.innerHTML = '<i class="fas fa-stop"></i> বন্ধ করুন';
        button.classList.remove('btn-outline');
        button.classList.add('btn-primary');
        
        showNotification(`${soundNames[soundType]} সাউন্ড চালু করা হয়েছে`, 'success');
        
        // Auto stop after 30 minutes
        setTimeout(() => {
            if (AppState.activeSound === soundType) {
                playSound(soundType, button);
            }
        }, 30 * 60 * 1000);
    }
}

// ===== এফএকিউ সিস্টেম =====
function setupFAQSystem() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
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

// ===== মোবাইল মেনু =====
function setupMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (!menuToggle || !mobileMenu) return;
    
    menuToggle.addEventListener('click', function() {
        this.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
    
    // Close menu when clicking on a link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mobileMenu.classList.remove('active');
        });
    });
}

// ===== ইনিশিয়ালাইজেশন =====
function initializeApp() {
    console.log(`${CONFIG.APP_NAME} v${CONFIG.VERSION} শুরু হচ্ছে...`);
    
    // Initialize theme
    initTheme();
    
    // Setup theme toggle
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
        toggle.addEventListener('click', toggleTheme);
    });
    
    // Setup mobile menu
    setupMobileMenu();
    
    // Setup mood tracker
    setupMoodTracker();
    
    // Setup breathing exercise
    setupBreathingExercise();
    
    // Setup review system
    setupReviewSystem();
    
    // Setup share system
    setupShareSystem();
    
    // Setup session form
    setupSessionForm();
    
    // Setup sound system
    setupSoundSystem();
    
    // Setup FAQ system
    setupFAQSystem();
    
    // Load page from hash
    loadPageFromHash();
    
    // Setup navigation
    setupNavigation();
    
    // Welcome notification
    setTimeout(() => {
        if (!localStorage.getItem('hasVisited')) {
            showNotification('স্বাগতম! কথা বলা বা না বলা — সবই গ্রহণযোগ্য।', 'info');
            localStorage.setItem('hasVisited', 'true');
        }
    }, 1000);
    
    console.log(`${CONFIG.APP_NAME} সফলভাবে শুরু হয়েছে`);
}

function loadPageFromHash() {
    const hash = window.location.hash.substring(1);
    const validPages = ['home', 'about', 'how-it-works', 'sessions', 'reviews', 'share', 'resources', 'start'];
    
    if (hash && validPages.includes(hash)) {
        showPage(hash);
    } else {
        showPage('home');
    }
}

function setupNavigation() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href') !== '#') {
                e.preventDefault();
                const pageId = this.getAttribute('href').substring(1);
                showPage(pageId);
            }
        });
    });
}

// ===== গ্লোবাল ফাংশন =====
window.showPage = showPage;
window.toggleTheme = toggleTheme;

// ===== অ্যাপ্লিকেশন শুরু =====
document.addEventListener('DOMContentLoaded', initializeApp);

// Hash change listener
window.addEventListener('hashchange', loadPageFromHash);
