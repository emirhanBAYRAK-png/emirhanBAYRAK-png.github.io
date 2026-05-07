const MapData = {
    size: 16,
    // Yepyeni Tasarım: Merkezi Avlu, Köşe Odalar
    grid: new Uint8Array([
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,
        1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,1,
        1,0,1,0,0,0,0,1,1,0,0,0,0,1,0,1,
        1,0,1,0,0,0,0,0,0,0,0,0,0,1,0,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,1,0,1,1,1,1,0,0,1,1,1,1,0,1,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,0,0,0,0,0,1,1,1,1,0,0,0,0,0,1,
        1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,
        1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1
    ]),

    lights: [
        { x: 2.5, y: 2.5, intensity: 3.0, baseRadius: 4.0 },   // Sol üst
        { x: 13.5, y: 2.5, intensity: 3.0, baseRadius: 4.0 },  // Sağ üst
        { x: 7.5, y: 7.5, intensity: 4.5, baseRadius: 6.0 },   // MERKEZ AVLU (Büyük Işık)
        { x: 2.5, y: 13.5, intensity: 3.0, baseRadius: 4.0 },  // Sol alt
        { x: 13.5, y: 13.5, intensity: 3.0, baseRadius: 4.0 }  // Sağ alt
    ],

    items: [],

    isWall: function(x, y) {
        let mapX = ~~x, mapY = ~~y;
        if (mapX < 0 || mapX >= this.size || mapY < 0 || mapY >= this.size) return true;
        return this.grid[mapY * this.size + mapX] === 1;
    }
};