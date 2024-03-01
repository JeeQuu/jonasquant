document.addEventListener('DOMContentLoaded', () => {
    // Text overlay functionality
    const textOverlay = document.getElementById('text-overlay');
    const texts = [
        "The future is now, baby",
        "How are you today?",
        "This is how we dance",
        "You are taking things way too seriously",
        "Are you scared of robots?",
        "I'm just a shy boy",
        "All because of you",
        "I've been to the ocean",
        "Colors running through me",
        "She's such a psychotron",
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

    // Audio control functionality using Howler.js
    var sound = new Howl({
        src: ['https://res.cloudinary.com/dakoxedxt/video/upload/v1709149116/shyboy7_etlz9b.mp3'],
        volume: 0.5, // Set the volume to 50%
        autoplay: false, // Automatically start playing (set to true if needed)
        loop: true, // Loop the sound
        onend: function() {
            console.log('Finished playing');
        }
    });

    const audioControlImage = document.getElementById('audioControlImage');

    audioControlImage.addEventListener('click', function() {
        if (sound.playing()) {
            sound.pause();
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
        } else {
            sound.play();
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
        }
    });

    // iOS video source adjustment
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

// Function to send an email
function sendEmail() {
    var user = "joel";
    var domain = "borglundell.se";
    window.location.href = "mailto:" + user + "@" + domain;
}