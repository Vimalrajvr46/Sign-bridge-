SignBridge

SignBridge is an AI-powered real-time communication platform designed to bridge the communication gap between deaf, mute, and hearing individuals. It enables seamless video calling with live speech-to-sign and sign-to-speech translation using AI, computer vision, and an interactive 3D avatar.

🌟 Features
🎥 Real-time WebRTC video calling
🧏 Role selection (Normal User / Deaf & Mute User)
🗣️ Speech-to-Text conversion
🤟 Sign Language Recognition using AI
🤖 Animated 3D Avatar for Sign Language
🔊 Text-to-Speech output
💬 Live multilingual captions
🌍 Caption language selection before joining a call
👤 Male/Female avatar selection
🏠 Room-based communication
⚡ Real-time communication using WebSockets
🎨 Modern Spatial UI / Liquid Glass interface

🚀 How It Works
Normal User → Deaf User
User joins a room.
Speech is converted into text.
Text is sent through WebSocket.
The AI avatar performs the corresponding ASL sign language animation.
Deaf User → Normal User
Webcam captures hand gestures.
AI detects sign language.
Signs are converted into text.
Text is displayed as live captions.
Optional Text-to-Speech reads the message aloud.

🏗️ Project Structure
signbridge/
│
├── backend/
│   ├── main.py
│   ├── sign_detection.py
│   ├── requirements.txt
│   └── models/
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── components/
│   ├── pages/
│   ├── avatar/
│   ├── styles/
│   └── assets/
│
├── animations/
│   ├── hello.glb
│   ├── thank_you.glb
│   ├── yes.glb
│   └── ...
│
├── README.md
└── LICENSE

🛠️ Technologies Used
Frontend:
React
Vite
HTML5
CSS3
JavaScript
Three.js
WebRTC
Web Speech API

Backend:
Python
FastAPI
WebSockets
MediaPipe
OpenCV
NumPy
Uvicorn
AI & Machine Learning
MediaPipe Hands
YOLO (optional)
TensorFlow / PyTorch
Whisper (Speech-to-Text)
NLLB-200 Translation Model
ONNX Runtime

🤖 AI Models
Purpose	Model
Speech Recognition	OpenAI Whisper
Hand Detection	MediaPipe Hands
Sign Recognition	MediaPipe / YOLO + Custom Classifier
Language Translation	Facebook NLLB-200
Avatar Animation	Three.js + GLB Animations
Text-to-Speech	Browser SpeechSynthesis API

🎯 Supported Flow
Normal User
      │
      ▼
Speech Recognition
      │
      ▼
Speech → Text
      │
      ▼
WebSocket
      │
      ▼
Animated Avatar
      │
      ▼
ASL Animation
Deaf User
      │
      ▼
Camera
      │
      ▼
Hand Detection
      │
      ▼
Sign Recognition
      │
      ▼
Text
      │
      ▼
Live Caption / Voice

⚙️ Installation
Clone Repository
git clone https://github.com/yourusername/signbridge.git
cd signbridge
Backend
cd backend

python -m venv .venv
Windows
.venv\Scripts\activate
Linux / macOS
source .venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Run backend:

uvicorn main:app --reload
Frontend
cd frontend

npm install

npm run dev

🎨 User Interface
Glassmorphism
Spatial UI
Liquid Glass Effects
Responsive Design
Modern Animations
Dark Theme
Smooth Page Transitions

📌 Future Enhancements
Full ASL sentence recognition
ISL (Indian Sign Language) support
AI-generated facial expressions
Mobile application
Offline AI inference
Voice cloning
Cloud synchronization
Emotion recognition
Multi-user conferencing
AI conversation history
Real-time language translation into 100+ languages
Custom avatar personalization

👨‍💻 Developers

Vimal Raj
AI | Full Stack Developer | UI/UX Designer

❤️ Vision
"Empowering inclusive communication by breaking language and accessibility barriers through Artificial Intelligence."
