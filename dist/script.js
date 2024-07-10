const MAX_MUSIC_STOPS = 14;
const MAX_HIGH_SCORES = 10;
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
// Initialize Firestore
const db = firebase.firestore();

// Function to submit a high score
function submitHighScore(name, score) {
    console.log("Attempting to submit high score:", name, score);
    return db.collection("highScores").add({
        name: name,
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        console.log("High score submitted successfully");
        return Promise.resolve();
    })
    .catch((error) => {
        console.error("Error submitting high score: ", error);
        return Promise.reject(error);
    });
}

// Function to get high scores
function getHighScores() {
return db.collection("highScores")
.orderBy("score", "desc")
.limit(10)
.get()
.then((querySnapshot) => {
return querySnapshot.docs.map(doc => doc.data());
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
let highScores = [];
let particleSystem;
let feedbackParticles;
let characterWalkSpeed = 0.1; // Adjust this value to change walking speed
let cameraChangeInterval;

// Babylon.js objects
let engine, scene, camera;
let character, walkAnimation, idleAnimation, fallAnimation;

// Initialize the engine
function initializeEngine() {
    engine = new BABYLON.Engine(canvas, true);
}

// Game over function
function gameOver() {
    if (!isGameStarted) return; // Prevent multiple calls
    isGameStarted = false;
    audio.pause();
    walkAnimation.stop();
    idleAnimation.stop();
    clearInterval(cameraChangeInterval); // Clear any ongoing intervals

    console.log("Playing fall animation");
    fallAnimation.start(false);  // Play once

    fallAnimation.onAnimationEndObservable.addOnce(() => {
        console.log("Fall animation ended, transitioning to game over state");
        fallAnimation.stop();
        showGameOverScreen();
    });
}
function createFeedbackParticles() {
    if (particleSystem) {
        particleSystem.dispose();
    }
    particleSystem = new BABYLON.ParticleSystem("particles", 2000, scene);
    particleSystem.particleTexture = new BABYLON.Texture("https://www.babylonjs-playground.com/textures/flare.png", scene);
    particleSystem.emitter = character; // the character mesh
    particleSystem.minEmitBox = new BABYLON.Vector3(-1, 0, -1);
    particleSystem.maxEmitBox = new BABYLON.Vector3(1, 2, 1);
    particleSystem.color1 = new BABYLON.Color4(1, 1, 0, 1);
    particleSystem.color2 = new BABYLON.Color4(1, 0.5, 0, 1);
    particleSystem.colorDead = new BABYLON.Color4(0, 0, 0, 0);
    particleSystem.minSize = 0.1;
    particleSystem.maxSize = 0.5;
    particleSystem.emitRate = 0;
    particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_ONEONE;
    particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);
    particleSystem.direction1 = new BABYLON.Vector3(-1, 8, 1);
    particleSystem.direction2 = new BABYLON.Vector3(1, 8, -1);
    particleSystem.minEmitPower = 1;
    particleSystem.maxEmitPower = 3;
    particleSystem.updateSpeed = 0.01;
}


function forceAnimationChange() {
    if (isMoving) {
        walkAnimation.start(true, 1.0, walkAnimation.from, walkAnimation.to, false);
        idleAnimation.stop();
    } else {
        idleAnimation.start(true, 1.0, idleAnimation.from, idleAnimation.to, false);
        walkAnimation.stop();
    }
}

function showGameOverScreen() {
    const gameOverText = document.createElement('div');
    gameOverText.id = 'gameOverText';
    gameOverText.textContent = 'GAME OVER';
    document.body.appendChild(gameOverText);

    setTimeout(() => {
        checkHighScore(Math.floor(score));
    }, 2000);  // Show game over text for 2 seconds before checking high score
}

function checkHighScore(finalScore) {
    console.log("Checking high score:", finalScore);
    getHighScores().then(highScores => {
        if (highScores.length < MAX_HIGH_SCORES || finalScore > highScores[highScores.length - 1].score) {
            const name = prompt("Congratulations! You got a high score! Enter your name:");
            if (name) {
                console.log("Submitting high score for:", name);
                submitHighScore(name, finalScore)
                    .then(() => {
                        console.log("High score submitted, showing high scores");
                        showHighScores();
                    })
                    .catch(error => {
                        console.error("Error submitting high score:", error);
                        alert("Failed to submit high score. The game will continue.");
                        showHighScores();
                    });
            } else {
                console.log("No name entered, showing high scores");
                showHighScores();
            }
        } else {
            console.log("Score not high enough, showing high scores");
            showHighScores();
        }
    }).catch(error => {
        console.error("Error checking high scores:", error);
        alert("Failed to check high scores. The game will continue.");
        showHighScores();
    });
}



function showHighScores() {
    console.log("Showing high scores");
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingHighScores';
    loadingDiv.textContent = 'Loading high scores...';
    document.body.appendChild(loadingDiv);

    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
    );

    Promise.race([getHighScores(), timeoutPromise])
        .then(highScores => {
            console.log("High scores fetched:", highScores);
            document.getElementById('loadingHighScores').remove();
            if (document.getElementById('highScoreDisplay')) {
                document.getElementById('highScoreDisplay').remove();
            }

            const highScoreDisplay = document.createElement('div');
            highScoreDisplay.id = 'highScoreDisplay';
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

            document.body.appendChild(highScoreDisplay);
            startButton.textContent = 'Start Game';
            startButton.style.display = 'block';
        })
        .catch(error => {
            console.error("Error fetching high scores:", error);
            document.getElementById('loadingHighScores').remove();
            const errorDiv = document.createElement('div');
            errorDiv.id = 'highScoreError';
            errorDiv.textContent = 'Unable to load high scores. Please try again later.';
            document.body.appendChild(errorDiv);
            startButton.style.display = 'block';
        });
}
// Create and set up the scene
const createScene = async function () {
    scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(1, 0.7, 0.7, 1);
    scene.ambientColor = new BABYLON.Color3(0.1, 0.1, 0.1);


  
    setupCamera();
    setupLights();
    createStars(scene);
    const bridge = createBridge(scene);
    bridge.position.y = -5;

    await loadCharacterModel();
    setupCharacter();
  createFeedbackParticles();

    setupPostProcessing();
    setupSceneObservables();
  

    return scene;
};

// Camera setup
let cameraPositions = [
    new BABYLON.Vector3(0, 15, -25),  // Behind and above
    new BABYLON.Vector3(15, 10, -10), // Diagonal behind right
    new BABYLON.Vector3(-15, 10, -10) // Diagonal behind left
];
let currentCameraIndex = 0;
let lastCameraUpdateTime = 0;
let rotationAngle = 0;

function setupCamera() {
    camera = new BABYLON.ArcRotateCamera("camera", Math.PI, Math.PI / 3, 25, new BABYLON.Vector3(0, 0, 0), scene);
    camera.upperBetaLimit = Math.PI / 2.2;
    camera.lowerRadiusLimit = 15;
    camera.upperRadiusLimit = 40;
}
function bezierEasing(t) {
    return t * t * (3.0 - 2.0 * t);
}

function updateCameraPosition() {
    const currentTime = Date.now();
    if (isGameStarted) {
        if (isMoving) {
            if (currentTime - lastCameraUpdateTime > 5000) { // Change every 5 seconds
                currentCameraIndex = (currentCameraIndex + 1) % cameraPositions.length;
                lastCameraUpdateTime = currentTime;
            }
            let targetPosition = cameraPositions[currentCameraIndex].add(character.position);
            let t = bezierEasing((currentTime - lastCameraUpdateTime) / 5000);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, t * 0.1);
        } else {
            rotationAngle += 0.01;
            let x = Math.sin(rotationAngle) * 25;
            let z = Math.cos(rotationAngle) * 25;
            let targetPosition = new BABYLON.Vector3(x, 15, z).add(character.position);
            let t = bezierEasing((currentTime - lastCameraUpdateTime) / 2000);
            camera.position = BABYLON.Vector3.Lerp(camera.position, targetPosition, t * 0.1);
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
// GAMER OVER SCREEN
function gameOver() {
    if (!isGameStarted) return; // Prevent multiple calls
    isGameStarted = false;
    audio.pause();
    walkAnimation.stop();
    idleAnimation.stop();
    clearInterval(cameraChangeInterval); // Clear any ongoing intervals

    console.log("Playing fall animation");
    if (fallAnimation) {
        fallAnimation.stop();
        fallAnimation.reset();
        fallAnimation.start(false, 1.0, fallAnimation.from, fallAnimation.to, false);

        fallAnimation.onAnimationEndObservable.addOnce(() => {
            console.log("Fall animation ended, transitioning to game over state");
            showGameOverScreen();
        });
    } else {
        console.error("Fall animation not found, skipping to game over screen");
        showGameOverScreen();
    }
}

function showGameOverScreen() {
    const gameOverText = document.createElement('div');
    gameOverText.id = 'gameOverText';
    gameOverText.className = 'game-text';
    gameOverText.textContent = 'GAME OVER';
    document.body.appendChild(gameOverText);

    console.log("Game over screen displayed");

    // Wait for 3 seconds before checking high score
    setTimeout(() => {
        gameOverText.remove();
        checkHighScore(Math.floor(score));
    }, 3000);
}
// Set up character
function setupCharacter() {
    character.position.y = -4.5;
    character.rotation.y = Math.PI / 2;
    idleAnimation.start(true);
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
    scene.onBeforeRenderObservable.add(updateGame);
    scene.onKeyboardObservable.add(handleKeyboardInput);
    canvas.addEventListener('touchstart', handleInput);
}

// Update game state
function updateGame() {
    if (isGameStarted) {
        updateCharacterMovement();
        updateEnergy();
        updateScore();
        updateEnergyMeter();
        checkGameOver();
        updateCameraPosition();  // Add this line
    }
    moveStars(scene);
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
            energy = Math.min(energy + 0.15, 100);
        } else if (isMoving && !isMusicPlaying) {
            energy = Math.max(energy - 1.2, 0);  // Slowed down the energy decrease
        }
        console.log("Current energy:", energy); // Add this line for debugging
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
        forceAnimationChange();
        
        if (!isMusicPlaying && !isMoving) {
            const reactionTime = (Date.now() - musicStopTime) / 1000;
            scoreMultiplier = calculateMultiplier(reactionTime);
            score += 100 * scoreMultiplier;
            updateScore();
            showFeedback(reactionTime);
            triggerFeedbackParticles();
            createMultiplierPopup(scoreMultiplier); // Add this line
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
            
            vec3 color1 = vec3(0.545, 0.271, 0.075); // #FFB86C
            vec3 color2 = vec3(0.824, 0.412, 0.118); // #8BE9FD
            
            float blinkIntensity = sin(time * 2.0 + vUV.x * 10.0) * 0.5 + 0.5;
            vec3 baseColor = mix(color1, color2, chessBoardPattern);
            vec3 finalColor = mix(baseColor, vec3(1.0, 1.0, 0.5), blinkIntensity * 0.3);
            
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

// Create stars
function createStars(scene) {
    for (let i = 0; i < 1000; i++) {
        const star = BABYLON.MeshBuilder.CreateSphere(`star${i}`, {diameter: 0.1}, scene);
        star.position = new BABYLON.Vector3(Math.random() * 1000 - 500, Math.random() * 200 - 100, Math.random() * 1000 - 500);
        const starMaterial = new BABYLON.StandardMaterial(`starMaterial${i}`, scene);
        starMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
        star.material = starMaterial;
    }
}

// Add this new function to trigger the particle effect
function triggerFeedbackParticles() {
    if (particleSystem) {
        particleSystem.emitRate = 2000;
        particleSystem.start();
        setTimeout(() => {
            particleSystem.emitRate = 0;
        }, 200);
    }
}

// Add this new function for the multiplier popup
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


// Move stars
function moveStars(scene) {
    scene.meshes.filter(mesh => mesh.name.startsWith('star')).forEach(star => {
        star.position.z -= 0.1;
        if (star.position.z < -500) star.position.z = 500;
    });
}

// Update background gradient
function updateBackgroundGradient(scene, characterZ) {
    const t = (characterZ % 1000) / 1000;
    const r = 1 - t * 0.5, g = 0.7 - t * 0.7, b = 0.7 - t * 0.7;
    scene.clearColor = new BABYLON.Color4(r, g, b, 1);
}

function startGame() {
    isGameStarted = true;
    startButton.style.display = 'none';
    setupUI();
    resetGameState();
    audio.load();
    audio.play().catch(e => console.error("Error playing audio:", e));
    fallAnimation.stop();
    idleAnimation.stop();
forceAnimationChange();
    scheduleNextPause();
   setWalkSpeed(0.1);

  
    // Start camera movement
    cameraChangeInterval = setInterval(updateCameraPosition, 5000); // Change every 5 seconds
}

// Setup UI
function setupUI() {
    setupScoreDisplay();
    setupEnergyMeter();
    setupFeedbackDisplay();
    if (highScoreDisplay) highScoreDisplay.style.display = 'none';
}

// Setup score display
function setupScoreDisplay() {
    if (document.getElementById('scoreDisplay')) document.getElementById('scoreDisplay').remove();
    scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'scoreDisplay';
    document.body.appendChild(scoreDisplay);
    scoreDisplay.style.display = 'block';
    updateScore();
}

// Setup energy meter
function setupEnergyMeter() {
    if (!energyMeter) {
        const container = document.createElement('div');
        container.id = 'energyMeterContainer';
        energyMeter = document.createElement('div');
        energyMeter.id = 'energyMeter';
        container.appendChild(energyMeter);
        document.body.appendChild(container);
    }
    updateEnergyMeter();
}

// Setup feedback display
function setupFeedbackDisplay() {
    if (!feedbackDisplay) {
        feedbackDisplay = document.createElement('div');
        feedbackDisplay.id = 'feedbackDisplay';
        document.body.appendChild(feedbackDisplay);
    }
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
function updateScore() {
    if (isGameStarted && isMoving && isMusicPlaying) {
        score += 0.1 * scoreMultiplier;
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
    if (reactionTime >= 1.5) return 0;
    return 330 * (1 - reactionTime);  // Linear decrease from 33 to 0 over 1 second
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

// Update game state
function updateGame() {
    if (isGameStarted) {
        updateCharacterMovement();
        // Remove updateCharacterAnimation() from here
        updateEnergy();
        updateScore();
        updateEnergyMeter();
        checkGameOver();
        updateCameraPosition();
    }
    moveStars(scene);
    updateBackgroundGradient(scene, character.position.z);
}
  
function resetCameraAndCheckHighScore() {
    console.log("Resetting camera and checking high score");
    camera.position = new BABYLON.Vector3(0, 15, -25);
    camera.setTarget(character.position);
    checkHighScore(Math.floor(score));
}

function checkHighScore(finalScore) {
    getHighScores().then(highScores => {
        if (highScores.length < MAX_HIGH_SCORES || finalScore > highScores[highScores.length - 1].score) {
            const name = prompt("Congratulations! You got a high score! Enter your name:");
            if (name) {
                submitHighScore(name, finalScore)
                    .then(() => {
                        console.log("High score submitted successfully");
                        showHighScores();
                    })
                    .catch(error => {
                        console.error("Error submitting high score:", error);
                        alert("Failed to submit high score. Please try again.");
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

function showHighScores() {
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loadingHighScores';
    loadingDiv.textContent = 'Loading high scores...';
    document.body.appendChild(loadingDiv);

    getHighScores()
        .then(highScores => {
            // Remove loading indicator
            document.getElementById('loadingHighScores').remove();

            // Clear previous high score display
            if (document.getElementById('highScoreDisplay')) {
                document.getElementById('highScoreDisplay').remove();
            }

            const highScoreDisplay = document.createElement('div');
            highScoreDisplay.id = 'highScoreDisplay';
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

            document.body.appendChild(highScoreDisplay);
            startButton.textContent = 'Start Game';
            startButton.style.display = 'block';
        })
        .catch(error => {
            console.error("Error fetching high scores:", error);
            const errorDiv = document.createElement('div');
            errorDiv.id = 'highScoreError';
            errorDiv.textContent = 'Unable to load high scores. Please try again later.';
            document.body.appendChild(errorDiv);
        });
}

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