const images = [
    'https://res.cloudinary.com/dakoxedxt/image/upload/v1718132815/shake_s0wlpq.png',
    'https://res.cloudinary.com/dakoxedxt/image/upload/v1718132815/happy_cqemdz.png',
    'https://res.cloudinary.com/dakoxedxt/image/upload/v1718132815/date_hjbdbm.png'
];

function createFloatingImages() {
    for (let i = 0; i < 50; i++) {
        const imgSrc = images[Math.floor(Math.random() * images.length)];
        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'floating-image';
        img.style.width = `${Math.random() * 50 + 50}px`; // Random size between 50px and 100px
        img.style.animationDuration = `${Math.random() * 10 + 5}s`; // Random duration for rotation

        // Set random position and direction
        setRandomStartPosition(img);
        setRandomDirection(img);

        document.body.appendChild(img);

        // Start the animation
        animateImage(img);
    }
}

function setRandomStartPosition(element) {
    const startPositionX = Math.random() * window.innerWidth;
    const startPositionY = Math.random() * window.innerHeight;
    element.style.left = `${startPositionX}px`;
    element.style.top = `${startPositionY}px`;
}

function setRandomDirection(element) {
    const angle = Math.random() * 2 * Math.PI; // Random angle in radians
    element.dataset.dx = Math.cos(angle);
    element.dataset.dy = Math.sin(angle);
}

function animateImage(element) {
    const speed = 1; // Adjust speed as needed
    let startX = parseFloat(element.style.left);
    let startY = parseFloat(element.style.top);

    const move = () => {
        startX += speed * element.dataset.dx;
        startY += speed * element.dataset.dy;

        // Wrap around the edges
        if (startX < -100) startX = window.innerWidth + 100;
        if (startX > window.innerWidth + 100) startX = -100;
        if (startY < -100) startY = window.innerHeight + 100;
        if (startY > window.innerHeight + 100) startY = -100;

        element.style.left = `${startX}px`;
        element.style.top = `${startY}px`;

        requestAnimationFrame(move);
    };

    move();
}

// Call the function to create floating images
createFloatingImages();

// Your existing duotone code here...
let isInverted = false;
let isFullGlory = false;
let fullSizeImageUrl = ''; // To store the full-size image URL

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

function randomizeSticker(ctx, canvasWidth, canvasHeight, beHappyImage) {
    const beHappyWidth = 100 * 8; // Smaller size
    const beHappyHeight = (beHappyImage.height / beHappyImage.width) * beHappyWidth;
    const randomX = Math.random() * (canvasWidth - beHappyWidth);
    const randomY = Math.random() * (canvasHeight - beHappyHeight);
    const randomRotation = (Math.random() - 0.5) * Math.PI / 2; // Random rotation between -45 to 45 degrees
    ctx.save();
    ctx.translate(randomX + beHappyWidth / 2, randomY + beHappyHeight / 2);
    ctx.rotate(randomRotation);
    ctx.drawImage(beHappyImage, -beHappyWidth / 2, -beHappyHeight / 2, beHappyWidth, beHappyHeight);
    ctx.restore();
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
        img.crossOrigin = "anonymous"; // Set CORS attribute
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

            // Load and draw the "post-it note" image in the top-left corner
            const postItImage = new Image();
            postItImage.crossOrigin = "anonymous"; // Set CORS attribute
            postItImage.src = 'https://res.cloudinary.com/dakoxedxt/image/upload/v1718020329/IMG_0424_bchwgu.jpg';
            postItImage.onload = () => {
                const postItWidth = 150 * 2.5; // 2.5x bigger
                const postItHeight = (postItImage.height / postItImage.width) * postItWidth;
                ctx.save();
                ctx.translate(100, 215); // Move further inside to fit within the frame
                ctx.rotate(-0.2); // Slightly tilt the image
                ctx.drawImage(postItImage, -postItWidth / 2, -postItHeight / 2, postItWidth, postItHeight);
                ctx.restore();

                // Load and randomly place the "Be Happy" sticker
                const beHappyImage = new Image();
                beHappyImage.crossOrigin = "anonymous"; // Set CORS attribute
                beHappyImage.src = 'https://res.cloudinary.com/dakoxedxt/image/upload/v1717971677/BEHAPPYSTICKER_aeb9uy.png';
                beHappyImage.onload = () => {
                    randomizeSticker(ctx, canvasWidth, canvasHeight, beHappyImage);

                    // Create a higher resolution canvas for download
                    const highResCanvas = document.createElement('canvas');
                    const highResCtx = highResCanvas.getContext('2d');
                    const highResWidth = canvasWidth * 1.5;
                    const highResHeight = canvasHeight * 1.5;
                    highResCanvas.width = highResWidth;
                    highResCanvas.height = highResHeight;
                    highResCtx.drawImage(canvas, 0, 0, canvasWidth, canvasHeight, 0, 0, highResWidth, highResHeight);

                    try {
                        document.getElementById('resultImage').src = canvas.toDataURL('image/png');
                        fullSizeImageUrl = highResCanvas.toDataURL('image/png'); // Store the high-resolution image URL
                        console.log("Image processing complete.");
                    } catch (e) {
                        console.error("Error setting resultImage src:", e);
                    }
                };
            };
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

// Function to download the image
function downloadImage() {
    const link = document.createElement('a');
    link.href = fullSizeImageUrl;
    link.download = 'duotone_image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Run initial conversion on page load
document.getElementById('imageInput').addEventListener('change', convertDuotone);
