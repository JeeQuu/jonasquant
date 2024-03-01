document.addEventListener('DOMContentLoaded', () => {
    const textOverlay = document.getElementById('text-overlay');
    const texts = [
        "The future is now, baby",
        // ... Add all your other text strings here
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

    const backgroundMusic = document.getElementById('background-music');
    const audioControlImage = document.getElementById('audioControlImage');
    let isMusicPlaying = false; // Tracks the playing state of the music

    // Revised Function to Toggle Music
    function toggleMusic() {
        if (isMusicPlaying) {
            backgroundMusic.pause();
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
            audioControlImage.alt = "Music Off";
        } else {
            backgroundMusic.play().then(() => {
                audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
                audioControlImage.alt = "Music On";
            }).catch(error => {
                console.error('Playback was prevented. Error:', error);
            });
        }
        isMusicPlaying = !isMusicPlaying; // Toggle the state
    }

    audioControlImage.addEventListener('click', toggleMusic);

    // Check for iOS to adjust video source if necessary
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
});

// Function to send an email - remains unchanged
function sendEmail() {
    var user = "joel";
    var domain = "borglundell.se";
    window.location.href = "mailto:" + user + "@" + domain;
}