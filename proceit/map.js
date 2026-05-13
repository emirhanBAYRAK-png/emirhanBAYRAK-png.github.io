class WorldMap {
    constructor(scene) {
        this.scene = scene;
        this.colliders = [];
        this.materials = {};
        this.geometries = {};
        
        this.cliffZ = -190; 
        this.bloodZoneZ = -160; // Kanlı anormallik bölgesi
        
        this.cliffFloor = null; 
        this.isCollapsing = false;
        
        // Glitch Cesetler Listesi
        this.glitches = [];

        this.init();
    }

    init() {
        this.buildAssets();
        this.buildEnvironment();
        this.buildBloodyGlitchZone(); // Yeni: Kanlı Cesetler
        this.buildScatteredPaperTrail(); // Yeni: Dağınık ve Yer/Duvar kağıtları
    }

    generateNoiseTexture(r, g, b, intensity, isBlood = false) {
        const size = 256; 
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
            let noise = (Math.random() - 0.5) * intensity;
            if (isBlood && Math.random() > 0.6) {
                // Kan pıhtıları (Koyu kırmızı/siyah)
                data[i] = Math.max(50, Math.min(180, r + noise * 2)); // R
                data[i+1] = 5; // G
                data[i+2] = 5; // B
            } else {
                data[i]     = Math.max(0, Math.min(255, r + noise));
                data[i+1]   = Math.max(0, Math.min(255, g + noise));
                data[i+2]   = Math.max(0, Math.min(255, b + noise));
            }
            data[i+3]   = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    createArrowTexture(angle) {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128; 
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#a09d8c'; 
        ctx.fillRect(0,0,128,128);
        
        for(let i=0; i<300; i++) {
            ctx.fillStyle = `rgba(20,10,5,${Math.random()*0.3})`;
            ctx.fillRect(Math.random()*128, Math.random()*128, 2, 2);
        }
        
        ctx.translate(64, 64);
        ctx.rotate(angle); // Hedefe doğru açıyı çevir
        
        ctx.fillStyle = '#3a0000'; 
        ctx.beginPath();
        // İleri (Yukarı) bakan ok çizeriz, rotate onu hedefe çevirir
        ctx.moveTo(0, -40);
        ctx.lineTo(-25, 0);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-10, 40);
        ctx.lineTo(10, 40);
        ctx.lineTo(10, 0);
        ctx.lineTo(25, 0);
        ctx.closePath();
        ctx.fill();
        
        const tex = new THREE.CanvasTexture(canvas);
        return new THREE.MeshStandardMaterial({ 
            map: tex, roughness: 1.0, emissive: 0x111105, side: THREE.DoubleSide 
        });
    }

    buildAssets() {
        const floorTex = this.generateNoiseTexture(12, 14, 12, 20); floorTex.repeat.set(40, 40);
        const bloodTex = this.generateNoiseTexture(60, 5, 5, 40, true); bloodTex.repeat.set(5, 5); // Kan dokusu
        const barkTex = this.generateNoiseTexture(20, 18, 16, 25); barkTex.repeat.set(1, 2);
        const leafTex = this.generateNoiseTexture(8, 15, 8, 20); leafTex.repeat.set(2, 2);
        const rockTex = this.generateNoiseTexture(25, 25, 27, 30); rockTex.repeat.set(2, 2);

        this.materials.floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 });
        this.materials.bloodFloor = new THREE.MeshStandardMaterial({ map: bloodTex, roughness: 0.4, metalness: 0.3 }); // Islak kan hissi
        this.materials.trunk = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 1.0 });
        this.materials.leaf = new THREE.MeshStandardMaterial({ map: leafTex, roughness: 1.0 });
        this.materials.rock = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.8 });
        
        this.geometries.mainFloor = new THREE.PlaneGeometry(500, 400); 
        this.geometries.cliffFloor = new THREE.PlaneGeometry(500, 80); 
        this.geometries.bloodFloor = new THREE.PlaneGeometry(60, 40); 
        
        // LOW POLY GEOMETRİLER
        this.geometries.trunk = new THREE.CylinderGeometry(0.8, 1.2, 15, 6); // 6 gen silindir
        this.geometries.leaf = new THREE.IcosahedronGeometry(4.5, 0); // Düşük poligonlu yaprak topu
        this.geometries.rock = new THREE.DodecahedronGeometry(2, 0); // Low poly kaya
        this.geometries.paper = new THREE.PlaneGeometry(0.5, 0.7);
        
        // Glitch Ceset Materyali (Başlangıç)
        this.materials.glitch = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: false });
        this.geometries.glitch = new THREE.BoxGeometry(1.5, 0.8, 2.5); // Şekilsiz yığın
    }

    buildEnvironment() {
        const mainFloor = new THREE.Mesh(this.geometries.mainFloor, this.materials.floor);
        mainFloor.rotation.x = -Math.PI / 2; mainFloor.position.set(0, 0, 50); 
        this.scene.add(mainFloor);

        this.cliffFloor = new THREE.Mesh(this.geometries.cliffFloor, this.materials.floor);
        this.cliffFloor.rotation.x = -Math.PI / 2;
        this.cliffFloor.position.set(0, 0, this.cliffZ - 10); 
        this.scene.add(this.cliffFloor);

        // LOW POLY AĞAÇLAR (Gövde + Yaprak)
        const treeCount = 400;
        const trunkInstanced = new THREE.InstancedMesh(this.geometries.trunk, this.materials.trunk, treeCount);
        const leafInstanced = new THREE.InstancedMesh(this.geometries.leaf, this.materials.leaf, treeCount * 2); // Her ağaca 2 yaprak
        const dummy = new THREE.Object3D();

        let leafIndex = 0;
        for (let i = 0; i < treeCount; i++) {
            let x = (Math.random() - 0.5) * 180;
            let z = 30 - (Math.random() * 210); 
            
            if (x > -15 && x < 15 && z > this.cliffZ && z < 10) continue; // Geniş Yol

            // Gövde
            dummy.position.set(x, 7.5, z);
            dummy.rotation.set(0, Math.random() * Math.PI, 0);
            dummy.updateMatrix();
            trunkInstanced.setMatrixAt(i, dummy.matrix);

            // Yaprak 1
            dummy.position.set(x, 15, z);
            dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
            dummy.scale.set(1 + Math.random(), 1 + Math.random(), 1 + Math.random());
            dummy.updateMatrix();
            leafInstanced.setMatrixAt(leafIndex++, dummy.matrix);

            // Yaprak 2 (Biraz daha yukarı ve yana)
            dummy.position.set(x + (Math.random()-0.5)*2, 18, z + (Math.random()-0.5)*2);
            dummy.updateMatrix();
            leafInstanced.setMatrixAt(leafIndex++, dummy.matrix);

            this.colliders.push(new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(x, 7.5, z), new THREE.Vector3(2, 15, 2)
            ));
        }
        this.scene.add(trunkInstanced);
        this.scene.add(leafInstanced);

        // KAYALAR (Sınırları ve ormanı doldurur)
        const rockCount = 150;
        const rockInstanced = new THREE.InstancedMesh(this.geometries.rock, this.materials.rock, rockCount);
        for (let i = 0; i < rockCount; i++) {
            let x = (Math.random() - 0.5) * 180;
            let z = 30 - (Math.random() * 210); 
            if (x > -12 && x < 12 && z > this.cliffZ && z < 10) continue; 
            
            dummy.position.set(x, 0, z);
            dummy.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, 0);
            let s = 1 + Math.random()*2;
            dummy.scale.set(s, s*0.6, s); // Basık kayalar
            dummy.updateMatrix();
            rockInstanced.setMatrixAt(i, dummy.matrix);
            
            this.colliders.push(new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(x, 0, z), new THREE.Vector3(s*2, s, s*2)
            ));
        }
        this.scene.add(rockInstanced);
    }

    buildBloodyGlitchZone() {
        // Kanlı Zemin Segmenti
        const bloodFloor = new THREE.Mesh(this.geometries.bloodFloor, this.materials.bloodFloor);
        bloodFloor.rotation.x = -Math.PI / 2;
        bloodFloor.position.set(0, 0.02, this.bloodZoneZ); // Normal zeminin milimetrik üstünde
        this.scene.add(bloodFloor);

        // Glitch Cesetler
        for(let i=0; i<2; i++) {
            let glitchMesh = new THREE.Mesh(this.geometries.glitch, this.materials.glitch.clone());
            glitchMesh.position.set((i===0 ? -3 : 3) + Math.random(), 0.5, this.bloodZoneZ + (Math.random()*4 - 2));
            this.scene.add(glitchMesh);
            this.glitches.push(glitchMesh);
        }
    }

    buildScatteredPaperTrail() {
        let papers = [];
        const paperCount = 16;
        
        // Z Ekseni boyunca rastgele dağıt
        for(let i=0; i<paperCount; i++) {
            let zPos = -10 - (i * 10) - (Math.random() * 5); // Z'ye doğru ilerler
            // Eğer kanlı bölgedeyse kağıt atma
            if (zPos < this.bloodZoneZ + 10 && zPos > this.bloodZoneZ - 10) zPos -= 20;

            papers.push({
                id: i,
                x: (Math.random() - 0.5) * 26, // Geniş bir alana (Sağ/Sol) saç
                z: zPos,
                isGround: Math.random() > 0.4, // %60 ihtimalle yerde
                targetIndex: -1
            });
        }

        const cliffTarget = { x: 0, z: this.cliffZ - 5 };

        // Okların hedefini belirle (En yakın +Z yönündeki kağıt)
        for(let i=0; i<paperCount; i++) {
            if (i >= paperCount - 2) {
                papers[i].targetObj = cliffTarget;
            } else {
                // Kendinden sonraki en yakın kağıdı bul
                let closest = null;
                let minDist = Infinity;
                for(let j=i+1; j<paperCount; j++) {
                    let d = Math.hypot(papers[j].x - papers[i].x, papers[j].z - papers[i].z);
                    if (d < minDist) { minDist = d; closest = papers[j]; }
                }
                papers[i].targetObj = closest || cliffTarget;
            }
        }

        // Haritaya Mesh Olarak Ekle
        papers.forEach(p => {
            let dx = p.targetObj.x - p.x;
            let dz = p.targetObj.z - p.z;
            let angle = Math.atan2(dx, -dz); // Hedefe olan rotasyon açısı
            
            let paperMat = this.createArrowTexture(angle);
            let paperMesh = new THREE.Mesh(this.geometries.paper, paperMat);
            
            if (p.isGround) {
                // Yerde duran kağıt
                paperMesh.position.set(p.x, 0.05, p.z);
                paperMesh.rotation.x = -Math.PI / 2;
                paperMesh.rotation.z = (Math.random() - 0.5) * 0.5; // Yerde rastgele dönük
            } else {
                // Ağaca asılı kağıt (Ağaç oluşturup üstüne tak)
                let tree = new THREE.Mesh(this.geometries.trunk, this.materials.trunk);
                tree.position.set(p.x, 7.5, p.z);
                this.scene.add(tree);
                this.colliders.push(new THREE.Box3().setFromObject(tree));
                
                paperMesh.position.set(p.x, 1.6, p.z + 0.85); // Silindirin yüzeyine yakın
                paperMesh.rotation.z = (Math.random() - 0.5) * 0.2;
            }
            this.scene.add(paperMesh);
        });
    }

    triggerCollapse() {
        this.isCollapsing = true;
    }

    update(delta) {
        // Çöküş Animasyonu
        if (this.isCollapsing && this.cliffFloor) {
            this.cliffFloor.position.y -= 15.0 * delta; 
            this.cliffFloor.rotation.z += 0.5 * delta; 
            this.cliffFloor.rotation.x += 0.2 * delta;
        }

        // Glitch Ceset Animasyonu (Kabus Efekti)
        this.glitches.forEach(g => {
            if (Math.random() > 0.8) {
                // Rastgele Şekil Bozma
                g.scale.set(0.5 + Math.random()*2, 0.5 + Math.random()*1.5, 0.5 + Math.random()*2);
                g.position.x += (Math.random() - 0.5) * 0.4;
                g.position.z += (Math.random() - 0.5) * 0.4;
                
                // Renk ve Wireframe titremesi (Siyah, Beyaz, Kırmızı, Mavi)
                let colors = [0xff0000, 0x00ffff, 0xffffff, 0x000000];
                g.material.color.setHex(colors[Math.floor(Math.random() * colors.length)]);
                g.material.wireframe = Math.random() > 0.5;
            }
        });
    }

    checkCollision(playerBox) {
        for (let i = 0; i < this.colliders.length; i++) {
            if (playerBox.intersectsBox(this.colliders[i])) return true;
        }
        return false;
    }
}