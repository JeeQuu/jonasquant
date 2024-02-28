document.addEventListener('DOMContentLoaded', (event) => {
    // Text overlay functionality
    const textOverlay = document.getElementById('text-overlay');
    const texts = [
        "The future is now baby.",
        "How are you today?",
        "You are taking things way too seriously.",
        "Are you scared of robots?",
        "I find inspiration in the dark.",
        "Be nice to the nice.",
        "Even super cool Ninjas suffer from erection problems sometimes.",
        "If you can't convince them, confuse them.",
        "You look stupid in that outfit.",
        "I'm scared.",
        "I hate orange candy.",
        "Prepare for an emotional rollercoaster.",
        "I still have no clue what I'm gonna do when I grow up.",
        "I love you.",
        "Have you had enough water today?",
        // Add more fun lines as you like
    ];
    let textIndex = 0;

    function updateText() {
        textOverlay.innerHTML = texts[textIndex++ % texts.length];
    }

    setInterval(updateText, 10000); // Update text every 10 seconds

    // Audio control functionality
    const backgroundMusic = document.getElementById('background-music');
    const audioControlButton = document.getElementById('audioControl');

    // Set the initial volume; adjust as necessary.
    backgroundMusic.volume = 0.2;

    // Event listener for the button click to toggle play/pause.
    audioControlButton.addEventListener('click', () => {
        backgroundMusic.muted = !backgroundMusic.muted;
        audioControlButton.textContent = backgroundMusic.muted ? 'Unmute Audio' : 'Mute Audio';
    });

    // Optional: Mute the audio initially and adjust the button text accordingly.
    backgroundMusic.muted = true;
    backgroundMusic.autoplay = true;
    backgroundMusic.loop = true;
    audioControlButton.textContent = 'Unmute Audio';

    // iOS-specific video handling
    const videoElement = document.getElementById('bg-video');
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.platform) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    if (isIOS()) {
        videoElement.setAttribute('playsinline', '');
        videoElement.muted = true; // Mute the video to allow autoplay on iOS
    }
});
