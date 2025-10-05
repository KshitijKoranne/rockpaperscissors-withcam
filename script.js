// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

class RockPaperScissorsGame {
    constructor() {
        this.videoElement = document.getElementById('webcam');
        this.canvasElement = document.getElementById('output');
        this.canvasCtx = this.canvasElement.getContext('2d');
        
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
        
        this.hands = null;
        this.animationId = null;
        this.isProcessing = false;
        this.cameraStream = null;
        this.countdownInterval = null;

        this.gameState = {
            round: 1,
            playerScore: 0,
            computerScore: 0,
            isPlaying: false,
            currentPlayerGesture: null,
            currentComputerChoice: null,
            countdown: 0
        };

        this.matchState = {
            mode: '3',
            playerWins: 0,
            computerWins: 0,
            matchActive: false
        };

        this.audioState = {
            isMuted: localStorage.getItem('audioMuted') === 'true',
            previousVolume: 0.5
        };

        this.aiState = {
            difficulty: 'medium',
            playerHistory: [],
            maxHistoryLength: 5
        };

        this.themeState = {
            isDark: localStorage.getItem('darkMode') === 'true'
        };

        this.achievementsState = {
            achievements: this.loadAchievements(),
            stats: this.loadStats()
        };

        this.gestures = ['rock', 'paper', 'scissors'];
        this.gestureEmojis = {
            'rock': '✊',
            'paper': '✋',
            'scissors': '✌️'
        };
        
        this.detectedGesture = null;
        this.gestureConfidence = 0;
        this.gestureHistory = [];
        this.gestureStabilityFrames = 5;
        this.confidenceThreshold = 0.8;
        this.currentQuality = 0;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeTheme();

        // Check device compatibility before initializing camera
        if (this.isMobilePhone()) {
            this.showMobileBlockModal();
        } else {
            this.initializeCamera();
        }
    }
    
    initializeElements() {
        const getElement = (id) => document.getElementById(id);

        this.elements = {
            gestureDetected: getElement('gesture-detected'),
            roundNumber: getElement('round-number'),
            countdown: getElement('countdown'),
            playerChoice: getElement('player-choice'),
            computerChoice: getElement('computer-choice'),
            playerGesture: getElement('player-gesture'),
            computerGesture: getElement('computer-gesture'),
            roundResult: getElement('round-result'),
            playButton: getElement('play-button'),
            resetButton: getElement('reset-button'),
            playerScore: getElement('player-score'),
            computerScore: getElement('computer-score'),
            gestureIcons: document.querySelectorAll('.gesture-icon'),
            gestureText: getElement('gesture-text'),
            qualityFill: getElement('quality-fill'),
            qualityText: getElement('quality-text'),
            confettiContainer: getElement('confetti-container'),
            helpButton: getElement('help-button'),
            helpModal: getElement('help-modal'),
            closeModal: getElement('close-modal'),
            backgroundMusic: getElement('background-music'),
            volumeSlider: getElement('volume-slider'),
            gameModeSelector: getElement('game-mode'),
            matchWinnerModal: getElement('match-winner-modal'),
            matchWinnerTitle: document.querySelector('.match-winner-title'),
            matchWinnerScore: document.querySelector('.match-winner-score'),
            newMatchButton: getElement('new-match-button'),
            muteButton: getElement('mute-button'),
            volumeIconUnmuted: getElement('volume-icon-unmuted'),
            volumeIconMuted: getElement('volume-icon-muted'),
            gestureReadyIndicator: getElement('gesture-ready-indicator'),
            practiceModeCheckbox: getElement('practice-mode'),
            difficultySelector: getElement('difficulty'),
            themeToggle: getElement('theme-toggle'),
            sunIcon: getElement('sun-icon'),
            moonIcon: getElement('moon-icon'),
            achievementsButton: getElement('achievements-button'),
            achievementsModal: getElement('achievements-modal'),
            closeAchievementsModal: getElement('close-achievements-modal'),
            achievementsList: getElement('achievements-list'),
            cameraErrorModal: getElement('camera-error-modal'),
            cameraErrorMessage: getElement('camera-error-message'),
            retryCameraButton: getElement('retry-camera-button'),
            mobileBlockModal: getElement('mobile-block-modal')
        };
    }
    
    setupEventListeners() {
        this.elements.playButton.addEventListener('click', () => this.startRound());
        this.elements.resetButton.addEventListener('click', () => this.resetGame());
        this.elements.helpButton.addEventListener('click', () => this.openModal());
        this.elements.closeModal.addEventListener('click', () => this.closeModal());
        this.elements.gameModeSelector.addEventListener('change', (e) => this.changeGameMode(e.target.value));
        this.elements.newMatchButton.addEventListener('click', () => this.startNewMatch());
        this.elements.muteButton.addEventListener('click', () => this.toggleMute());
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.elements.achievementsButton.addEventListener('click', () => this.openAchievementsModal());
        this.elements.closeAchievementsModal.addEventListener('click', () => this.closeAchievementsModal());
        this.elements.retryCameraButton.addEventListener('click', () => this.retryCamera());

        // Close modal when clicking outside
        this.elements.helpModal.addEventListener('click', (e) => {
            if (e.target === this.elements.helpModal) {
                this.closeModal();
            }
        });

        this.elements.achievementsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.achievementsModal) {
                this.closeAchievementsModal();
            }
        });

        // Window resize listener to re-check device compatibility
        window.addEventListener('resize', debounce(() => {
            this.checkDeviceCompatibility();
        }, 500));

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            // Close achievements modal with Escape
            if (e.key === 'Escape' && this.elements.achievementsModal.classList.contains('show')) {
                this.closeAchievementsModal();
                return;
            }

            // Close help modal with Escape
            if (e.key === 'Escape' && this.elements.helpModal.classList.contains('show')) {
                this.closeModal();
                return;
            }

            // Close match winner modal with Escape or Enter
            if ((e.key === 'Escape' || e.key === 'Enter') && this.elements.matchWinnerModal.classList.contains('show')) {
                this.startNewMatch();
                return;
            }

            // Space bar or Enter to start round
            if ((e.key === ' ' || e.key === 'Enter') && !this.gameState.isPlaying &&
                !this.elements.helpModal.classList.contains('show') &&
                !this.elements.matchWinnerModal.classList.contains('show') &&
                !this.elements.achievementsModal.classList.contains('show')) {
                e.preventDefault(); // Prevent page scroll on space
                this.startRound();
            }
        });

        // Background music setup
        this.audioState.previousVolume = this.elements.volumeSlider.value / 100;
        this.elements.backgroundMusic.volume = this.audioState.isMuted ? 0 : this.audioState.previousVolume;
        this.updateMuteIcon();

        // Debounced localStorage save for volume
        const debouncedVolumeSave = debounce((isMuted) => {
            try {
                localStorage.setItem('audioMuted', isMuted.toString());
            } catch (error) {
                console.error('Failed to save audio mute state:', error);
            }
        }, 500);

        this.elements.volumeSlider.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.audioState.previousVolume = volume;

            if (!this.audioState.isMuted) {
                this.elements.backgroundMusic.volume = volume;
            }

            // Unmute if user adjusts volume
            if (volume > 0 && this.audioState.isMuted) {
                this.audioState.isMuted = false;
                this.updateMuteIcon();
                debouncedVolumeSave(false);
            }
        });

        // Auto-play music when user interacts
        document.addEventListener('click', () => {
            if (this.elements.backgroundMusic.paused) {
                this.elements.backgroundMusic.play().catch(err => {
                    console.log('Audio autoplay prevented:', err);
                });
            }
        }, { once: true });
    }

    toggleMute() {
        this.audioState.isMuted = !this.audioState.isMuted;

        if (this.audioState.isMuted) {
            this.elements.backgroundMusic.volume = 0;
        } else {
            this.elements.backgroundMusic.volume = this.audioState.previousVolume;
        }

        this.updateMuteIcon();

        try {
            localStorage.setItem('audioMuted', this.audioState.isMuted.toString());
        } catch (error) {
            console.error('Failed to save audio mute state:', error);
        }
    }

    updateMuteIcon() {
        if (this.audioState.isMuted) {
            this.elements.volumeIconUnmuted.style.display = 'none';
            this.elements.volumeIconMuted.style.display = 'block';
        } else {
            this.elements.volumeIconUnmuted.style.display = 'block';
            this.elements.volumeIconMuted.style.display = 'none';
        }
    }

    initializeTheme() {
        if (this.themeState.isDark) {
            document.body.classList.add('dark-mode');
        }
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.themeState.isDark = !this.themeState.isDark;
        document.body.classList.toggle('dark-mode');

        try {
            localStorage.setItem('darkMode', this.themeState.isDark.toString());
        } catch (error) {
            console.error('Failed to save theme preference:', error);
        }

        this.updateThemeIcon();
    }

    updateThemeIcon() {
        if (this.themeState.isDark) {
            this.elements.sunIcon.style.display = 'none';
            this.elements.moonIcon.style.display = 'block';
        } else {
            this.elements.sunIcon.style.display = 'block';
            this.elements.moonIcon.style.display = 'none';
        }
    }

    openModal() {
        this.elements.helpModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.elements.closeModal.focus();
    }

    closeModal() {
        this.elements.helpModal.classList.remove('show');
        document.body.style.overflow = '';
        this.elements.helpButton.focus();
    }

    isMobilePhone() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;

        // iPad detection (iPads should be allowed)
        const isIPad = /iPad/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

        // Android tablet detection (Android tablets should be allowed)
        const isAndroidTablet = /Android/i.test(userAgent) && !(/Mobile/i.test(userAgent));

        // If it's a tablet, allow it
        if (isIPad || isAndroidTablet) {
            return false;
        }

        // Block all mobile phones: iPhone, iPod, Android phones, etc.
        const isMobilePhone = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        return isMobilePhone;
    }

    showMobileBlockModal() {
        console.log('Mobile phone detected - blocking game access');
        this.elements.mobileBlockModal.classList.add('show');
        this.elements.mobileBlockModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // Disable all game controls
        this.elements.playButton.disabled = true;
        this.elements.resetButton.disabled = true;
    }

    hideMobileBlockModal() {
        this.elements.mobileBlockModal.classList.remove('show');
        this.elements.mobileBlockModal.style.display = 'none';
        document.body.style.overflow = '';

        // Re-enable game controls
        this.elements.playButton.disabled = false;
        this.elements.resetButton.disabled = false;
    }

    checkDeviceCompatibility() {
        const isBlockedCurrently = this.elements.mobileBlockModal.classList.contains('show');
        const shouldBeBlocked = this.isMobilePhone();

        if (shouldBeBlocked && !isBlockedCurrently) {
            // Device is now too small - show block modal
            this.showMobileBlockModal();
            // Clean up camera if it was running
            if (this.isProcessing) {
                this.cleanupCamera();
            }
        } else if (!shouldBeBlocked && isBlockedCurrently) {
            // Device is now large enough - hide block modal and initialize camera
            this.hideMobileBlockModal();
            if (!this.isProcessing && !this.cameraStream) {
                this.initializeCamera();
            }
        }
    }

    async initializeCamera() {
        try {
            console.log('Initializing camera...');

            // Cleanup existing camera stream first
            this.cleanupCamera();

            // Check if mediaDevices is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.showCameraError('Your browser does not support camera access. Please use a modern browser like Chrome, Firefox, or Safari.');
                return;
            }

            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.cameraStream = stream;
            this.videoElement.srcObject = stream;

            this.videoElement.addEventListener('loadedmetadata', () => {
                console.log('Video metadata loaded');
                const width = this.videoElement.videoWidth || 640;
                const height = this.videoElement.videoHeight || 480;

                this.canvasElement.width = width;
                this.canvasElement.height = height;
                this.offscreenCanvas.width = width;
                this.offscreenCanvas.height = height;
            }, { once: true });

            // Wait for video to be ready to play
            await this.videoElement.play();
            console.log('Video playing');

            // Safari compatibility: wait a bit for video to be fully ready
            await new Promise(resolve => setTimeout(resolve, 300));

            this.initializeMediaPipe();

            console.log('Camera initialized successfully');

        } catch (error) {
            console.error('Error accessing camera:', error);

            let errorMessage = 'Unable to access camera. ';

            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                errorMessage = 'Camera permission was denied. Please allow camera access to play this game.';
            } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found on this device. This game requires a camera to detect hand gestures.';
            } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                errorMessage = 'Camera is already in use by another application. Please close other apps using the camera and try again.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Camera does not meet the required specifications. Please try a different camera.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Camera access is blocked due to security settings. Please check your browser permissions.';
            } else {
                errorMessage = `Camera error: ${error.message || 'Unknown error occurred'}`;
            }

            this.showCameraError(errorMessage);
        }
    }

    cleanupCamera() {
        // Stop animation frame loop
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Stop camera stream
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => {
                track.stop();
                console.log('Camera track stopped:', track.kind);
            });
            this.cameraStream = null;
        }

        // Clear video element
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject = null;
        }

        // Reset processing flag
        this.isProcessing = false;

        console.log('Camera resources cleaned up');
    }

    showCameraError(message) {
        this.elements.cameraErrorMessage.textContent = message;
        this.elements.cameraErrorModal.classList.add('show');
        document.body.style.overflow = 'hidden';
        this.elements.playButton.disabled = true;
    }

    retryCamera() {
        this.elements.cameraErrorModal.classList.remove('show');
        document.body.style.overflow = '';
        this.initializeCamera();
    }
    
    initializeMediaPipe() {
        console.log('Initializing MediaPipe Hands...');

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onHandResults(results));

        this.startVideoProcessing();

        // Enable play button after MediaPipe is initialized
        this.elements.playButton.disabled = false;
        console.log('MediaPipe Hands initialized successfully');
    }
    
    startVideoProcessing() {
        // Prevent multiple processing loops
        if (this.isProcessing) {
            console.warn('Video processing already running');
            return;
        }

        this.isProcessing = true;
        console.log('Starting video processing loop');

        const processFrame = async () => {
            // Check if we should continue processing
            if (!this.isProcessing) {
                console.log('Video processing stopped');
                return;
            }

            if (this.videoElement.readyState === 4) {
                try {
                    await this.hands.send({ image: this.videoElement });
                } catch (error) {
                    console.error('Error processing video frame:', error);
                }
            }

            this.animationId = requestAnimationFrame(processFrame);
        };
        processFrame();
    }
    
    onHandResults(results) {
        this.offscreenCtx.save();
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            
            drawConnectors(this.offscreenCtx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 3});
            drawLandmarks(this.offscreenCtx, landmarks, {color: '#FF0000', lineWidth: 2, radius: 4});
            
            const gestureResult = this.classifyGesture(landmarks);
            const smoothedGesture = this.smoothGesture(gestureResult);
            this.updateGestureDisplay(smoothedGesture);
            this.updateQualityIndicator(gestureResult);
        } else {
            this.updateGestureDisplay(null);
            this.updateQualityIndicator({ gesture: null, confidence: 0 });
        }
        
        this.offscreenCtx.restore();
        
        this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.canvasCtx.drawImage(this.offscreenCanvas, 0, 0);
    }
    
    classifyGesture(landmarks) {
        try {
            if (!landmarks || landmarks.length !== 21) {
                return { gesture: null, confidence: 0 };
            }

            const FINGER_TIPS = [4, 8, 12, 16, 20];
            const FINGER_MCPS = [2, 5, 9, 13, 17];
            const FINGER_PIPS = [3, 6, 10, 14, 18];
            const EXTENSION_THRESHOLD = 0.03;

            const extendedFingers = [];
            const fingerConfidences = [];

            // Validate landmark data
            for (let i = 0; i < landmarks.length; i++) {
                if (!landmarks[i] || typeof landmarks[i].x === 'undefined' || typeof landmarks[i].y === 'undefined') {
                    console.warn('Invalid landmark data at index', i);
                    return { gesture: null, confidence: 0 };
                }
            }

            // Check thumb (different logic due to thumb orientation)
            const thumbExtended = landmarks[4].x > landmarks[3].x;
            if (thumbExtended) {
                extendedFingers.push('thumb');
            }
            fingerConfidences.push(Math.abs(landmarks[4].x - landmarks[3].x) * 5);

            // Check other fingers
            for (let i = 1; i < 5; i++) {
                const tipIndex = FINGER_TIPS[i];
                const pipIndex = FINGER_PIPS[i];
                const mcpIndex = FINGER_MCPS[i];

                const fingerExtended = landmarks[tipIndex].y < landmarks[pipIndex].y;
                const extensionDistance = Math.abs(landmarks[tipIndex].y - landmarks[mcpIndex].y);

                if (fingerExtended && extensionDistance > EXTENSION_THRESHOLD) {
                    extendedFingers.push(i);
                }

                fingerConfidences.push(Math.min(1.0, extensionDistance * 8));
            }

            const avgFingerConfidence = fingerConfidences.reduce((a, b) => a + b, 0) / fingerConfidences.length;

            let gesture = null;
            let gestureSpecificConfidence = 0;

            const isRock = extendedFingers.length === 0 ||
                           (extendedFingers.length === 1 && extendedFingers.includes('thumb'));
            const isPaper = extendedFingers.length >= 4;
            const isScissors = extendedFingers.includes(1) &&
                              extendedFingers.includes(2) &&
                              extendedFingers.length <= 3;

            if (isRock) {
                gesture = 'rock';
                gestureSpecificConfidence = avgFingerConfidence * 0.9 + 0.1;
            } else if (isPaper) {
                gesture = 'paper';
                gestureSpecificConfidence = avgFingerConfidence * 0.8 + 0.2;
            } else if (isScissors) {
                gesture = 'scissors';
                const scissorsSpecific = (fingerConfidences[1] + fingerConfidences[2]) / 2;
                gestureSpecificConfidence = scissorsSpecific * 0.7 + 0.3;
            }

            return { gesture, confidence: Math.min(1.0, gestureSpecificConfidence) };
        } catch (error) {
            console.error('Error in gesture classification:', error);
            return { gesture: null, confidence: 0 };
        }
    }
    
    smoothGesture(gestureResult) {
        if (!gestureResult || !gestureResult.gesture) {
            this.gestureHistory = [];
            return null;
        }
        
        this.gestureHistory.push(gestureResult);
        
        if (this.gestureHistory.length > this.gestureStabilityFrames) {
            this.gestureHistory.shift();
        }
        
        if (this.gestureHistory.length < this.gestureStabilityFrames) {
            return null;
        }
        
        const gestureCounts = {};
        let totalConfidence = 0;
        
        this.gestureHistory.forEach(result => {
            if (result.gesture) {
                gestureCounts[result.gesture] = (gestureCounts[result.gesture] || 0) + 1;
                totalConfidence += result.confidence;
            }
        });
        
        const avgConfidence = totalConfidence / this.gestureHistory.length;
        
        if (avgConfidence < this.confidenceThreshold) {
            return null;
        }
        
        const dominantGesture = Object.keys(gestureCounts).reduce((a, b) => 
            gestureCounts[a] > gestureCounts[b] ? a : b);
        
        const dominantCount = gestureCounts[dominantGesture];
        const stabilityRatio = dominantCount / this.gestureHistory.length;
        
        if (stabilityRatio >= 0.6) {
            return dominantGesture;
        }

        return null;
    }

    updateGestureDisplay(gesture) {
        this.detectedGesture = gesture;

        this.elements.gestureIcons.forEach(icon => {
            icon.classList.remove('active');
        });

        if (gesture) {
            const capitalizedGesture = gesture.charAt(0).toUpperCase() + gesture.slice(1);

            // Update dedicated text element
            this.elements.gestureText.textContent = `Detected: ${capitalizedGesture} ${this.gestureEmojis[gesture]}`;

            const activeIcon = document.querySelector(`[data-gesture="${gesture}"]`);
            if (activeIcon) {
                activeIcon.classList.add('active');
            }

            // Show ready indicator
            this.elements.gestureReadyIndicator.classList.add('show');
        } else {
            // Update dedicated text element
            this.elements.gestureText.textContent = 'Show your hand to the camera';

            // Hide ready indicator
            this.elements.gestureReadyIndicator.classList.remove('show');
        }
    }
    
    updateQualityIndicator(gestureResult) {
        const confidence = gestureResult ? gestureResult.confidence : 0;
        this.currentQuality = confidence;

        const percentage = Math.round(confidence * 100);
        this.elements.qualityFill.style.width = `${percentage}%`;

        const qualityBar = this.elements.qualityFill.parentElement;
        qualityBar.setAttribute('aria-valuenow', percentage);

        if (confidence === 0) {
            this.elements.qualityText.textContent = '--';
        } else {
            this.elements.qualityText.textContent = `${percentage}%`;
        }
    }
    
    startRound() {
        if (this.gameState.isPlaying) return;

        // Practice mode - just show gestures, no game
        if (this.elements.practiceModeCheckbox.checked) {
            return; // Gestures are already being shown in practice mode
        }

        // Clear any existing countdown interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        this.gameState.isPlaying = true;
        this.elements.playButton.disabled = true;
        this.elements.playButton.textContent = 'Get Ready...';

        this.clearPreviousRound();

        let countdown = 3;
        this.elements.countdown.textContent = countdown;

        this.countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                this.elements.countdown.textContent = countdown;
            } else if (countdown === 0) {
                this.elements.countdown.textContent = 'SHOW!';
            } else {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
                this.captureGesture();
            }
        }, 1000);
    }
    
    captureGesture() {
        const playerGesture = this.detectedGesture;
        const computerChoice = this.getAIChoice(playerGesture);

        // Store player history for AI learning
        if (playerGesture) {
            this.aiState.playerHistory.push(playerGesture);
            if (this.aiState.playerHistory.length > this.aiState.maxHistoryLength) {
                this.aiState.playerHistory.shift();
            }
        }

        this.gameState.currentPlayerGesture = playerGesture;
        this.gameState.currentComputerChoice = computerChoice;

        this.displayChoices(playerGesture, computerChoice);
        this.determineWinner(playerGesture, computerChoice);

        this.elements.countdown.textContent = '';
        this.gameState.isPlaying = false;
        this.elements.playButton.disabled = false;
        this.elements.playButton.textContent = 'Play Again';
    }

    getAIChoice(playerGesture) {
        const difficulty = this.elements.difficultySelector.value;
        const counterMoves = {
            'rock': 'paper',
            'paper': 'scissors',
            'scissors': 'rock'
        };

        switch (difficulty) {
            case 'easy':
                // Random choice
                return this.gestures[Math.floor(Math.random() * 3)];

            case 'medium':
                // 30% chance to counter player's last move
                if (playerGesture && Math.random() < 0.3) {
                    return counterMoves[playerGesture];
                }
                return this.gestures[Math.floor(Math.random() * 3)];

            case 'hard':
                // Pattern learning - predict based on history
                if (this.aiState.playerHistory.length >= 3) {
                    const mostCommon = this.getMostCommonGesture();
                    if (mostCommon && Math.random() < 0.6) {
                        return counterMoves[mostCommon];
                    }
                }
                // Fallback to medium strategy
                if (playerGesture && Math.random() < 0.4) {
                    return counterMoves[playerGesture];
                }
                return this.gestures[Math.floor(Math.random() * 3)];

            default:
                return this.gestures[Math.floor(Math.random() * 3)];
        }
    }

    getMostCommonGesture() {
        const counts = {};
        this.aiState.playerHistory.forEach(gesture => {
            counts[gesture] = (counts[gesture] || 0) + 1;
        });

        let maxCount = 0;
        let mostCommon = null;

        Object.keys(counts).forEach(gesture => {
            if (counts[gesture] > maxCount) {
                maxCount = counts[gesture];
                mostCommon = gesture;
            }
        });

        return mostCommon;
    }
    
    displayChoices(playerGesture, computerChoice) {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

        // Display player choice immediately
        if (playerGesture) {
            this.elements.playerChoice.textContent = this.gestureEmojis[playerGesture];
            this.elements.playerGesture.textContent = capitalize(playerGesture);
        } else {
            this.elements.playerChoice.textContent = '❌';
            this.elements.playerGesture.textContent = 'Not detected';
        }

        // Animate computer choice (slot machine effect)
        this.animateComputerChoice(computerChoice);
    }

    animateComputerChoice(finalChoice) {
        const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);
        const spinDuration = 400; // ms
        const spinSpeed = 80; // ms
        let currentIndex = 0;

        const spinTimer = setInterval(() => {
            const currentGesture = this.gestures[currentIndex % 3];
            this.elements.computerChoice.textContent = this.gestureEmojis[currentGesture];
            this.elements.computerGesture.textContent = '???';
            this.elements.computerChoice.classList.add('spinning');
            currentIndex++;
        }, spinSpeed);

        setTimeout(() => {
            clearInterval(spinTimer);
            this.elements.computerChoice.classList.remove('spinning');
            this.elements.computerChoice.textContent = this.gestureEmojis[finalChoice];
            this.elements.computerGesture.textContent = capitalize(finalChoice);
            this.elements.computerChoice.classList.add('reveal');

            setTimeout(() => {
                this.elements.computerChoice.classList.remove('reveal');
            }, 300);
        }, spinDuration);
    }
    
    determineWinner(playerGesture, computerChoice) {
        const winConditions = {
            'rock': 'scissors',
            'paper': 'rock',
            'scissors': 'paper'
        };

        setTimeout(() => {
            let roundResult = '';

            if (!playerGesture) {
                this.elements.roundResult.textContent = 'No gesture detected - Computer wins!';
                this.elements.roundResult.className = 'lose animate-in';
                this.elements.computerChoice.classList.add('winner');
                this.gameState.computerScore++;
                roundResult = 'lose';
            } else if (playerGesture === computerChoice) {
                this.elements.roundResult.textContent = "It's a tie!";
                this.elements.roundResult.className = 'tie animate-in';
                roundResult = 'tie';
            } else if (winConditions[playerGesture] === computerChoice) {
                this.elements.roundResult.textContent = 'You win this round!';
                this.elements.roundResult.className = 'win animate-in';
                this.elements.playerChoice.classList.add('winner');
                this.gameState.playerScore++;
                this.triggerConfetti();
                roundResult = 'win';
            } else {
                this.elements.roundResult.textContent = 'Computer wins this round!';
                this.elements.roundResult.className = 'lose animate-in';
                this.elements.computerChoice.classList.add('winner');
                this.gameState.computerScore++;
                roundResult = 'lose';
            }

            this.updateScore();
            this.gameState.round++;
            this.elements.roundNumber.textContent = this.gameState.round;

            // Check achievements
            if (playerGesture) {
                this.checkAchievements(roundResult, playerGesture, computerChoice);
            }

            // Check for match winner
            this.checkMatchWinner();

            setTimeout(() => {
                this.elements.roundResult.classList.remove('animate-in');
            }, 600);
        }, 500);
    }

    checkMatchWinner() {
        if (this.matchState.mode === 'endless') return;

        const winsNeeded = Math.ceil(parseInt(this.matchState.mode) / 2);

        // Check player win first to prevent race condition
        if (this.gameState.playerScore >= winsNeeded) {
            setTimeout(() => this.showMatchWinner('You', this.gameState.playerScore, this.gameState.computerScore), 1500);
        } else if (this.gameState.computerScore >= winsNeeded) {
            // Only show computer win if player hasn't won
            setTimeout(() => this.showMatchWinner('Computer', this.gameState.computerScore, this.gameState.playerScore), 1500);
        }
    }

    showMatchWinner(winner, winnerScore, loserScore) {
        this.elements.matchWinnerTitle.textContent = `${winner} Win${winner === 'You' ? '' : 's'} the Match!`;
        this.elements.matchWinnerScore.textContent = `Final Score: ${winnerScore} - ${loserScore}`;
        this.elements.matchWinnerModal.classList.add('show');
        document.body.style.overflow = 'hidden';

        if (winner === 'You') {
            this.triggerConfetti();
            this.checkMatchAchievements(winner);
        }
    }

    startNewMatch() {
        this.elements.matchWinnerModal.classList.remove('show');
        document.body.style.overflow = '';
        this.resetGame();
    }

    changeGameMode(mode) {
        this.matchState.mode = mode;
        this.resetGame();
    }
    
    updateScore() {
        this.elements.playerScore.textContent = this.gameState.playerScore;
        this.elements.computerScore.textContent = this.gameState.computerScore;
    }
    
    clearPreviousRound() {
        this.elements.playerChoice.textContent = '?';
        this.elements.computerChoice.textContent = '?';
        this.elements.playerGesture.textContent = 'Waiting...';
        this.elements.computerGesture.textContent = 'Waiting...';
        this.elements.roundResult.textContent = '';
        this.elements.roundResult.className = '';
        
        this.elements.playerChoice.classList.remove('winner', 'loser');
        this.elements.computerChoice.classList.remove('winner', 'loser');
    }
    
    resetGame() {
        // Clear countdown interval if running
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }

        // Reset AI history for fair gameplay
        this.aiState.playerHistory = [];

        this.gameState = {
            round: 1,
            playerScore: 0,
            computerScore: 0,
            isPlaying: false,
            currentPlayerGesture: null,
            currentComputerChoice: null,
            countdown: 0
        };

        this.clearPreviousRound();
        this.updateScore();
        this.elements.roundNumber.textContent = this.gameState.round;
        this.elements.playButton.textContent = 'Start Playing';
        this.elements.playButton.disabled = false;
        this.elements.countdown.textContent = '';
    }
    
    triggerConfetti() {
        const container = this.elements.confettiContainer;
        const CONFETTI_COUNT = 50;
        const CONFETTI_LIFETIME = 4000;
        const SPAWN_DELAY = 50;

        for (let i = 0; i < CONFETTI_COUNT; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                confetti.style.animationDelay = `${Math.random() * 2}s`;
                confetti.style.animationDuration = `${Math.random() * 2 + 2}s`;
                confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

                container.appendChild(confetti);

                setTimeout(() => {
                    confetti.remove();
                }, CONFETTI_LIFETIME);
            }, i * SPAWN_DELAY);
        }
    }
    
    // Achievements System
    loadAchievements() {
        const defaultAchievements = [
            { id: 'first_win', title: 'First Victory', description: 'Win your first round', icon: '🏆', unlocked: false, progress: 0, target: 1 },
            { id: 'winning_streak', title: 'Hot Streak', description: 'Win 3 rounds in a row', icon: '🔥', unlocked: false, progress: 0, target: 3 },
            { id: 'match_winner', title: 'Match Champion', description: 'Win a Best-of match', icon: '👑', unlocked: false, progress: 0, target: 1 },
            { id: 'gesture_master', title: 'Gesture Master', description: 'Win with each gesture type', icon: '🎯', unlocked: false, progress: 0, target: 3 },
            { id: 'hard_mode_win', title: 'Challenge Accepted', description: 'Win on Hard difficulty', icon: '💪', unlocked: false, progress: 0, target: 1 },
            { id: 'perfect_match', title: 'Perfect Match', description: 'Win a Best-of match without losing', icon: '⭐', unlocked: false, progress: 0, target: 1 },
            { id: 'veteran', title: 'Veteran Player', description: 'Play 50 rounds', icon: '🎮', unlocked: false, progress: 0, target: 50 },
            { id: 'comeback', title: 'Never Give Up', description: 'Win after being behind 0-2', icon: '💫', unlocked: false, progress: 0, target: 1 }
        ];

        try {
            const saved = localStorage.getItem('achievements');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate structure
                if (Array.isArray(parsed) && parsed.length === defaultAchievements.length) {
                    return parsed;
                }
                console.warn('Invalid achievements data, using defaults');
            }
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
        return defaultAchievements;
    }

    loadStats() {
        const defaultStats = {
            totalRounds: 0,
            winStreak: 0,
            maxWinStreak: 0,
            gestureWins: { rock: false, paper: false, scissors: false },
            comebackInProgress: false
        };

        try {
            const saved = localStorage.getItem('achievementStats');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Validate structure
                if (parsed && typeof parsed === 'object' && 'totalRounds' in parsed) {
                    return parsed;
                }
                console.warn('Invalid stats data, using defaults');
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
        return defaultStats;
    }

    saveAchievements() {
        try {
            localStorage.setItem('achievements', JSON.stringify(this.achievementsState.achievements));
            localStorage.setItem('achievementStats', JSON.stringify(this.achievementsState.stats));
        } catch (error) {
            console.error('Failed to save achievements to localStorage:', error);
            // Silently fail - achievements will work this session but won't persist
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Achievement progress will not be saved.');
            }
        }
    }

    checkAchievements(roundResult, playerChoice, computerChoice) {
        const achievements = this.achievementsState.achievements;
        const stats = this.achievementsState.stats;
        let newUnlocks = [];

        stats.totalRounds++;

        // Track win streak
        if (roundResult === 'win') {
            stats.winStreak++;
            stats.maxWinStreak = Math.max(stats.maxWinStreak, stats.winStreak);

            // First win
            const firstWin = achievements.find(a => a.id === 'first_win');
            if (!firstWin.unlocked) {
                firstWin.unlocked = true;
                firstWin.progress = 1;
                newUnlocks.push(firstWin);
            }

            // Winning streak
            const streak = achievements.find(a => a.id === 'winning_streak');
            if (!streak.unlocked) {
                streak.progress = stats.winStreak;
                if (stats.winStreak >= 3) {
                    streak.unlocked = true;
                    newUnlocks.push(streak);
                }
            }

            // Gesture master
            stats.gestureWins[playerChoice] = true;
            const gestureMaster = achievements.find(a => a.id === 'gesture_master');
            if (!gestureMaster.unlocked) {
                const uniqueWins = Object.values(stats.gestureWins).filter(Boolean).length;
                gestureMaster.progress = uniqueWins;
                if (uniqueWins === 3) {
                    gestureMaster.unlocked = true;
                    newUnlocks.push(gestureMaster);
                }
            }

            // Hard mode win
            if (this.elements.difficultySelector.value === 'hard') {
                const hardMode = achievements.find(a => a.id === 'hard_mode_win');
                if (!hardMode.unlocked) {
                    hardMode.unlocked = true;
                    hardMode.progress = 1;
                    newUnlocks.push(hardMode);
                }
            }

            // Comeback achievement
            if (stats.comebackInProgress && this.gameState.playerScore > this.gameState.computerScore) {
                const comeback = achievements.find(a => a.id === 'comeback');
                if (!comeback.unlocked) {
                    comeback.unlocked = true;
                    comeback.progress = 1;
                    newUnlocks.push(comeback);
                }
                stats.comebackInProgress = false;
            }
        } else {
            stats.winStreak = 0;

            // Track if player is behind by 2 or more for comeback achievement
            if (this.gameState.computerScore - this.gameState.playerScore >= 2) {
                stats.comebackInProgress = true;
            }
        }

        // Veteran player
        const veteran = achievements.find(a => a.id === 'veteran');
        if (!veteran.unlocked) {
            veteran.progress = stats.totalRounds;
            if (stats.totalRounds >= 50) {
                veteran.unlocked = true;
                newUnlocks.push(veteran);
            }
        }

        this.saveAchievements();

        // Show notification for new unlocks
        newUnlocks.forEach((achievement, index) => {
            setTimeout(() => this.showAchievementUnlock(achievement), index * 500);
        });

        // Update badge indicator
        if (newUnlocks.length > 0) {
            this.elements.achievementsButton.classList.add('has-new');
        }
    }

    checkMatchAchievements(winner) {
        const achievements = this.achievementsState.achievements;
        let newUnlocks = [];

        if (winner === 'You') {
            // Match winner
            const matchWinner = achievements.find(a => a.id === 'match_winner');
            if (!matchWinner.unlocked) {
                matchWinner.unlocked = true;
                matchWinner.progress = 1;
                newUnlocks.push(matchWinner);
            }

            // Perfect match
            if (this.gameState.computerScore === 0) {
                const perfectMatch = achievements.find(a => a.id === 'perfect_match');
                if (!perfectMatch.unlocked) {
                    perfectMatch.unlocked = true;
                    perfectMatch.progress = 1;
                    newUnlocks.push(perfectMatch);
                }
            }
        }

        this.saveAchievements();

        newUnlocks.forEach((achievement, index) => {
            setTimeout(() => this.showAchievementUnlock(achievement), index * 500);
        });

        if (newUnlocks.length > 0) {
            this.elements.achievementsButton.classList.add('has-new');
        }
    }

    showAchievementUnlock(achievement) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification';
        notification.innerHTML = `
            <div class="achievement-notification-icon">${achievement.icon}</div>
            <div class="achievement-notification-content">
                <div class="achievement-notification-title">Achievement Unlocked!</div>
                <div class="achievement-notification-name">${achievement.title}</div>
            </div>
        `;
        document.body.appendChild(notification);

        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    openAchievementsModal() {
        this.elements.achievementsButton.classList.remove('has-new');
        this.renderAchievements();
        this.elements.achievementsModal.classList.add('show');
    }

    closeAchievementsModal() {
        this.elements.achievementsModal.classList.remove('show');
    }

    renderAchievements() {
        const achievements = this.achievementsState.achievements;
        this.elements.achievementsList.innerHTML = achievements.map(achievement => {
            const progressPercent = (achievement.progress / achievement.target) * 100;
            const statusClass = achievement.unlocked ? 'unlocked' : 'locked';

            return `
                <div class="achievement-card ${statusClass}">
                    <div class="achievement-icon">${achievement.icon}</div>
                    <h3 class="achievement-title">${achievement.title}</h3>
                    <p class="achievement-description">${achievement.description}</p>
                    ${!achievement.unlocked && achievement.target > 1 ? `
                        <div class="achievement-progress">
                            <div class="achievement-progress-bar">
                                <div class="achievement-progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                            <div class="achievement-progress-text">${achievement.progress}/${achievement.target}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    showError(message) {
        this.elements.gestureDetected.textContent = message;
        this.elements.gestureDetected.style.color = '#f44336';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game...');
    new RockPaperScissorsGame();

    if ('serviceWorker' in navigator) {
        // Use relative path for service worker to work in subdirectories
        const swPath = new URL('sw.js', document.baseURI).pathname;
        navigator.serviceWorker.register(swPath)
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope:', registration.scope);
            })
            .catch((error) => {
                console.error('ServiceWorker registration failed:', error);
            });
    }
});