class InputManager {
    constructor() {
        this.keys = { w: false, a: false, s: false, d: false, shift: false };
        this.mouseDelta = { x: 0, y: 0 };
        this.isLocked = false;
        this.setup();
    }

    setup() {
        document.addEventListener('keydown', (e) => this.handleKey(e.code, true));
        document.addEventListener('keyup', (e) => this.handleKey(e.code, false));
        document.addEventListener('mousemove', (e) => {
            if (this.isLocked) {
                this.mouseDelta.x += e.movementX || 0;
                this.mouseDelta.y += e.movementY || 0;
            }
        });
    }

    handleKey(code, isPressed) {
        if (code === 'KeyW') this.keys.w = isPressed;
        if (code === 'KeyS') this.keys.s = isPressed;
        if (code === 'KeyA') this.keys.a = isPressed;
        if (code === 'KeyD') this.keys.d = isPressed;
        if (code === 'ShiftLeft' || code === 'ShiftRight') this.keys.shift = isPressed;
    }

    resetMouse() {
        this.mouseDelta.x = 0; this.mouseDelta.y = 0;
    }
}

// ==========================================
// GELİŞMİŞ 3D SES VE GÜRÜLTÜ SENTEZLEYİCİSİ
// ==========================================
class AudioSystem {
    constructor() {
        this.ctx = null;
        this.isSuspended = false;
        this.ambienceStarted = false;
        this.noiseBuffer = null;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.createNoiseBuffer(); // Gerçekçi çıtırtılar için
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        if (!this.ambienceStarted) {
            this.startAmbientHorror();
            this.ambienceStarted = true;
        }
    }

    stopAll() {
        if (this.ctx) { this.ctx.suspend(); this.isSuspended = true; }
    }

    // Beyaz Gürültü (White Noise) Üretici - Yaprak/Dal/Kan hışırtısı için
    createNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2; // 2 saniye
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
    }

    updateListener(camera) {
        if (!this.ctx || this.isSuspended) return;
        const listener = this.ctx.listener;
        const pos = camera.position;
        if (listener.positionX) {
            listener.positionX.setTargetAtTime(pos.x, this.ctx.currentTime, 0.01);
            listener.positionY.setTargetAtTime(pos.y, this.ctx.currentTime, 0.01);
            listener.positionZ.setTargetAtTime(pos.z, this.ctx.currentTime, 0.01);
        } else { listener.setPosition(pos.x, pos.y, pos.z); }

        const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
        const up = camera.up;
        if (listener.forwardX) {
            listener.forwardX.setTargetAtTime(dir.x, this.ctx.currentTime, 0.01);
            listener.forwardY.setTargetAtTime(dir.y, this.ctx.currentTime, 0.01);
            listener.forwardZ.setTargetAtTime(dir.z, this.ctx.currentTime, 0.01);
            listener.upX.setTargetAtTime(up.x, this.ctx.currentTime, 0.01);
            listener.upY.setTargetAtTime(up.y, this.ctx.currentTime, 0.01);
            listener.upZ.setTargetAtTime(up.z, this.ctx.currentTime, 0.01);
        } else { listener.setOrientation(dir.x, dir.y, dir.z, up.x, up.y, up.z); }
    }

    create3DPanner(x, y, z) {
        const panner = this.ctx.createPanner();
        panner.panningModel = 'HRTF'; 
        panner.distanceModel = 'exponential';
        panner.refDistance = 2.0; panner.maxDistance = 80.0; panner.rolloffFactor = 1.5;
        if (panner.positionX) {
            panner.positionX.value = x; panner.positionY.value = y; panner.positionZ.value = z;
        } else { panner.setPosition(x, y, z); }
        return panner;
    }

    startAmbientHorror() {
        if (!this.ctx) return;
        const subOsc = this.ctx.createOscillator();
        subOsc.type = 'sine'; subOsc.frequency.value = 18; // İnfrasound
        const subGain = this.ctx.createGain();
        subGain.gain.value = 1.0; 
        subOsc.connect(subGain); subGain.connect(this.ctx.destination);
        subOsc.start();
    }

    // Zemin tipine göre değişen ayak sesleri (Toprak vs Kan)
    playFootstep(isSprinting, isOnBlood) {
        if (!this.ctx || this.isSuspended || !this.noiseBuffer) return;
        
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain); oscGain.connect(this.ctx.destination);
        
        // Tok Ses (Bass)
        osc.frequency.setValueAtTime(isOnBlood ? 40 : 65, this.ctx.currentTime); 
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        oscGain.gain.setValueAtTime(isSprinting ? 1.0 : 0.6, this.ctx.currentTime);
        oscGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
        osc.type = 'sine'; osc.start(); osc.stop(this.ctx.currentTime + 0.15);

        // Çıtırtı / Islaklık Sesi (Noise Filter)
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this.noiseBuffer;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = isOnBlood ? 'lowpass' : 'highpass'; // Kan için boğuk, toprak için çatırtılı
        noiseFilter.frequency.value = isOnBlood ? 800 : 2000;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(isOnBlood ? 0.8 : 0.3, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (isOnBlood ? 0.3 : 0.1));
        
        noiseSrc.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(this.ctx.destination);
        noiseSrc.start(); noiseSrc.stop(this.ctx.currentTime + 0.3);
    }

    // Sahte dal kırılma sesi (3D)
    playTwigSnap3D(x, y, z) {
        if (!this.ctx || this.isSuspended || !this.noiseBuffer) return;
        const panner = this.create3DPanner(x, y, z);
        
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this.noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass'; filter.frequency.value = 3000;
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(1.5, this.ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        noiseSrc.connect(filter); filter.connect(gain); gain.connect(panner); panner.connect(this.ctx.destination);
        noiseSrc.start(); noiseSrc.stop(this.ctx.currentTime + 0.1);
    }

    // Glitch / Dijital Çığlık Sesi (3D)
    playGlitchScream3D(x, y, z) {
        if (!this.ctx || this.isSuspended) return;
        const panner = this.create3DPanner(x, y, z);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain); gain.connect(panner); panner.connect(this.ctx.destination);
        
        osc.type = 'square'; // Dijital yırtılma sesi
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);
        
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        
        osc.start(); osc.stop(this.ctx.currentTime + 0.5);
    }
}

// ==========================================
// OYUNCU (Player)
// ==========================================
class Player {
    constructor(camera, input, audio, world) {
        this.camera = camera;
        this.input = input;
        this.audio = audio;
        this.world = world;

        this.yawObject = new THREE.Object3D();
        this.pitchObject = new THREE.Object3D();
        this.sceneAdd = (scene) => scene.add(this.yawObject);

        this.yawObject.position.set(0, 1.6, 0); 
        this.yawObject.add(this.pitchObject);
        this.pitchObject.add(this.camera);

        this.flashLight = new THREE.SpotLight(0xffeedd, 2.0);
        this.flashLight.angle = Math.PI / 5; 
        this.flashLight.penumbra = 0.6; 
        this.flashLight.distance = 55; 
        this.flashLight.decay = 2.0;
        
        this.camera.add(this.flashLight);
        this.flashLight.position.set(0, 0, 0);
        this.flashLight.target.position.set(0, 0, -1);
        this.camera.add(this.flashLight.target);

        this.targetVelocity = new THREE.Vector3();
        this.currentVelocity = new THREE.Vector3();
        this.walkSpeed = 3.5; 
        this.sprintSpeed = 6.5; 
        this.walkTimer = 0;
        this.isStepping = false;
        
        this.targetYaw = 0;
        this.targetPitch = 0;
        
        this.isFalling = false;
        this.fallVelocity = 0;
    }

    update(delta) {
        if (this.isFalling) {
            this.handleFall(delta);
            return;
        }

        this.handleSmoothLook(delta);
        this.handleSmoothMovement(delta);
        this.handleFlicker();
    }

    handleSmoothLook(delta) {
        const sens = 0.0015;
        this.targetYaw -= this.input.mouseDelta.x * sens;
        this.targetPitch -= this.input.mouseDelta.y * sens;
        this.targetPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.targetPitch));

        this.yawObject.rotation.y = THREE.MathUtils.lerp(this.yawObject.rotation.y, this.targetYaw, 15 * delta);
        this.pitchObject.rotation.x = THREE.MathUtils.lerp(this.pitchObject.rotation.x, this.targetPitch, 15 * delta);
        
        this.input.resetMouse();
    }

    handleSmoothMovement(delta) {
        let dirX = Number(this.input.keys.d) - Number(this.input.keys.a);
        let dirZ = Number(this.input.keys.w) - Number(this.input.keys.s);

        let direction = new THREE.Vector3(dirX, 0, -dirZ).normalize();
        const speed = this.input.keys.shift ? this.sprintSpeed : this.walkSpeed;

        this.targetVelocity.x = direction.x * speed;
        this.targetVelocity.z = direction.z * speed;

        this.currentVelocity.x = THREE.MathUtils.lerp(this.currentVelocity.x, this.targetVelocity.x, 8 * delta);
        this.currentVelocity.z = THREE.MathUtils.lerp(this.currentVelocity.z, this.targetVelocity.z, 8 * delta);

        const hitBoxSize = new THREE.Vector3(0.6, 1.8, 0.6);

        this.yawObject.translateX(this.currentVelocity.x * delta);
        let boxX = new THREE.Box3().setFromCenterAndSize(this.yawObject.position, hitBoxSize);
        if (this.world.checkCollision(boxX)) {
            this.yawObject.translateX(-this.currentVelocity.x * delta); 
            this.currentVelocity.x = 0;
        }

        this.yawObject.translateZ(this.currentVelocity.z * delta);
        let boxZ = new THREE.Box3().setFromCenterAndSize(this.yawObject.position, hitBoxSize);
        if (this.world.checkCollision(boxZ)) {
            this.yawObject.translateZ(-this.currentVelocity.z * delta); 
            this.currentVelocity.z = 0;
        }

        // Kanlı bölgede miyiz?
        let zPos = this.yawObject.position.z;
        let isOnBlood = (zPos < this.world.bloodZoneZ + 15 && zPos > this.world.bloodZoneZ - 10);

        if (zPos < this.world.cliffZ) {
            this.isFalling = true;
            this.world.triggerCollapse(); 
        }

        let speedMag = Math.sqrt(this.currentVelocity.x**2 + this.currentVelocity.z**2);
        if (speedMag > 0.5) {
            let bobSpeed = this.input.keys.shift ? 14 : 10;
            this.walkTimer += delta * bobSpeed;
            let bobHeight = Math.sin(this.walkTimer) * 0.08;
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, bobHeight, 10 * delta);

            if (bobHeight < -0.07 && !this.isStepping) {
                this.audio.playFootstep(this.input.keys.shift, isOnBlood);
                this.isStepping = true;
            } else if (bobHeight > 0) {
                this.isStepping = false;
            }
        } else {
            this.walkTimer = 0;
            this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, 0, 5 * delta);
        }
    }

    handleFall(delta) {
        this.fallVelocity -= 18.0 * delta; 
        this.yawObject.position.y += this.fallVelocity * delta;
        this.yawObject.rotation.z += 0.02;
        this.pitchObject.rotation.x -= 0.015;
    }

    handleFlicker() {
        if (Math.random() > 0.94) {
            // Kanlı bölgedeyken fener daha çok bozulur
            let zPos = this.yawObject.position.z;
            let isOnBlood = (zPos < this.world.bloodZoneZ + 15 && zPos > this.world.bloodZoneZ - 10);
            this.flashLight.intensity = (isOnBlood ? 0.2 : 1.0) + Math.random() * 1.5;
        }
    }

    killLight() { this.flashLight.intensity = 0; }
}

// ==========================================
// ANA MOTOR
// ==========================================
class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010101);
        this.scene.fog = new THREE.FogExp2(0x010101, 0.04); 

        const hemiLight = new THREE.HemisphereLight(0x060608, 0x000000, 0.4);
        this.scene.add(hemiLight);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); 
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputEncoding = THREE.sRGBEncoding; 
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        this.input = new InputManager();
        this.audio = new AudioSystem();
        this.world = new WorldMap(this.scene);
        
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.player = new Player(camera, this.input, this.audio, this.world);
        this.player.sceneAdd(this.scene);

        this.clock = new THREE.Clock();
        this.isGameOver = false;

        this.fakeAudioTimer = 0;

        this.uiStart = document.getElementById('start-screen');
        this.uiOver = document.getElementById('game-over-screen');

        this.initDOM();
    }

    initDOM() {
        window.addEventListener('resize', () => {
            this.player.camera.aspect = window.innerWidth / window.innerHeight;
            this.player.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        document.body.addEventListener('click', () => {
            if (!this.input.isLocked && !this.isGameOver) {
                this.audio.init();
                document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock;
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.input.isLocked = (document.pointerLockElement === document.body);
            if (this.input.isLocked) {
                this.uiStart.style.display = 'none';
            } else {
                if (!this.isGameOver) this.uiStart.style.display = 'flex';
                this.input.keys = { w: false, a: false, s: false, d: false, shift: false };
            }
        });

        this.loop();
    }

    triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        
        this.player.killLight(); 
        document.exitPointerLock();
        this.uiStart.style.display = 'none';
        
        this.uiOver.classList.remove('hidden');
        setTimeout(() => this.uiOver.classList.add('active'), 50);

        this.audio.stopAll();
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        let delta = Math.min(this.clock.getDelta(), 0.05); 

        this.world.update(delta);

        if (this.input.isLocked && !this.isGameOver) {
            this.player.update(delta);
            this.audio.updateListener(this.player.camera);
            
            // PSİKOLOJİK SES MOTORU YÖNETİMİ
            let pZ = this.player.yawObject.position.z;
            let inBloodZone = (pZ < this.world.bloodZoneZ + 15 && pZ > this.world.bloodZoneZ - 10);

            this.fakeAudioTimer += delta;
            if (this.fakeAudioTimer > 2.5) {
                if (inBloodZone) {
                    // Kanlı bölgedeyken Glitch cesetlerden ses gelir
                    if (Math.random() > 0.4) {
                        let glitch = this.world.glitches[Math.floor(Math.random() * this.world.glitches.length)];
                        this.audio.playGlitchScream3D(glitch.position.x, glitch.position.y, glitch.position.z);
                    }
                } else {
                    // Normal ormandayken sahte dallar kırılır (Asla uçurumdan değil, hep arkadan/yandan)
                    if (Math.random() > 0.6) {
                        let px = this.player.yawObject.position.x;
                        let fakeX = px + (Math.random() - 0.5) * 40; 
                        let fakeZ = pZ + 10 + (Math.random() * 20); // +Z (Arkası)
                        this.audio.playTwigSnap3D(fakeX, 0, fakeZ);
                    }
                }
                this.fakeAudioTimer = 0;
            }

            if (this.player.yawObject.position.y < -15) {
                this.triggerGameOver();
            }
        } else if (this.player.isFalling && !this.isGameOver) {
            this.player.handleFall(delta);
            if (this.player.yawObject.position.y < -15) {
                this.triggerGameOver();
            }
        }

        this.renderer.render(this.scene, this.player.camera);
    }
}

window.onload = () => {
    new Engine();
};