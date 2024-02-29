document.addEventListener('DOMContentLoaded', () => {
    const textOverlay = document.getElementById('text-overlay');
    const texts = [
        "The future is now, baby",
        "How are you today?",
        "This is how we dance",
        "You are taking things way too seriously",
        "Are you scared of robots?",
        "I'm just a shy boy",
        "I find inspiration in the dark",
        "Save the world, please",
        "Imagine a world without tomatoes",
        "Be nice to the nice",
    "Ai for president",
        "Grow up",
        "Even super cool ninjas cry sometimes",
        "If you can't convince them, confuse them",
        "Favorite toy?",
        "Be happy",
        "Human race",
        "Take chances",
        "It's only in your head",
        "Prepare for an emotional rollercoaster",
        "Drink water",
        // Additional texts as desired...
    ];

    function changeText() {
        textOverlay.style.opacity = 0; // Start fade out
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * texts.length);
            textOverlay.innerHTML = texts[randomIndex];
            textOverlay.style.opacity = 1; // Fade in immediately after updating text
        }, 1000); // This timeout matches the CSS transition duration for opacity
    }

    function initiateTextChange() {
        setTimeout(() => {
            changeText();
            initiateTextChange(); // Recursively call to continue the cycle with random timing
        }, getRandomTime(4000, 7000)); // Random interval between text changes
    }

    function getRandomTime(min, max) {
        return Math.random() * (max - min) + min;
    }

    initiateTextChange();

    const audioControlImage = document.getElementById('audioControlImage');
    const backgroundMusic = document.getElementById('background-music');

    function toggleMusic(event) {
        event.preventDefault(); // Added to prevent the default action
        console.log("Toggle music clicked"); // For debugging
        if (backgroundMusic.paused || backgroundMusic.muted) {
            backgroundMusic.muted = false;
            backgroundMusic.play().then(() => {
                audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
                audioControlImage.alt = "Music On";
                console.log("Music playing"); // For debugging
            }).catch(error => {
                console.error('Audio playback failed:', error);
            });
        } else {
            backgroundMusic.pause();
            backgroundMusic.muted = true;
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
            audioControlImage.alt = "Music Off";
            console.log("Music paused"); // For debugging
        }
    }

    audioControlImage.addEventListener('click', toggleMusic);

    const videoElement = document.getElementById('bg-video');

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.platform) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    if (isIOS()) {
        videoElement.setAttribute('playsinline', '');
        videoElement.muted = true; // Mute the video to allow autoplay on iOS
        videoElement.src = "https://res.cloudinary.com/dakoxedxt/video/upload/v1709158796/STORYMODE1.mov"; // iOS-specific video source
    } else {
        videoElement.src = "https://res.cloudinary.com/dakoxedxt/video/upload/v1709158799/YOUTUBE.mov"; // Default video source
    }
    videoElement.load(); // Ensure the video element reloads to apply the new source if needed

    function sendEmail() {
        var user = "joel";
        var domain = "borglundell.se";
        window.location.href = "mailto:" + user + "@" + domain;
    }
});