import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Coastal Port Coordinates on Globe Texture (4096 x 2048 equirectangular)
// Lon: (lon + 180)/360 * 4096; Lat: (90 - lat)/180 * 2048
export const INDIAN_COASTAL_NODES = [
  { name: 'MUMBAI', lat: 18.92, lon: 72.82, x: 2876, y: 808, code: 'IN-BOM', state: 'Maharashtra', wave: '1.1m', sst: '28.2°C' },
  { name: 'KOCHI', lat: 9.93, lon: 76.26, x: 2915, y: 911, code: 'IN-COK', state: 'Kerala', wave: '0.9m', sst: '29.1°C' },
  { name: 'CHENNAI', lat: 13.08, lon: 80.27, x: 2961, y: 875, code: 'IN-MAA', state: 'Tamil Nadu', wave: '1.3m', sst: '28.6°C' },
  { name: 'VIZAG', lat: 17.68, lon: 83.21, x: 2994, y: 822, code: 'IN-VTZ', state: 'Andhra Pradesh', wave: '1.2m', sst: '28.4°C' },
  { name: 'PORT BLAIR', lat: 11.66, lon: 92.74, x: 3103, y: 891, code: 'IN-IXZ', state: 'Andaman & Nicobar', wave: '1.4m', sst: '29.3°C' },
  { name: 'KAVARATTI', lat: 10.57, lon: 72.64, x: 2874, y: 903, code: 'IN-KVT', state: 'Lakshadweep', wave: '0.8m', sst: '29.5°C' },
  { name: 'VERAVAL', lat: 20.90, lon: 70.37, x: 2848, y: 786, code: 'IN-VRL', state: 'Gujarat', wave: '1.0m', sst: '27.8°C' },
  { name: 'PARADIP', lat: 20.31, lon: 86.61, x: 3033, y: 793, code: 'IN-PRT', state: 'Odisha', wave: '1.2m', sst: '28.5°C' }
];

export default function OceanGlobe3D({ 
  activePort = 'MUMBAI', 
  onSelectPort,
  activeLayers = { bathymetry: true, thermal: true, sonar: true, satTrack: true }
}) {
  const mountRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const globeGroupRef = useRef(null);
  const cameraRef = useRef(null);
  const targetRotationRef = useRef({ x: 0.35, y: -1.82 });

  useEffect(() => {
    if (!activePort) return;
    const node = INDIAN_COASTAL_NODES.find(
      n => n.name.toUpperCase() === activePort.toUpperCase() || 
           n.name.toLowerCase().includes(activePort.toLowerCase())
    );
    if (node) {
      // Calculate target rotation to center the chosen Indian coastal port
      // Latitude around 9°-21°N translates to x ~ 0.28 - 0.42
      // Longitude around 70°-93°E translates to y ~ -1.68 to -2.05
      const rotX = 0.22 + (node.lat / 90) * 0.4;
      const rotY = -1.0 - (node.lon / 180) * 1.85;
      targetRotationRef.current = { x: rotX, y: rotY };
    }
  }, [activePort]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 0.45, 4.3);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Globe Group (Rotated to center Indian Subcontinent)
    const globeGroup = new THREE.Group();
    globeGroup.rotation.x = 0.35;
    globeGroup.rotation.y = -1.82;
    globeGroupRef.current = globeGroup;
    scene.add(globeGroup);

    // 3. Procedural High-Res Canvas Texture for Ocean & India Coastline
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Abyss Navy Base (#061722)
    ctx.fillStyle = '#061722';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bathymetric Depth Gradient centered on the Indian Ocean Basin
    const oceanGrad = ctx.createRadialGradient(
      canvas.width * 0.71, canvas.height * 0.54, 60,
      canvas.width * 0.71, canvas.height * 0.54, 900
    );
    oceanGrad.addColorStop(0, '#0f3647');
    oceanGrad.addColorStop(0.35, '#0a2634');
    oceanGrad.addColorStop(0.7, '#071c28');
    oceanGrad.addColorStop(1, '#04131d');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle Geospatial Navigational Grid Lines
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
    ctx.lineWidth = 1.2;
    for (let lat = 0; lat < canvas.height; lat += 128) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(canvas.width, lat);
      ctx.stroke();
    }
    for (let lon = 0; lon < canvas.width; lon += 128) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, canvas.height);
      ctx.stroke();
    }

    // Helper: Draw Coastal Polygons
    const drawLand = (points, fillColor, strokeColor, lineWidth = 2.5) => {
      if (!points.length) return;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();
      ctx.fillStyle = fillColor || '#0d222e';
      ctx.fill();
      ctx.strokeStyle = strokeColor || 'rgba(0, 212, 255, 0.55)';
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    };

    // Indian Subcontinent (Complete geometry including Kashmir, Gujarat, Malabar & Coromandel)
    const indiaPolygon = [
      [2820, 630], [2860, 610], [2940, 620], [2990, 680], [3040, 710], // North / Himalayan boundary
      [3030, 780], [2990, 830], [2980, 890], // Bengal / Odisha coast (Paradip)
      [2950, 950], [2920, 1010], [2890, 1070], // Andhra / Tamil Nadu coast (Chennai)
      [2865, 1105], // Kanyakumari / Cape Comorin southern tip
      [2850, 1070], [2835, 1000], [2810, 930], // Malabar / Kerala / Goa / Maharashtra (Mumbai)
      [2790, 870], [2760, 820], // Gujarat / Saurashtra peninsula (Veraval)
      [2740, 800], [2750, 760], [2780, 740], [2800, 680]
    ];
    drawLand(indiaPolygon, '#0d2532', '#00d4ff', 3.0);

    // Inner territorial glow around India
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.25)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Sri Lanka
    const sriLanka = [[2895, 1120], [2915, 1130], [2910, 1165], [2890, 1155]];
    drawLand(sriLanka, '#0e2634', '#00d4ff', 2.0);

    // Arabian Peninsula
    const arabia = [
      [2580, 700], [2660, 710], [2710, 750], [2680, 850],
      [2620, 900], [2570, 870], [2520, 790]
    ];
    drawLand(arabia, '#0b1d28', 'rgba(0, 212, 255, 0.25)', 1.5);

    // East Africa & Horn of Africa
    const africaEast = [
      [2520, 900], [2580, 920], [2610, 1010], [2600, 1120],
      [2550, 1260], [2490, 1370], [2440, 1420], [2400, 1360],
      [2430, 1150], [2470, 990]
    ];
    drawLand(africaEast, '#0a1922', 'rgba(0, 212, 255, 0.2)', 1.5);

    // Madagascar
    drawLand([[2620, 1280], [2650, 1310], [2630, 1400], [2600, 1370]], '#0a1922', 'rgba(0, 212, 255, 0.25)', 1.5);

    // Southeast Asia (Myanmar, Thailand, Malacca)
    const seAsia = [
      [3070, 760], [3120, 790], [3160, 870], [3150, 980],
      [3130, 1080], [3090, 1070], [3070, 970], [3040, 880]
    ];
    drawLand(seAsia, '#0c202a', 'rgba(0, 212, 255, 0.3)', 1.5);

    // Sumatra / Indonesian Archipelago
    drawLand([[3120, 1100], [3180, 1140], [3270, 1180], [3240, 1220], [3140, 1160]], '#0c202a', 'rgba(0, 212, 255, 0.3)', 1.5);

    // Lakshadweep Archipelago (Glowing Cyan Atolls in Arabian Sea)
    const lakshadweepAtolls = [
      [2825, 1025], [2828, 1045], [2832, 1065], [2830, 1085]
    ];
    lakshadweepAtolls.forEach(pt => {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Andaman & Nicobar Archipelago (Island Arc in Bay of Bengal)
    const andamanArc = [
      [3055, 960], [3058, 985], [3062, 1010], [3065, 1035], [3070, 1060], [3075, 1090]
    ];
    andamanArc.forEach(pt => {
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    // Bathymetric Mid-Ocean Ridges (Ninety East Ridge, Central Indian Ridge, Carlsberg Ridge)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.38)';
    ctx.setLineDash([8, 12]);
    ctx.lineWidth = 2.5;

    // Ninety East Ridge
    ctx.beginPath();
    ctx.moveTo(3000, 920);
    ctx.bezierCurveTo(3020, 1120, 3040, 1380, 3030, 1540);
    ctx.stroke();

    // Central Indian Ridge
    ctx.beginPath();
    ctx.moveTo(2740, 960);
    ctx.bezierCurveTo(2810, 1180, 2850, 1370, 2800, 1580);
    ctx.stroke();

    // Carlsberg Ridge
    ctx.beginPath();
    ctx.moveTo(2680, 870);
    ctx.bezierCurveTo(2710, 920, 2760, 980, 2790, 1060);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sea Surface Currents (Bay of Bengal Gyre & Arabian Sea Currents)
    ctx.strokeStyle = 'rgba(212, 231, 226, 0.32)';
    ctx.lineWidth = 2;
    const flows = [
      [[2970, 900], [2990, 950], [2970, 1030], [2920, 1050]],
      [[3020, 850], [3040, 930], [3020, 1020], [2960, 1070]],
      [[2800, 830], [2820, 930], [2840, 1030], [2870, 1120]]
    ];
    flows.forEach(curve => {
      ctx.beginPath();
      ctx.moveTo(curve[0][0], curve[0][1]);
      for (let i = 1; i < curve.length; i++) {
        ctx.lineTo(curve[i][0], curve[i][1]);
      }
      ctx.stroke();
    });

    // Coastal Port Beacons on Canvas
    INDIAN_COASTAL_NODES.forEach(port => {
      // Glow circle
      ctx.fillStyle = '#00d4ff';
      ctx.beginPath();
      ctx.arc(port.x, port.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(port.x, port.y, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#F1EFE8';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(port.name, port.x + 24, port.y + 6);

      ctx.fillStyle = '#00d4ff';
      ctx.font = '14px monospace';
      ctx.fillText(port.code, port.x + 24, port.y + 24);
    });

    const earthTexture = new THREE.CanvasTexture(canvas);
    earthTexture.anisotropy = 8;

    // 4. Globe Sphere Mesh
    const sphereGeo = new THREE.SphereGeometry(1.68, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.82,
      metalness: 0.14
    });
    const earthMesh = new THREE.Mesh(sphereGeo, sphereMat);
    globeGroup.add(earthMesh);

    // 5. Atmospheric Halo (Electric Cyan Fresnel)
    const atmosGeo = new THREE.SphereGeometry(1.725, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          float edge = dot(viewDir, vNormal);
          float intensity = pow(1.0 - abs(edge), 2.8) * 0.9;
          vec3 atmosColor = vec3(0.0, 0.83, 1.0);
          gl_FragColor = vec4(atmosColor, intensity);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    globeGroup.add(atmosMesh);

    // 6. ISRO Satellite Orbit 1: Oceansat-3 (EOS-06 Polar Sun-Synchronous)
    const orbitCurve1 = new THREE.EllipseCurve(0, 0, 2.05, 2.05, 0, 2 * Math.PI, false, 0);
    const pts1 = orbitCurve1.getPoints(120);
    const orbitGeo1 = new THREE.BufferGeometry().setFromPoints(pts1.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const orbitMat1 = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.45 });
    const orbitMesh1 = new THREE.Line(orbitGeo1, orbitMat1);
    orbitMesh1.rotation.x = Math.PI / 2.35;
    orbitMesh1.rotation.z = Math.PI / 4.5;
    globeGroup.add(orbitMesh1);

    const satMesh1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.024, 0.035),
      new THREE.MeshBasicMaterial({ color: 0x00f0ff })
    );
    globeGroup.add(satMesh1);

    // ISRO Satellite Orbit 2: INSAT-3DR (Geostationary Telemetry Track)
    const orbitCurve2 = new THREE.EllipseCurve(0, 0, 2.32, 2.32, 0, 2 * Math.PI, false, 0);
    const pts2 = orbitCurve2.getPoints(140);
    const orbitGeo2 = new THREE.BufferGeometry().setFromPoints(pts2.map(p => new THREE.Vector3(p.x, 0, p.y)));
    const orbitMat2 = new THREE.LineDashedMaterial({
      color: 0xe6a448,
      dashSize: 0.08,
      gapSize: 0.04,
      transparent: true,
      opacity: 0.55
    });
    const orbitMesh2 = new THREE.Line(orbitGeo2, orbitMat2);
    orbitMesh2.computeLineDistances();
    orbitMesh2.rotation.x = Math.PI / 1.85;
    orbitMesh2.rotation.y = -Math.PI / 6.2;
    globeGroup.add(orbitMesh2);

    const satMesh2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe6a448 })
    );
    globeGroup.add(satMesh2);

    // 7. Floating Oceanographic Node Particle Cloud
    const pCount = 280;
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / pCount);
      const theta = Math.sqrt(pCount * Math.PI) * phi;
      const r = 1.76 + Math.random() * 0.35;
      pPositions[i * 3] = r * Math.cos(theta) * Math.sin(phi);
      pPositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      pPositions[i * 3 + 2] = r * Math.cos(phi);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00d4ff,
      size: 0.022,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const pSystem = new THREE.Points(pGeo, pMat);
    globeGroup.add(pSystem);

    // 8. Cinematic Lighting
    const keyLight = new THREE.DirectionalLight(0xd4e7e2, 1.85);
    keyLight.position.set(4, 3.5, 4);
    scene.add(keyLight);

    const ambientLight = new THREE.AmbientLight(0x071d29, 0.95);
    scene.add(ambientLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 1.3);
    rimLight.position.set(-4.5, -2, -3.5);
    scene.add(rimLight);

    // 9. Interactive Drag to Rotate & Parallax Handling
    let mouseX = 0;
    let mouseY = 0;
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const currX = ((e.clientX - rect.left) / width) * 2 - 1;
      const currY = -(((e.clientY - rect.top) / height) * 2 - 1);

      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        globeGroup.rotation.y += deltaX * 0.005;
        globeGroup.rotation.x += deltaY * 0.005;
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      } else {
        mouseX = currX;
        mouseY = currY;
      }
    };

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY * 0.002;
      camera.position.z = Math.min(Math.max(camera.position.z + zoomFactor, 2.3), 6.5);
    };

    const onGlobeZoomIn = () => {
      camera.position.z = Math.max(camera.position.z - 0.5, 2.3);
    };
    const onGlobeZoomOut = () => {
      camera.position.z = Math.min(camera.position.z + 0.5, 6.5);
    };
    const onGlobeReset = () => {
      camera.position.set(0, 0.45, 4.3);
      globeGroup.rotation.x = 0.35;
      globeGroup.rotation.y = -1.82;
      targetRotationRef.current = { x: 0.35, y: -1.82 };
    };

    window.addEventListener('orca-globe-zoom-in', onGlobeZoomIn);
    window.addEventListener('orca-globe-zoom-out', onGlobeZoomOut);
    window.addEventListener('orca-globe-reset', onGlobeReset);

    const domElement = renderer.domElement;
    domElement.addEventListener('mousemove', onMouseMove);
    domElement.addEventListener('mousedown', onMouseDown);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('mouseup', onMouseUp);

    // Resize Handler
    const onResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 10. Animation Loop
    let clock = new THREE.Clock();
    let satAngle1 = 0;
    let satAngle2 = 0;
    let reqId = null;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = clock.getDelta();

      // Slow planetary drift or smooth rotation to active port
      if (!isDragging) {
        if (targetRotationRef.current) {
          globeGroup.rotation.x += (targetRotationRef.current.x - globeGroup.rotation.x) * 0.04;
          globeGroup.rotation.y += (targetRotationRef.current.y - globeGroup.rotation.y) * 0.04;
        } else {
          globeGroup.rotation.y += 0.0006;
        }
      }

      // Parallax Sway
      camera.position.x += (mouseX * 0.25 - camera.position.x) * 0.04;
      camera.position.y += (0.45 + mouseY * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Satellite Orbits
      if (activeLayers?.satTrack !== false) {
        satAngle1 += dt * 0.65;
        satMesh1.position.set(
          Math.cos(satAngle1) * 2.05,
          Math.sin(satAngle1) * 0.4,
          Math.sin(satAngle1) * 2.05
        );

        satAngle2 += dt * 0.42;
        satMesh2.position.set(
          Math.sin(satAngle2) * 2.32,
          Math.cos(satAngle2) * 0.6,
          Math.cos(satAngle2) * 2.32
        );
      }

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup on Unmount
    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('orca-globe-zoom-in', onGlobeZoomIn);
      window.removeEventListener('orca-globe-zoom-out', onGlobeZoomOut);
      window.removeEventListener('orca-globe-reset', onGlobeReset);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('resize', onResize);
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      sphereGeo.dispose();
      sphereMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      earthTexture.dispose();
      orbitGeo1.dispose();
      orbitMat1.dispose();
      orbitGeo2.dispose();
      orbitMat2.dispose();
      pGeo.dispose();
      pMat.dispose();
    };
  }, []);

  return (
    <div className="ocean-globe-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%', cursor: 'grab' }} />
      {/* Floating Indian Ocean Basin Technical Overlay */}
      <div className="ocean-globe-hud-overlay pointer-events-none">
        <div className="basin-crosshair top-left"></div>
        <div className="basin-crosshair top-right"></div>
        <div className="basin-crosshair bottom-left"></div>
        <div className="basin-crosshair bottom-right"></div>
        
        <div className="basin-tag">
          <span className="dot pulse"></span>
          <span>INDIAN OCEAN BASIN · ARABIAN SEA &amp; BAY OF BENGAL</span>
        </div>
      </div>
    </div>
  );
}
