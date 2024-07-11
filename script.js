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
        }, 10000); // 10 second timeout

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
            return scores.reverse(); // Reverse to get descending order
        });
}

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
let particleSystem;
let feedbackParticles;
let characterWalkSpeed = 0.1;
let cameraChangeInterval;

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
    if (!isGameStarted) return; // Prevent multiple calls
    isGameStarted = false;
    clearInterval(cameraChangeInterval);

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
    const bridge = createBridge(scene);
    bridge.position.y = -5;

    await loadCharacterModel();
    setupCharacter();

    setupPostProcessing();
    setupSceneObservables();

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
    camera.setTarget(character);
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

function updateCameraPosition() {
    const currentTime = Date.now();
    if (isGameStarted) {
        if (isMoving) {
            if (currentTime - lastCameraUpdateTime > 5000) {
                currentCameraIndex = (currentCameraIndex + 1) % cameraPositions.length;
                lastCameraUpdateTime = currentTime;
            }
            let targetPosition = cameraPositions[currentCameraIndex].add(character.position);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, 0.1);
        } else {
            rotationAngle += 0.01;
            let x = Math.sin(rotationAngle) * 25;
            let z = Math.cos(rotationAngle) * 25;
            let targetPosition = new BABYLON.Vector3(x, 15, z).add(character.position);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, 0.1);
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
    camera.lockedTarget = character;
}

// Set up post-processing
function setupPostProcessing() {
    const pipeline = new BABYLON.DefaultRenderingPipeline("retro", true, scene, [camera]);
    pipeline.chromaticAberrationEnabled = true;
    pipeline.chromaticAberration.aberrationAmount = 5;
    pipeline.grainEnabled = true;
    pipeline.grain.intensity = 20;
    pipeline.sharpenEnabled = false;
    pipeline.sharpen.edgeAmount = 0.3;
}

// Set up scene observables
function setupSceneObservables() {
    scene.onBeforeRenderObservable.add(onBeforeRender);
    scene.onKeyboardObservable.add(handleKeyboardInput);
    canvas.addEventListener('touchstart', handleInput);
}

// Update game state
function onBeforeRender() {
    if (isGameStarted) {
        updateCharacterMovement();
        updateEnergy();
        updateScore();
        updateEnergyMeter();
        checkGameOver();
        updateCameraPosition();
    }
    updateBackgroundGradient(scene, character.position.z);
}

// Update character movement
function updateCharacterMovement() {
    if (isMoving && isMusicPlaying) {
        character.position.z += characterWalkSpeed;
    }
}

// Update energy
function updateEnergy() {
    if (isGameStarted) {
        if (isMoving && isMusicPlaying) {
            energy = Math.min(energy + ENERGY_INCREASE_RATE, 100);
        } else if (isMoving && !isMusicPlaying) {
            energy = Math.max(energy - ENERGY_DECREASE_RATE, 0);
        }
        console.log("Current energy:", energy);
    }
    updateEnergyMeter();
}

// Check for game over
function checkGameOver() {
    if (isGameStarted && energy <= 0) {
        console.log("Energy depleted, calling gameOver");
        gameOver();
    }
}

// Handle keyboard input
function handleKeyboardInput(kbInfo) {
    if (kbInfo.type === BABYLON.KeyboardEventTypes.KEYDOWN && kbInfo.event.key === " ") handleInput();
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
            updateScore();
            showFeedback(reactionTime);
            triggerFeedbackParticles();
            createMultiplierPopup(scoreMultiplier);
        }
        
        updateEnergy();
        updateEnergyMeter();
    }
}

// Create bridge
function createBridge(scene) {
    const bridgeLength = 2000;
    const bridgeWidth = 5;
    const bridge = BABYLON.MeshBuilder.CreateBox("bridge", {width: bridgeWidth, height: 1, depth: bridgeLength}, scene);
    
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
            float x = floor(vUV.x * 4000.0);
            float y = floor(vUV.y * 8.0);
            float chessBoardPattern = mod(x + y, 2.0);
            
            vec3 color1 = vec3(0.545, 0.271, 0.075);
            vec3 color2 = vec3(0.824, 0.412, 0.118);
            
            float blinkIntensity = sin(time * 2.0 + vUV.x * 10.0) * 0.5 + 0.5;
            vec3 baseColor = mix(color1, color2, chessBoardPattern);
            vec3 finalColor = mix(baseColor, vec3(1.0, 1.0,            0.5), blinkIntensity * 0.3);
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `;

    shaderMaterial.setFloat("time", 0);
    
    bridge.material = shaderMaterial;

    let time = 0;
    scene.registerBeforeRender(() => {
        time += 0.016; // Assuming 60 FPS
        shaderMaterial.setFloat("time", time);
    });

    return bridge;
}

// Trigger feedback particles
function triggerFeedbackParticles() {
    if (particleSystem) {
        particleSystem.emitRate = 2000;
        particleSystem.start();
        setTimeout(() => {
            particleSystem.emitRate = 0;
        }, 200);
    }
}

// Create multiplier popup
function createMultiplierPopup(multiplier) {
    const advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
    
    const text = new BABYLON.GUI.TextBlock();
    text.text = `x${multiplier.toFixed(1)}`;
    text.color = "yellow";
    text.fontSize = 48;
    text.fontFamily = "AndaleMono";
    
    advancedTexture.addControl(text);
    
    text.top = "100px";
    text.left = "0px";
    
    let alpha = 1;
    let posY = 100;
    
    scene.registerBeforeRender(() => {
        alpha -= 0.01;
        posY -= 0.5;
        
        text.alpha = alpha;
        text.top = posY + "px";
        
        if (alpha <= 0) {
            advancedTexture.removeControl(text);
        }
    });
}

// Update background gradient
function updateBackgroundGradient(scene, characterZ) {
    const t = (characterZ % 1000) / 1000;
    const r = 1 - t * 0.5, g = 0.7 - t * 0.7, b = 0.7 - t * 0.7;
    scene.clearColor = new BABYLON.Color4(r, g, b, 1);
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
    characterWalkSpeed = 0.1;

    // Start camera movement
    cameraChangeInterval = setInterval(updateCameraPosition, 5000); // Change every 5 seconds
}

// Setup UI
function setupUI() {
    scoreDisplay = createUIElement('scoreDisplay');
    energyMeter = createUIElement('energyMeter', 'energyMeterContainer');
    feedbackDisplay = createUIElement('feedbackDisplay');
    if (highScoreDisplay) highScoreDisplay.style.display = 'none';
    updateScore();
    updateEnergyMeter();
}

// Reset game state
function resetGameState() {
    score = 0;
    energy = 100;
    isMoving = true;
    isMusicPlaying = true;
    scoreMultiplier = 1;
    musicStopCount = 0;
}

// Pause music
async function pauseMusic() {
    if (musicStopCount < MAX_MUSIC_STOPS) {
        const pauseDuration = Math.floor(Math.random() * 4000) + 2000;
        audio.pause();
        isMusicPlaying = false;
        musicStopTime = Date.now();
        musicStopCount++;
        await new Promise(resolve => setTimeout(resolve, pauseDuration));
        await audio.play().catch(e => console.error("Error playing audio:", e));
        isMusicPlaying = true;
        scheduleNextPause();
    }
}

// Schedule next pause
async function scheduleNextPause() {
    if (musicStopCount < MAX_MUSIC_STOPS) {
        const nextPauseTime = Math.floor(Math.random() * 10000) + 5000;
        await new Promise(resolve => setTimeout(resolve, nextPauseTime));
        await pauseMusic();
    }
}

// Update score
function updateScore() {
    if (isGameStarted && isMoving && isMusicPlaying) {
        score += SCORE_INCREMENT * scoreMultiplier;
    }
    if (scoreDisplay) {
        scoreDisplay.textContent = `${Math.floor(score)}`;
    }
}

// Update energy meter
function updateEnergyMeter() {
    if (energyMeter) energyMeter.style.width = `${energy}%`;
}

// Calculate multiplier
function calculateMultiplier(reactionTime) {
    if (reactionTime <= 0) return 33;
    if (reactionTime >= MAX_REACTION_TIME) return 0;
    return 330 * (1 - reactionTime / MAX_REACTION_TIME);
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
    
    setTimeout(() => {
        feedbackDisplay.style.opacity = '0';
        feedbackDisplay.style.transform = 'translateY(-50px)';
    }, 5000);

    setTimeout(() => {
        feedbackDisplay.style.display = 'none';
        feedbackDisplay.style.transform = 'translateY(0)';
    }, 2000);
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
            startButton.style.display = 'block';
        });
}

// Main function
async function main() {
    try {
        initializeEngine();
        const scene = await createScene();
        engine.runRenderLoop(() => scene.render());
        startButton.addEventListener('click', startGame);
    } catch (error) {
        console.error("Error starting game:", error.message, error.stack);
        alert("An error occurred while starting the game. Please check the console for more details.");
    }
}

// Window resize event
window.addEventListener("resize", () => engine.resize());

// Call main function to start the game
main().catch((error) => console.error("Error starting game:", error));