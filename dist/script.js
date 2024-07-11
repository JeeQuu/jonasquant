// Constants
const MAX_MUSIC_STOPS = 14;
const MAX_HIGH_SCORES = 10;
const ENERGY_INCREASE_RATE = 0.15;
const ENERGY_DECREASE_RATE = 1.2;
const SCORE_INCREMENT = 0.1;
const MAX_REACTION_TIME = 1.5;

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3IZlrpusRfIa8VgmYMqtt-UepWyTVOy4",
    authDomain: "shy-score.firebaseapp.com",
    databaseURL: "https://shy-score-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "shy-score",
    storageBucket: "shy-score.appspot.com",
    messagingSenderId: "323096951218",
    appId: "1:323096951218:web:27f70f8ec5fa2f05608cab"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Elements
const canvas = document.getElementById("renderCanvas");
const startButton = document.getElementById("startButton");
const audio = document.getElementById("gameAudio");
let scoreDisplay, energyMeter, feedbackDisplay, highScoreDisplay;

// Game state
let isGameStarted = false;
let isMoving = true;
let score = 0;
let isMusicPlaying = true;
let energy = 100;
let musicStopTime = 0;
let scoreMultiplier = 1;
let musicStopCount = 0;
let characterWalkSpeed = 0.1;
let lastTime = 0;

// Babylon.js objects
let engine, scene, camera;
let character, walkAnimation, idleAnimation, fallAnimation;

// Animation states
const AnimationStates = {
    IDLE: 'idle',
    WALK: 'walk',
    FALL: 'fall'
};
let currentAnimationState = AnimationStates.IDLE;

// Initialize the engine
function initializeEngine() {
    engine = new BABYLON.Engine(canvas, true);
    engine.enableOfflineSupport = false;
}

// Helper function for creating UI elements
function createUIElement(id, parentId = 'body') {
    const element = document.createElement('div');
    element.id = id;
    (parentId === 'body' ? document.body : document.getElementById(parentId)).appendChild(element);
    return element;
}

// Function to submit a high score
function submitHighScore(name, score) {
    console.log("Attempting to submit high score:", name, score);
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("Submission timeout"));
        }, 10000);

        db.ref('highScores').push({
            name: name,
            score: score,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        })
        .then(() => {
            clearTimeout(timeout);
            console.log("High score submitted successfully");
            resolve();
        })
        .catch((error) => {
            clearTimeout(timeout);
            console.error("Error submitting high score: ", error);
            reject(error);
        });
    });
}

// Function to get high scores
function getHighScores() {
    return db.ref('highScores')
        .orderByChild('score')
        .limitToLast(10)
        .once('value')
        .then((snapshot) => {
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push(childSnapshot.val());
            });
            return scores.reverse();
        });
}

// Set animation state
function setAnimationState(newState) {
    if (newState === currentAnimationState) return;
    
    switch(newState) {
        case AnimationStates.IDLE:
            walkAnimation.stop();
            fallAnimation.stop();
            idleAnimation.start(true);
            break;
        case AnimationStates.WALK:
            idleAnimation.stop();
            fallAnimation.stop();
            walkAnimation.start(true);
            break;
        case AnimationStates.FALL:
            idleAnimation.stop();
            walkAnimation.stop();
            fallAnimation.start(false);
            break;
    }
    
    currentAnimationState = newState;
}

// Game over function
function gameOver() {
    if (!isGameStarted) return;
    isGameStarted = false;
    audio.pause();
    audio.currentTime = 0;

    console.log("Playing fall animation");
    setAnimationState(AnimationStates.FALL);

    fallAnimation.onAnimationEndObservable.addOnce(() => {
        console.log("Fall animation ended, transitioning to game over state");
        showGameOverScreen();
    });
}

function showGameOverScreen() {
    const gameOverText = createUIElement('gameOverText');
    gameOverText.className = 'game-text';
    gameOverText.textContent = 'GAME OVER';

    console.log("Game over screen displayed");

    setTimeout(() => {
        gameOverText.remove();
        handleHighScore(Math.floor(score));
    }, 3000);
}

// Create and set up the scene
const createScene = async function () {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 0.7, 0.7, 1);
    scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);

    setupCamera();
    setupLights();
    const bridge = await createBridge(scene);
    bridge.position.y = -5;

    await loadCharacterModel();
    setupCharacter();

    createStars(scene);

    return scene;
};

// Camera setup
let cameraPositions = [
    new BABYLON.Vector3(0, 15, -25),
    new BABYLON.Vector3(15, 10, -10),
    new BABYLON.Vector3(-15, 10, -10)
];
let currentCameraIndex = 0;
let lastCameraUpdateTime = 0;
let rotationAngle = 0;

function setupCamera() {
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI, Math.PI / 3, 25, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 40;

    window.addEventListener('resize', adjustCameraForOrientation);
    adjustCameraForOrientation();
}

function adjustCameraForOrientation() {
    if (window.innerHeight > window.innerWidth) {
        camera.radius = 30;
        camera.beta = Math.PI / 2.5;
    } else {
        camera.radius = 25;
        camera.beta = Math.PI / 3;
    }
}

function updateCameraPosition(deltaTime) {
    const currentTime = Date.now();
    if (isGameStarted) {
        if (isMoving) {
            if (currentTime - lastCameraUpdateTime > 5000) {
                currentCameraIndex = (currentCameraIndex + 1) % cameraPositions.length;
                lastCameraUpdateTime = currentTime;
            }
            let targetPosition = cameraPositions[currentCameraIndex].add(character.position);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, deltaTime * 2);
        } else {
            rotationAngle += deltaTime * 0.5;
            let x = Math.sin(rotationAngle) * 25;
            let z = Math.cos(rotationAngle) * 25;
            let targetPosition = new BABYLON.Vector3(x, 15, z).add(character.position);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, deltaTime * 2);
        }
        camera.setTarget(character.position);
    }
}

// Lighting setup
function setupLights() {
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene).intensity = 1.5;
    new BABYLON.DirectionalLight("directionalLight", new BABYLON.Vector3(0, -1, 1), scene).intensity = 0.5;
}

// Load character model
async function loadCharacterModel() {
    console.log("Starting to load character model");
    const modelUrl = "https://raw.githubusercontent.com/JeeQuu/jonasquant/main/dist/WALK4_IDLErun3.glb";
    console.log("Attempting to load model from:", modelUrl);
    
    try {
        const result = await BABYLON.SceneLoader.ImportMeshAsync("", "", modelUrl, scene);
        character = result.meshes[0];
        const animationGroups = result.animationGroups;
        
        console.log("All animation groups:", animationGroups.map(ag => ({name: ag.name, from: ag.from, to: ag.to})));
        
        walkAnimation = animationGroups.find(ag => ag.name === "walk_32frames");
        idleAnimation = animationGroups.find(ag => ag.name === "breathingidle_300frames");
        fallAnimation = animationGroups.find(ag => ag.name === "fall_77frames");
        
        console.log("Walk animation:", walkAnimation ? {name: walkAnimation.name, from: walkAnimation.from, to: walkAnimation.to} : "Not found");
        console.log("Idle animation:", idleAnimation ? {name: idleAnimation.name, from: idleAnimation.from, to: idleAnimation.to} : "Not found");
        console.log("Fall animation:", fallAnimation ? {name: fallAnimation.name, from: fallAnimation.from, to: fallAnimation.to} : "Not found");

        if (!walkAnimation || !idleAnimation || !fallAnimation) {
            console.error("Essential animations not found. Game may not function correctly.");
        }

        console.log("Character model loading complete");
    } catch (error) {
        console.error("Error loading character model:", error);
        throw error;
    }
}

// Set up character
function setupCharacter() {
    character.position.y = -4.5;
    character.rotation.y = Math.PI / 2;
    setAnimationState(AnimationStates.IDLE);
}

// Create bridge (using instancing for better performance)
async function createBridge(scene) {
    const bridgeLength = 2000;
    const bridgeWidth = 5;
    const segmentLength = 10;
    const segmentCount = bridgeLength / segmentLength;

    const bridgeSegment = BABYLON.MeshBuilder.CreateBox("bridgeSegment", {width: bridgeWidth, height: 1, depth: segmentLength}, scene);
    
    const shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom",
    },
    {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "time"]
    });

    BABYLON.Effect.ShadersStore["customVertexShader"] = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform mat4 worldViewProjection;
        varying vec2 vUV;
        void main(void) {
            gl_Position = worldViewProjection * vec4(position, 1.0);
            vUV = uv;
        }
    `;

    BABYLON.Effect.ShadersStore["customFragmentShader"] = `
        precision highp float;
        varying vec2 vUV;
        uniform float time;
        void main(void) {
            float x = floor(vUV.x * 40.0);
            float y = floor(vUV.y * 8.0);
            float chessBoardPattern = mod(x + y, 2.0);
            
            vec3 color1 = vec3(0.545, 0.271, 0.075);
            vec3 color2 = vec3(0.824, 0.412, 0.118);
            
            float blinkIntensity = sin(time * 2.0 + vUV.x * 10.0) * 0.5 + 0.5;
            vec3 baseColor = mix(color1, color2, chessBoardPattern);
            vec3 finalColor = mix(baseColor, vec3(1.0, 1.0, 0.5), blinkIntensity * 0.3);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    shaderMaterial.setFloat("time", 0);
    bridgeSegment.material = shaderMaterial;

    // Create instances
    const instances = [];
    for (let i = 0; i < segmentCount; i++) {
        const instance = bridgeSegment.createInstance("bridgeSegment_" + i);
        instance.position.z = i * segmentLength;
        instances.push(instance);
    }

    // Update shader time in render loop
    let time = 0;
    scene.onBeforeRenderObservable.add(() => {
        time += 0.016;
        shaderMaterial.setFloat("time", time);
    });

    return bridgeSegment;
}

// Create stars using instancing
function createStars(scene) {
    const starCount = 1000;
    const starMesh = BABYLON.MeshBuilder.CreateSphere("star", {diameter: 0.1}, scene);
    const starMaterial = new BABYLON.StandardMaterial("starMaterial", scene);
    starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    starMesh.material = starMaterial;

    const matrix = new BABYLON.Matrix();
    const matrices = [];

    for (let i = 0; i < starCount; i++) {
        BABYLON.Matrix.TranslationToRef(
            Math.random() * 1000 - 500,
            Math.random() * 200 - 100,
            Math.random() * 1000 - 500,
            matrix
        );
        matrices.push(matrix.clone());
    }

    starMesh.thinInstanceSetBuffer("matrix", matrices.map(m => m.asArray()).flat(), 16);
}

// Move stars
function moveStars(deltaTime) {
    const starMesh = scene.getMeshByName("star");
    if (starMesh && starMesh.thinInstanceCount > 0) {
        const matrices = starMesh.thinInstanceGetWorldMatrices();
        for (let i = 0; i < matrices.length; i++) {
            const matrix = matrices[i];
            matrix.setTranslation(matrix.getTranslation().add(new BABYLON.Vector3(0, 0, -0.1 * deltaTime * 60)));
            if (matrix.getTranslation().z < -500) {
                matrix.setTranslation(new BABYLON.Vector3(
                    Math.random() * 1000 - 500,
                    Math.random() * 200 - 100,
                    500
                ));
            }
        }
        starMesh.thinInstanceSetBuffer("matrix", matrices.map(m => m.asArray()).flat(), 16);
    }
}

// Update background gradient
// Update background gradient
function updateBackgroundGradient() {
    const t = (character.position.z % 1000) / 1000;
    const r = 1 - t * 0.5, g = 0.7 - t * 0.7, b = 0.7 - t * 0.7;
    scene.clearColor.r = r;
    scene.clearColor.g = g;
    scene.clearColor.b = b;
}

// Start game
function startGame() {
    isGameStarted = true;
    startButton.style.display = 'none';
    setupUI();
    resetGameState();
    audio.load();
    audio.play().catch(e => console.error("Error playing audio:", e));
    setAnimationState(AnimationStates.WALK);
    scheduleNextPause();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Setup UI
function setupUI() {
    scoreDisplay = createUIElement('scoreDisplay');
    energyMeter = createUIElement('energyMeter', 'energyMeterContainer');
    feedbackDisplay = createUIElement('feedbackDisplay');
    if (highScoreDisplay) highScoreDisplay.style.display = 'none';
}

// Reset game state
function resetGameState() {
    score = 0;
    energy = 100;
    isMoving = true;
    isMusicPlaying = true;
    scoreMultiplier = 1;
    musicStopCount = 0;
    character.position.set(0, -4.5, 0);
}

// Pause music
function pauseMusic() {
    if (musicStopCount < MAX_MUSIC_STOPS) {
        const pauseDuration = Math.floor(Math.random() * 4000) + 2000;
        audio.pause();
        isMusicPlaying = false;
        musicStopTime = Date.now();
        musicStopCount++;
        setTimeout(() => {
            audio.play().catch(e => console.error("Error playing audio:", e));
            isMusicPlaying = true;
            scheduleNextPause();
        }, pauseDuration);
    }
}

// Schedule next pause
function scheduleNextPause() {
    if (musicStopCount < MAX_MUSIC_STOPS) {
        const nextPauseTime = Math.floor(Math.random() * 10000) + 5000;
        setTimeout(pauseMusic, nextPauseTime);
    }
}

// Update score
function updateScore(deltaTime) {
    if (isGameStarted && isMoving && isMusicPlaying) {
        score += SCORE_INCREMENT * scoreMultiplier * deltaTime * 60;
    }
    if (scoreDisplay) {
        scoreDisplay.textContent = `${Math.floor(score)}`;
    }
}

// Update energy
function updateEnergy(deltaTime) {
    if (isGameStarted) {
        if (isMoving && isMusicPlaying) {
            energy = Math.min(energy + ENERGY_INCREASE_RATE * deltaTime * 60, 100);
        } else if (isMoving && !isMusicPlaying) {
            energy = Math.max(energy - ENERGY_DECREASE_RATE * deltaTime * 60, 0);
        }
    }
    updateEnergyMeter();
}

// Update energy meter
function updateEnergyMeter() {
    if (energyMeter) energyMeter.style.width = `${energy}%`;
}

// Calculate multiplier
function calculateMultiplier(reactionTime) {
    if (reactionTime <= 0) return 33;
    if (reactionTime >= MAX_REACTION_TIME) return 0;
    return 33 * (1 - reactionTime / MAX_REACTION_TIME);
}

// Show feedback
function showFeedback(reactionTime) {
    let message;
    if (reactionTime <= 0.75) {
        message = "AMAZING!";
    } else if (reactionTime <= 1.75) {
        message = "OK!";
    } else {
        message = "BAD!";
    }
    feedbackDisplay.textContent = message;
    feedbackDisplay.style.display = 'block';
    feedbackDisplay.style.opacity = '1';
    feedbackDisplay.style.transform = 'translateY(0)';
    
    animateText(feedbackDisplay, -100, 1000);
}

// Animate text upwards
function animateText(element, distance, duration) {
    let start = null;
    const startPosition = 0;
    
    function step(timestamp) {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        
        const currentPosition = startPosition + (distance * percentage);
        element.style.transform = `translateY(${currentPosition}px)`;
        element.style.opacity = 1 - percentage;
        
        if (progress < duration) {
            requestAnimationFrame(step);
        } else {
            element.style.display = 'none';
            element.style.transform = 'translateY(0)';
        }
    }
    
    requestAnimationFrame(step);
}

// Create multiplier popup
function createMultiplierPopup(multiplier) {
    const popupText = document.createElement('div');
    popupText.className = 'multiplier-popup';
    popupText.textContent = `x${multiplier.toFixed(1)}`;
    document.body.appendChild(popupText);
    
    animateText(popupText, -100, 1000);
    
    setTimeout(() => {
        popupText.remove();
    }, 1000);
}

// Handle input (keyboard or touch)
function handleInput() {
    if (isGameStarted) {
        isMoving = !isMoving;
        setAnimationState(isMoving ? AnimationStates.WALK : AnimationStates.IDLE);
        
        if (!isMusicPlaying && !isMoving) {
            const reactionTime = (Date.now() - musicStopTime) / 1000;
            scoreMultiplier = calculateMultiplier(reactionTime);
            score += 100 * scoreMultiplier;
            showFeedback(reactionTime);
            createMultiplierPopup(scoreMultiplier);
        }
        
        updateEnergy(1/60);
        updateEnergyMeter();
    }
}

// Handle keyboard input
function handleKeyboardInput(kbInfo) {
    if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key === " ") handleInput();
}

// Check for game over
function checkGameOver() {
    if (isGameStarted && energy <= 0) {
        console.log("Energy depleted, calling gameOver");
        gameOver();
    }
}

// Handle high score
function handleHighScore(finalScore) {
    getHighScores().then(highScores => {
        if (highScores.length < MAX_HIGH_SCORES || finalScore > highScores[highScores.length - 1].score) {
            const name = prompt("Congratulations! You got a high score! Enter your name:");
            if (name) {
                submitHighScore(name, finalScore)
                    .then(showHighScores)
                    .catch(error => {
                        console.error("Error submitting high score:", error);
                        alert("Failed to submit high score. Please try again.");
                        showHighScores();
                    });
            } else {
                showHighScores();
            }
        } else {
            showHighScores();
        }
    }).catch(error => {
        console.error("Error checking high scores:", error);
        alert("Failed to check high scores. Please try again.");
    });
}

// Show high scores
function showHighScores() {
    const loadingDiv = createUIElement('loadingHighScores');
    loadingDiv.textContent = 'Loading high scores...';

    getHighScores()
        .then(highScores => {
            loadingDiv.remove();
            if (document.getElementById('highScoreDisplay')) {
                document.getElementById('highScoreDisplay').remove();
            }

            const highScoreDisplay = createUIElement('highScoreDisplay');
            highScoreDisplay.innerHTML = '<h2>High Scores</h2>';
            
            if (highScores.length === 0) {
                highScoreDisplay.innerHTML += '<p>No high scores yet. Be the first!</p>';
            } else {
                const list = document.createElement('ol');
                highScores.forEach((score, index) => {
                    const item = document.createElement('li');
                    item.textContent = `${index + 1}. ${score.name}: ${score.score.toLocaleString()}`;
                    list.appendChild(item);
                });
                highScoreDisplay.appendChild(list);
            }

            startButton.textContent = 'Start Game';
            startButton.style.display = 'block';
        })
        .catch(error => {
            console.error("Error fetching high scores:", error);
            loadingDiv.remove();
            const errorDiv = createUIElement('highScoreError');
            errorDiv.textContent = 'Unable to load high scores. Please try again later.';
        });
}

// Main game loop
function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    if (isGameStarted) {
        updateGame(deltaTime);
    }

    scene.render();

    requestAnimationFrame(gameLoop);
}

// Update game state
function updateGame(deltaTime) {
    updateCharacterMovement(deltaTime);
    updateEnergy(deltaTime);
    updateScore(deltaTime);
    checkGameOver();
    updateCameraPosition(deltaTime);
    moveStars(deltaTime);
    updateBackgroundGradient();
}

// Update character movement
function updateCharacterMovement(deltaTime) {
    if (isMoving && isMusicPlaying) {
        character.position.z += characterWalkSpeed * deltaTime * 60;
    }
}

// Main function
async function main() {
    try {
        initializeEngine();
        const scene = await createScene();
        engine.runRenderLoop(() => scene.render());
        startButton.addEventListener('click', startGame);
        window.addEventListener("resize", () => {
            engine.resize();
            adjustCameraForOrientation();
        });
        scene.onKeyboardObservable.add(handleKeyboardInput);
        canvas.addEventListener('touchstart', handleInput);
        
        // Make canvas fullscreen
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
        canvas.style.display = 'block';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error("Error starting game:", error);
        alert("An error occurred while starting the game. Please check the console for more details.");
    }
}

// Start the game
main().catch((error) => console.error("Error starting game:", error));

document.head.innerHTML += '<link rel="stylesheet" href="styles.css">';