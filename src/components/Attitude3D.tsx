import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RotateCcw, Layers } from 'lucide-react';

interface Attitude3DProps {
  roll: number;    // degrees (-180 to 180)
  pitch: number;   // degrees (-90 to 90)
  totalAcc?: number;
  altitude?: number;
}

const _targetEuler = new THREE.Euler();
const _targetQuat = new THREE.Quaternion();

export const Attitude3D: React.FC<Attitude3DProps> = ({
  roll,
  pitch,
  totalAcc = 1.0,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const craftGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [trackingMode, setTrackingMode] = useState<'follow' | 'inspect'>('follow');
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [viewPreset, setViewPreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');

  const stateRef = useRef({ roll, pitch, trackingMode, wireframe });
  stateRef.current = { roll, pitch, trackingMode, wireframe };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Guard probe
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer Setup
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Scene & Camera matching Pure Pitch Black #000000
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.04);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.0);
    cameraRef.current = camera;

    // 4. Studio Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Studio Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    keyLight.position.set(5, 8, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0x8e8e93, 0x121212, 1.3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(-5, -2, -4);
    scene.add(rimLight);

    // 6. Damped OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 14;
    controls.minDistance = 2;
    controls.target.set(0, 0.8, 0);
    controlsRef.current = controls;

    // 7. Ground Grid matching #262626
    const gridHelper = new THREE.GridHelper(16, 24, 0x262626, 0x121212);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Procedural Contact Shadow Texture
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowGeo = new THREE.PlaneGeometry(3.6, 3.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.01;
    scene.add(shadowMesh);

    // 8. Composite 8-Part Procedural Avionics Pod Model
    const craftGroup = new THREE.Group();
    craftGroup.position.set(0, 0.8, 0);
    scene.add(craftGroup);
    craftGroupRef.current = craftGroup;

    // Procedural texture matching OLED Dark Gray #121212
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 256;
    texCanvas.height = 256;
    const tCtx = texCanvas.getContext('2d')!;
    tCtx.fillStyle = '#121212';
    tCtx.fillRect(0, 0, 256, 256);
    tCtx.strokeStyle = '#262626';
    tCtx.lineWidth = 2;
    for (let x = 0; x < 256; x += 16) {
      tCtx.beginPath();
      tCtx.moveTo(x, 0);
      tCtx.lineTo(x, 256);
      tCtx.stroke();
    }
    for (let y = 0; y < 256; y += 16) {
      tCtx.beginPath();
      tCtx.moveTo(0, y);
      tCtx.lineTo(256, y);
      tCtx.stroke();
    }
    const proceduralTex = new THREE.CanvasTexture(texCanvas);
    proceduralTex.colorSpace = THREE.SRGBColorSpace;
    proceduralTex.wrapS = THREE.RepeatWrapping;
    proceduralTex.wrapT = THREE.RepeatWrapping;
    proceduralTex.repeat.set(2, 2);

    // Part 1: Main Avionics Fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.85, 0.9, 1.8, 8, 1, false);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x121212,
      map: proceduralTex,
      metalness: 0.85,
      roughness: 0.28,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.castShadow = !isSoftwareGl;
    bodyMesh.receiveShadow = !isSoftwareGl;
    craftGroup.add(bodyMesh);

    // Part 2: Rings / Bezels (Silver-White accent)
    const ringGeo = new THREE.TorusGeometry(0.88, 0.05, 12, 32);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0x555555,
      emissiveIntensity: 0.2,
    });
    const topRing = new THREE.Mesh(ringGeo, ringMat);
    topRing.rotation.x = Math.PI / 2;
    topRing.position.y = 0.9;
    craftGroup.add(topRing);

    const bottomRing = topRing.clone();
    bottomRing.position.y = -0.9;
    craftGroup.add(bottomRing);

    // Part 3: Deployable Solar Wings
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.9,
      roughness: 0.2,
    });
    const solarCellMat = new THREE.MeshStandardMaterial({
      color: 0x262626,
      metalness: 0.95,
      roughness: 0.15,
      emissive: 0x181818,
      emissiveIntensity: 0.3,
    });

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const finGroup = new THREE.Group();
      finGroup.rotation.y = angle;

      const finGeo = new THREE.BoxGeometry(0.04, 1.4, 0.75);
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.position.set(0, 0, 1.25);
      finMesh.castShadow = !isSoftwareGl;
      finGroup.add(finMesh);

      const cellGeo = new THREE.BoxGeometry(0.048, 1.2, 0.65);
      const cellMesh = new THREE.Mesh(cellGeo, solarCellMat);
      cellMesh.position.set(0, 0, 1.25);
      finGroup.add(cellMesh);

      craftGroup.add(finGroup);
    }

    // Part 4: GPS Antenna
    const gpsGeo = new THREE.BoxGeometry(0.42, 0.08, 0.42);
    const gpsMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      metalness: 0.92,
      roughness: 0.15,
    });
    const gpsMesh = new THREE.Mesh(gpsGeo, gpsMat);
    gpsMesh.position.set(0, 0.94, 0);
    gpsMesh.castShadow = !isSoftwareGl;
    craftGroup.add(gpsMesh);

    // Part 5: Helical Antenna
    const antennaGeo = new THREE.CylinderGeometry(0.015, 0.02, 1.1, 8);
    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.95,
      roughness: 0.1,
    });
    const antennaMesh = new THREE.Mesh(antennaGeo, antennaMat);
    antennaMesh.position.set(0.3, 1.45, 0.2);
    craftGroup.add(antennaMesh);

    // Part 6: PCB on side window
    const pcbGeo = new THREE.BoxGeometry(0.08, 0.5, 0.65);
    const pcbMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.4,
      metalness: 0.3,
    });
    const pcbMesh = new THREE.Mesh(pcbGeo, pcbMat);
    pcbMesh.position.set(0.88, 0, 0);
    craftGroup.add(pcbMesh);

    // Part 7: Microchip (ESP32)
    const mcuGeo = new THREE.BoxGeometry(0.09, 0.26, 0.28);
    const mcuMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0.8,
      roughness: 0.3,
    });
    const mcuMesh = new THREE.Mesh(mcuGeo, mcuMat);
    mcuMesh.position.set(0.89, 0.05, 0);
    craftGroup.add(mcuMesh);

    // Part 8: BMP280 / MPU6500 sensor modules
    const sensorGeo = new THREE.BoxGeometry(0.09, 0.1, 0.12);
    const sensorMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.98,
      roughness: 0.1,
    });
    const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
    sensorMesh.position.set(0.89, -0.15, 0.14);
    craftGroup.add(sensorMesh);

    // Part 9: Active Status LED (White Glow)
    const ledGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 2.5,
      roughness: 0.1,
    });
    const ledMesh = new THREE.Mesh(ledGeo, ledMat);
    ledMesh.position.set(0.92, 0.2, 0.22);
    craftGroup.add(ledMesh);

    // 9. Coordinate Axes Indicators
    const axesGroup = new THREE.Group();
    const createAxisArrow = (dir: THREE.Vector3, colorHex: number) => {
      return new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 1.6, colorHex, 0.25, 0.15);
    };
    axesGroup.add(createAxisArrow(new THREE.Vector3(1, 0, 0), 0xef4444)); // Pitch (Red)
    axesGroup.add(createAxisArrow(new THREE.Vector3(0, 1, 0), 0x10b981)); // Yaw (Green)
    axesGroup.add(createAxisArrow(new THREE.Vector3(0, 0, 1), 0xffffff)); // Roll (White)
    craftGroup.add(axesGroup);

    // 10. Animation Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 16);
        return;
      }
      const poll = () => {
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const { roll: currentRoll, pitch: currentPitch, trackingMode: currentMode, wireframe: isWf } = stateRef.current;

      craftGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
          if (m && m.wireframe !== isWf) {
            m.wireframe = isWf;
          }
        }
      });

      const t = clock.getElapsedTime();
      ledMat.emissiveIntensity = Math.sin(t * 6) > 0 ? 3.0 : 0.4;

      if (currentMode === 'follow') {
        const targetPitchRad = THREE.MathUtils.degToRad(-currentPitch);
        const targetRollRad = THREE.MathUtils.degToRad(currentRoll);

        _targetEuler.set(targetPitchRad, 0, targetRollRad, 'XYZ');
        _targetQuat.setFromEuler(_targetEuler);

        const lambda = 8.0;
        const alpha = 1 - Math.exp(-lambda * delta);
        craftGroup.quaternion.slerp(_targetQuat, alpha);
      } else {
        craftGroup.rotation.y += delta * 0.2;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const applyPreset = (preset: 'iso' | 'top' | 'front' | 'side') => {
    setViewPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;

    switch (preset) {
      case 'iso':
        cam.position.set(4.5, 3.2, 5.0);
        break;
      case 'top':
        cam.position.set(0, 7.5, 0.01);
        break;
      case 'front':
        cam.position.set(0, 1.2, 6.0);
        break;
      case 'side':
        cam.position.set(6.0, 1.2, 0);
        break;
    }
    ctrl.target.set(0, 0.8, 0);
    ctrl.update();
  };

  const resetAttitude = () => {
    if (craftGroupRef.current) {
      craftGroupRef.current.quaternion.identity();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[460px] bg-[#121212] rounded-xl overflow-hidden border border-[#262626] shadow-sm flex flex-col">
      {/* 3D Scene Viewport */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none select-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#000000]/90 border border-[#262626] shadow-md text-xs text-[#FFFFFF]">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span className="font-bold tracking-wider">3D ATTITUDE GIMBAL</span>
          <span className="text-[#8E8E93] font-mono">MPU-6500</span>
        </div>

        <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[#000000]/90 border border-[#262626] text-xs font-mono text-[#FFFFFF]">
          <span>R: <strong className="text-[#FFFFFF]">{roll.toFixed(1)}°</strong></span>
          <span>P: <strong className="text-[#8E8E93]">{pitch.toFixed(1)}°</strong></span>
          <span>G: <strong className="text-emerald-400">{totalAcc.toFixed(2)}g</strong></span>
        </div>
      </div>

      {/* Top Right Reset Button */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 select-none">
        <button
          onClick={resetAttitude}
          title="Reset Gimbal Orientation"
          className="p-2 rounded-lg bg-[#000000]/90 hover:bg-[#262626] border border-[#262626] text-[#FFFFFF] shadow-md transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Unified Bottom Control Dock */}
      <div
        className={`absolute z-20 transition-all duration-300 ease-out left-1/2 -translate-x-1/2 flex flex-col items-center ${
          isDockCollapsed ? 'bottom-2' : 'bottom-4'
        } max-w-[94%] w-auto`}
      >
        <button
          onClick={() => setIsDockCollapsed(!isDockCollapsed)}
          className="mb-1.5 px-3 py-0.5 rounded-full bg-[#000000]/90 hover:bg-[#262626] border border-[#262626] text-[11px] text-[#FFFFFF] shadow-md flex items-center gap-1 transition-all"
        >
          <span>{isDockCollapsed ? '▴ Show Gimbal Controls' : '▾ Hide Controls'}</span>
        </button>

        {!isDockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-xl bg-[#000000]/95 border border-[#262626] shadow-xl">
            {/* Tracking Mode Switch */}
            <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-[#262626] text-xs">
              <button
                onClick={() => setTrackingMode('follow')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  trackingMode === 'follow'
                    ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                    : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                }`}
              >
                Track Live
              </button>
              <button
                onClick={() => setTrackingMode('inspect')}
                className={`px-3 py-1 rounded-md font-bold transition-all ${
                  trackingMode === 'inspect'
                    ? 'bg-[#FFFFFF] text-[#000000] shadow-[0_0_12px_rgba(255,255,255,0.25)]'
                    : 'text-[#8E8E93] hover:text-[#FFFFFF]'
                }`}
              >
                Free Orbit
              </button>
            </div>

            <div className="h-4 w-px bg-[#262626] hidden sm:block" />

            {/* Camera Presets */}
            <div className="flex items-center gap-1 text-xs">
              {(['iso', 'top', 'front', 'side'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={`px-2.5 py-1 rounded-md capitalize font-mono text-[11px] transition-colors ${
                    viewPreset === p
                      ? 'bg-[#FFFFFF] text-[#000000] font-bold shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                      : 'bg-[#121212] text-[#8E8E93] hover:text-[#FFFFFF] border border-[#262626]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-[#262626] hidden sm:block" />

            {/* Wireframe Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWireframe(!wireframe)}
                className={`p-1.5 rounded-md border text-xs transition-colors ${
                  wireframe
                    ? 'bg-[#FFFFFF] text-[#000000] border-[#FFFFFF] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                    : 'bg-[#121212] border-[#262626] text-[#8E8E93] hover:text-[#FFFFFF]'
                }`}
                title="Toggle Wireframe"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
