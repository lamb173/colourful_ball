    // ═════════════════════════════════════════════════════
    //  土星3D场景（第5关 土星风暴 场景包围 · 程序化生成）
    // ═════════════════════════════════════════════════════

    let saturnGroup     = null;   // THREE.Group 土星本体+光环
    let saturnStarfield = null;   // THREE.Points 第5关专属星空
    let saturnInScene  = false;
    let starfieldInScene = false;

    // ─── 辅助：生成土星条纹纹理（Canvas 2D） ───
    function makeSaturnBodyTexture() {
      const W = 1024, H = 512;
      const c = document.createElement("canvas");
      c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#c8a832";
      ctx.fillRect(0, 0, W, H);
      const bands = [
        { y: 0.00, h: 0.06, c: "#bfa52e" },
        { y: 0.06, h: 0.05, c: "#d4b83c" },
        { y: 0.11, h: 0.07, c: "#b59628" },
        { y: 0.18, h: 0.04, c: "#dcc84a" },
        { y: 0.22, h: 0.06, c: "#a88a22" },
        { y: 0.28, h: 0.05, c: "#d0b038" },
        { y: 0.33, h: 0.08, c: "#c49c2e" },
        { y: 0.41, h: 0.04, c: "#e0cc55" },
        { y: 0.45, h: 0.10, c: "#9e8420" },
        { y: 0.55, h: 0.04, c: "#d8c448" },
        { y: 0.59, h: 0.07, c: "#b89a28" },
        { y: 0.66, h: 0.05, c: "#e8d860" },
        { y: 0.71, h: 0.06, c: "#a89025" },
        { y: 0.77, h: 0.08, c: "#d0b538" },
        { y: 0.85, h: 0.05, c: "#c4a02c" },
        { y: 0.90, h: 0.10, c: "#b89828" },
      ];
      for (const b of bands) {
        ctx.fillStyle = b.c;
        ctx.fillRect(0, Math.round(b.y * H), W, Math.round(b.h * H));
      }
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * W;
        const y = Math.random() * H;
        ctx.fillStyle = "rgba(255,255,200," + (Math.random() * 0.06) + ")";
        ctx.fillRect(x, y, 2, 1);
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    }

    // ─── 创建土星本体+光环 ───
    function createSaturnProcedural() {
      console.log("[SATURN] createSaturnProcedural() called");
      try {
        const group = new THREE.Group();

        // ① 土星本体（带条纹纹理）
        const bodyGeo = new THREE.SphereGeometry(1.0, 80, 60);
        const bodyMat = new THREE.MeshStandardMaterial({
          map: makeSaturnBodyTexture(),
          roughness: 0.72,
          metalness: 0.03,
          fog: false,
        });
        group.add(new THREE.Mesh(bodyGeo, bodyMat));
        console.log("[SATURN] textured body added");

        // ② 光环（7个精细环）
        const ringData = [
          { r: 1.35, tube: 0.06, color: 0xc8b88a, opacity: 0.30 },
          { r: 1.50, tube: 0.11, color: 0xd0d0a0, opacity: 0.55 },
          { r: 1.68, tube: 0.05, color: 0xb8a060, opacity: 0.25 },
          { r: 1.85, tube: 0.14, color: 0xdcc888, opacity: 0.60 },
          { r: 2.08, tube: 0.08, color: 0xc0a870, opacity: 0.40 },
          { r: 2.28, tube: 0.16, color: 0xeee0a0, opacity: 0.50 },
          { r: 2.55, tube: 0.07, color: 0xb8a060, opacity: 0.28 },
        ];
        for (const d of ringData) {
          const tGeo = new THREE.TorusGeometry(d.r, d.tube, 12, 128);
          const tMat = new THREE.MeshStandardMaterial({
            color: d.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: d.opacity,
            roughness: 0.65,
            metalness: 0.0,
            fog: false,
          });
          const tMesh = new THREE.Mesh(tGeo, tMat);
          tMesh.rotation.x = Math.PI / 2;
          group.add(tMesh);
        }
        console.log("[SATURN] 7 textured rings added");

        // ③ 大气光晕（内发光）
        const glowGeo = new THREE.SphereGeometry(1.12, 80, 60);
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xeeddaa,
          transparent: true,
          opacity: 0.09,
          side: THREE.BackSide,
          fog: false,
          depthWrite: false,
        });
        group.add(new THREE.Mesh(glowGeo, glowMat));

        // ④ 外光晕
        const glow2Geo = new THREE.SphereGeometry(1.38, 40, 30);
        const glow2Mat = new THREE.MeshBasicMaterial({
          color: 0xddcc88,
          transparent: true,
          opacity: 0.04,
          side: THREE.BackSide,
          fog: false,
          depthWrite: false,
        });
        group.add(new THREE.Mesh(glow2Geo, glow2Mat));
        console.log("[SATURN] glow layers added");

        group.rotation.x = 0.47;
        group.rotation.y = 0.18;
        group.position.set(0, 14, 45);
        group.scale.set(16, 16, 16);
        console.log("[SATURN] group created");

        return group;
      } catch(e) {
        console.error("[SATURN] createSaturnProcedural ERROR:", e);
        return null;
      }
    }

    // ─── 创建第5关专属星空 ───
    function createSaturnStarfield() {
      console.log("[SATURN-SKY] creating starfield...");
      const group = new THREE.Group();
      const count = 12000;
      const pos = new Float32Array(count * 3);
      const col = new Float32Array(count * 3);
      const sz  = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const r     = 280 + Math.random() * 220;
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        const t = Math.random();
        if (t < 0.5) {
          col[i * 3] = 0.92; col[i * 3 + 1] = 0.94; col[i * 3 + 2] = 1.0;
        } else if (t < 0.8) {
          col[i * 3] = 1.0; col[i * 3 + 1] = 0.97; col[i * 3 + 2] = 0.85;
        } else {
          col[i * 3] = 0.75; col[i * 3 + 1] = 0.85; col[i * 3 + 2] = 1.0;
        }
        sz[i] = 0.5 + Math.random() * 2.2;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color",    new THREE.BufferAttribute(col, 3));
      geo.setAttribute("size",     new THREE.BufferAttribute(sz, 1));
      const mat = new THREE.PointsMaterial({
        size: 1.4,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: true,
        fog: false,
        depthWrite: false,
      });
      group.add(new THREE.Points(geo, mat));
      console.log("[SATURN-SKY] starfield created, count=", count);
      return group;
    }

    // ─── 显示/隐藏 ───
    function showSaturn() {
      console.log("[SATURN] showSaturn(), stage=", _currentStage ? _currentStage.id : null);
      try {
        if (!saturnGroup) saturnGroup = createSaturnProcedural();
        if (saturnGroup && !saturnInScene) {
          scene.add(saturnGroup);
          saturnInScene = true;
        }
        if (!saturnStarfield) saturnStarfield = createSaturnStarfield();
        if (saturnStarfield && !starfieldInScene) {
          scene.add(saturnStarfield);
          starfieldInScene = true;
          console.log("[SATURN-SKY] added to scene");
        }
      } catch(e) {
        console.error("[SATURN] showSaturn ERROR:", e);
      }
    }

    function hideSaturn() {
      console.log("[SATURN] hideSaturn()");
      try {
        if (saturnInScene && saturnGroup) {
          scene.remove(saturnGroup);
          saturnInScene = false;
        }
        if (starfieldInScene && saturnStarfield) {
          scene.remove(saturnStarfield);
          starfieldInScene = false;
          console.log("[SATURN-SKY] removed from scene");
        }
      } catch(e) {
        console.error("[SATURN] hideSaturn ERROR:", e);
      }
    }
