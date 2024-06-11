let isInverted = false;
let isFullGlory = false;

const duoColors = ['#DD67B6', '#EAC302']; // Default color set for duotone
const fullGloryColors = [
    '#DD67B6', // Pink (more dominant)
    '#EAC302', // Yellow (more dominant)
    '#67DCD1', // Green/Teal
    '#8E44AD'  // Purple
];

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function interpolateColor(color1, color2, factor) {
    const result = color1.slice();
    for (let i = 0; i < 3; i++) {
        result[i] = Math.round(result[i] + factor * (color2[i] - result[i]));
    }
    return result;
}

function convertDuotone() {
    console.log("convertDuotone called");
    const imageInput = document.getElementById('imageInput').files[0];
    if (!imageInput) {
        alert("Please select an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        console.log("FileReader onload called");
        const img = new Image();
        img.src = event.target.result;

        img.onload = () => {
            console.log("Main image loaded successfully.");
            const canvasWidth = 1080; // Instagram story width
            const canvasHeight = 1920; // Instagram story height

            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            // Calculate the dimensions and offset to center crop the image
            const imgRatio = img.width / img.height;
            const canvasRatio = canvasWidth / canvasHeight;
            let srcX, srcY, srcWidth, srcHeight;

            if (imgRatio > canvasRatio) {
                srcHeight = img.height;
                srcWidth = img.height * canvasRatio;
                srcX = (img.width - srcWidth) / 2;
                srcY = 0;
            } else {
                srcWidth = img.width;
                srcHeight = img.width / canvasRatio;
                srcX = 0;
                srcY = (img.height - srcHeight) / 2;
            }

            console.log("Drawing image on canvas");
            ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas before drawing
            ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, canvasWidth, canvasHeight);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            const palette = isFullGlory ? fullGloryColors : duoColors;
            let colors = palette.slice();

            if (isInverted) {
                colors.reverse();
            }

            const getColor = (grey, colors) => {
                const step = 1 / (colors.length - 1);
                for (let i = 0; i < colors.length - 1; i++) {
                    if (grey >= i * step && grey < (i + 1) * step) {
                        const factor = (grey - i * step) / step;
                        return interpolateColor(hexToRgb(colors[i]), hexToRgb(colors[i + 1]), factor);
                    }
                }
                return hexToRgb(colors[colors.length - 1]);
            };

            for (let i = 0; i < data.length; i += 4) {
                const grey = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
                const normalizedGrey = grey / 255;

                let r, g, b;
                const threshold = 1 / (colors.length);
                const colorIndex = Math.min(Math.floor(normalizedGrey / threshold), colors.length - 1);
                [r, g, b] = hexToRgb(colors[colorIndex]);

                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }

            ctx.putImageData(imageData, 0, 0);

            try {
                document.getElementById('resultImage').src = canvas.toDataURL('image/png');
                console.log("Image processing complete.");
            } catch (e) {
                console.error("Error setting resultImage src:", e);
            }
        };

        img.onerror = () => {
            console.error("Failed to load the main image.");
        };
    };

    reader.onerror = () => {
        console.error("Failed to read the image file.");
    };

    reader.readAsDataURL(imageInput);
}

function invertDuotone() {
    isInverted = !isInverted;
    console.log("Inverting colors");
    convertDuotone();
}

function fullGlory() {
    isFullGlory = !isFullGlory;
    console.log("Setting full glory mode");
    convertDuotone();
}

function createFloatingText() {
    const texts = ['Be Happy', '6 14 24'];
    const textContent = texts[Math.floor(Math.random() * texts.length)];
    
    const text = document.createElement('div');
    text.className = 'floating-text';
    text.textContent = textContent;

    // Set random size and speed
    const size = Math.random() * 20 + 10; // Size between 10px and 30px
    text.style.fontSize = `${size}px`;

    // Speed inversely proportional to size
    const duration = 10 - (size / 10);
    text.style.animationDuration = `${duration}s`;

    document.body.appendChild(text);

    setRandomStartPosition(text);
    animateText(text);
}

function setRandomStartPosition(element) {
    // Randomly select a side: 0 = left, 1 = right, 2 = top, 3 = bottom
    const side = Math.floor(Math.random() * 4);
    let startPositionX, startPositionY;

    if (side === 0) { // left
        startPositionX = -100;
        startPositionY = Math.random() * window.innerHeight;
    } else if (side === 1) { // right
        startPositionX = window.innerWidth + 100;
        startPositionY = Math.random() * window.innerHeight;
    } else if (side === 2) { // top
        startPositionX = Math.random() * window.innerWidth;
        startPositionY = -100;
    } else { // bottom
        startPositionX = Math.random() * window.innerWidth;
        startPositionY = window.innerHeight + 100;
    }

    element.style.left = `${startPositionX}px`;
    element.style.top = `${startPositionY}px`;
}

function animateText(element) {
    const duration = parseFloat(element.style.animationDuration);
    const endPositionX = Math.random() * window.innerWidth;
    const endPositionY = Math.random() * window.innerHeight;

    element.style.animationName = 'none';
    requestAnimationFrame(() => {
        element.style.transform = `translate(${endPositionX - parseFloat(element.style.left)}px, ${endPositionY - parseFloat(element.style.top)}px)`;
        element.style.animationName = '';
    });

    element.addEventListener('animationiteration', () => {
        setRandomStartPosition(element);
    });
}

// Increase the number of "Be Happy" and "6 14 24" instances here
for (let i = 0; i < 50; i++) {
    createFloatingText();
}

// Function to download the image
function downloadImage() {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'duotone_image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Run initial conversion on page load
document.getElementById('imageInput').addEventListener('change', convertDuotone);
