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

    const audioControlImage = document.getElementById('audioControlImage');
    const backgroundMusic = document.getElementById('background-music');

// Ensure the audio is ready to play
backgroundMusic.addEventListener('canplaythrough', event => {
    console.log("Audio ready to play!");
    // Optionally, enable the audio control button here to ensure user can only interact when audio is ready.
});

function toggleMusic(event) {
    event.preventDefault(); // Important to prevent any default action.
    console.log("Toggle music clicked");
    if (backgroundMusic.paused) {
        backgroundMusic.play().then(() => {
            console.log("Music playing");
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
            audioControlImage.alt = "Music On";
        }).catch(error => {
            console.error('Audio playback failed:', error);
        });
    } else {
        console.log("Music paused");
        backgroundMusic.pause();
        audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
        audioControlImage.alt = "Music Off";
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