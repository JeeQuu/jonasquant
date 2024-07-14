// Constants
const MAX_MUSIC_STOPS = 14;
const MAX_HIGH_SCORES = 10;
const ENERGY_INCREASE_RATE = 0.15;
const ENERGY_DECREASE_RATE = 2.2;
const SCORE_INCREMENT = 0.1;
const MAX_REACTION_TIME = 1.5;

console.log("BABYLON loaded:", typeof BABYLON !== 'undefined');

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
const database = firebase.database();

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
let bridge;

// Animation states
const AnimationStates = {
    IDLE: 'idle',
    WALK: 'walk',
    FALL: 'fall'
};
let currentAnimationState = AnimationStates.IDLE;

// Initialize the engine
function initializeEngine() {
    console.log("Initializing engine...");
    engine = new BABYLON.Engine(canvas, true);
    engine.enableOfflineSupport = false;
    console.log("Engine initialized.");
}

// Create and set up the scene
const createScene = async function () {
    try {
        console.log("Creating scene...");
        scene = new BABYLON.Scene(engine);
       scene.clearColor = new BABYLON.Color4(0.5, 0.8, 0.5, 1); // Light green color
        scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);

        console.log("Setting up camera...");
        setupCamera();
        console.log("Setting up lights...");
        setupLights();
        console.log("Creating bridge...");
        bridge = createBridge(scene);
        console.log("Loading character model...");
        await loadCharacterModel();
        console.log("Setting up character...");
        setupCharacter();
      console.log("Camera set up:", camera);

        console.log("Creating stars...");
        createStars(scene);

        console.log("Scene creation complete.");
        return scene;
    } catch (error) {
        console.error("Error in createScene:", error);
        throw error;
    }
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
    console.log("Setting up camera...");
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI, Math.PI / 3, 25, new BABYLON.Vector3(0, 0, 0), scene);
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 40;

    window.addEventListener('resize', adjustCameraForOrientation);
    adjustCameraForOrientation();
    console.log("Camera setup complete.");
}

function adjustCameraForOrientation() {
    console.log("Adjusting camera for orientation...");
    if (window.innerHeight > window.innerWidth) {
        camera.radius = 30;
        camera.beta = Math.PI / 2.5;
    } else {
        camera.radius = 25;
        camera.beta = Math.PI / 3;
    }
    console.log("Camera adjusted.");
}

const cameraViews = [
    { position: new BABYLON.Vector3(0, 10, -20), target: new BABYLON.Vector3(0, 0, 10) },
    { position: new BABYLON.Vector3(15, 5, -10), target: new BABYLON.Vector3(0, 0, 10) },
    { position: new BABYLON.Vector3(-15, 8, -5), target: new BABYLON.Vector3(0, 0, 10) },
    { position: new BABYLON.Vector3(10, 12, 0), target: new BABYLON.Vector3(0, 0, 10) },
    { position: new BABYLON.Vector3(-5, 6, -15), target: new BABYLON.Vector3(0, 0, 10) }
];

let currentViewIndex = 0;
let viewTransitionTime = 0;
const VIEW_TRANSITION_DURATION = 10; // seconds

function updateCameraPosition(deltaTime) {
    if (isGameStarted) {
        const characterPosition = character.position;
        
        if (isMoving) {
            viewTransitionTime += deltaTime;
            if (viewTransitionTime > VIEW_TRANSITION_DURATION) {
                viewTransitionTime = 0;
                currentViewIndex = (currentViewIndex + 1) % cameraViews.length;
            }
            
            const t = viewTransitionTime / VIEW_TRANSITION_DURATION;
            const easedT = easeInOutCubic(t);
            
            const currentView = cameraViews[currentViewIndex];
            const nextView = cameraViews[(currentViewIndex + 1) % cameraViews.length];
            
            const lerpedPosition = BABYLON.Vector3.Lerp(currentView.position, nextView.position, easedT);
            const lerpedTarget = BABYLON.Vector3.Lerp(currentView.target, nextView.target, easedT);
            
            camera.position = lerpedPosition.add(characterPosition);
            camera.setTarget(lerpedTarget.add(characterPosition));
        } else {
            // Zoom in when stopped
            const targetPosition = new BABYLON.Vector3(0, 5, -10).add(characterPosition);
            const targetLookAt = new BABYLON.Vector3(0, 0, 10).add(characterPosition);
            
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, 0.05);
            const currentTarget = camera.getTarget();
            camera.setTarget(BABYLON.Vector3.Lerp(currentTarget, targetLookAt, 0.05));
        }
    }
}

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Lighting setup
function setupLights() {
    console.log("Setting up lights...");
    new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene).intensity = 1.5;
    new BABYLON.DirectionalLight("directionalLight", new BABYLON.Vector3(0, -1, 1), scene).intensity = 0.5;
    console.log("Lights setup complete.");
}

// Load character model
async function loadCharacterModel() {
    console.log("Starting to load character model");
    const modelUrl = "https://dl.dropboxusercontent.com/scl/fi/7vaw9fobwo63rhozg6hzv/WALK4_IDLErun3.glb?rlkey=h7csszip84ge1vo9mhhqd645k&dl=1&raw=1";
    console.log("Attempting to load model from:", modelUrl);

    try {
        console.log("GLB loader available:", BABYLON.SceneLoader.IsPluginForExtensionAvailable('.glb'));
        console.log("Babylon.js version:", BABYLON.Engine.Version);

        if (!scene.isReady()) {
            await scene.whenReadyAsync();
        }

        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.LoadAssetContainer("", modelUrl, scene, 
                function (container) {
                    console.log("Model loaded successfully");
                    character = container.meshes[0];
                    const animationGroups = container.animationGroups;
                    
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

                    container.addAllToScene();
                    console.log("Character model loading complete");
                    resolve();
                },
                function (event) {
                    if (event.lengthComputable) {
                        const progress = (event.loaded / event.total * 100).toFixed(2);
                        console.log(`Loading progress: ${progress}%`);
                    }
                },
                function (scene, message, exception) {
                    console.error("Error loading model:", message);
                    if (exception) {
                        console.error("Exception details:", exception);
                    }
                    reject(new Error(message));
                }
            );
        });
    } catch (error) {
        console.error("Error in loadCharacterModel:", error.message);
        console.error("Error name:", error.name);
        console.error("Error stack:", error.stack);
        if (error instanceof DOMException && error.name === 'SecurityError') {
            console.error("CORS error detected. Ensure the server allows cross-origin requests.");
        }
        throw error;
    }
}

// Set up character
function setupCharacter() {
    console.log("Setting up character...");
    character.position.y = -4.5;
    character.rotation.y = Math.PI / 2;
    setAnimationState(AnimationStates.IDLE);
    console.log("Character setup complete.");
}

// Create bridge (using instancing for better performance)
function createBridge(scene, length = 2000, width = 5, segmentLength = 10) {
    console.log("Creating bridge...");
    const segmentCount = Math.ceil(length / segmentLength);

    const bridgeSegment = BABYLON.MeshBuilder.CreateBox("bridgeSegment", {width: width, height: 1, depth: segmentLength}, scene);
    
    const bridgeMaterial = new BABYLON.StandardMaterial("bridgeMaterial", scene);
    bridgeMaterial.diffuseColor = new BABYLON.Color3(0.545, 0.271, 0.075); // Brown color
    bridgeSegment.material = bridgeMaterial;
    bridgeSegment.isVisible = false; // Hide the original segment

    // Create instances
    const instances = [];
    for (let i = 0; i < segmentCount; i++) {
        const instance = bridgeSegment.createInstance("bridgeSegment_" + i);
        instance.position.z = i * segmentLength;
        instance.position.y = -5.5; // Ensure it's under the character's feet
        instances.push(instance);
    }

    console.log("Bridge creation complete. Total segments:", instances.length);
    return {
        segment: bridgeSegment,
        instances: instances,
        length: length,
        segmentLength: segmentLength
    };
}

function checkBridgeState() {
    console.log("Checking bridge state...");
    const characterZ = character.position.z;
    let visibleSegments = 0;
    let furthestZ = -Infinity;
    let closestZ = Infinity;

    bridge.instances.forEach((instance, index) => {
        if (instance.position.z >= characterZ - 50 && instance.position.z <= characterZ + 50) {
            visibleSegments++;
            furthestZ = Math.max(furthestZ, instance.position.z);
            closestZ = Math.min(closestZ, instance.position.z);
        }
    });

    console.log(`Visible segments: ${visibleSegments}`);
    console.log(`Closest segment Z: ${closestZ}`);
    console.log(`Furthest segment Z: ${furthestZ}`);
    console.log(`Character Z: ${characterZ}`);
}

let starSystem;

function createStars(scene) {
    console.log("Creating star particle system...");
    
    // Create a particle system
    starSystem = new BABYLON.ParticleSystem("stars", 2000, scene);

    // Texture of each particle
    starSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);

    // Where the particles come from
    starSystem.emitter = new BABYLON.Vector3(0, 0, 0); // the starting object, the emitter
    starSystem.minEmitBox = new BABYLON.Vector3(-100, -100, -100); // Starting all from
    starSystem.maxEmitBox = new BABYLON.Vector3(100, 100, 100); // To...

    // Colors of all particles
    starSystem.color1 = new BABYLON.Color4(1, 1, 1, 1.0);
    starSystem.color2 = new BABYLON.Color4(0.8, 0.8, 1, 1.0);
    starSystem.colorDead = new BABYLON.Color4(0, 0, 0.2, 0.0);

    // Size of each particle (random between...
    starSystem.minSize = 0.1;
    starSystem.maxSize = 0.5;

    // Life time of each particle (random between...
    starSystem.minLifeTime = 10;
    starSystem.maxLifeTime = 10;

    // Emission rate
    starSystem.emitRate = 2000;

    // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
    starSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;

    // Set the gravity of all particles
    starSystem.gravity = new BABYLON.Vector3(0, 0, 0);

    // Direction of each particle after it has been emitted
    starSystem.direction1 = new BABYLON.Vector3(0, 0, -1);
    starSystem.direction2 = new BABYLON.Vector3(0, 0, -1);

    // Angular speed, in radians
    starSystem.minAngularSpeed = 0;
    starSystem.maxAngularSpeed = Math.PI;

    // Speed
    starSystem.minEmitPower = 1;
    starSystem.maxEmitPower = 1;
    starSystem.updateSpeed = 0.005;

    // Start the particle system
    starSystem.start();

    console.log("Star particle system created.");
}

function updateStars() {
    if (starSystem) {
        // Move the emitter with the character
        starSystem.emitter = character.position.clone();
        starSystem.emitter.y += 10; // Adjust this value to position the emitter above the character
    }
}

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
    console.log("Starting game...");
    isGameStarted = false; // Temporarily set to false
    resetGameState(); // This will reset bridge and character position
    isGameStarted = true;
    startButton.style.display = 'none';
    setupUI();
    audio.load();
    audio.play().catch(e => console.error("Error playing audio:", e));
    
    if (walkAnimation && idleAnimation) {
        console.log("Setting animation state to WALK");
        setAnimationState(AnimationStates.WALK);
    } else {
        console.error("Animations not properly loaded");
    }
    
    isMoving = true;
    scheduleNextPause();
    
    checkBridgeState(); // Check bridge state after starting

    console.log("Game started successfully.");
}

// Setup UI
function setupUI() {
    console.log("Setting up UI...");
    scoreDisplay = document.getElementById('scoreDisplay');
    energyMeter = document.getElementById('energyMeter');
    feedbackDisplay = document.getElementById('feedbackDisplay');
    highScoreDisplay = document.getElementById('highScoreDisplay');
    if (highScoreDisplay) highScoreDisplay.style.display = 'none';
    console.log("UI setup complete.");
}

function resetGameState() {
    console.log("Resetting game state...");
    score = 0;
    energy = 100;
    isMoving = true;
    isMusicPlaying = true;
    scoreMultiplier = 1;
    musicStopCount = 0;
    character.position.set(0, -4.5, 0);
checkBridgeState();

    // Reset bridge segments
    bridge.instances.forEach((instance, index) => {
        instance.position.z = index * bridge.segmentLength;
        instance.position.y = -5.5; // Ensure it's under the character's feet
    });

    // Reset camera
    camera.position = new BABYLON.Vector3(0, 10, -20);
    camera.setTarget(new BABYLON.Vector3(0, 0, 10));

    currentViewIndex = 0;
    viewTransitionTime = 0;

    console.log("Game state reset complete.");
}

// Pause music
function pauseMusic() {
    if (musicStopCount < MAX_MUSIC_STOPS) {
        console.log("Pausing music...");
        const pauseDuration = Math.floor(Math.random() * 4000) + 2000;
        audio.pause();
        isMusicPlaying = false;
        musicStopTime = Date.now();
        musicStopCount++;
       setTimeout(() => {
            console.log("Resuming music...");
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
        scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
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

// Handle input (keyboard or touch)
function handleInput() {
    if (isGameStarted) {
        console.log("Input detected, toggling movement...");
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

// Game over function
function gameOver() {
    if (!isGameStarted) return;
    console.log("Game over triggered");
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
    console.log("Showing game over screen");
    const gameOverText = document.createElement('div');
    gameOverText.id = 'gameOverText';
    gameOverText.className = 'game-text';
    gameOverText.textContent = 'GAME OVER';
    document.body.appendChild(gameOverText);

    console.log("Game over screen displayed");

    setTimeout(() => {
        gameOverText.remove();
        handleHighScore(Math.floor(score));
    }, 3000);
}

// Set animation state
function setAnimationState(newState) {
    if (newState === currentAnimationState) return;
    
    console.log("Setting animation state to:", newState);
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

function updateGame(deltaTime) {
    updateCharacterMovement(deltaTime);
    updateEnergy(deltaTime);
    updateScore(deltaTime);
    checkGameOver();
    updateCameraPosition(deltaTime);
    updateStars(); // Replace moveStars(deltaTime) with this
    updateBackgroundGradient();
    recycleBridgeSegments();
}

// Update character movement
function updateCharacterMovement(deltaTime) {
    if (isMoving && isMusicPlaying) {
        character.position.z += characterWalkSpeed * deltaTime * 60;
    }
}

// Recycle bridge segments
function recycleBridgeSegments() {
    const characterZ = character.position.z;
    const cameraZ = camera.position.z;
    const viewDistance = 50; // Adjust this value based on your desired view distance

    bridge.instances.forEach(instance => {
        if (instance.position.z < characterZ - viewDistance) {
            instance.position.z += bridge.length;
        }
    });
}

// Create multiplier popup
function createMultiplierPopup(multiplier) {
    const popup = document.createElement('div');
    popup.className = 'multiplier-popup';
    popup.textContent = `x${multiplier.toFixed(1)}`;
    popup.style.left = `${Math.random() * 80 + 10}%`;
    popup.style.top = `${Math.random() * 80 + 10}%`;
    document.body.appendChild(popup);

    setTimeout(() => {
        popup.style.opacity = '0';
        popup.style.transform = 'translateY(-50px)';
        setTimeout(() => popup.remove(), 1000);
    }, 1000);
}

// High score handling
function handleHighScore(finalScore) {
    console.log("Handling high score...");
    const playerName = prompt("Enter your name for the high score:");
    if (playerName) {
        saveHighScore(playerName, finalScore);
    } else {
        showStartScreen();
    }
}

function saveHighScore(playerName, score) {
    const newScoreRef = database.ref('highScores').push();
    newScoreRef.set({
        name: playerName,
        score: score
    }).then(() => {
        console.log("Score saved successfully");
        loadAndShowHighScores();
    }).catch((error) => {
        console.error("Error saving score:", error);
        showStartScreen();
    });
}

function loadAndShowHighScores() {
    database.ref('highScores').orderByChild('score').limitToLast(MAX_HIGH_SCORES).once('value')
        .then((snapshot) => {
            const highScores = [];
            snapshot.forEach((childSnapshot) => {
                highScores.unshift(childSnapshot.val());
            });
            showHighScores(highScores);
        })
        .catch((error) => {
            console.error("Error loading high scores:", error);
            showStartScreen();
        });
}

function showHighScores(highScores) {
    console.log("Showing high scores...");
    highScoreDisplay.innerHTML = '<h2>High Scores</h2><ol>' + 
        highScores.map(score => `<li>${score.name}: ${score.score}</li>`).join('') +
        '</ol><button id="playAgainButton">Play Again</button>';
    highScoreDisplay.style.display = 'block';
    document.getElementById('playAgainButton').addEventListener('click', showStartScreen);
}

function showStartScreen() {
    console.log("Showing start screen...");
    highScoreDisplay.style.display = 'none';
    startButton.style.display = 'block';
    resetGameState();
}

// Main function
async function main() {
    try {
        console.log("Starting main function...");
        initializeEngine();
        console.log("Creating scene...");
        const scene = await createScene();
        console.log("Scene created successfully.");
        engine.runRenderLoop(() => {
            const deltaTime = engine.getDeltaTime() / 1000;
            scene.render();
            if (isGameStarted) {
                updateGame(deltaTime);
            }
        });
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
        
        console.log("Game setup complete. Ready to start.");
    } catch (error) {
        console.error("Error in main function:", error);
        alert("An error occurred while starting the game. Please check the console for more details.");
    }
}

// Start the game
main().catch((error) => console.error("Error starting game:", error));

// FPS display update
setInterval(() => {
    const fpsDisplay = document.getElementById('fpsDisplay');
    if (fpsDisplay) {
        fpsDisplay.textContent = `FPS: ${engine.getFps().toFixed()}`;
    }
}, 1000);

// Additional utility functions
function pauseGame() {
    if (isGameStarted) {
        isGameStarted = false;
        audio.pause();
        // You might want to show a pause menu here
    }
}

function resumeGame() {
    if (!isGameStarted) {
        isGameStarted = true;
        audio.play().catch(e => console.error("Error playing audio:", e));
        // Hide pause menu if you have one
    }
}

function setVolume(volume) {
    audio.volume = Math.max(0, Math.min(1, volume));
}

function toggleMute() {
    audio.muted = !audio.muted;
}

function increaseDifficulty() {
    characterWalkSpeed *= 1.1;
    ENERGY_DECREASE_RATE *= 1.1;
    // You can add more difficulty increases here
}