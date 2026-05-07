const Player = {
    x: 2.5, y: 2.5,
    dirX: 1.0, dirY: 0.0,      
    planeX: 0.0, planeY: 0.66, 
    moveSpeed: 0.06, rotSpeed: 0.04,
    keys: {},
    battery: 100, flashlightOn: false, fKeyPressed: false,
    muzzleFlash: 0, bobTime: 0, bobAmp: 0, recoil: {z: 0},
    uiLevel: null,

    init: function() {
        this.uiLevel = document.getElementById('battery-level');
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
    },

    update: function(dt) {
        let moveStep = 0;
        if (this.keys['KeyW']) moveStep = this.moveSpeed;
        if (this.keys['KeyS']) moveStep = -this.moveSpeed;
        
        if (moveStep !== 0) {
            this.bobTime += dt * 0.01;
            this.bobAmp = Math.min(1, this.bobAmp + 0.1);
            let nX = this.x + this.dirX * moveStep;
            let nY = this.y + this.dirY * moveStep;
            if (!MapData.isWall(nX, this.y)) this.x = nX;
            if (!MapData.isWall(this.x, nY)) this.y = nY;
        } else {
            this.bobAmp *= 0.9;
        }

        let rot = 0;
        if (this.keys['ArrowLeft'] || this.keys['KeyA']) rot = -this.rotSpeed;
        if (this.keys['ArrowRight'] || this.keys['KeyD']) rot = this.rotSpeed;
        
        if (rot !== 0) {
            let oldDirX = this.dirX;
            this.dirX = this.dirX * Math.cos(rot) - this.dirY * Math.sin(rot);
            this.dirY = oldDirX * Math.sin(rot) + this.dirY * Math.cos(rot);
            let oldPlaneX = this.planeX;
            this.planeX = this.planeX * Math.cos(rot) - this.planeY * Math.sin(rot);
            this.planeY = oldPlaneX * Math.sin(rot) + this.planeY * Math.cos(rot);
        }

        if (this.keys['KeyF']) {
            if (!this.fKeyPressed) {
                if (this.battery > 0) this.flashlightOn = !this.flashlightOn;
                this.fKeyPressed = true;
            }
        } else { this.fKeyPressed = false; }

        if (this.flashlightOn && this.battery > 0) {
            this.battery -= dt * 0.005; 
            if (this.battery <= 0) { this.battery = 0; this.flashlightOn = false; }
        }

        let b = Math.max(0, this.battery);
        if(this.uiLevel) this.uiLevel.style.width = b + "%";
    }
};