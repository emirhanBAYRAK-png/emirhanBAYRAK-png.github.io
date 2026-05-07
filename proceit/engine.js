const Engine = {
    canvas: document.getElementById('gameCanvas'),
    ctx: null, width: 640, height: 360,
    imageData: null, buffer: null, zBuffer: null,
    lastTime: 0,

    init: function() {
        this.ctx = this.canvas.getContext('2d', { alpha: false });
        this.canvas.width = this.width; this.canvas.height = this.height;
        this.imageData = this.ctx.createImageData(this.width, this.height);
        this.buffer = new Uint32Array(this.imageData.data.buffer);
        this.zBuffer = new Float32Array(this.width);
        
        Player.init();
        requestAnimationFrame(this.loop.bind(this));
    },

    createColor: function(r, g, b) {
        return (255 << 24) | (Math.min(255, ~~b) << 16) | (Math.min(255, ~~g) << 8) | Math.min(255, ~~r);
    },

    getWallTexture: function(tx, ty) {
        let r = 45, g = 55, b = 65;
        if (tx < 0.05 || tx > 0.95 || ty < 0.05 || ty > 0.95) return {r: 20, g: 25, b: 30};
        if (ty > 0.45 && ty < 0.55) return {r: 30, g: 35, b: 45};
        if (Math.random() > 0.7) { r -= 4; g -= 4; b -= 4; }
        if (~~(tx * 20) % 2 === 0) { r -= 3; g -= 3; b -= 3; }
        return {r, g, b};
    },

    getFloorTexture: function(tx, ty) {
        let tileX = ~~(tx * 2), tileY = ~~(ty * 2);
        let borderX = (tx * 2) % 1, borderY = (ty * 2) % 1;
        if (borderX < 0.05 || borderX > 0.95 || borderY < 0.05 || borderY > 0.95) return {r: 10, g: 10, b: 12};
        let color = ((tileX + tileY) % 2 === 0) ? {r: 35, g: 40, b: 45} : {r: 20, g: 22, b: 25};
        if (Math.random() > 0.8) { color.r -= 3; color.g -= 3; color.b -= 3; }
        return color;
    },

    calculateLighting: function(worldX, worldY, dist) {
        let depthFactor = Math.max(0, 1 - (dist / 14)); 
        let rLight = 0.08, gLight = 0.08, bLight = 0.12; 
        
        if (Player.muzzleFlash > 0) { rLight += 0.9; gLight += 0.7; bLight += 0.2; }
        if (Player.flashlightOn && Player.battery > 0) {
            let bF = 1.0; if (Player.battery < 20) bF = Player.battery / 20; if (Player.battery < 10 && Math.random() < 0.4) bF = 0.1; 
            let pD = Math.pow(worldX-Player.x,2)+Math.pow(worldY-Player.y,2);
            if(pD<15){let pL=(1-pD/15)*0.8*bF; rLight+=pL;gLight+=pL;bLight+=pL;}
        }
        MapData.lights.forEach(l=>{
            let d=Math.pow(worldX-l.x,2)+Math.pow(worldY-l.y,2);let r=l.baseRadius*l.baseRadius;
            if(d<r){let i=Math.pow(1-d/r,2)*l.intensity;rLight+=i*1.0;gLight+=i*0.7;bLight+=i*0.2;}
        });

        return {
            r: Math.min(1.5, rLight * depthFactor), 
            g: Math.min(1.5, gLight * depthFactor), 
            b: Math.min(1.5, bLight * depthFactor)
        };
    },

    render: function() {
        // --- 1. 3D DÜNYAYI ÇİZ (Eski kodla tamamen aynı) ---
        this.buffer.fill(0xFF060608);

        for (let x = 0; x < this.width; x++) {
            let cameraX = 2 * x / this.width - 1;
            let rDX = Player.dirX + Player.planeX * cameraX;
            let rDY = Player.dirY + Player.planeY * cameraX;
            let mapX = ~~Player.x, mapY = ~~Player.y, sDX, sDY, dDX = Math.abs(1/rDX), dDY = Math.abs(1/rDY), stepX, stepY, hit=0, side=0;
            
            if(rDX<0){stepX=-1;sDX=(Player.x-mapX)*dDX;}else{stepX=1;sDX=(mapX+1.0-Player.x)*dDX;}
            if(rDY<0){stepY=-1;sDY=(Player.y-mapY)*dDY;}else{stepY=1;sDY=(mapY+1.0-Player.y)*dDY;}
            while(hit==0){if(sDX<sDY){sDX+=dDX;mapX+=stepX;side=0;}else{sDY+=dDY;mapY+=stepY;side=1;}if(MapData.isWall(mapX,mapY))hit=1;}
            
            let pD=(side==0)?(sDX-dDX):(sDY-dDY); this.zBuffer[x]=pD;
            let h=this.height/pD; let dSE=-h/2+this.height/2; let start=Math.max(0,~~dSE); let end=Math.min(this.height-1,~~(h/2+this.height/2));
            let wallX=(side==0)?Player.y+pD*rDY:Player.x+pD*rDX; wallX-=Math.floor(wallX);
            let hitX=Player.x+rDX*pD,hitY=Player.y+rDY*pD; let lM=this.calculateLighting(hitX,hitY,pD);
            
            for(let y=start;y<end;y++){
                let wallY=(y-dSE)/h; let tex=this.getWallTexture(wallX,wallY); if(side==1){tex.r*=0.6;tex.g*=0.6;tex.b*=0.6;}
                this.buffer[y*this.width+x]=this.createColor(tex.r*lM.r,tex.g*lM.g,tex.b*lM.b);
            }
            
            let fXW, fYW; if(side==0&&rDX>0){fXW=mapX;fYW=mapY+wallX;}else if(side==0&&rDX<0){fXW=mapX+1.0;fYW=mapY+wallX;}else if(side==1&&rDY>0){fXW=mapX+wallX;fYW=mapY;}else{fXW=mapX+wallX;fYW=mapY+1.0;}
            for(let y=end;y<this.height;y++){
                let cD=this.height/(2.0*y-this.height);let w=cD/pD;let cX=w*fXW+(1.0-w)*Player.x,cY=w*fYW+(1.0-w)*Player.y;
                let tex=this.getFloorTexture(cX-Math.floor(cX),cY-Math.floor(cY)); let fL=this.calculateLighting(cX,cY,cD);
                this.buffer[y*this.width+x]=this.createColor(tex.r*fL.r,tex.g*fL.g,tex.b*fL.b);
            }
        }
        
        this.renderSprites();
        this.ctx.putImageData(this.imageData, 0, 0);

    },

    renderSprites: function() {
        MapData.items.forEach(item => {
            if (!item.active) return;
            let sX = item.x - Player.x, sY = item.y - Player.y;
            let invDet = 1.0 / (Player.planeX * Player.dirY - Player.dirX * Player.planeY);
            let tx = invDet * (Player.dirY * sX - Player.dirX * sY);
            let ty = invDet * (-Player.planeY * sX + Player.planeX * sY);
            if (ty > 0.1) {
                let screenX = ~~((this.width / 2) * (1 + tx / ty));
                let size = Math.abs(~~(this.height / ty)) / 4;
                let move = ~~( (this.height / ty) * 0.4 );
                let vStart = Math.max(0, ~~(-size / 2 + this.height / 2 + move));
                let vEnd = Math.min(this.height - 1, ~~(size / 2 + this.height / 2 + move));
                let hStart = Math.max(0, ~~(-size / 2 + screenX));
                let hEnd = Math.min(this.width - 1, ~~(size / 2 + screenX));
                for (let stripe = hStart; stripe < hEnd; stripe++) {
                    if (ty < this.zBuffer[stripe]) {
                        for (let y = vStart; y < vEnd; y++) {
                            let texX = (stripe - hStart) / size;
                            let col;
                            if (item.type === 'battery') { col = (texX < 0.2 || texX > 0.8) ? this.createColor(10, 80, 10) : this.createColor(50, 200, 50); } else { col = (texX < 0.2 || texX > 0.8) ? this.createColor(80, 10, 10) : this.createColor(200, 50, 50); }
                            this.buffer[y * this.width + stripe] = col;
                        }
                    }
                }
            }
        });
    },

// engine.js dosyasının en sonu şöyle olmalı:
    loop: function(time) {
        let dt = time - this.lastTime;
        this.lastTime = time;
        Player.update(dt);
        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }
}; // Engine nesnesini burada kapat

window.onload = () => Engine.init();