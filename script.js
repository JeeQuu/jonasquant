let isInverted = false;
let isFullGlory = false;

const duoColors = ['#DD67B6', '#EAC302']; // Default color set for duotone
const fullGloryColors = [
    '#DD67B6', // Pink (more dominant)
    '#EAC302', // Yellow (more dominant)
    '#67DCD1', // Green/Teal
    '#8E44AD'  // Purple
];

// URL of the sticker
const stickerUrl = "https://res.cloudinary.com/dakoxedxt/image/upload/v1717971677/BEHAPPYSTICKER_aeb9uy.png";
let stickerImg = new Image();
stickerImg.crossOrigin = "Anonymous"; // Ensure cross-origin access
stickerImg.src = stickerUrl;

stickerImg.onload = () => {
    console.log("Sticker image loaded successfully.");
};

stickerImg.onerror = () => {
    console.error("Failed to load the sticker image.");
};

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
    const imageInput = document.getElementById('imageInput').files[0];
    if (!imageInput) {
        alert("Please select an image file.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
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

            // Calculate the dimensions to fit the image within the canvas and center it
            const imgRatio = img.width / img.height;
            const canvasRatio = canvasWidth / canvasHeight;

            let drawWidth, drawHeight, offsetX, offsetY;

            if (imgRatio > canvasRatio) {
                drawHeight = canvasHeight;
                drawWidth = imgRatio * drawHeight;
                offsetX = (drawWidth - canvasWidth) / 2;
                offsetY = 0;
            } else {
                drawWidth = canvasWidth;
                drawHeight = drawWidth / imgRatio;
                offsetX = 0;
                offsetY = (drawHeight - canvasHeight) / 2;
            }

            ctx.drawImage(img, -offsetX, -offsetY, drawWidth, drawHeight);

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

            // Draw the sticker with random rotation and position
            if (stickerImg.complete) {
                drawSticker(ctx, canvas.width, canvas.height);
            } else {
                stickerImg.onload = () => {
                    drawSticker(ctx, canvas.width, canvas.height);
                };
            }

            document.getElementById('resultImage').src = canvas.toDataURL('image/png');
            console.log("Image processing complete.");
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

function drawSticker(ctx, canvasWidth, canvasHeight) {
    const overlayWidth = 800;  // Double the size for the sticker
    const overlayHeight = stickerImg.height * (overlayWidth / stickerImg.width); // Maintain aspect ratio

    // Random position within the canvas
    const xPosition = Math.random() * (canvasWidth - overlayWidth - 20) + 10;
    const yPosition = Math.random() * (canvasHeight - overlayHeight - 20) + 10;

    // Random rotation within ±45 degrees
