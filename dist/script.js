document.addEventListener('DOMContentLoaded', () => {
    const textOverlay = document.getElementById('text-overlay');
    const texts = [
        "The future is now baby.",
        "How are you today?",
        "You are taking things way too seriously.",
        "Are you scared of robots?",
        "Joel, do you read this?",
        "I find inspiration in the dark.",
      "Save the world please.",
       "Imagine a world without tomatoes.",
        "Be nice to the nice.",
              "grow up.",
        "Even super cool Ninjas suffer from erection problems sometimes.",
        "If you can't convince them, confuse them.",
        "Favorite toy?",
        "I'm scared.",
        "I hate orange candy.",
        "Prepare for an emotional rollercoaster.",
        "I still have no clue what I'm gonna do when I grow up.",
        "I love you.",
        "Have you had enough water today?",
        // Additional texts as desired...
    ];

    function changeText() {
        textOverlay.style.opacity = 0; // Start fade out

        setTimeout(() => {
            // Select a random text from the array
            const randomIndex = Math.floor(Math.random() * texts.length);
            textOverlay.innerHTML = texts[randomIndex];

            textOverlay.style.opacity = 1; // Fade in immediately after updating text
        }, 1000); // This timeout matches the CSS transition duration for opacity
    }

    // Function to initiate the text change with fade effect after a random interval
    function initiateTextChange() {
        setTimeout(() => {
            changeText();
            initiateTextChange(); // Recursively call to continue the cycle with random timing
        }, getRandomTime(4000, 7000)); // Random interval between text changes
    }

    // Utility function to get a random time interval
    function getRandomTime(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Start the cycle
    initiateTextChange();

    // Audio Control Functionality with Image Toggle
    const backgroundMusic = document.getElementById('background-music');
    const audioControlImage = document.getElementById('audioControlImage'); // Ensure you have this ID on your <img> tag for the audio control
    
    const musicOnImg = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
    const musicOffImg = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";

    backgroundMusic.volume = 0.2; // Set the initial volume; adjust as necessary.
    backgroundMusic.loop = true; // Loop the music
    backgroundMusic.muted = true; // Start muted to comply with autoplay policies

    document.getElementById('audioControl').addEventListener('click', () => {
        if (backgroundMusic.paused || backgroundMusic.muted) {
            backgroundMusic.muted = false;
            backgroundMusic.play().then(() => {
                audioControlImage.src = musicOnImg;
                audioControlImage.alt = "Music On";
            }).catch(error => {
                console.error('Audio playback failed:', error);
                audioControlImage.src = musicOffImg;
                audioControlImage.alt = "Music Off";
            });
        } else {
            backgroundMusic.pause();
            backgroundMusic.muted = true;
            audioControlImage.src = musicOffImg;
            audioControlImage.alt = "Music Off";
        }
    });
document.addEventListener('DOMContentLoaded', () => {
    const backgroundMusic = document.getElementById('background-music');
    const audioControlImage = document.getElementById('audioControlImage');

    // Function to toggle music play/pause
    function toggleMusic() {
        if (backgroundMusic.paused || backgroundMusic.muted) {
            backgroundMusic.muted = false;
            backgroundMusic.play().then(() => {
                audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161330/MUSIC_koxx3m.png";
                audioControlImage.alt = "Music On";
            }).catch(error => {
                console.error('Audio playback failed:', error);
            });
        } else {
            backgroundMusic.pause();
            backgroundMusic.muted = true;
            audioControlImage.src = "https://res.cloudinary.com/dakoxedxt/image/upload/v1709161448/MUSIC_OFF_1_aabc8l.png";
            audioControlImage.alt = "Music Off";
        }
    }

    // Add click event listener to the audio control
    audioControlImage.addEventListener('click', toggleMusic);

    // Other functionalities...
});

    // Video Source Adjustment for iOS
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
        videoElement.src = "https://res.cloudinary.com/dakoxedxt/video/upload/v1709158799/YOUTUBE.mov";
    }
    videoElement.load(); // Reload video element to apply new source
    
    // Send Email Function
    function sendEmail() {
        var user = "joel"; // The local-part of the email address
        var domain = "borglundell.se"; // The domain part of the email address
        window.location.href = "mailto:" + user + "@" + domain;
    }
});