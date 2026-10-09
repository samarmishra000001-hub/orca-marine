import React, { Suspense, useRef, useState, useEffect, Component } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Text, Float } from '@react-three/drei';

class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#e0f2fe' }}>
          <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '2px' }}>ORCA</h1>
          <p style={{ color: '#7dd3fc', letterSpacing: '1px' }}>Marine Intelligence Assistant</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function Earth() {
  const earthRef = useRef();

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.005;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere ref={earthRef} args={[2, 64, 64]} scale={1}>
        <MeshDistortMaterial
          color="#0ea5e9"
          emissive="#0369a1"
          emissiveIntensity={0.2}
          distort={0.1}
          speed={2}
          roughness={0.7}
          metalness={0.2}
          wireframe={true}
        />
      </Sphere>
    </Float>
  );
}

function CinematicScene({ onFinish }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 7000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999, background: '#020617' }}>
      <WebGLErrorBoundary>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} fallback={<div>WebGL not supported.</div>}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <directionalLight position={[-10, -10, -5]} color="#0ea5e9" intensity={0.5} />
          <Suspense fallback={null}>
            <Earth />
            <Text
              position={[0, 0, 2.5]}
              fontSize={0.4}
              color="#e0f2fe"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              ORCA
            </Text>
            <Text
              position={[0, -0.4, 2.5]}
              fontSize={0.15}
              color="#7dd3fc"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf"
            >
              Marine Intelligence Assistant
            </Text>
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </WebGLErrorBoundary>
      <div style={{ position: 'absolute', bottom: '10%', left: '0', width: '100%', display: 'flex', justifyContent: 'center', gap: '20px', zIndex: 10000 }}>
        <button
          onClick={onFinish}
          style={{
            padding: '10px 24px',
            background: 'rgba(14, 165, 233, 0.2)',
            border: '1px solid rgba(14, 165, 233, 0.5)',
            color: '#e0f2fe',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(14, 165, 233, 0.4)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(14, 165, 233, 0.2)'}
        >
          Open ocean console
        </button>
        <button
          onClick={onFinish}
          style={{
            padding: '10px 24px',
            background: 'transparent',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            color: '#94a3b8',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(148, 163, 184, 0.1)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

export default CinematicScene;
