// Add at the very top of script.js
let game;

// Initialize EmailJS (add this near the top of your script)
(function() {
    emailjs.init("cQc0Zbd-BVu34QIhr");
})();

class SpaceScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SpaceScene' });
        this.letterBodies = [];
        this.defaultCategory = 0x0001;
        this.shipCategory = 0x0002;
        this.letterCategory = 0x0004;
        this.music = null;
        this.isTerminated = false;
        this.sounds = null;
        this.lastThrustSound = 0;
        this.thrustSoundDelay = 100;
        this.soundsReady = false;
        this.soundEffects = null;
        this.thrustSound = null;
        this.thrustFadeOutTween = null;
        this.analyser = null;
        this.dataArray = null;
        this.freqBands = {
            bass: { min: 20, max: 140 },
            lowMid: { min: 140, max: 400 },
            mid: { min: 400, max: 2600 },
            highMid: { min: 2600, max: 5200 },
            treble: { min: 5200, max: 14000 }
        };
        this.starfield = null;
        this.stars = [];
        this.starfieldActive = false;
        this.gridLines = [];
        this.gridParticles = [];
        this.lastBeatTime = 0;
        this.beatThreshold = 0.6;
        this.colorCycle = 0;
        this.mountains = [];
        this.mountainLayers = 3; // Number of parallax layers
        this.mountainSpeed = [0.5, 1, 1.5]; // Different speeds for each layer
        this.birds = [];
        this.birdSwarms = []; // Store separate swarms
        this.birdSpawnTimer = null;
        this.gridEffects = {
            activeGrids: [],
            maxActiveEffects: 3,  // Reduced from 5
            gridSize: 50,
            waveSpeed: 0.001,    // Reduced from 0.002 for slower waves
            waveAmplitude: 0.3
        };
    }

    preload() {
        // Load the ship sprite
        this.load.image('ship', 'https://res.cloudinary.com/dakoxedxt/image/upload/v1731944307/SHIP_kydqhd.png');
        
        // Keep the pixel texture for particles
        const graphics = this.add.graphics();
        graphics.fillStyle(0xffffff);
        graphics.fillRect(0, 0, 4, 4);
        graphics.generateTexture('pixel', 4, 4);
        graphics.destroy();
        
        // Load the music file
        this.load.audio('beat', 'https://res.cloudinary.com/dakoxedxt/video/upload/v1731993826/song3_gtatfd.mp3');
        
        // Load sound effects
        this.load.audio('shoot', 'https://res.cloudinary.com/dakoxedxt/video/upload/v1730833360/green1_s5xlbm.wav');
        this.load.audio('thrust', 'https://res.cloudinary.com/dakoxedxt/video/upload/v1728906753/SAWLOOPOUTCAST_SFX_tgofdg.wav');
        this.load.audio('select', 'https://res.cloudinary.com/dakoxedxt/video/upload/v1730833368/red8_s8hjtk.wav');
        this.load.audio('terminate', 'https://res.cloudinary.com/dakoxedxt/video/upload/v1728906734/FIENDE_PYRAMIDGUBBE_2OUTCAST_SFX_n451vw.wav');
    }

    create() {
        try {
            // Initialize audio
            this.music = this.sound.add('beat', {
                loop: true,
                volume: 0.3
            });

            // Wait for the audio context to be ready
            const setupAudioAnalyzer = () => {
                try {
                    if (this.sound.context) {
                        // Create analyzer node
                        this.analyser = this.sound.context.createAnalyser();
                        this.analyser.fftSize = 1024;
                        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

                        // Connect to the WebAudio nodes
                        if (this.music.source) {
                            this.music.source.connect(this.analyser);
                            this.analyser.connect(this.sound.context.destination);
                        }
                    }
                } catch (error) {
                    console.error('Analyzer setup failed:', error);
                }
            };

            // Add unlock handler
            const unlockAudio = () => {
                if (this.sound.locked) {
                    this.sound.unlock();
                }
                this.music.play();
                setupAudioAnalyzer();
                
                document.body.removeEventListener('click', unlockAudio);
                document.body.removeEventListener('touchstart', unlockAudio);
            };

            document.body.addEventListener('click', unlockAudio, { once: true });
            document.body.addEventListener('touchstart', unlockAudio, { once: true });

            this.soundsReady = true;
        } catch (error) {
            console.error('Audio initialization failed:', error);
            this.soundsReady = false;
        }

        this.time.timeScale = 1;
        
        // Set up the Matter world bounds to match the window size
        this.matter.world.setBounds(0, 0, window.innerWidth, window.innerHeight, 32, true);
        
        // Create controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Add this to prevent spacebar from being captured by Phaser
        this.input.keyboard.removeCapture(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Set up the camera to follow the ship
        this.cameras.main.setZoom(1);
        this.cameras.main.setBounds(0, 0, window.innerWidth, window.innerHeight);

        // Create particles
        this.thrustParticles = this.add.particles(0, 0, 'pixel', {
            speed: { min: 200, max: 400 },
            angle: { min: -15, max: 15 },
            scale: { start: 5.5, end: 0 },
            alpha: { start: 0.8, end: 0 },
            lifespan: { min: 300, max: 500 },
            blendMode: 'ADD',
            tint: 0xffffff,
            quantity: 3,
            emitting: false,
            gravityY: 0,
            frequency: 16,
            rotate: { min: -180, max: 180 },
            scaleX: { min: 0.5, max: 2 },
            scaleY: { min: 0.5, max: 2 }
        });

        // Create new ship shape
        this.ship = this.matter.add.image(
            window.innerWidth / 2,
            window.innerHeight / 3,
            'ship',
            null,
            {
                friction: 0,
                frictionAir: 0.01,
                density: 0.001,
                collisionFilter: {
                    category: this.shipCategory,
                    mask: this.defaultCategory | this.letterCategory
                }
            }
        );
        
        // Set the ship's properties
        this.ship.setScale(0.04);
        this.ship.setAngle(180);
        this.ship.setBounce(0.8);
        this.ship.setMass(20);
        this.ship.setTint(0xffffff);
        this.ship.setAlpha(1);
        this.ship.setBlendMode(Phaser.BlendModes.NORMAL);
        this.ship.setPipeline('Light2D');

        // Add multiple layers of glow
        this.ship.preFX.clear();
        this.ship.preFX.addGlow(0xffffff, 0.5, 0, false, 0.1, 8);  // Base glow
        this.ship.preFX.addGlow(0xffffff, 0.3, 1, false, 0.15, 16); // Outer glow
        this.ship.setBlendMode(Phaser.BlendModes.SCREEN);

   

        // Initial text setup with enhanced brightness
        const text = 'quant';
        const fontSize = Math.min(
            window.innerWidth / 8,
            window.innerHeight / 6,
            120
        );
        const letterSpacing = fontSize * 0.8;
        const totalWidth = (text.length - 1) * letterSpacing;
        let currentX = window.innerWidth / 2 - totalWidth / 2;
        const centerY = window.innerHeight / 2;

        this.matter.world.createDebugGraphic = false;  // Disable debug graphics completely

        text.split('').forEach((letter, index) => {
            if (letter === ' ') {
                currentX += letterSpacing;
                return;
            }

            // Adjust physics body size proportionally
            const body = this.matter.add.circle(
                currentX,
                centerY,
                fontSize/2.5,  // Increased from fontSize/3 for better collision area
                {
                    friction: 0.001,
                    frictionAir: 0.02,
                    restitution: 0.8,
                    mass: 1,
                    collisionFilter: {
                        category: this.letterCategory,
                        mask: this.shipCategory | this.defaultCategory | this.letterCategory
                    }
                }
            );

            const letterText = this.add.text(
                currentX,
                centerY,
                letter,
                {
                    fontFamily: 'League Spartan',
                    fontSize: `${fontSize}px`,
                    color: '#ffffff',
                    resolution: 2,
                    fontWeight: '400'  // Changed from '700' to '400' for a lighter weight
                }
            )
            .setOrigin(0.5)
            .setDepth(100)
            .setTint(0xffffff)
            .setBlendMode(Phaser.BlendModes.NORMAL);

            // Simple storage
            this.letterBodies.push({
                text: letterText,
                body: body,
                homeX: currentX,
                homeY: centerY
            });

            currentX += letterSpacing;
        });

        // Camera follow
        this.cameras.main.startFollow(this.ship, true, 0.09, 0.09);

        // Add touch controls
        this.input.addPointer(2);

        // Create invisible touch zones
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;

        // Create a large touch area for thrust (top 2/3 of screen)
        this.thrustZone = this.add.rectangle(0, 0, screenWidth, screenHeight * 0.7, 0x000000, 0)
            .setOrigin(0, 0)
            .setInteractive();

        // Create left/right rotation zones (bottom 1/3 of screen, split in half)
        this.leftZone = this.add.rectangle(0, screenHeight * 0.7, screenWidth * 0.5, screenHeight * 0.3, 0x000000, 0)
            .setOrigin(0, 0)
            .setInteractive();
        
        this.rightZone = this.add.rectangle(screenWidth * 0.5, screenHeight * 0.7, screenWidth * 0.5, screenHeight * 0.3, 0x000000, 0)
            .setOrigin(0, 0)
            .setInteractive();

        // Touch control states
        this.touchControls = {
            thrust: false,
            rotateLeft: false,
            rotateRight: false
        };

        // Touch event handlers
        this.thrustZone.on('pointerdown', () => this.touchControls.thrust = true);
        this.thrustZone.on('pointerup', () => this.touchControls.thrust = false);
        this.thrustZone.on('pointerout', () => this.touchControls.thrust = false);

        this.leftZone.on('pointerdown', () => this.touchControls.rotateLeft = true);
        this.leftZone.on('pointerup', () => this.touchControls.rotateLeft = false);
        this.leftZone.on('pointerout', () => this.touchControls.rotateLeft = false);

        this.rightZone.on('pointerdown', () => this.touchControls.rotateRight = true);
        this.rightZone.on('pointerup', () => this.touchControls.rotateRight = false);
        this.rightZone.on('pointerout', () => this.touchControls.rotateRight = false);

        // Create post-processing effects container
        this.effects = {
            // Scanlines effect
            scanlines: this.add.graphics()
                .setScrollFactor(0)
                .lineStyle(1, 0x000000, 0.1),
            
            // Stronger noise overlay
            noise: this.add.rectangle(0, 0, window.innerWidth, window.innerHeight, 0xffffff, 0.1)
                .setScrollFactor(0)
                .setOrigin(0, 0)
                .setBlendMode(Phaser.BlendModes.OVERLAY),
            
            // Additional fine grain layer
            fineGrain: this.add.rectangle(0, 0, window.innerWidth, window.innerHeight, 0x080808, 0.2)
                .setScrollFactor(0)
                .setOrigin(0, 0)
                .setBlendMode(Phaser.BlendModes.MULTIPLY),
            
            // Vignette effect (darker corners)
            vignette: this.add.circle(window.innerWidth/2, window.innerHeight/2, 
                Math.max(window.innerWidth, window.innerHeight), 0x000000, 0.3)
                .setScrollFactor(0)
                .setBlendMode(Phaser.BlendModes.MULTIPLY)
        };

        // Draw scanlines
        for(let y = 0; y < window.innerHeight; y += 4) {
            this.effects.scanlines.lineBetween(0, y, window.innerWidth, y);
        }

        // Animate main noise effect more aggressively
        this.time.addEvent({
            delay: 40, // Faster updates
            loop: true,
            callback: () => {
                this.effects.noise.setAlpha(0.05 + Math.random() * 0.15);
            }
        });

        // Animate fine grain separately
        this.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                this.effects.fineGrain.setAlpha(0.1 + Math.random() * 0.2);
            }
        });

        // Add occasional stronger noise bursts
        this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                if (Math.random() > 0.5) { // 50% chance
                    this.effects.noise.setAlpha(0.3);
                    this.time.delayedCall(100, () => {
                        this.effects.noise.setAlpha(0.1);
                    });
                }
            }
        });

        // Add occasional screen glitch effect
        this.time.addEvent({
            delay: 5000,
            loop: true,
            callback: () => {
                if (Math.random() > 0.7) { // 30% chance of glitch
                    this.cameras.main.shake(100, 0.01);
                    this.effects.noise.setAlpha(0.2);
                    this.time.delayedCall(100, () => {
                        this.effects.noise.setAlpha(0.02);
                    });
                }
            }
        });

        // Optional: Add a subtle color pulse to the entire scene
        const colorOverlay = this.add.rectangle(0, 0, window.innerWidth, window.innerHeight, 0x0000ff, 0.1)
            .setScrollFactor(0)
            .setOrigin(0, 0)
            .setBlendMode(Phaser.BlendModes.OVERLAY);

        this.tweens.add({
            targets: colorOverlay,
            alpha: { from: 0.1, to: 0.2 },
            duration: 2000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });

        // Add glow pipeline if not exists
        if (!this.game.renderer.pipelines.get('Glow')) {
            this.game.renderer.pipelines.add('Glow', new Phaser.Renderer.WebGL.Pipelines.PostFXPipeline({
                game: this.game,
                name: 'Glow',
                fragShader: `
                    precision mediump float;
                    uniform sampler2D uMainSampler;
                    uniform float time;
                    varying vec2 outTexCoord;
                    void main() {
                        vec4 color = texture2D(uMainSampler, outTexCoord);
                        float glow = abs(sin(time * 0.003)) * 0.5 + 0.5;
                        color.rgb *= (1.0 + glow * 0.5);
                        gl_FragColor = color;
                    }
                `
            }));
        }

        // Reduce the ship's base glow
        this.ship.preFX.addGlow(0xffffff, 1, 0, false, 0.02, 4); // Reduced intensity and blur

        // Subtle text glow (already white)
        this.letterBodies.forEach(letter => {
            letter.text.preFX.addGlow(0xffffff, 1, 0, false, 0.03, 4);
        });

        // White ambient glow particles
        this.glowParticles = this.add.particles(0, 0, 'pixel', {
            x: { min: 0, max: window.innerWidth },
            y: { min: 0, max: window.innerHeight },
            scale: { start: 0.3, end: 0 },
            alpha: { start: 0.2, end: 0 },
            tint: 0xffffff,
            blendMode: 'ADD',
            lifespan: 2000,
            frequency: 50,
            quantity: 1,
            follow: this.ship,
            followOffset: { x: -10, y: -10 }
        });

        // Subtler ship pulse
        this.tweens.add({
            targets: this.ship,
            alpha: { from: 0.9, to: 1 }, // Reduced alpha range
            duration: 1500,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        });

        // Make the ship glow follow the ship
        const shipGlow = this.add.pointlight(0, 0, 0xffffff, 50, 0.1); // Reduced radius and intensity
        shipGlow.setScrollFactor(1);
        
        this.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                shipGlow.x = this.ship.x;
                shipGlow.y = this.ship.y;
            }
        });

  

    

        // Add text chaos timer with a safer delay
        this.time.addEvent({
            delay: 60000, // Every minute
            loop: true,
            callback: () => {
                // Only trigger if the scene is still active
                if (this.scene.isActive()) {
                    this.createChaosEffect();
                }
            },
            callbackScope: this
        });

        // Add CLIENT AREA text after the main text setup
        const clientText = this.add.text(
            window.innerWidth / 2,
            window.innerHeight * 0.75,
            'login',
            {
                fontFamily: 'Space Mono',
                fontSize: `${Math.min(window.innerWidth / 40, 20)}px`,
                color: '#ffffff',
                align: 'center'
            }
        )
        .setOrigin(0.5)
        .setAlpha(0.5)
        .setDepth(2000)
        .setInteractive({ useHandCursor: true });

        // Add hover effects
        clientText.on('pointerover', () => {
            this.tweens.add({
                targets: clientText,
                alpha: 1,
                scale: 1.1,
                duration: 150,
                ease: 'Power2'
            });
        });

        clientText.on('pointerout', () => {
            this.tweens.add({
                targets: clientText,
                alpha: 0.5,
                scale: 1,
                duration: 150,
                ease: 'Power2'
            });
        });

        // Add click handler for prompt
        clientText.on('pointerdown', () => {
            // Create modal overlay
            const overlay = this.add.rectangle(0, 0, window.innerWidth, window.innerHeight, 0x000000, 0.7)
                .setOrigin(0, 0)
                .setDepth(1000)
                .setScrollFactor(0);

            // Create prompt container
            const promptContainer = this.add.container(window.innerWidth / 2, window.innerHeight / 2)
                .setDepth(1001)
                .setScrollFactor(0);

            // Create prompt background
            const promptBg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9)
                .setStrokeStyle(2, 0xffffff);
            
            // Create prompt text
            const promptText = this.add.text(0, -50, 'Enter your secret phrase', {
                fontFamily: 'Space Mono',
                fontSize: '24px',
                color: '#ffffff'
            }).setOrigin(0.5);

            // Create an actual HTML input field for mobile compatibility
            const input = document.createElement('input');
            input.type = 'text';
            input.style.position = 'absolute';
            input.style.left = '50%';
            input.style.top = '50%';
            input.style.transform = 'translate(-50%, -50%)';
            input.style.width = '200px';
            input.style.padding = '10px';
            input.style.backgroundColor = 'transparent';
            input.style.border = '1px solid #ffffff';
            input.style.color = '#ffffff';
            input.style.fontFamily = 'Space Mono';
            input.style.fontSize = '20px';
            input.style.textAlign = 'center';
            input.autocomplete = 'off';
            input.autocapitalize = 'off';

            document.body.appendChild(input);
            input.focus();

            // Handle input submission
            const handleSubmit = () => {
                this.showTermination();
                input.remove();
                document.removeEventListener('keydown', handleKeydown);
            };

            const handleKeydown = (event) => {
                if (event.key === 'Enter') {
                    handleSubmit();
                }
            };

            input.addEventListener('keydown', handleKeydown);

            // Add all elements to container
            promptContainer.add([promptBg, promptText]);

            // Clean up when overlay is clicked
            overlay.setInteractive();
            overlay.on('pointerdown', () => {
                input.remove();
                overlay.destroy();
                promptContainer.destroy();
                document.removeEventListener('keydown', handleKeydown);
            });
        });

        // Initialize music with lower volume
        this.music = this.sound.add('beat', {
            loop: true,
            volume: 0.3
        });

        // Initialize sound effects with lower volumes
        this.soundEffects = {
            shoot: this.sound.add('shoot', { volume: 0.15 }),    // Reduced from 0.3
            thrust: this.sound.add('thrust', { volume: 0 }),     // Starts at 0 for fade-in
            select: this.sound.add('select', { volume: 0.15 }),  // Reduced from 0.3
            terminate: this.sound.add('terminate', { volume: 0.2 }) // Reduced from 0.4
        };

        // Initialize audio context and start music on first interaction
        const startAudio = async () => {
            console.log('Start audio called');
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize sounds after audio context is ready
            //this.sounds = window.gameSounds;
            
            if (this.music && !this.music.isPlaying) {
                this.music = this.sound.add('beat', { 
                    volume: 0.3, 
                    loop: true 
                });
                
                // Create analyzer node
                this.analyser = this.sound.context.createAnalyser();
                this.analyser.fftSize = 1024; // Reduced for better performance
                this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                
                // Connect music to analyzer
                this.music.volumeNode.connect(this.analyser);
                
                this.music.play();
                
                // Start analyzing with more frequent updates
                this.time.addEvent({
                    delay: 16, // 60fps
                    callback: this.analyzeMusic,
                    callbackScope: this,
                    loop: true
                });

                // Add debug visualization
                this.debugGraphics = this.add.graphics()
                    .setScrollFactor(0)
                    .setDepth(1000);
            }
            
            // Remove all interaction listeners
            document.removeEventListener('click', handleFirstInteraction);
            document.removeEventListener('keydown', handleFirstInteraction);
            document.removeEventListener('touchstart', handleFirstInteraction);
            
            // Enable sound triggers
            this.soundsReady = true;
        };

        // Wrapper for first interaction
        const handleFirstInteraction = async (e) => {
            e.preventDefault();
            await startAudio();
        };

        // Add document-level listeners for first interaction
        document.addEventListener('click', handleFirstInteraction);
        document.addEventListener('keydown', handleFirstInteraction);
        document.addEventListener('touchstart', handleFirstInteraction);

        // Initialize thrust sound with loop and zero volume
        this.thrustSound = this.sound.add('thrust', {
            volume: 0,
            loop: true
        });

        // Handle thrust start
        this.thrustZone.on('pointerdown', () => {
            this.touchControls.thrust = true;
            if (this.soundsReady && this.thrustSound && !this.thrustSound.isPlaying) {
                this.thrustSound.play();
                // Cancel any existing fade out
                if (this.thrustFadeOutTween) {
                    this.thrustFadeOutTween.stop();
                }
                this.tweens.add({
                    targets: this.thrustSound,
                    volume: 0.15,
                    duration: 150,
                    ease: 'Power1'
                });
            }
        });

        // Handle thrust release
        this.thrustZone.on('pointerup', () => {
            this.touchControls.thrust = false;
            this.stopThrustSound();
        });

        // Also handle pointer leaving the thrust zone
        this.thrustZone.on('pointerout', () => {
            this.touchControls.thrust = false;
            this.stopThrustSound();
        });

        // Keyboard controls
        this.input.keyboard.on('keydown-UP', () => {
            if (this.soundsReady && this.thrustSound && !this.thrustSound.isPlaying) {
                this.thrustSound.play();
                // Cancel any existing fade out
                if (this.thrustFadeOutTween) {
                    this.thrustFadeOutTween.stop();
                }
                this.tweens.add({
                    targets: this.thrustSound,
                    volume: 0.15,
                    duration: 150,
                    ease: 'Power1'
                });
            }
        });

        this.input.keyboard.on('keyup-UP', () => {
            this.stopThrustSound();
        });

        // Remove the constant update timer that was making letters jiggle
        // Just keep ship movement and other necessary updates
        this.events.on('update', () => {
            this.letterBodies.forEach(letter => {
                if (letter.text && letter.body) {
                    letter.text.setPosition(letter.body.position.x, letter.body.position.y);
                }
            });
        });

        // Create starfield container
        this.starfield = this.add.container(0, 0).setDepth(1000);
        
        // Create more varied stars
        for (let i = 0; i < 150; i++) {
            // Create a gradient star using graphics
            const starGraphics = this.add.graphics();
            
            // Random size between 2 and 4
            const size = 1 + Math.random() * 1.5;
            
            // Create radial gradient effect
            const colors = [
                { stop: 0, color: 0xffffff, alpha: 1 },
                { stop: 0.4, color: 0xffffff, alpha: 0.8 },
                { stop: 1, color: 0xffffff, alpha: 0 }
            ];

            // Draw gradient star
            starGraphics.clear();
            colors.forEach((color, index) => {
                const radius = size * (1 - color.stop);
                starGraphics.fillStyle(color.color, color.alpha);
                starGraphics.fillCircle(size, size, radius);
            });

            // Generate texture from graphics
            const key = `star_${i}`;
            starGraphics.generateTexture(key, size * 2, size * 2);
            starGraphics.destroy();

            // Create sprite with generated texture
            const star = this.add.image(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight,
                key
            )
            .setBlendMode(Phaser.BlendModes.SCREEN)
            .setAlpha(0)
            .setDepth(1000);
            
            this.stars.push({
                sprite: star,
                z: Math.random() * 1.5 + 0.5,
                initialX: star.x,
                initialY: star.y,
                baseAlpha: 0.5 + Math.random() * 0.4 // Vary base brightness
            });
            
            this.starfield.add(star);
        }
        
        // Set starfield to follow camera
        this.starfield.setScrollFactor(0);
        this.starfield.setDepth(1);

        // Less frequent activation
        this.time.addEvent({
            delay: 15000, // Every 15 seconds
            callback: () => {
                if (Math.random() < 0.3) { // 30% chance
                    this.activateStarfield();
                }
            },
            loop: true
        });

        // Create TRON grid
        this.createGrid();
        
        // Start grid animation
        this.time.addEvent({
            delay: 50,
            callback: this.animateGrid,
            callbackScope: this,
            loop: true
        });

        // Add the geometric face
        this.geometricFace = this.createGeometricFace();

        // Add mountains before the face and other elements
        this.createMountains();

        // Clear any existing spawn timer
        if (this.birdSpawnTimer) {
            this.birdSpawnTimer.remove();
        }

        // Create initial flock
        this.createBirdSwarm();

        // Set up spawn timer that only creates new flock when no others exist
        this.birdSpawnTimer = this.time.addEvent({
            delay: 20000, // Spawn every 20 seconds
            callback: () => {
                // Only spawn new flock if there are fewer than 2 active flocks
                if (this.birdSwarms.length < 1) {
                    this.createBirdSwarm();
                }
            },
            loop: true
        });

        // Add grid effect spawner
        this.time.addEvent({
            delay: 5000,         // Increased from 2000 to 5000ms (less frequent spawning)
            callback: () => {
                if (this.gridEffects.activeGrids.length < this.gridEffects.maxActiveEffects) {
                    this.createWaveEffect();
                }
            },
            loop: true
        });

        // Add this at the end of create()
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                if (this.gridEffects.activeGrids.length < this.gridEffects.maxActiveEffects) {
                    this.createWaveEffect();
                }
            },
            loop: true
        });

        // Add mouse/touch control for ship rotation
        this.input.on('pointermove', (pointer) => {
            if (!this.isTerminated) {
                // Get the center of the screen
                const centerX = window.innerWidth / 2;
                
                // Calculate how far the pointer is from center
                const deltaX = pointer.x - centerX;
                
                // Convert to rotation (adjust 0.0001 to change sensitivity)
                const rotationSpeed = deltaX * 0.0001;
                
                // Apply rotation to ship
                this.ship.setAngularVelocity(rotationSpeed);
            }
        });
    }

    update() {
        if (this.isTerminated) return;

        // Modify ship controls to work with both keyboard and mouse/touch
        if (this.cursors.left.isDown || this.touchControls.rotateLeft) {
            this.ship.setAngularVelocity(-0.05);
        } else if (this.cursors.right.isDown || this.touchControls.rotateRight) {
            this.ship.setAngularVelocity(0.05);
        } else if (!this.input.activePointer.isDown) {
            // Only reset angular velocity if not using mouse/touch control
            this.ship.setAngularVelocity(0);
        }

        if (this.cursors.up.isDown || this.touchControls.thrust) {
            const angle = this.ship.rotation - Math.PI / 2;
            const thrust = 0.002;
            this.ship.applyForce({
                x: Math.cos(angle) * thrust,
                y: Math.sin(angle) * thrust
            });
        }

        // Call analyzeMusic for visual effects only
        this.analyzeMusic();

        // Update mountain positions
        if (this.mountains) {
            this.mountains.forEach(layer => {
                layer.group.getChildren().forEach(mountain => {
                    mountain.x -= layer.speed;
                    
                    // Reset position when mountain moves off screen
                    if (mountain.x <= -layer.width) {
                        mountain.x += layer.width * 2;
                    }
                });
            });
        }

        // Update bird swarms
        this.birdSwarms.forEach((swarm, swarmIndex) => {
            if (!swarm.leader || swarm.birds.length === 0) return;

            const leader = swarm.leader;

            // Smooth leader movement with slight irregularities
            const time = this.time.now * 0.001;
            const amplitude = 50; // Vertical movement amplitude
            const frequency = 0.1; // Vertical movement frequency

            // Calculate desired vertical position
            const targetY = leader.startY + Math.sin(time * frequency + leader.phase) * amplitude;

            // Calculate vertical velocity needed to reach targetY smoothly
            const dy = targetY - leader.y;
            const verticalStiffness = 0.02;
            leader.velocityY += dy * verticalStiffness;

            // Slight irregularity with Perlin noise
            leader.velocityY += (Math.random() - 0.5) * 0.1;

            // Limit leader's speed
            const maxSpeed = leader.baseSpeed;
            const speed = Math.sqrt(leader.velocityX * leader.velocityX + leader.velocityY * leader.velocityY);
            if (speed > maxSpeed) {
                leader.velocityX *= maxSpeed / speed;
                leader.velocityY *= maxSpeed / speed;
            }

            // Update leader's position
            leader.x += leader.velocityX;
            leader.y += leader.velocityY;
            leader.graphic.setPosition(leader.x, leader.y);

            // Update followers with elastic following
            swarm.birds.forEach(bird => {
                // Calculate target position relative to leader
                const targetX = leader.x + bird.targetOffsetX;
                const targetY = leader.y + bird.targetOffsetY;

                // Calculate displacement vector
                const dx = targetX - bird.x;
                const dy = targetY - bird.y;

                // Apply spring force (elastic effect)
                const stiffness = 0.001; // Adjust stiffness for elasticity
                bird.velocityX += dx * stiffness;
                bird.velocityY += dy * stiffness;

                // Apply damping to reduce oscillation
                const damping = 0.90; // Adjust for desired damping
                bird.velocityX *= damping;
                bird.velocityY *= damping;

                // Update bird's position
                bird.x += bird.velocityX;
                bird.y += bird.velocityY;
                bird.graphic.setPosition(bird.x, bird.y);
            });

            // Check if the swarm has entirely left the screen
            const offScreenBuffer = 200; // Allow some buffer before deletion
            const isLeaderOffScreen = leader.x > window.innerWidth + offScreenBuffer;
            const areAllFollowersOffScreen = swarm.birds.every(bird => bird.x > window.innerWidth + offScreenBuffer);

            if (isLeaderOffScreen && areAllFollowersOffScreen) {
                leader.graphic.destroy();
                swarm.birds.forEach(bird => bird.graphic.destroy());
                this.birdSwarms.splice(swarmIndex, 1);
            }
        });

        // Remove flocks that have gone off screen
        this.birdSwarms = this.birdSwarms.filter(swarm => {
            const isOffScreen = swarm.leader.x > window.innerWidth + 200;
            if (isOffScreen) {
                // Cleanup graphics
                swarm.leader.graphic.destroy();
                swarm.birds.forEach(bird => bird.graphic.destroy());
            }
            return !isOffScreen;
        });

        // Update grid effects
        if (this.gridEffects && this.gridEffects.activeGrids) {
            this.gridEffects.activeGrids.forEach(effect => {
                this.updateWaveEffects(effect);
            });
        }
    }

    // Helper method for shooting
    shoot() {
        const shipRotation = this.ship.rotation - Math.PI/2;
        this.createBullet(
            this.ship.x + Math.cos(shipRotation) * 20,
            this.ship.y + Math.sin(shipRotation) * 20,
            shipRotation
        );
    }

    // Simplify chaos effect to maintain more controlled movement
    createChaosEffect() {
        try {
            const chaosDuration = 15000;
            
            this.letterBodies.forEach(letter => {
                if (letter.body) {
                    // Add a single impulse instead of continuous movement
                    const force = 0.005;
                    const angleRad = Math.random() * Math.PI * 2;
                    this.matter.body.applyForce(letter.body, 
                        letter.body.position,
                        {
                            x: Math.cos(angleRad) * force,
                            y: Math.sin(angleRad) * force
                        }
                    );
                }
            });

            // Add subtle screen shake
            this.cameras.main.shake(300, 0.003);

        } catch (error) {
            console.log('Error in chaos effect:', error);
        }
    }

    // Add new method for termination
    showTermination() {
        this.isTerminated = true;
        
        // Play termination sound
        if (this.soundEffects) this.soundEffects.terminate.play();
        
        // Stop music
        if (this.music && this.music.isPlaying) {
            this.music.stop();
        }

        // Destroy everything in the scene
        this.children.removeAll();
        
        // Full black background
        const blackout = this.add.rectangle(0, 0, window.innerWidth, window.innerHeight, 0x000000)
            .setOrigin(0)
            .setScrollFactor(0)
            .setDepth(1000)
            .setAlpha(0);

        // Centered TERMINATED text
        const terminatedText = this.add.text(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'TERMINATED',
            {
                fontFamily: 'Space Mono',
                fontSize: '28px',
                color: '#ff0000',
                fontWeight: 'bold'
            }
        )
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1001)
        .setAlpha(0);

        // Quick fade to black, then show text
        this.tweens.add({
            targets: blackout,
            alpha: 1,
            duration: 500,
            ease: 'Power2',
            onComplete: () => {
                // Fade in text with glitch effect
                this.tweens.add({
                    targets: terminatedText,
                    alpha: 1,
                    duration: 200,
                    ease: 'Steps.4'
                });
            }
        });

        // Hide video background
        const videoElement = document.querySelector('.video-background');
        if (videoElement) {
            videoElement.style.display = 'none';
        }

        // Remove any existing overlays
        const existingPrompt = document.querySelector('.prompt-overlay');
        if (existingPrompt) {
            existingPrompt.remove();
        }
    }

    // Add method to handle thrust sound stopping
    stopThrustSound() {
        if (this.thrustSound && this.thrustSound.isPlaying) {
            // Store the tween reference so we can cancel it if needed
            this.thrustFadeOutTween = this.tweens.add({
                targets: this.thrustSound,
                volume: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    this.thrustSound.stop();
                    this.thrustFadeOutTween = null;
                }
            });
        }
    }

    // Clean up in case of scene change or termination
    shutdown() {
        if (this.thrustSound) {
            this.thrustSound.stop();
        }
        if (this.thrustFadeOutTween) {
            this.thrustFadeOutTween.stop();
        }
    }

    // Get average amplitude for a frequency range
    getFrequencyRangeValue(start, end) {
        if (!this.analyser || !this.dataArray) return 0;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        const sampleRate = this.sound.context.sampleRate;
        const binCount = this.analyser.frequencyBinCount;
        const startIndex = Math.floor(start * binCount / (sampleRate / 2));
        const endIndex = Math.floor(end * binCount / (sampleRate / 2));
        let total = 0;
        
        for (let i = startIndex; i <= endIndex; i++) {
            total += this.dataArray[i];
        }
        
        return total / (endIndex - startIndex + 1) / 255; // Normalize to 0-1
    }

    analyzeMusic() {
        if (!this.music?.isPlaying || !this.analyser) return;
        
        // Get frequency data with increased sensitivity
        const bass = this.getFrequencyRangeValue(this.freqBands.bass.min, this.freqBands.bass.max) * 1.5;
        const lowMid = this.getFrequencyRangeValue(this.freqBands.lowMid.min, this.freqBands.lowMid.max) * 1.4;
        const mid = this.getFrequencyRangeValue(this.freqBands.mid.min, this.freqBands.mid.max) * 1.3;
        const highMid = this.getFrequencyRangeValue(this.freqBands.highMid.min, this.freqBands.highMid.max) * 1.2;
        const treble = this.getFrequencyRangeValue(this.freqBands.treble.min, this.freqBands.treble.max) * 1.4;

        // 1. Grid Response (glow only)
        if (this.gridContainer) {
            this.gridLines.forEach(line => {
                line.setAlpha(0.1 + (bass * 0.4));
            });
        }

        // 2. Worm Response (glow only)
        this.gridParticles.forEach((worm, index) => {
            worm.segments.forEach((segment, segIndex) => {
                if (segment.glow) {
                    const baseGlowSize = 8 - (segIndex * 0.5);
                    segment.glow.setRadius(baseGlowSize + (mid * 8));
                    segment.glow.setAlpha(0.3 + (mid * 0.6));
                    
                    const hue = (this.time.now * 0.1 + index * 30) % 360;
                    const color = Phaser.Display.Color.HSLToColor(hue/360, 1, 0.5).color;
                    segment.glow.setFillStyle(color, 0.3 + (mid * 0.6));
                }
            });
        });

        // 3. Ship Response (glow only)
        if (this.ship) {
            // Single, clean glow effect
            if (this.ship.preFX) {
                this.ship.preFX.clear();
                this.ship.preFX.addGlow(0xffffff, 0.5 + (highMid * 0.5), 0, false, 0.1, 8);
            }
            
            // Simple color tinting
            const intensity = Math.floor(bass * 255);
            const color = Phaser.Display.Color.GetColor(
                128 + intensity,
                128 + Math.floor(mid * 255),
                255
            );
            this.ship.setTint(color);
        }

        // 4. Text Response (glow only)
        this.letterBodies.forEach((letter, index) => {
            if (letter.text.preFX) {
                letter.text.preFX.clear();
                letter.text.preFX.addGlow(0xffffff, 1 + (mid * 4), 0, false, 0.1, 4);
            }
        });

        // 5. Background Effects
        if (this.effects) {
            this.effects.noise.setAlpha(0.05 + (treble * 0.4));
            this.effects.vignette.setAlpha(0.3 + (bass * 0.4));
            this.effects.scanlines.setAlpha(0.1 + (mid * 0.3));
            
            const scanlineColor = Phaser.Display.Color.HSLToColor(
                (this.time.now * 0.1) % 360 / 360,
                0.5,
                0.5
            ).color;
            this.effects.scanlines.lineStyle(1, scanlineColor, 0.1 + (mid * 0.3));
        }

        // 6. Particle Effects (glow only)
        if (this.glowParticles) {
            this.glowParticles.setFrequency(30 - (mid * 25));
            this.glowParticles.setScale({
                start: 0.3 + (bass * 1),
                end: 0
            });
            
            this.glowParticles.setConfig({
                tint: Phaser.Display.Color.HSLToColor(
                    (this.time.now * 0.1) % 360 / 360,
                    1,
                    0.5
                ).color
            });
        }
    }

    updateStarfield() {
        if (!this.starfieldActive) return;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const time = this.time.now * 0.001;

        this.stars.forEach(star => {
            if (!star.sprite || !star.sprite.active) return;

            // Update star position
            const angle = time * star.speed;
            const distance = star.distance + (Math.sin(time * 0.5) * 20);
            
            // Calculate new position
            const newX = centerX + Math.cos(angle) * distance;
            const newY = centerY + Math.sin(angle) * distance;
            
            // Smooth movement
            star.sprite.x = star.sprite.x + (newX - star.sprite.x) * 0.1;
            star.sprite.y = star.sprite.y + (newY - star.sprite.y) * 0.1;
            
            // Calculate distance-based alpha
            const distanceFromCenter = Math.sqrt(
                Math.pow(star.sprite.x - centerX, 2) + 
                Math.pow(star.sprite.y - centerY, 2)
            );
            
            const maxDistance = Math.max(window.innerWidth, window.innerHeight) * 0.5;
            const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1);
            star.sprite.alpha = Math.max(0.2, 1 - normalizedDistance) * star.baseAlpha;
        });
    }

    activateStarfield() {
        if (this.starfieldActive) return;
        this.starfieldActive = true;

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        // Clear existing stars if any
        this.stars.forEach(star => {
            if (star.sprite) star.sprite.destroy();
        });
        this.stars = [];

        // Create new stars with correct color and brightness
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 50 + Math.random() * 150;
            const sprite = this.add.circle(
                centerX + Math.cos(angle) * distance,
                centerY + Math.sin(angle) * distance,
                1 + Math.random(),
                0xffffff,  // White color
                1         // Full alpha
            )
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(5);  // Ensure stars are visible

            this.stars.push({
                sprite: sprite,
                distance: distance,
                speed: 0.2 + Math.random() * 0.3,
                baseAlpha: 0.5 + Math.random() * 0.5
            });

            // Start with zero alpha for fade in
            sprite.setAlpha(0);
        }

        // Fade out videos
        const videoElements = document.querySelectorAll('.video-background');
        videoElements.forEach(video => {
            video.style.transition = 'opacity 2s ease-in-out';
            video.style.opacity = '0';
        });

        // Start star animation with proper cleanup
        if (this.starfieldMovement) {
            this.starfieldMovement.remove();
        }
        
        this.starfieldMovement = this.time.addEvent({
            delay: 16,
            callback: this.updateStarfield,
            callbackScope: this,
            loop: true
        });

        // Fade in stars
        this.stars.forEach(star => {
            this.tweens.add({
                targets: star.sprite,
                alpha: star.baseAlpha,
                duration: 2000,
                ease: 'Power2'
            });
        });

        // Set deactivation timer
        this.time.delayedCall(15000, () => {
            this.deactivateStarfield();
        });
    }

    deactivateStarfield() {
        if (!this.starfieldActive) return;

        // Fade out stars
        this.stars.forEach(star => {
            if (star.sprite && star.sprite.active) {
                this.tweens.add({
                    targets: star.sprite,
                    alpha: 0,
                    duration: 2000,
                    ease: 'Power2',
                    onComplete: () => {
                        star.sprite.destroy();
                    }
                });
            }
        });

        // Wait for stars to fade before bringing videos back
        setTimeout(() => {
            const videoElements = document.querySelectorAll('.video-background');
            videoElements.forEach(video => {
                // Reset transition
                video.style.transition = '';
                video.offsetHeight;
                // Add new transition
                video.style.transition = 'opacity 2s ease-in-out';
                video.style.opacity = '1';
            });

            // Stop starfield movement after everything is done
            setTimeout(() => {
                if (this.starfieldMovement) {
                    this.starfieldMovement.remove();
                    this.starfieldMovement = null;
                }
                this.starfieldActive = false;
            }, 2000);
        }, 1500);
    }

    createGrid() {
        // Move container to actual center
        this.gridContainer = this.add.container(0, 0);  // Changed from window.innerWidth/2, window.innerHeight/2
        this.gridContainer.setDepth(10);

        // Create larger grid pattern
        const cellSize = 100;
        const width = window.innerWidth * 2;     // Increased from 1.5 to 2
        const height = window.innerHeight * 2;    // Increased from 1.5 to 2
        
        // Center the grid by adjusting offsets
        const offsetX = -width / 2;
        const offsetY = -height / 2;

        // Draw grid lines with larger buffer
        const extraLines = 4; // Increased buffer for better coverage
        
        // Modified horizontal lines drawing
        for (let y = -height; y <= height; y += cellSize) {
            const line = this.add.line(
                0,  // Center point
                y, 
                offsetX - (cellSize * extraLines), // Start point
                0, 
                width + (cellSize * extraLines * 2), // End point
                0, 
                0xffffff, 
                0.1
            )
            .setBlendMode(Phaser.BlendModes.ADD);
            this.gridContainer.add(line);
            this.gridLines.push(line);
        }

        // Modified vertical lines drawing
        for (let x = -width; x <= width; x += cellSize) {
            const line = this.add.line(
                x,  // Center point
                0, 
                0, 
                offsetY - (cellSize * extraLines), // Start point
                0, 
                height + (cellSize * extraLines * 2), // End point
                0xffffff, 
                0.1
            )
            .setBlendMode(Phaser.BlendModes.ADD);
            this.gridContainer.add(line);
            this.gridLines.push(line);
        }

        // Center the entire grid container
        this.gridContainer.setPosition(window.innerWidth / 2, window.innerHeight / 2);

        // Create worms with precise grid alignment
        const gridWidth = Math.floor(width / cellSize);
        const gridHeight = Math.floor(height / cellSize);
        
        // Modified worm creation
        for (let i = 0; i < 4; i++) {
            const segments = [];
            const numSegments = 20;
            const wormColor = i % 2 === 0 ? 0x00ffff : 0x4169e1;
            
            // Ensure starting position is exactly on a grid line
            const startGridX = Math.floor(Math.random() * gridWidth - gridWidth/2) * cellSize;
            const startGridY = Math.floor(Math.random() * gridHeight - gridHeight/2) * cellSize;
            
            // Store exact grid coordinates instead of calculating
            const worm = {
                segments: [],
                speed: 2,
                direction: Math.random() < 0.5 ? 'horizontal' : 'vertical',
                gridPosition: {
                    x: startGridX,
                    y: startGridY
                },
                jumpTimer: 0,
                jumpInterval: 2000,
                shouldJump: false,
                fixedAxis: Math.random() < 0.5 ? startGridX : startGridY // Lock one axis
            };

            // Create segments at exact grid positions
            for (let j = 0; j < numSegments; j++) {
                const segment = this.add.circle(
                    worm.direction === 'horizontal' ? startGridX : startGridX,
                    worm.direction === 'vertical' ? startGridY : startGridY,
                    4 - (j * 0.15),
                    wormColor,
                    1 - (j / numSegments) * 0.7
                ).setBlendMode(Phaser.BlendModes.SCREEN);
                
                if (j < 3) {
                    const glow = this.add.circle(
                        segment.x,
                        segment.y,
                        8 - (j * 0.5),
                        wormColor,
                        0.3
                    ).setBlendMode(Phaser.BlendModes.ADD);
                    
                    this.gridContainer.add(glow);
                    segment.glow = glow;
                }
                
                this.gridContainer.add(segment);
                worm.segments.push(segment);
            }
            
            this.gridParticles.push(worm);
        }

        // Stay more zoomed in with less variation
        this.gridScale = this.tweens.add({
            targets: this.gridContainer,
            scale: { from: 2.0, to: 2.8 },  // Changed from 1.5-2.5 to 2.0-2.8
            duration: 8000,                  // Shorter duration
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Slower rotation
        this.gridRotation = this.tweens.add({
            targets: this.gridContainer,
            angle: 360,
            duration: 240000,  // Even slower rotation
            repeat: -1,
            ease: 'Linear'
        });

        // Optional: Add mouse/touch interaction with rotation instead of skew
        this.input.on('pointermove', (pointer) => {
            const deltaX = pointer.x - window.innerWidth / 2;
            const deltaY = pointer.y - window.innerHeight / 2;
            
            // Use subtle rotation instead of skew
            this.gridContainer.setRotation(
                (deltaX * 0.0001) + (deltaY * 0.0001)
            );
        });
    }

    animateGrid() {
        const cellSize = 100;
        const width = window.innerWidth * 2;
        const height = window.innerHeight * 2;
        
        this.gridParticles.forEach(worm => {
            const head = worm.segments[0];
            
            // Update jump timer
            worm.jumpTimer += 16;
            if (worm.jumpTimer >= worm.jumpInterval) {
                worm.shouldJump = true;
                worm.jumpTimer = 0;
            }

            // Handle jumping between lines
            if (worm.shouldJump) {
                if (worm.direction === 'horizontal') {
                    // Jump to a new horizontal line while keeping x position
                    worm.gridPosition.y = Math.floor(Math.random() * (height/cellSize) - height/(2*cellSize)) * cellSize;
                    worm.fixedAxis = worm.gridPosition.y;
                } else {
                    // Jump to a new vertical line while keeping y position
                    worm.gridPosition.x = Math.floor(Math.random() * (width/cellSize) - width/(2*cellSize)) * cellSize;
                    worm.fixedAxis = worm.gridPosition.x;
                }
                worm.shouldJump = false;
            }

            // Movement along grid
            if (worm.direction === 'horizontal') {
                worm.gridPosition.x += worm.speed;
                head.x = worm.gridPosition.x;
                head.y = worm.fixedAxis; // Keep y position locked to grid
                
                // Reset when reaching edge
                if (worm.gridPosition.x > width/2) {
                    worm.gridPosition.x = -width/2;
                }
            } else {
                worm.gridPosition.y += worm.speed;
                head.x = worm.fixedAxis; // Keep x position locked to grid
                head.y = worm.gridPosition.y;
                
                // Reset when reaching edge
                if (worm.gridPosition.y > height/2) {
                    worm.gridPosition.y = -height/2;
                }
            }

            // Update trail segments with strict grid alignment
            for (let i = worm.segments.length - 1; i > 0; i--) {
                const segment = worm.segments[i];
                const target = worm.segments[i - 1];
                
                if (!isNaN(target.x) && !isNaN(target.y)) {
                    segment.x += (target.x - segment.x) * 0.3;
                    segment.y += (target.y - segment.y) * 0.3;
                    
                    if (segment.glow) {
                        segment.glow.setPosition(segment.x, segment.y);
                    }
                }
            }
        });
    }

    createGeometricFace() {
        const face = this.add.container(
            window.innerWidth / 2, 
            window.innerHeight * 2
        );
        const graphics = this.add.graphics();
        
        graphics.lineStyle(3, 0xffffff, 0.8);
        
        // Head (inverted hexagon - wider at top)
        const headPoints = [];
        const headRadiusX = 80;
        const headRadiusY = 100;
        const topWide = 1.3; // Wider at top
        const chinNarrow = 0.6; // Narrower chin
        
        const originalPoints = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2 / 6) + Math.PI / 6;
            // Invert the modifier - wide at top, narrow at bottom
            const radiusModifier = (angle <= Math.PI) ? topWide : chinNarrow;
            const point = {
                x: Math.cos(angle) * headRadiusX * radiusModifier,
                y: Math.sin(angle) * headRadiusY
            };
            headPoints.push({...point});
            originalPoints.push({...point});
        }
        
        const drawHead = () => {
            graphics.clear();
            graphics.lineStyle(3, 0xffffff, 0.8);
            graphics.beginPath();
            graphics.moveTo(headPoints[0].x, headPoints[0].y);
            headPoints.forEach(point => {
                graphics.lineTo(point.x, point.y);
            });
            graphics.closePath();
            graphics.strokePath();
        };
        
        drawHead();
        
        // Eyes
        const leftEye = this.add.graphics();
        leftEye.lineStyle(3, 0xffffff, 0.8);
        leftEye.beginPath();
        leftEye.moveTo(-50, -30);
        leftEye.lineTo(-30, -40);
        leftEye.lineTo(-30, -20);
        leftEye.closePath();
        leftEye.strokePath();
        
        const rightEye = this.add.graphics();
        rightEye.lineStyle(3, 0xffffff, 0.8);
        rightEye.beginPath();
        rightEye.moveTo(50, -30);
        rightEye.lineTo(30, -40);
        rightEye.lineTo(30, -20);
        rightEye.closePath();
        rightEye.strokePath();
        
        // Audio-reactive mouth
        const mouth = this.add.graphics();
        face.add([graphics, leftEye, rightEye, mouth]);
        
        // Mouth animation
        this.time.addEvent({
            delay: 16,
            callback: () => {
                const highMid = this.getFrequencyRangeValue(
                    this.freqBands.highMid.min,
                    this.freqBands.highMid.max
                );
                
                mouth.clear();
                mouth.lineStyle(3, 0xffffff, 0.8);
                
                // Dynamic mouth height based on audio
                const baseHeight = 15;
                const mouthHeight = baseHeight + (highMid * 20);
                
                // Draw robotic mouth segments
                mouth.beginPath();
                for (let x = -20; x <= 20; x += 4) { // Smaller segments
                    const segmentHeight = mouthHeight * (1 - Math.abs(x/20) * 0.3);
                    mouth.moveTo(x, segmentHeight/2 + 20); // Moved down slightly
                    mouth.lineTo(x, -segmentHeight/2 + 20);
                }
                mouth.strokePath();
            },
            loop: true
        });

        // Slower, more dramatic deformation
        this.time.addEvent({
            delay: 15000, // Every 15 seconds
            callback: () => {
                if (Math.random() > 0.7) {
                    // More dramatic deformation
                    const deformDuration = 4000; // Slower deform
                    const returnDuration = 2000; // Slower return
                    
                    headPoints.forEach((point, index) => {
                        this.tweens.add({
                            targets: point,
                            x: point.x + (Math.random() - 0.5) * 80, // More dramatic movement
                            y: point.y + (Math.random() - 0.5) * 80,
                            duration: deformDuration,
                            ease: 'Sine.easeInOut',
                            onUpdate: drawHead,
                            onComplete: () => {
                                this.tweens.add({
                                    targets: point,
                                    x: originalPoints[index].x,
                                    y: originalPoints[index].y,
                                    duration: returnDuration,
                                    ease: 'Power2.easeOut',
                                    onUpdate: drawHead
                                });
                            }
                        });
                    });
                }
            },
            loop: true
        });

        // Entrance animation
        this.tweens.add({
            targets: face,
            y: window.innerHeight * 0.35,
            duration: 4000,
            ease: 'Power2',
            delay: 1000,
            onComplete: () => {
                // Start floating animation
                this.tweens.add({
                    targets: face,
                    y: '+=20', // Float up and down by 20 pixels
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });

                // Add periodic scaling effect
                this.time.addEvent({
                    delay: 15000, // Every 15 seconds
                    callback: () => {
                        if (Math.random() > 0.5) { // 50% chance to trigger
                            this.tweens.add({
                                targets: face,
                                scale: 3, // Grow to twice the size
                                duration: 5000, // Take 5 seconds to grow
                                ease: 'Sine.easeInOut',
                                yoyo: true, // Return to original size
                                onComplete: () => {
                                    face.setScale(1); // Ensure we're back to original size
                                }
                            });
                        }
                    },
                    loop: true
                });
            }
        });

        // Laser beam effect (unchanged)
        const createLaserBeam = (eye, direction) => {
            const laser = this.add.graphics();
            const startX = direction === 'left' ? -40 : 40;
            const endX = direction === 'left' ? -window.innerWidth/2 : window.innerWidth/2;
            
            this.tweens.add({
                targets: laser,
                alpha: { from: 1, to: 0 },
                duration: 500,
                onUpdate: (tween) => {
                    laser.clear();
                    laser.lineStyle(3, 0x00ffff, 1 - tween.progress);
                    laser.beginPath();
                    laser.moveTo(startX, -30);
                    laser.lineTo(endX, -30 + Math.random() * 10);
                    laser.strokePath();
                },
                onComplete: () => laser.destroy()
            });
            
            face.add(laser);
        };

        // Random laser beams (unchanged)
        this.time.addEvent({
            delay: 8000,
            callback: () => {
                if (Math.random() > 0.7) {
                    createLaserBeam(leftEye, 'left');
                    createLaserBeam(rightEye, 'right');
                    
                    [leftEye, rightEye].forEach(eye => {
                        this.tweens.add({
                            targets: eye,
                            alpha: { from: 1, to: 0.2 },
                            duration: 100,
                            yoyo: true,
                            repeat: 3
                        });
                    });
                }
            },
            loop: true
        });

        return face;
    }

    createMountains() {
        const colors = [0x222222, 0x333333, 0x444444];
        
        for (let layer = 0; layer < this.mountainLayers; layer++) {
            const mountainGroup = this.add.group();
            const segmentWidth = 50; // Smaller segments for smoothness
            const maxHeight = 150 + (layer * 50);
            const segments = Math.ceil(window.innerWidth / segmentWidth) + 2;
            
            for (let set = 0; set < 2; set++) {
                const mountains = this.add.graphics();
                mountains.setDepth(10 - layer);
                mountains.fillStyle(colors[layer], 1);
                
                // Generate smooth points using sine wave interpolation
                const points = [];
                for (let i = 0; i <= segments; i++) {
                    const x = i * segmentWidth;
                    
                    // Create smooth height using multiple sine waves
                    const baseHeight = Math.random() * maxHeight;
                    const wave1 = Math.sin(i * 0.5) * (maxHeight * 0.2);
                    const wave2 = Math.sin(i * 0.2) * (maxHeight * 0.1);
                    const height = baseHeight + wave1 + wave2;
                    
                    const y = window.innerHeight - height;
                    points.push({ x, y });
                }
                
                // Draw mountains with simple lines but many points
                mountains.beginPath();
                mountains.moveTo(points[0].x, points[0].y);
                
                // Draw smooth line through points
                for (let i = 1; i < points.length; i++) {
                    mountains.lineTo(points[i].x, points[i].y);
                }
                
                // Close the shape
                mountains.lineTo(points[points.length - 1].x, window.innerHeight + 100);
                mountains.lineTo(points[0].x, window.innerHeight + 100);
                mountains.closePath();
                mountains.fill();
                
                // Position second set
                if (set === 1) {
                    mountains.x = points[points.length - 1].x;
                }
                
                mountainGroup.add(mountains);
            }
            
            this.mountains.push({
                group: mountainGroup,
                speed: this.mountainSpeed[layer],
                width: segments * segmentWidth
            });
        }
    }

    getSteeringForce(bird, neighbors, leader) {
        const forces = {
            separation: { x: 0, y: 0 },
            alignment: { x: 0, y: 0 },
            cohesion: { x: 0, y: 0 },
            followLeader: { x: 0, y: 0 }
        };

        // Enhanced separation with personality influence
        neighbors.forEach(other => {
            const dx = bird.x - other.x;
            const dy = bird.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bird.separationRadius && dist > 0) {
                const force = (bird.separationRadius - dist) / bird.separationRadius;
                const personalityFactor = 1 + (bird.personality * 0.5);  // More independent birds separate more
                forces.separation.x += (dx / dist) * force * personalityFactor;
                forces.separation.y += (dy / dist) * force * personalityFactor;
            }
        });

        // Modify force calculations for more gradual following
        const targetX = leader.x + bird.targetOffsetX;
        const targetY = leader.y + bird.targetOffsetY;
        const dx = targetX - bird.x;
        const dy = targetY - bird.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Weaker leader following based on distance
        const followStrength = 0.05 / (1 + bird.row * 0.2);
        forces.followLeader.x = dx * followStrength;
        forces.followLeader.y = dy * followStrength;

        // Gradual upward drift when falling behind
        if (dist > 100) {
            forces.followLeader.y -= 0.02 * (1 + bird.row * 0.1);
        }

        // Weight forces with more emphasis on smooth following
        return {
            x: forces.separation.x * 1.0 +
               forces.alignment.x * 0.6 +
               forces.cohesion.x * 0.4 +
               forces.followLeader.x * (1.2 - bird.row * 0.1),
            y: forces.separation.y * 1.0 +
               forces.alignment.y * 0.6 +
               forces.cohesion.y * 0.4 +
               forces.followLeader.y * (1.2 - bird.row * 0.1)
        };
    }

    createBirdSwarm() {
        const swarmSize = Phaser.Math.Between(20, 30);
        // Adjust starting position to be higher and further left
        const startX = -200; // Further left to ensure all birds spawn off-screen
        const startY = Phaser.Math.Between(window.innerHeight * 0.5, window.innerHeight * 1.0); // Lower flight path
        const baseSpeed = Phaser.Math.FloatBetween(2.5, 3);

        const swarm = {
            birds: [],
            leader: null
        };

        // Make leader movement much more subtle
        const leader = {
            graphic: this.add.graphics(),
            x: startX,
            y: startY,
            velocityX: baseSpeed,
            velocityY: 0,
            depth: 2,
            scale: 1.2,
            color: 0x666666,
            wingUp: true,
            startY: startY,
            phase: Math.random() * Math.PI * 2,
            waveMagnitude: 0.08,
            waveFrequency: 0.05,
            baseSpeed: baseSpeed,
            targetY: window.innerHeight * 0.6 // Add target height for gradual descent
        };

        // Assign leader to swarm
        swarm.leader = leader;

        // Position followers with more variation
        for (let i = 0; i < swarmSize; i++) {
            const row = Math.floor(i / 2);
            const isLeft = i % 2 === 0;
            const angle = (isLeft ? 1 : -1) * Math.PI / 6;
            const spacing = 35; // Increased base spacing
            
            // Much more progressive lag based on distance from leader
            const lagFactor = 0.92 + (row * 0.01); // More dramatic increase with each row
            const xOffset = -spacing * (row + 1) * (1 + row * 0.1); // Increasing spacing for back rows
            const yOffset = (isLeft ? 1 : -1) * spacing * (row + 1) * Math.sin(angle);
            
            const bird = {
                graphic: this.add.graphics(),
                x: leader.x + xOffset,
                y: leader.y + yOffset,
                velocityX: baseSpeed * 0.9,
                velocityY: 0,
                depth: 1,
                scale: 0.8,
                color: 0x444444,
                wingUp: true,
                inertia: lagFactor,
                agility: 0.5 - (row * 0.08), // More dramatic decrease in agility
                maxSpeed: baseSpeed * (0.95 - (row * 0.03)), // More speed variation
                verticalFollowing: 1 - (row * 0.15), // Reduced vertical following for back birds
                oscillator: {
                    frequency: 0.1 + Math.random() * 0.2,
                    phase: Math.random() * Math.PI * 2,
                    amplitude: 0.05 + (row * 0.04) // More movement for back birds
                },
                targetOffsetX: xOffset,
                targetOffsetY: yOffset,
                row: row
            };

            swarm.birds.push(bird);
        }

        // Draw birds
        const drawBird = (bird, isLeader = false) => {
            bird.graphic.clear();
            bird.graphic.lineStyle(isLeader ? 3 : 2 * bird.scale, bird.color);
            if (bird.wingUp) {
                bird.graphic.beginPath();
                bird.graphic.moveTo(-8 * bird.scale, -4 * bird.scale);
                bird.graphic.lineTo(0, 0);
                bird.graphic.lineTo(8 * bird.scale, -4 * bird.scale);
                bird.graphic.strokePath();
            } else {
                bird.graphic.beginPath();
                bird.graphic.moveTo(-8 * bird.scale, 4 * bird.scale);
                bird.graphic.lineTo(0, 0);
                bird.graphic.lineTo(8 * bird.scale, 4 * bird.scale);
                bird.graphic.strokePath();
            }
        };

        drawBird(leader, true);
        swarm.birds.forEach(bird => drawBird(bird));

        this.birdSwarms.push(swarm);

        // Wing animation
        this.time.addEvent({
            delay: 150,
            callback: () => {
                // Check if leader exists before accessing
                if (swarm.leader) {
                    swarm.leader.wingUp = !swarm.leader.wingUp;
                    drawBird(swarm.leader, true);
                }
                
                // Update follower birds
                swarm.birds.forEach(bird => {
                    if (bird) {  // Add null check
                        bird.wingUp = !bird.wingUp;
                        drawBird(bird);
                    }
                });
            },
            loop: true
        });

        // Update movement code
        this.time.addEvent({
            delay: 16,
            callback: () => {
                const time = this.time.now * 0.001;
                
                // Modify leader movement to gradually descend
                leader.x += leader.velocityX;
                
                // Gradual descent towards target height
                const heightDiff = leader.targetY - leader.y;
                leader.y += heightDiff * 0.001; // Very gradual descent
                
                // Add subtle wave motion
                leader.y += Math.sin(time * leader.waveFrequency + leader.phase) * leader.waveMagnitude;
                
                leader.graphic.setPosition(leader.x, leader.y);

                // Sort birds by row for more natural following
                const sortedBirds = [...swarm.birds].sort((a, b) => a.row - b.row);

                sortedBirds.forEach(bird => {
                    const neighbors = sortedBirds.filter(other => {
                        if (other === bird) return false;
                        const dx = other.x - bird.x;
                        const dy = other.y - bird.y;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        return dist < bird.cohesionRadius;
                    });

                    const force = this.getSteeringForce(bird, neighbors, leader);
                    
                    // Separate horizontal and vertical force application
                    bird.velocityX = bird.velocityX * bird.inertia + 
                                    force.x * bird.agility * (1 - bird.row * 0.1);
                    // Reduced vertical movement for back birds
                    bird.velocityY = bird.velocityY * bird.inertia + 
                                    force.y * bird.agility * bird.verticalFollowing;

                    const rowFactor = bird.row * 0.15; // Increased row influence
                    const individualMotion = {
                        x: Math.sin(time * bird.oscillator.frequency + bird.oscillator.phase) * 
                           bird.oscillator.amplitude * (1 + rowFactor),
                        y: Math.cos(time * bird.oscillator.frequency * 0.5 + bird.oscillator.phase) * 
                           bird.oscillator.amplitude * (1 + rowFactor)
                    };

                    bird.velocityX += individualMotion.x;
                    bird.velocityY += individualMotion.y;

                    // Increased turbulence for back birds
                    const turbulence = bird.row * 0.015;
                    bird.velocityX += (Math.random() - 0.5) * turbulence;
                    bird.velocityY += (Math.random() - 0.5) * turbulence;

                    bird.x += bird.velocityX;
                    bird.y += bird.velocityY;
                    bird.graphic.setPosition(bird.x, bird.y);
                });

                // Improved off-screen detection and cleanup
                const rightmostBird = Math.max(
                    leader.x,
                    ...swarm.birds.map(bird => bird.x)
                );
                
                const leftmostBird = Math.min(
                    leader.x,
                    ...swarm.birds.map(bird => bird.x)
                );

                // Only remove swarm when ALL birds are off screen
                if (leftmostBird > window.innerWidth + 100) {
                    // Clean up graphics before removing
                    leader.graphic.destroy();
                    swarm.birds.forEach(bird => bird.graphic.destroy());
                    
                    // Find and remove this swarm from the birdSwarms array
                    const swarmIndex = this.birdSwarms.indexOf(swarm);
                    if (swarmIndex !== -1) {
                        this.birdSwarms.splice(swarmIndex, 1);
                    }
                }
            },
            loop: true
        });
    }

    createWaveEffect() {
        const cols = Math.ceil(window.innerWidth / this.gridEffects.gridSize);
        const rows = Math.ceil(window.innerHeight / this.gridEffects.gridSize);
        
        const startCol = Phaser.Math.Between(0, cols - 1);
        const startRow = Phaser.Math.Between(0, rows - 1);
        
        const effect = {
            graphics: this.add.graphics(),
            startTime: this.time.now,
            center: {
                x: startCol * this.gridEffects.gridSize,
                y: startRow * this.gridEffects.gridSize
            },
            maxRadius: Math.max(window.innerWidth, window.innerHeight),
            alpha: 0
        };

        effect.graphics
            .setScrollFactor(1)
            .setDepth(1)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.gridEffects.activeGrids.push(effect);

        this.time.delayedCall(5000, () => {
            effect.graphics.destroy();
            const index = this.gridEffects.activeGrids.indexOf(effect);
            if (index > -1) {
                this.gridEffects.activeGrids.splice(index, 1);
            }
        });
    }

    updateWaveEffects(effect) {
        effect.graphics.clear();
        
        const elapsed = this.time.now - effect.startTime;
        const radius = elapsed * this.gridEffects.waveSpeed * 1000;
        
        const gridSize = this.gridEffects.gridSize;
        const cellsToLight = [];
        
        for (let x = effect.center.x - radius; x <= effect.center.x + radius; x += gridSize) {
            for (let y = effect.center.y - radius; y <= effect.center.y + radius; y += gridSize) {
                const dx = x - effect.center.x;
                const dy = y - effect.center.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (Math.abs(distance - radius) < gridSize * 1.5) {  // Increased from gridSize to gridSize * 1.5 for wider waves
                    const intensity = 0.15 * (1 - (radius / effect.maxRadius));  // Reduced from 0.3 to 0.15 for softer glow
                    cellsToLight.push({ x, y, intensity });
                }
            }
        }
        
        effect.graphics.fillStyle(0xffffff);
        cellsToLight.forEach(cell => {
            effect.graphics.fillRect(
                cell.x, 
                cell.y, 
                gridSize, 
                gridSize
            ).setAlpha(cell.intensity);
        });
    }
}

// Improved config with responsive settings
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game',
    backgroundColor: 'rgba(0,0,0,0)',
    transparent: true,
    physics: {
        default: 'matter',
        matter: {
            debug: false,
            gravity: { y: 0 },
            setBounds: true
        }
    },
    scene: SpaceScene
};

// Initialize game only once
window.addEventListener('load', () => {
    try {
        if (typeof Phaser === 'undefined') {
            console.error('Phaser is not loaded');
            return;
        }
        
        game = new Phaser.Game(config);
        
        // Add error handler
        game.events.on('error', (error) => {
            console.error('Phaser error:', error);
        });
    } catch (error) {
        console.error('Game initialization failed:', error);
    }
});

// Handle resize separately
window.addEventListener('resize', () => {
    try {
        if (game && game.scene && game.scene.scenes[0]) {
            game.scale.resize(window.innerWidth, window.innerHeight);
            
            const currentScene = game.scene.scenes[0];
            if (currentScene.mountains) {
                currentScene.mountains = [];
                currentScene.createMountains();
            }
            
            if (currentScene.effects) {
                // Redraw scanlines
                currentScene.effects.scanlines.clear();
                for(let y = 0; y < window.innerHeight; y += 4) {
                    currentScene.effects.scanlines.lineBetween(0, y, window.innerWidth, y);
                }
                
                // Update noise layers
                currentScene.effects.noise.setSize(window.innerWidth, window.innerHeight);
                currentScene.effects.fineGrain.setSize(window.innerWidth, window.innerHeight);
            }
        }
    } catch (error) {
        console.error('Resize handler error:', error);
    }
});

// Add this at the bottom of your script.js file
document.addEventListener('DOMContentLoaded', () => {
    const infoButton = document.getElementById('infoButton');
    const infoOverlay = document.getElementById('infoOverlay');
    const closeButton = document.querySelector('.close-button');

    infoButton.addEventListener('click', () => {
        infoOverlay.classList.add('active');
    });

    closeButton.addEventListener('click', () => {
        infoOverlay.classList.remove('active');
    });

    // Close overlay when clicking outside the content
    infoOverlay.addEventListener('click', (e) => {
        if (e.target === infoOverlay) {
            infoOverlay.classList.remove('active');
        }
    });

    // Close overlay with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && infoOverlay.classList.contains('active')) {
            infoOverlay.classList.remove('active');
        }
    });

    // Handle form submission
    const contactForm = document.getElementById('contactForm');
    const submitButton = contactForm.querySelector('.submit-button');
    const statusMessage = document.createElement('div');
    statusMessage.className = 'status-message';
    contactForm.appendChild(statusMessage);

    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        submitButton.textContent = 'Sending...';
        submitButton.disabled = true;
        statusMessage.textContent = '';

        const templateParams = {
            from_name: contactForm.querySelector('#name').value,
            reply_to: contactForm.querySelector('#email').value,
            message: contactForm.querySelector('#message').value
        };

        try {
            await emailjs.send(
                'service_596qdpg',
                'template_u2435fr',
                templateParams
            );

            // Success
            statusMessage.textContent = 'Message sent successfully!';
            statusMessage.style.color = '#4CAF50';
            contactForm.reset();

            // Optional: Close overlay after success
            setTimeout(() => {
                const overlay = document.getElementById('infoOverlay');
                overlay.classList.remove('active');
                statusMessage.textContent = '';
            }, 2000);

        } catch (error) {
            console.error('Error:', error);
            statusMessage.textContent = 'Failed to send message. Please try again.';
            statusMessage.style.color = '#f44336';
        } finally {
            submitButton.textContent = 'Send Message';
            submitButton.disabled = false;
        }
    });
});
