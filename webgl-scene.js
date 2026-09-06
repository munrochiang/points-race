(function () {
  "use strict";

  class SpaceRenderer {
    constructor(field, getState) {
      this.field = field;
      this.getState = getState;
      this.supported = false;
      this.stageIndex = 0;
      this.elapsed = 0;
      this.lastTime = performance.now();
      if (!field || !window.THREE) return;

      try {
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      } catch (_) {
        return;
      }

      this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
      this.renderer.setClearColor(0x020817, 0);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.domElement.className = "webgl-space";
      this.renderer.domElement.setAttribute("aria-hidden", "true");
      field.prepend(this.renderer.domElement);

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x061329, 0.035);
      this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 90);
      this.camera.position.set(0, 1.25, 11);
      this.camera.lookAt(0, -1.05, 0);

      this.world = new THREE.Group();
      this.tracked = new THREE.Group();
      this.scene.add(this.world, this.tracked);
      this.scene.add(new THREE.HemisphereLight(0x99ddff, 0x100724, 2.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
      keyLight.position.set(-4, 7, 8);
      this.scene.add(keyLight);
      this.cyanLight = new THREE.PointLight(0x42e8ff, 18, 24, 2);
      this.cyanLight.position.set(0, -2, 5);
      this.scene.add(this.cyanLight);

      this.createStarfield();
      this.createFlightGrid();
      this.createPlanet();
      this.createAsteroids();
      this.player = this.createPlayerShip();
      this.tracked.add(this.player);
      this.enemies = Array.from({ length: 4 }, (_, index) => {
        const drone = this.createEnemyDrone(index);
        this.tracked.add(drone);
        return drone;
      });
      this.boss = this.createBossShip();
      this.boss.visible = false;
      this.tracked.add(this.boss);

      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(field);
      this.resize();
      this.supported = true;
      field.classList.add("webgl-ready");
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    createStarfield() {
      const count = innerWidth <= 540 ? 900 : 1500;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const palette = [new THREE.Color(0xffffff), new THREE.Color(0x67e9ff), new THREE.Color(0xffd86a), new THREE.Color(0xb795ff)];
      for (let index = 0; index < count; index += 1) {
        positions[index * 3] = (Math.random() - .5) * 28;
        positions[index * 3 + 1] = (Math.random() - .45) * 24;
        positions[index * 3 + 2] = -Math.random() * 52 + 5;
        const color = palette[Math.floor(Math.random() * palette.length)];
        colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      this.stars = new THREE.Points(geometry, new THREE.PointsMaterial({ size: .075, vertexColors: true, transparent: true, opacity: .95, depthWrite: false, blending: THREE.AdditiveBlending }));
      this.world.add(this.stars);

      const streakGeometry = new THREE.BufferGeometry();
      const streaks = [];
      for (let index = 0; index < 90; index += 1) {
        const x = (Math.random() - .5) * 20;
        const y = (Math.random() - .5) * 18;
        const z = -Math.random() * 35;
        streaks.push(x, y, z, x, y - .35 - Math.random() * .7, z + .2);
      }
      streakGeometry.setAttribute("position", new THREE.Float32BufferAttribute(streaks, 3));
      this.streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({ color: 0x8feaff, transparent: true, opacity: .28, blending: THREE.AdditiveBlending }));
      this.world.add(this.streaks);
    }

    createFlightGrid() {
      this.grid = new THREE.GridHelper(42, 42, 0x55efff, 0x174b78);
      this.grid.position.set(0, -4.5, -8);
      this.grid.material.transparent = true;
      this.grid.material.opacity = .42;
      this.world.add(this.grid);

      const rails = [];
      for (let lane = -4; lane <= 4; lane += 1) rails.push(lane * 1.3, -4.42, 5, lane * 4.1, -4.42, -38);
      const railGeometry = new THREE.BufferGeometry();
      railGeometry.setAttribute("position", new THREE.Float32BufferAttribute(rails, 3));
      this.rails = new THREE.LineSegments(railGeometry, new THREE.LineBasicMaterial({ color: 0x43ddff, transparent: true, opacity: .5, blending: THREE.AdditiveBlending }));
      this.world.add(this.rails);
    }

    createPlanet() {
      this.planetMaterial = new THREE.MeshStandardMaterial({ color: 0x2878df, emissive: 0x082553, emissiveIntensity: .9, roughness: .72, metalness: .08 });
      this.planet = new THREE.Mesh(new THREE.SphereGeometry(2.65, 36, 24), this.planetMaterial);
      this.planet.position.set(5.2, 3.4, -12);
      this.world.add(this.planet);
      this.planetRing = new THREE.Mesh(new THREE.TorusGeometry(3.55, .12, 10, 96), new THREE.MeshBasicMaterial({ color: 0x8feaff, transparent: true, opacity: .52 }));
      this.planetRing.position.copy(this.planet.position);
      this.planetRing.rotation.x = 1.18;
      this.planetRing.rotation.y = .35;
      this.world.add(this.planetRing);
      const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.82, 28, 18), new THREE.MeshBasicMaterial({ color: 0x53d9ff, transparent: true, opacity: .08, side: THREE.BackSide, blending: THREE.AdditiveBlending }));
      atmosphere.position.copy(this.planet.position);
      this.world.add(atmosphere);
    }

    createAsteroids() {
      const geometry = new THREE.DodecahedronGeometry(.25, 0);
      const material = new THREE.MeshStandardMaterial({ color: 0x53627d, roughness: .88, metalness: .22 });
      this.asteroids = Array.from({ length: 22 }, (_, index) => {
        const rock = new THREE.Mesh(geometry, material);
        rock.position.set((Math.random() - .5) * 17, (Math.random() - .5) * 12, -5 - Math.random() * 28);
        const size = .35 + Math.random() * 1.8;
        rock.scale.setScalar(size);
        rock.userData.spin = .25 + Math.random() * .7;
        rock.userData.offset = index * .7;
        this.world.add(rock);
        return rock;
      });
    }

    createPlayerShip() {
      const group = new THREE.Group();
      const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xeaf6ff, metalness: .75, roughness: .22, emissive: 0x123c6f, emissiveIntensity: .45 });
      const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x2784e8, metalness: .7, roughness: .2, emissive: 0x0e3d91, emissiveIntensity: .8 });
      const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x07172d, metalness: .82, roughness: .25 });
      const glowMaterial = new THREE.MeshBasicMaterial({ color: 0x65e9ff });
      this.playerMaterials = { bodyMaterial, accentMaterial, glowMaterial };

      const body = new THREE.Mesh(new THREE.ConeGeometry(.42, 2.65, 5), bodyMaterial);
      body.position.y = .15;
      group.add(body);
      const wingShape = new THREE.Shape();
      wingShape.moveTo(0, 1.05); wingShape.lineTo(-.35, .15); wingShape.lineTo(-1.75, -.7); wingShape.lineTo(-.45, -.48); wingShape.lineTo(0, -1.05); wingShape.lineTo(.45, -.48); wingShape.lineTo(1.75, -.7); wingShape.lineTo(.35, .15); wingShape.closePath();
      const wings = new THREE.Mesh(new THREE.ExtrudeGeometry(wingShape, { depth: .16, bevelEnabled: true, bevelSize: .05, bevelThickness: .04, bevelSegments: 1 }), accentMaterial);
      wings.position.z = -.06;
      group.add(wings);
      const cockpit = new THREE.Mesh(new THREE.SphereGeometry(.27, 16, 10), glowMaterial);
      cockpit.scale.set(.8, 1.5, .65); cockpit.position.set(0, .35, .34);
      group.add(cockpit);
      [-.32, .32].forEach((x) => {
        const thruster = new THREE.Mesh(new THREE.ConeGeometry(.13, .9, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x6df3ff, transparent: true, opacity: .75, blending: THREE.AdditiveBlending }));
        thruster.rotation.z = Math.PI; thruster.position.set(x, -1.2, 0);
        group.add(thruster);
      });
      this.playerCannons = [-1, 1].map((side) => {
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 1.15, 8), darkMaterial);
        cannon.position.set(side * 1.18, -.15, .08); cannon.visible = false; group.add(cannon); return cannon;
      });
      group.rotation.x = -.12;
      return group;
    }

    createEnemyDrone(index) {
      const group = new THREE.Group();
      const colors = [0xff365c, 0xff7638, 0xd43cff, 0xff2a94];
      const material = new THREE.MeshStandardMaterial({ color: colors[index], emissive: colors[index], emissiveIntensity: .7, metalness: .62, roughness: .27 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x15152d, metalness: .8, roughness: .25 });
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(.48, 0), material);
      core.scale.set(1, 1.25, .72);
      group.add(core);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(1.75, .18, .34), dark);
      wing.rotation.z = index % 2 ? .17 : -.17;
      group.add(wing);
      [-.78, .78].forEach((x) => {
        const pod = new THREE.Mesh(new THREE.ConeGeometry(.18, .72, 5), material);
        pod.rotation.z = Math.PI; pod.position.set(x, -.18, 0); group.add(pod);
      });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      eye.position.z = .42; group.add(eye);
      group.userData.phase = index * 1.7;
      return group;
    }

    createBossShip() {
      const group = new THREE.Group();
      const armor = new THREE.MeshStandardMaterial({ color: 0x7724b8, emissive: 0x6f159f, emissiveIntensity: 1.1, metalness: .78, roughness: .22 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x12091f, metalness: .9, roughness: .18 });
      const core = new THREE.MeshBasicMaterial({ color: 0xff527d });
      const hull = new THREE.Mesh(new THREE.IcosahedronGeometry(.85, 1), armor);
      hull.scale.set(1.65, .78, .72); group.add(hull);
      [-1, 1].forEach((side) => {
        const wing = new THREE.Mesh(new THREE.ConeGeometry(.52, 2.5, 4), dark);
        wing.rotation.z = side * 1.2; wing.position.x = side * 1.25; group.add(wing);
        const cannon = new THREE.Mesh(new THREE.CylinderGeometry(.13, .2, 1.45, 8), armor);
        cannon.position.set(side * 1.55, -.45, .2); group.add(cannon);
      });
      const eye = new THREE.Mesh(new THREE.SphereGeometry(.3, 18, 12), core);
      eye.position.z = .72; group.add(eye);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, .08, 8, 64), new THREE.MeshBasicMaterial({ color: 0xee9cff, transparent: true, opacity: .72, blending: THREE.AdditiveBlending }));
      ring.rotation.x = .85; group.add(ring); group.userData.ring = ring;
      return group;
    }

    setStage(index) {
      this.stageIndex = index;
      const colors = [0x2878df, 0xa8b2cc, 0xc94b28, 0xd78d52, 0xe2c46b, 0x315ac7, 0x8c4fe0, 0xf078b9];
      const emissives = [0x082553, 0x252a3c, 0x52160d, 0x55301c, 0x514316, 0x17255f, 0x391465, 0x5c173f];
      const paletteIndex = index % colors.length;
      this.planetMaterial.color.setHex(colors[paletteIndex]);
      this.planetMaterial.emissive.setHex(emissives[paletteIndex]);
      this.planetRing.visible = index % 6 === 4 || index % 6 === 0;
      this.planetRing.material.color.setHex(index % 6 === 4 ? 0xffdc78 : 0x8feaff);
    }

    setLoadout(paint, upgrades) {
      const colors = { blue: [0x2784e8, 0x65e9ff], red: [0xdc3346, 0xff9d74], gold: [0xd89a18, 0xffef88], purple: [0x824ad1, 0xdfb7ff] };
      const selected = colors[paint] || colors.blue;
      this.playerMaterials.accentMaterial.color.setHex(selected[0]);
      this.playerMaterials.accentMaterial.emissive.setHex(selected[0]);
      this.playerMaterials.glowMaterial.color.setHex(selected[1]);
      this.playerCannons.forEach((cannon) => { cannon.visible = upgrades && upgrades.has("twin"); });
    }

    resize() {
      const width = this.field.clientWidth;
      const height = this.field.clientHeight;
      if (!width || !height || !this.renderer) return;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    elementToWorld(element, zPlane) {
      const fieldBox = this.field.getBoundingClientRect();
      const box = element.getBoundingClientRect();
      const x = ((box.left + box.width / 2 - fieldBox.left) / fieldBox.width) * 2 - 1;
      const y = -(((box.top + box.height / 2 - fieldBox.top) / fieldBox.height) * 2 - 1);
      const point = new THREE.Vector3(x, y, .25).unproject(this.camera);
      const direction = point.sub(this.camera.position).normalize();
      const distance = (zPlane - this.camera.position.z) / direction.z;
      return this.camera.position.clone().add(direction.multiplyScalar(distance));
    }

    syncTrackedObjects(time) {
      const fort = document.getElementById("fort");
      if (fort && fort.offsetParent !== null) {
        this.player.visible = true;
        this.player.position.copy(this.elementToWorld(fort, 2.25));
        this.player.position.y += .72;
        const widthScale = fort.getBoundingClientRect().width / 155;
        this.player.scale.setScalar(.56 * widthScale);
        this.player.rotation.y = Math.sin(time * .0012) * .08 + THREE.MathUtils.degToRad(this.getState().cameraYaw * .75);
        this.player.rotation.x = -.15 + THREE.MathUtils.degToRad(this.getState().cameraPitch * .3);
      } else {
        this.player.visible = false;
      }

      const buttons = [...document.querySelectorAll(".enemy-unit")];
      this.enemies.forEach((drone, index) => {
        const button = buttons[index];
        if (!button || button.offsetParent === null || button.classList.contains("correct") || button.classList.contains("retreat") || button.classList.contains("jammed") || button.classList.contains("nuclear-hit")) {
          drone.visible = false;
          return;
        }
        drone.visible = true;
        drone.position.copy(this.elementToWorld(button, 1.05));
        const widthScale = button.getBoundingClientRect().width / 115;
        drone.scale.setScalar(.82 * widthScale);
        drone.rotation.y = time * .0014 + drone.userData.phase;
        drone.rotation.x = Math.sin(time * .002 + drone.userData.phase) * .18;
        drone.rotation.z = Math.sin(time * .0017 + drone.userData.phase) * .14;
      });

      const bossElement = document.getElementById("bossShip");
      if (bossElement && bossElement.offsetParent !== null && this.getState().bossActive) {
        this.boss.visible = true;
        this.boss.position.copy(this.elementToWorld(bossElement, .35));
        this.boss.position.y += .35;
        const widthScale = bossElement.getBoundingClientRect().width / 240;
        this.boss.scale.setScalar(.52 * widthScale);
        this.boss.rotation.y = Math.sin(time * .0011) * .2;
        this.boss.rotation.x = Math.sin(time * .0017) * .08;
        this.boss.userData.ring.rotation.z = time * .0012;
      } else {
        this.boss.visible = false;
      }
    }

    animate(now) {
      requestAnimationFrame(this.animate);
      if (!this.supported || this.field.offsetParent === null) { this.lastTime = now; return; }
      const delta = Math.min(.05, Math.max(0, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.elapsed += delta;
      const state = this.getState();
      const targetY = THREE.MathUtils.degToRad(state.cameraYaw * .9);
      const targetX = THREE.MathUtils.degToRad(state.cameraPitch * .65);
      this.world.rotation.y += (targetY - this.world.rotation.y) * .09;
      this.world.rotation.x += (targetX - this.world.rotation.x) * .09;
      this.stars.rotation.z = Math.sin(this.elapsed * .08) * .035;
      this.streaks.position.y = -((this.elapsed * 2.4) % 2.5);
      this.grid.position.z = -8 + ((this.elapsed * 4.2) % 1);
      this.planet.rotation.y += delta * .11;
      this.planetRing.rotation.z += delta * .035;
      this.asteroids.forEach((rock) => {
        rock.rotation.x += delta * rock.userData.spin;
        rock.rotation.y += delta * rock.userData.spin * .73;
        rock.position.y -= delta * (.22 + rock.userData.spin * .12);
        if (rock.position.y < -7) rock.position.y = 7;
      });
      this.cyanLight.intensity = 15 + Math.sin(this.elapsed * 4.5) * 4;
      this.syncTrackedObjects(now);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.SpaceRenderer = SpaceRenderer;
})();
