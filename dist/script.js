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
    ];

    function changeText() {
        textOverlay.style.opacity = 0;
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * texts.length);
            textOverlay.innerHTML = texts[randomIndex];
            textOverlay.style.opacity = 1;
        }, 1000);
    }

    function initiateTextChange() {
        setTimeout(() => {
            changeText();
            initiateTextChange();
        }, getRandomTime(4000, 7000));
    }

    function getRandomTime(min, max) {
        return Math.random() * (max - min) + min;
    }

    initiateTextChange();
  
let isToggling = false; // Flag to indicate if toggling is in progress
  
    const audioControlImage = document.getElementById('audioControlImage');
    const backgroundMusic = document.getElementById('background-music');

    // Set initial volume
    backgroundMusic.volume = 0.5; // 50% volume. Adjust as needed.

    function toggleMusic(event) {
        // ... (existing toggleMusic function code)
    }

    // ... (the rest of your code remains unchanged)
  
    function toggleMusic(event) {
        if (isToggling) {
            return; // If toggling is in progress, don't do anything
        }
        isToggling = true; // Set the flag to indicate toggling is in progress

        event.preventDefault(); // Important to prevent any default action.
        console.log("Toggle music clicked");
        if (backgroundMusic.paused) {
            backgroundMusic.play().then(() => {
                console.log("Music playing");
                audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
                audioControlImage.alt = "Music On";
                isToggling = false; // Reset the flag after toggling
            }).catch(error => {
                console.error('Audio playback failed:', error);
                isToggling = false; // Reset the flag if an error occurs
            });
        } else {
            console.log("Music paused");
            backgroundMusic.pause();
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
            audioControlImage.alt = "Music Off";
            isToggling = false; // Reset the flag after toggling
        }
    }

    audioControlImage.addEventListener('click', toggleMusic);

    // ... (the rest of your code remains unchanged)

    const videoElement = document.getElementById('bg-video');

    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.platform) ||
               (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    if (isIOS()) {
        videoElement.setAttribute('playsinline', '');
        videoElement.muted = true;
        videoElement.src = "https://res.cloudinary.com/dakoxedxt/video/upload/v1709158796/STORYMODE1.mov";
    } else {
        videoElement.src = "https://res.cloudinary.com/dakoxedxt/video/upload/v1709158799/YOUTUBE.mov";
    }
    videoElement.load();

    function sendEmail() {
        var user = "joel";
        var domain = "borglundell.se";
        window.location.href = "mailto:" + user + "@" + domain;
    }
});