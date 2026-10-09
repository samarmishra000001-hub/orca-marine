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
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: '#F1EFE8', fontFamily: "'Plus Jakarta Sans', sans-serif"
        }}>
          <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '0.1em', fontWeight: 700 }}>ORCA</h1>
          <p style={{ color: '#9DB4BE', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.8rem', marginTop: '0.5rem' }}>Marine Intelligence</p>
          <p style={{ color: '#D4E7E2', fontSize: '0.95rem', marginTop: '1.5rem', fontWeight: 400 }}>Understanding the ocean. Supporting coastal decisions.</p>
          <button
            onClick={this.props.onFinish}
            style={{
              marginTop: '2rem', padding: '14px 36px', background: '#F1EFE8', color: '#071D29',
              border: 'none', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              fontFamily: "'Plus Jakarta Sans', sans-serif"
            }}
          >
            Enter the Observatory
          </button>
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
      earthRef.current.rotation.y += 0.003;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <Sphere ref={earthRef} args={[2, 64, 64]} scale={1}>
        <MeshDistortMaterial
          color="#123B49"
          emissive="#071D29"
          emissiveIntensity={0.4}
          distort={0.08}
          speed={1.5}
          roughness={0.8}
          metalness={0.3}
          wireframe={false}
        />
      </Sphere>
      {/* Atmosphere glow ring */}
      <Sphere args={[2.06, 64, 64]} scale={1}>
        <meshBasicMaterial color="#D4E7E2" transparent opacity={0.06} />
      </Sphere>
    </Float>
  );
}

const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function CinematicScene({ onFinish }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    requestAnimationFrame(() => setOpacity(1));
    if (reduceMotion) {
      // Skip animation entirely for reduced-motion users
      return;
    }
    const timer = setTimeout(() => {
      onFinish();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999,
      background: '#071D29',
      opacity: opacity,
      transition: 'opacity 0.8s ease-in'
    }}>
      <WebGLErrorBoundary onFinish={onFinish}>
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} fallback={<div>WebGL not supported.</div>}>
          <ambientLight intensity={0.4} color="#D4E7E2" />
          <directionalLight position={[10, 10, 5]} intensity={1.2} color="#F1EFE8" />
          <directionalLight position={[-10, -10, -5]} color="#123B49" intensity={0.4} />
          <Suspense fallback={null}>
            <Earth />
          </Suspense>
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} />
        </Canvas>
      </WebGLErrorBoundary>

      {/* Overlay Text */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
        zIndex: 10000
      }}>
        <div style={{ fontSize: '0.75rem', color: '#9DB4BE', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          ISRO SIH26176
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 700, color: '#F1EFE8',
          letterSpacing: '0.08em', margin: 0, textAlign: 'center'
        }}>
          ORCA
        </h1>
        <div style={{
          fontSize: '0.8rem', color: '#D4E7E2', letterSpacing: '0.15em', textTransform: 'uppercase',
          marginTop: '0.3rem', fontWeight: 500
        }}>
          Marine Intelligence
        </div>
        <div style={{
          width: '60px', height: '1px', background: '#E6A448', margin: '1.5rem 0', opacity: 0.7
        }} />
        <p style={{
          fontSize: 'clamp(0.85rem, 1.5vw, 1rem)', color: '#9DB4BE', fontWeight: 400,
          maxWidth: '400px', textAlign: 'center', lineHeight: 1.6
        }}>
          Understanding the ocean. Supporting coastal decisions.
        </p>
      </div>

      {/* Bottom Buttons */}
      <div style={{
        position: 'absolute', bottom: '10%', left: 0, width: '100%',
        display: 'flex', justifyContent: 'center', gap: '16px', zIndex: 10001
      }}>
        <button
          onClick={onFinish}
          style={{
            padding: '14px 32px', background: '#F1EFE8', color: '#071D29',
            border: 'none', borderRadius: '9999px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => { e.target.style.transform = 'scale(1.03)'; }}
          onMouseOut={(e) => { e.target.style.transform = 'scale(1)'; }}
        >
          Enter the Observatory
        </button>
        <button
          onClick={onFinish}
          style={{
            padding: '14px 24px', background: 'transparent',
            border: '1px solid rgba(212, 231, 226, 0.25)', color: '#9DB4BE',
            borderRadius: '9999px', cursor: 'pointer',
            fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'border-color 0.2s'
          }}
          onMouseOver={(e) => { e.target.style.borderColor = 'rgba(212, 231, 226, 0.5)'; }}
          onMouseOut={(e) => { e.target.style.borderColor = 'rgba(212, 231, 226, 0.25)'; }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

export default CinematicScene;
