import React, { Component } from 'react';
import CinematicExperience from './cinematic/CinematicExperience';

class CinematicErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', width: '100vw', background: '#071D29', color: '#F1EFE8',
          fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '24px', textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '0.08em', fontWeight: 700 }}>ORCA</h1>
          <p style={{ color: '#00d4ff', letterSpacing: '0.12em', textTransform: 'uppercase', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            Marine Intelligence Command Centre
          </p>
          <p style={{ color: '#9DB4BE', fontSize: '0.95rem', marginTop: '1.2rem', maxWidth: '440px', lineHeight: 1.6 }}>
            From changing sea conditions to clearer marine decisions, ORCA brings ocean intelligence into focus.
          </p>
          <button
            onClick={this.props.onFinish}
            style={{
              marginTop: '2rem', padding: '14px 36px', background: '#00d4ff', color: '#071D29',
              border: 'none', borderRadius: '9999px', cursor: 'pointer', fontSize: '0.85rem',
              fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)'
            }}
          >
            Enter Marine Command Centre
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function IntroScene({ onFinish }) {
  return (
    <CinematicErrorBoundary onFinish={onFinish}>
      <CinematicExperience onFinish={onFinish} />
    </CinematicErrorBoundary>
  );
}
