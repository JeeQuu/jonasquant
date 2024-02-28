const textOverlay = document.getElementById('text-overlay');
const texts = [
   
    "The future is now baby.",
   "New album "Human Race" coming in 2024,
    "How are you today?",
  "You are taking things way to serious.",
    "Are you scared of robots?",
  "I find inspiration in the dark.",
     "Get a hobby.",
  "Be nice to the nice.",
   "Even super cool Ninjas suffer from erection problems.",
  "If you can't convince them, confuse them.",
  "Im scared.",
  "Prepare for an emotional rollercoaster.",
  "I still have no clue what im gonna do when I grow up.",
   "I love you.",
  "Have you had enough water today?",
  
  
    // Add more fun lines as you like
];
let textIndex = 0;

function updateText() {
    textOverlay.innerHTML = texts[textIndex++ % texts.length];
}

setInterval(updateText, 10000); // Update text every 10 seconds

document.addEventListener('DOMContentLoaded', (event) => {
    const backgroundMusic = document.getElementById('background-music');
    const audioControlButton = document.getElementById('audioControl');

    // Set the initial volume; adjust as necessary.
    backgroundMusic.volume = 0.2;

    // Function to toggle play/pause.
    const togglePlayPause = () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
            audioControlButton.textContent = 'Pause Audio';
        } else {
            backgroundMusic.pause();
            audioControlButton.textContent = 'Play Audio';
        }
    };

    // Event listener for the button click.
    audioControlButton.addEventListener('click', togglePlayPause);

    // Optional: Mute the audio initially and adjust the button text accordingly.
    backgroundMusic.muted = true;
    backgroundMusic.autoplay = true;
    backgroundMusic.loop = true;
    audioControlButton.textContent = 'Unmute Audio';
});

document.addEventListener('DOMContentLoaded', (event) => {
    const backgroundMusic = document.getElementById('background-music');
    const audioControlButton = document.getElementById('audioControl');

    // Event listener for the button click.
    audioControlButton.addEventListener('click', () => {
        if (backgroundMusic.muted) {
            backgroundMusic.muted = false;
            audioControlButton.textContent = 'Mute Audio';
        } else {
            backgroundMusic.muted = true;
            audioControlButton.textContent = 'Play Audio';
        }
    });

// Detect if the user is on an iOS device
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.platform) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Apply video and audio settings based on the OS
function applyMediaSettings() {
    const videoElement = document.getElementById('bg-video');
  
    if (isIOS()) {
        // iOS-specific settings
        videoElement.setAttribute('playsinline', ''); // Ensures inline playback
        videoElement.muted = true; // Mute the video to allow autoplay on iOS
    } else {
        // Settings for non-iOS devices
        videoElement.muted = false; // Unmute video for devices that allow autoplay with sound
        // No need to change audio settings for non-iOS as it will autoplay based on your existing settings
    }
}

});
