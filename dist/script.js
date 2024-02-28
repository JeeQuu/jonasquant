const textOverlay = document.getElementById('text-overlay');
const texts = [
    "Even super cool Ninjas suffer from erection problems sometimes.",
    "The future is now baby.",
    "How are you today?",
    "Are you scared of robots?",
  "I find inspiration in the dark",
  "Be nice to the nice",
  "If you can't convince them, confuse them.",
  "You look stupid in that outfit",
  "Im scared.",
  "I love you.",
  "I hate orange candy.",
  "Prepare for an emotional rollercoaster.",
  "I still have no clue what im gonna do when I grow up.",
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
});