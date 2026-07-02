import { useEffect, useRef, useState } from 'react';

const LETTER_IDS = ['a', 'n', 'i-bar', 'm', 'e'];
const EXTRA_IDS = ['i-dot', 'e-dot', 'j', 's', 'three', 'd'];
const DEPTH = 0.2565;

export default function GaokaoThreeIntro({ onDone }) {
  const mountRef = useRef(null);
  const [phase, setPhase] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let renderer = null;
    let timer = null;
    let finishTimer = null;
    let resizeHandler = null;
    let cancelFrame = null;

    async function boot() {
      const [
        threeModule,
        svgLoaderModule,
        animeModule,
        threeAdapterModule,
        svgResponse
      ] = await Promise.all([
        import('three'),
        import('three/addons/loaders/SVGLoader.js'),
        import('animejs'),
        import('animejs/adapters/three'),
        fetch('/assets/gaokao-explosion-logo.svg')
      ]);

      if (disposed || !mountRef.current) return;

      const {
        Scene, WebGLRenderer, PerspectiveCamera, Color, Group, Box3, Vector3,
        Mesh, ExtrudeGeometry, MeshStandardMaterial, InstancedMesh, BoxGeometry, Object3D,
        AmbientLight, DirectionalLight, ShaderMaterial, SphereGeometry, BackSide
      } = threeModule;
      const { SVGLoader } = svgLoaderModule;
      const { animate, createTimeline, createTimer, stagger, utils, cubicBezier } = animeModule;
      const { getInstances } = threeAdapterModule;

      const svgText = await svgResponse.text();
      const data = new SVGLoader().parse(svgText);
      const parsed = {};

      function flipShapeY(shape) {
        const flipPath = (path) => path.curves.forEach((curve) => {
          if (curve.v0) curve.v0.y = -curve.v0.y;
          if (curve.v1) curve.v1.y = -curve.v1.y;
          if (curve.v2) curve.v2.y = -curve.v2.y;
          if (curve.v3) curve.v3.y = -curve.v3.y;
        });
        flipPath(shape);
        shape.holes.forEach(flipPath);
      }

      for (const path of data.paths) {
        const id = path.userData?.node?.id;
        if (!id) continue;
        const shapes = SVGLoader.createShapes(path);
        shapes.forEach(flipShapeY);
        const geom = new ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: false });
        const bbox = new Box3().setFromBufferAttribute(geom.attributes.position);
        const center = bbox.getCenter(new Vector3());
        const size = bbox.getSize(new Vector3());
        geom.translate(-center.x, -center.y, -center.z);
        parsed[id] = { geom, center, size, color: path.userData.style.fill || '#fff' };
      }

      if (parsed['i-dot'] && parsed['i-bar']) {
        parsed['i-dot'].center.x = parsed['i-bar'].center.x;
      }

      const scene = new Scene();
      const BG = '#252423';
      scene.background = new Color(BG);

      const skyMaterial = new ShaderMaterial({
        uniforms: {
          topColor: { value: new Color('#8e8e96') },
          bottomColor: { value: new Color('#cfcfd4') },
          offset: { value: 32 },
          exponent: { value: 0.6 }
        },
        side: BackSide,
        vertexShader: `
          varying vec3 vWorldPosition;
          void main() {
            vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 topColor;
          uniform vec3 bottomColor;
          uniform float offset;
          uniform float exponent;
          varying vec3 vWorldPosition;
          void main() {
            float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
            gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
            #include <colorspace_fragment>
          }
        `
      });
      scene.add(new Mesh(new SphereGeometry(600, 32, 15), skyMaterial));

      const logoGroup = new Group();
      const meshes = {};
      [...LETTER_IDS, ...EXTRA_IDS].forEach((id) => {
        const item = parsed[id];
        if (!item) return;
        const mesh = new Mesh(item.geom, new MeshStandardMaterial({
          color: new Color(item.color),
          roughness: 0.4,
          metalness: 0.1
        }));
        mesh.position.copy(item.center);
        mesh.userData.halfHeight = item.size.y / 2;
        meshes[id] = mesh;
        logoGroup.add(mesh);
      });

      const tileSize = 1;
      const scale = tileSize / parsed['i-dot'].size.x;
      logoGroup.scale.setScalar(scale);
      const iLocalBottomY = parsed['i-bar'].center.y - parsed['i-bar'].size.y / 2;
      logoGroup.position.set(-parsed['i-dot'].center.x * scale, tileSize / 2 - iLocalBottomY * scale, 0);
      const wrapper = new Group();
      wrapper.add(logoGroup);
      wrapper.position.set(0, -5, 0);
      logoGroup.visible = false;
      scene.add(wrapper);

      const floorGroup = new Group();
      const FLOOR_COLS = 31;
      const FLOOR_ROWS = 31;
      const floor = new InstancedMesh(
        new BoxGeometry(tileSize, tileSize, tileSize),
        new MeshStandardMaterial({ color: new Color('#d4d4d8'), roughness: 0.7, metalness: 0.05 }),
        FLOOR_COLS * FLOOR_ROWS
      );
      const dummy = new Object3D();
      for (let row = 0; row < FLOOR_ROWS; row += 1) {
        for (let col = 0; col < FLOOR_COLS; col += 1) {
          dummy.position.set(col - (FLOOR_COLS - 1) / 2, 0, row - (FLOOR_ROWS - 1) / 2);
          dummy.updateMatrix();
          floor.setMatrixAt(row * FLOOR_COLS + col, dummy.matrix);
        }
      }
      floorGroup.add(floor);
      scene.add(floorGroup);
      const tiles = getInstances(floor);

      const cube = new Mesh(
        new BoxGeometry(tileSize, tileSize, tileSize),
        new MeshStandardMaterial({ color: '#FF4B4B', roughness: 0.4, metalness: 0.1 })
      );
      scene.add(cube);

      const ambient = new AmbientLight(0xffffff, 0.6);
      scene.add(ambient);
      const keyLight = new DirectionalLight(0xffffff, 1.6);
      keyLight.position.set(100, 200, 300);
      scene.add(keyLight);
      const rimLight = new DirectionalLight(0xaab8ff, 0.6);
      rimLight.position.set(-200, -50, 150);
      scene.add(rimLight);

      const camera = new PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 2000);
      const cameraRig = new Group();
      cameraRig.add(camera);
      scene.add(cameraRig);

      renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.domElement.style.opacity = '0';
      mountRef.current.appendChild(renderer.domElement);

      resizeHandler = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', resizeHandler);

      const letters = LETTER_IDS.map(id => meshes[id]).filter(Boolean);
      const jsLetters = ['j', 's', 'three', 'd'].map(id => meshes[id]).filter(Boolean);
      const dot = meshes['i-dot'];
      const iBar = meshes['i-bar'];
      const dotRestX = dot.position.x;
      const bottomOrigin = (mesh) => `0 ${-mesh.userData.halfHeight} 0`;

      letters.forEach(mesh => utils.set(mesh, { skewX: -8, transformOrigin: bottomOrigin(mesh) }));
      jsLetters.forEach(mesh => utils.set(mesh, {
        y: mesh.position.y + 1.9 - meshes.e.position.y,
        z: 6.5,
        rotateX: 20,
        scale: 0,
        transformOrigin: bottomOrigin(mesh)
      }));
      utils.set(dot, { x: dotRestX - 0.045, y: 15, scaleY: 0, transformOrigin: bottomOrigin(dot) });
      utils.set(camera, { x: 0, y: 5.64, z: 20.66, rotateX: -14.73, fov: 60, zoom: 1 });
      utils.set(cube, { x: 0, y: 0, z: 0, transformOriginY: -0.5, scaleX: 0, scaleY: 5, scaleZ: 0 });
      utils.set(logoGroup, { x: -10.922, y: -0.31, z: -0.5 });
      utils.set(tiles, {
        x: stagger(1, { grid: true, from: 'center', axis: 'x' }),
        z: stagger(1, { grid: true, from: 'center', axis: 'z' }),
        y: 0
      });

      const centerIndex = Math.floor(FLOOR_ROWS / 2) * FLOOR_COLS + Math.floor(FLOOR_COLS / 2);
      const ringDistance = (index) => Math.hypot(
        (index % FLOOR_COLS) - Math.floor(FLOOR_COLS / 2),
        Math.floor(index / FLOOR_COLS) - Math.floor(FLOOR_ROWS / 2)
      );
      const centerTiles = tiles.filter((_, index) => ringDistance(index) <= 10);
      utils.set(tiles[centerIndex], { scale: 0 });

      const DEG2RAD = Math.PI / 180;
      const flatten = { value: 1 };
      const baseFov = camera.fov;
      const distanceNumerator = camera.position.z * Math.tan(baseFov * 0.5 * DEG2RAD);

      timer = createTimer({
        priority: 0,
        onUpdate: () => {
          camera.position.z = distanceNumerator * flatten.value / Math.tan(camera.fov * 0.5 * DEG2RAD);
          renderer.render(scene, camera);
        }
      });

      const tl = createTimeline({ autoplay: false })
        .add(renderer.domElement, { opacity: [0, 1], duration: 900, ease: 'inOut(2)' }, 0)
        .add(camera, {
          rotateX: [
            { to: 38, duration: 700, ease: 'inOut(2)' },
            { to: -16.5, duration: 260, delay: 900, ease: 'out(2)' },
            { to: -14.73, duration: 190, ease: 'inOutSine' }
          ],
          y: [
            { to: 6.4, duration: 900, ease: 'inOut(2)' },
            { to: 5.04, duration: 320, delay: 700, ease: 'in(2)' }
          ]
        }, 250)
        .add(cube, {
          y: [
            { from: 24, to: 1, duration: 1200, delay: 500, ease: 'in(4)' },
            { to: -2.5, duration: 800, ease: cubicBezier(0, 1.1575, 0.5712, 0.9605) }
          ],
          scaleX: [{ to: 1, duration: 1200 }, { to: 0.9, duration: 600 }],
          scaleY: [{ to: 2, duration: 1200 }, { to: 4, duration: 1600 }],
          scaleZ: [{ to: 1, duration: 1200 }, { to: 0.9, duration: 600 }],
          skewX: { to: 1, duration: 1700, delay: 1100, modifier: t => Math.sin(t * 26 * Math.PI) * (1 - t) * 8 }
        }, 0)
        .add(tiles, {
          y: [
            { to: stagger([0.4, 0], { from: 'center', grid: true }), duration: 90, delay: stagger([0, 420], { from: 'center', grid: true }), ease: 'out(3)' },
            { to: stagger([-2.6, 0], { from: 'center', grid: true, jitter: [0.25, 0], seed: 0 }), duration: 1000, ease: 'out(3)' }
          ],
          rotateX: { to: stagger([-30, 30], { from: 'center', grid: true, jitter: [20, 0], seed: 6 }), duration: 900 },
          rotateZ: { to: stagger([-35, 35], { from: 'center', grid: true, jitter: [20, 0], seed: 3 }), duration: 900 }
        }, 1600)
        .add(cameraRig, {
          rotateY: [
            { from: -270, to: -180, duration: 2200 },
            { to: 0, duration: 700, delay: 300, ease: cubicBezier(0.375, -0.0148, 0, 1.0101) }
          ],
          ease: 'inOut(2)'
        }, 2500)
        .add(centerTiles, {
          x: { to: stagger([1, 40], { from: 'center', grid: true, axis: 'x', jitter: 5, seed: 0 }), duration: 900, delay: stagger([0, 137], { from: 'center', grid: true }), ease: 'out(5)' },
          z: { to: stagger([1, 40], { from: 'center', grid: true, axis: 'z', jitter: 5, seed: 0 }), duration: 900, delay: stagger([0, 137], { from: 'center', grid: true }), ease: 'out(5)' },
          y: { to: stagger([40, 1], { from: 'center', grid: true, jitter: 5, seed: 0 }), duration: 900, delay: stagger([0, 137], { from: 'center', grid: true }), ease: 'out(5)' },
          scale: { to: 0, duration: 900, delay: stagger([0, 314], { from: 'center', grid: true }), ease: 'out(2.8)' }
        }, 5450)
        .add(letters, {
          y: [
            { from: -0.39, to: 3.23, duration: 240, ease: cubicBezier(0.225, 1, 0.915, 0.98) },
            { to: 1.9, duration: 120, delay: 20, ease: 'inQuad' },
            { to: 1.9, duration: 120, delay: 0, ease: 'outQuad' }
          ],
          scaleX: [{ to: [0.25, 0.85], duration: 240 }, { to: 1, duration: 260, delay: 120 }],
          scaleY: [{ to: [0.4, 1.5], duration: 120 }, { to: 1, duration: 320, delay: 160 }],
          delay: stagger(60, { from: 'center' }),
          ease: 'outSine'
        }, 5600)
        .add(cube, {
          x: { to: 16.4, duration: 1350 },
          y: [
            { to: 16.9, duration: 240, ease: cubicBezier(0.225, 1, 0.915, 0.98) },
            { to: 9.5, duration: 700, delay: 120, ease: 'outQuad' }
          ],
          scaleX: { to: 1, duration: 260 },
          scaleY: { to: 1, duration: 260 },
          scaleZ: { to: 1, duration: 260 },
          rotateZ: -720,
          skewX: 8,
          ease: 'outElastic(1.1,1.7)'
        }, 5600)
        .add(wrapper, { scale: { from: 1.25, to: 1, duration: 600 }, y: { from: -5.28, to: 0, duration: 600 }, ease: 'outExpo' }, 5600)
        .add(iBar, {
          scaleY: [{ to: 0.25, duration: 150 }, { to: 1, duration: 700, ease: 'outElastic(2.11, 0.61)' }],
          scaleX: [{ to: 1.5, duration: 50 }, { to: 1, duration: 900, ease: 'outElastic(2.11, 0.61)' }]
        }, 5980)
        .add(jsLetters, {
          z: { from: -2, to: 0.12825, duration: 1295 },
          rotateX: { from: -120, to: 0, duration: 1295 },
          scale: { from: 0, to: 1, duration: 549 },
          delay: stagger(50),
          ease: 'outElastic(1.1, .9)'
        }, 6650)
        .add(logoGroup, { x: { to: '-=8.7', duration: 1350, ease: 'outElastic(1.1, .9)' } }, 6650)
        .add(camera, { y: { to: 7, duration: 900 }, rotateX: { to: 0, duration: 900 }, zoom: { to: 1, duration: 400 }, fov: { to: 2, duration: 700 } }, 6000)
        .add(flatten, { value: { to: 1.5, duration: 1125 }, ease: 'out(2)' }, 6650)
        .add(skyMaterial, { topColor: '#252423', bottomColor: '#252423', duration: 465, ease: 'inOut(4)' }, 7200)
        .add(ambient, { intensity: [{ to: 3, duration: 300 }, { to: 1, duration: 700, delay: 650 }] }, 7350)
        .add([...letters, ...jsLetters, cube], {
          z: 62.1,
          y: 0.5,
          rotateX: () => utils.random(-540, 540),
          rotateY: () => utils.random(-540, 540),
          rotateZ: () => utils.random(-540, 540),
          delay: stagger(80, { from: 'last', ease: 'in(2)' }),
          duration: 1100,
          ease: 'in(2)'
        }, 8900)
        .init();

      animate(tl, {
        currentTime: [{ to: () => tl.duration, duration: () => tl.duration }],
        duration: tl.duration,
        ease: 'linear'
      });

      setPhase('title');
      finishTimer = window.setTimeout(() => {
        if (disposed) return;
        setPhase('done');
        window.setTimeout(() => onDone?.(), 780);
      }, 10400);
    }

    boot().catch((error) => {
      console.error('[Gaokao intro]', error);
      setPhase('done');
      window.setTimeout(() => onDone?.(), 400);
    });

    return () => {
      disposed = true;
      if (finishTimer) window.clearTimeout(finishTimer);
      if (cancelFrame) window.cancelAnimationFrame(cancelFrame);
      if (timer?.pause) timer.pause();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      if (renderer) {
        renderer.dispose();
        renderer.domElement?.remove();
      }
    };
  }, [onDone]);

  const universities = ['清华', '北大', '复旦', '上交', '浙大', '南大', '中科大', '人大', '同济'];

  return (
    <div className={`gaokao-intro ${phase === 'done' ? 'is-done' : ''}`}>
      <style>{`
        html:has(.gaokao-intro), body:has(.gaokao-intro) {
          margin: 0;
          padding: 0;
          height: 100%;
          background-color: #252423;
          overflow: hidden;
        }
        .gaokao-intro {
          position: fixed;
          inset: 0;
          z-index: 1000;
          overflow: hidden;
          background: #252423;
          color: #fff;
          transition: opacity 760ms ease, visibility 760ms ease;
        }
        .gaokao-intro.is-done {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }
        .gaokao-intro-stage,
        .gaokao-intro-stage canvas {
          display: block;
          height: 100%;
          width: 100%;
        }
        .gaokao-intro #logo {
          display: none;
        }
        .gaokao-intro-copy {
          position: absolute;
          left: 50%;
          bottom: 8vh;
          z-index: 3;
          display: grid;
          justify-items: center;
          width: min(92vw, 980px);
          transform: translate(-50%, 28px) scale(.96);
          opacity: 0;
          text-align: center;
          text-shadow: 0 0 34px rgba(255, 75, 75, .52), 0 10px 50px rgba(0, 0, 0, .8);
          transition: opacity 560ms ease, transform 720ms cubic-bezier(.08,.9,.18,1);
          pointer-events: none;
        }
        .gaokao-intro-copy.is-visible {
          transform: translate(-50%, 0) scale(1);
          opacity: 1;
        }
        .gaokao-intro-copy span {
          color: #ff4b4b;
          font-size: clamp(18px, 2.6vw, 34px);
          font-weight: 900;
          letter-spacing: .18em;
        }
        .gaokao-intro-copy strong {
          margin-top: 8px;
          color: #fff;
          font-size: clamp(34px, 7vw, 92px);
          font-weight: 950;
          letter-spacing: 0;
          line-height: 1.05;
        }
        .gaokao-school-field {
          position: absolute;
          left: 50%;
          top: 38%;
          z-index: 2;
          height: min(60vw, 460px);
          width: min(92vw, 980px);
          transform: translate(-50%, -50%);
          transform-style: preserve-3d;
          perspective: 900px;
          pointer-events: none;
        }
        .gaokao-hero-3d-title {
          position: absolute;
          left: 50%;
          top: 36%;
          z-index: 3;
          width: min(92vw, 980px);
          transform: translate(-50%, -50%) perspective(900px) rotateX(20deg) translateZ(40px);
          color: #fff;
          font-size: clamp(34px, 7vw, 88px);
          font-weight: 950;
          letter-spacing: .02em;
          line-height: 1.05;
          text-align: center;
          text-shadow:
            0 2px 0 rgba(255,255,255,.28),
            0 10px 0 rgba(96,96,104,.52),
            0 22px 34px rgba(0,0,0,.52),
            0 0 34px rgba(255,75,75,.32);
          opacity: 0;
          pointer-events: none;
          animation: hero-title-slam 7600ms cubic-bezier(.08,.9,.18,1) 4200ms both;
        }
        .gaokao-hero-3d-title::after {
          content: attr(data-shadow);
          position: absolute;
          inset: 0;
          z-index: -1;
          color: rgba(80, 82, 90, .72);
          transform: translate3d(0, 18px, -60px) skewX(-10deg);
          filter: blur(.4px);
        }
        .gaokao-school-tile {
          position: absolute;
          left: calc(50% + var(--x));
          top: calc(50% + var(--y));
          display: grid;
          height: clamp(54px, 7vw, 82px);
          min-width: clamp(88px, 11vw, 128px);
          place-items: center;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 8px;
          background:
            linear-gradient(145deg, rgba(255,255,255,.22), rgba(255,255,255,.05) 46%, rgba(255,75,75,.16)),
            rgba(20, 23, 30, .76);
          box-shadow:
            0 18px 34px rgba(0,0,0,.42),
            inset 0 1px 0 rgba(255,255,255,.24),
            inset 0 -12px 24px rgba(0,0,0,.24);
          color: #fff;
          font-size: clamp(18px, 2.4vw, 30px);
          font-weight: 950;
          letter-spacing: .08em;
          opacity: 0;
          text-shadow: 0 0 18px rgba(255,255,255,.35);
          transform:
            translate(-50%, -50%)
            rotateX(58deg)
            rotateY(var(--tilt))
            translateZ(-120px)
            scale(.4);
          animation: school-tile-burst 7800ms cubic-bezier(.08,.9,.18,1) var(--delay) both;
        }
        .gaokao-school-tile::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.32) 42%, transparent 58%);
          transform: translateX(-120%);
          animation: school-shine 1800ms ease var(--delay) infinite;
        }
        @keyframes school-tile-burst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) rotateX(76deg) rotateY(var(--tilt)) translateZ(-260px) scale(.18);
          }
          10% {
            opacity: 0;
          }
          24% {
            opacity: 1;
            transform: translate(-50%, -50%) rotateX(18deg) rotateY(var(--tilt)) translateZ(86px) scale(1.08);
          }
          42% {
            opacity: 1;
            transform: translate(-50%, -50%) rotateX(8deg) rotateY(var(--tilt)) translateZ(0) scale(1);
          }
          88% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotateX(-30deg) rotateY(var(--tilt)) translateZ(240px) scale(.82);
          }
        }
        @keyframes school-shine {
          0%, 35% { transform: translateX(-120%); opacity: 0; }
          55% { opacity: 1; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes hero-title-slam {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) perspective(900px) rotateX(70deg) translate3d(0, -80px, -260px) scale(.42);
            filter: blur(8px);
          }
          18% {
            opacity: 1;
            transform: translate(-50%, -50%) perspective(900px) rotateX(-10deg) translate3d(0, 10px, 96px) scale(1.08);
            filter: blur(0);
          }
          32% {
            transform: translate(-50%, -50%) perspective(900px) rotateX(14deg) translate3d(0, 0, 24px) scale(1);
          }
          78% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) perspective(900px) rotateX(-26deg) translate3d(0, 40px, 360px) scale(.96);
          }
        }
        .gaokao-intro-skip {
          position: absolute;
          right: 22px;
          top: 20px;
          z-index: 4;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 8px;
          background: rgba(255,255,255,.08);
          color: rgba(255,255,255,.82);
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 13px;
        }
        .gaokao-intro-skip:hover {
          background: rgba(255,255,255,.16);
          color: #fff;
        }
        @media (prefers-reduced-motion: reduce) {
          .gaokao-intro,
          .gaokao-intro-copy {
            transition: none;
          }
        }
      `}</style>
      <div ref={mountRef} className="gaokao-intro-stage" />
      <div className="gaokao-hero-3d-title" data-shadow="高考志愿填报智能体">高考志愿填报智能体</div>
      <div className="gaokao-school-field" aria-hidden="true">
        {universities.map((school, index) => (
          <span
            key={school}
            className="gaokao-school-tile"
            style={{
              '--x': `${[-360, -180, 0, 180, 360, -270, -90, 90, 270][index]}px`,
              '--y': `${[-96, -132, -108, -132, -96, 46, 18, 18, 46][index]}px`,
              '--tilt': `${index % 2 === 0 ? '-18deg' : '18deg'}`,
              '--delay': `${900 + index * 90}ms`
            }}
          >
            {school}
          </span>
        ))}
      </div>
      <svg id="logo" viewBox="0 0 7.156 4.024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <g fillRule="evenodd" transform="scale(0.01118)">
          <polygon id="i-dot" fill="#FF4B4B" points="309.202438 224.68 309.293324 207 332.173324 207 332.212438 224.68" />
          <polygon id="e-dot" fill="#FF4B4B" points="585.36 224.68 587.96 207 610.84 207 608.37 224.68" />
        </g>
      </svg>
      <div className={`gaokao-intro-copy ${phase === 'title' ? 'is-visible' : ''}`}>
        <span>把每一分</span>
        <strong>填成奔赴未来的坐标</strong>
      </div>
      <button className="gaokao-intro-skip" type="button" onClick={() => {
        setPhase('done');
        window.setTimeout(() => onDone?.(), 260);
      }}>
        跳过开场
      </button>
    </div>
  );
}
