# 🎮 Rock Paper Scissors - Hand Gesture Game

A real-time rock paper scissors game that uses your webcam to detect hand gestures and play against the computer!

## ✨ Features

### 🎯 Core Gameplay
- **Real-time hand gesture recognition** using MediaPipe Hands
- **Webcam integration** for live gesture detection
- **Visual feedback** with hand tracking overlay
- **Quality indicator** showing detection confidence
- **Gesture ready indicator** with checkmark when gesture is stable

### 🏆 Game Modes & Difficulty
- **Multiple game modes**: Best of 3, Best of 5, Best of 7, or Endless
- **Match winner system** with celebration modal and confetti
- **AI Difficulty Levels**:
  - **Easy**: Random choices
  - **Medium**: 30% counter-strategy
  - **Hard**: Pattern learning with player history tracking
- **Practice mode** to test gestures without competing

### 🎨 Visual & UX
- **Dark mode toggle** with smooth theme transitions
- **Computer choice animation** with slot machine spinning effect
- **Gesture icons** showing available hand gestures
- **Score tracking** across rounds and matches
- **Responsive design** that works on desktop and mobile

### 🎵 Audio & Controls
- **Background music** with volume control
- **Mute button** with localStorage persistence
- **Keyboard controls**:
  - `Space` or `Enter` to start round
  - `Escape` to close modals

### 🏅 Achievements System
Track your progress with 8 unique achievements:
- 🏆 **First Victory** - Win your first round
- 🔥 **Hot Streak** - Win 3 rounds in a row
- 👑 **Match Champion** - Win a Best-of match
- 🎯 **Gesture Master** - Win with each gesture type
- 💪 **Challenge Accepted** - Win on Hard difficulty
- ⭐ **Perfect Match** - Win a match without losing
- 🎮 **Veteran Player** - Play 50 rounds
- 💫 **Never Give Up** - Comeback from 0-2 deficit

Features include:
- Sliding notification popups for new achievements
- Progress bars for multi-step achievements
- Badge indicator for new unlocks
- localStorage persistence

## 🚀 How to Play

1. **Open the game**: Simply open `index.html` in your web browser
2. **Allow camera access**: Grant permission when prompted
3. **Choose your settings**:
   - Select game mode (Best of 3/5/7 or Endless)
   - Choose AI difficulty (Easy/Medium/Hard)
   - Toggle practice mode if desired
4. **Position your hand**: Hold your hand clearly in front of the camera
5. **Start playing**: Click "Start Playing" or press `Space`/`Enter`
6. **Make your gesture**: When the countdown ends, show your gesture:
   - **Rock** ✊: Make a fist
   - **Paper** ✋: Open hand with fingers spread
   - **Scissors** ✌️: Peace sign (two fingers up)

## 🎯 Game Rules

- Rock beats Scissors
- Scissors beats Paper
- Paper beats Rock
- Tie if both players choose the same gesture

## 🛠️ Technical Details

### Technologies Used
- **HTML5** for structure
- **CSS3** with CSS Variables for theming and responsive design
- **JavaScript (ES6+)** with class-based architecture
- **MediaPipe Hands** for hand tracking and gesture recognition
- **WebRTC** for webcam access
- **Service Worker** for PWA capabilities
- **localStorage** for persistent settings and achievements

### Browser Requirements
- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Camera access permissions
- JavaScript enabled

### Files Structure
```
rockpaperscissors/
├── index.html          # Main game page
├── style.css           # Game styling and theming
├── script.js           # Game logic and MediaPipe integration
├── sw.js               # Service worker for PWA
├── manifest.json       # PWA manifest
└── README.md           # This file
```

### Key Features Implementation

**Gesture Detection System**:
- Smoothing algorithm with gesture history tracking
- Confidence threshold (80%) for accurate detection
- Stability check across 5 frames
- Quality indicator based on landmark visibility

**AI Strategy**:
- Pattern learning with 5-move history
- Counter-move prediction
- Adaptive difficulty scaling

**Achievements Tracking**:
- Win streak monitoring
- Gesture variety tracking
- Comeback detection
- Match statistics

## 🎯 Tips for Best Results

1. **Good lighting**: Ensure adequate lighting for better hand detection
2. **Clear background**: Use a plain background behind your hand when possible
3. **Proper distance**: Keep your hand 2-3 feet from the camera
4. **Clear gestures**: Make distinct, well-formed gestures
5. **Steady hand**: Hold your gesture steady during detection
6. **Check quality bar**: Aim for green quality indicator before playing

## 🐛 Troubleshooting

**Camera not working?**
- Check if camera permissions are granted
- Try refreshing the page
- Ensure no other applications are using the camera

**Gestures not detected?**
- Improve lighting conditions
- Move hand closer/further from camera
- Make more distinct gestures
- Check if hand is fully visible in the camera view
- Wait for green checkmark indicator

**Game running slowly?**
- Close other browser tabs
- Try a different browser
- Check internet connection (for MediaPipe library loading)

**Dark mode not saving?**
- Ensure cookies/localStorage are enabled
- Clear browser cache and try again

## 🎮 Accessibility Features

- **ARIA labels** for screen readers
- **Keyboard navigation** support
- **Visual indicators** for all game states
- **High contrast** dark mode option
- **Focus management** in modals

## 📱 Progressive Web App (PWA)

This game can be installed as a Progressive Web App:
- Offline capability with service worker
- App-like experience on mobile
- Icon for home screen
- Optimized caching strategy

---

Built with ❤️ using MediaPipe and modern web technologies. Enjoy playing! 🎉
