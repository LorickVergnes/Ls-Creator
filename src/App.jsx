import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import Lightsaber from './components/Lightsaber';
import './App.css';

// ------------------------------------------------------------------
// LISTE DES COULEURS OFFICIELLES
// ------------------------------------------------------------------
const COLOR_PRESETS = [
  { name: 'Blood Moon', value: '#6b2624' },
  { name: 'Cobalt Nebula', value: '#2c3f83' },
  { name: 'Dark Matter', value: '#272728' },
  { name: 'Lunar Mist', value: '#c5c5c5' },
  { name: 'Sideral Dust', value: '#555556' },
  { name: 'Violet Plasma', value: '#723470' },
  { name: 'Viridian Aurora', value: '#63a878' },
  { name: 'Yggdrasil Mantle', value: '#72583e' },
  { name: 'Aluminium', value: '#eceae7' },
];

const ColorControl = ({ label, color, onChange }) => {
  const currentPreset = COLOR_PRESETS.find((p) => p.value.toLowerCase() === color.toLowerCase());
  
  return (
    <div className="color-control-wrapper">
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        <select 
          value={currentPreset ? currentPreset.value : 'custom'} 
          onChange={(e) => { if (e.target.value !== 'custom') onChange(e.target.value); }}
          style={{ flex: 1 }}
        >
          {COLOR_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.value}>{preset.name}</option>
          ))}
          {!currentPreset && <option value="custom">Perso...</option>}
        </select>
        <input type="color" value={color} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
};

function App() {
  const canvasRef = useRef();

  // Initialisation de l'état avec LocalStorage
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('ls-config');
    const initial = saved ? JSON.parse(saved) : {
      showRingTop: true,    
      showRingBottom: true,
      orientation: 'vertical', // Valeur par défaut
      colors: {
        global: '#c5c5c5',
        emitter: '#c5c5c5',
        ringTop: '#6b2624',
        body: '#c5c5c5',
        ringBottom: '#6b2624',
        pommel: '#c5c5c5',
      },
    };
    // S'assure que orientation existe si on charge une vieille config
    if (!initial.orientation) initial.orientation = 'vertical';
    return initial;
  });

  // Sauvegarde automatique
  useEffect(() => {
    localStorage.setItem('ls-config', JSON.stringify(config));
  }, [config]);

  const handleColorChange = (part, color) => {
    setConfig((prev) => {
      const newColors = { ...prev.colors };
      if (part === 'global') {
        Object.keys(newColors).forEach(k => newColors[k] = color);
      } else {
        newColors[part] = color;
      }
      return { ...prev, colors: newColors };
    });
  };

  const toggleRing = (ring) => {
    setConfig((prev) => ({ ...prev, [ring]: !prev[ring] }));
  };

  const setOrientation = (orientation) => {
    setConfig((prev) => ({ ...prev, orientation }));
  };

  // Fonction pour capturer l'écran
  const takeScreenshot = () => {
    const link = document.createElement('a');
    link.setAttribute('download', 'my-lightsaber.png');
    link.setAttribute('href', canvasRef.current.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    link.click();
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1>LS Creator</h1>
        
        <div className="control-group">
          <h3>Position</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <button 
              onClick={() => setOrientation('vertical')}
              style={{ 
                flex: 1, 
                padding: '8px', 
                background: config.orientation === 'vertical' ? '#6b2624' : '#333',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: config.orientation === 'vertical' ? 'bold' : 'normal'
              }}
            >
              Verticale
            </button>
            <button 
              onClick={() => setOrientation('horizontal')}
              style={{ 
                flex: 1, 
                padding: '8px', 
                background: config.orientation === 'horizontal' ? '#6b2624' : '#333',
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                fontWeight: config.orientation === 'horizontal' ? 'bold' : 'normal'
              }}
            >
              Horizontale
            </button>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
            🖱️ Clic gauche : Tourner • Clic droit : Déplacer
          </p>
        </div>

        <div className="control-group">
          <h3>Structure</h3>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.showRingTop} onChange={() => toggleRing('showRingTop')} /> 
            <span style={{ marginLeft: '10px' }}>Anneau Haut</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.showRingBottom} onChange={() => toggleRing('showRingBottom')} /> 
            <span style={{ marginLeft: '10px' }}>Anneau Bas</span>
          </label>
        </div>

        <div className="control-group">
          <h3>Couleurs</h3>
          <ColorControl label="Globale (Tout)" color={config.colors.global} onChange={(c) => handleColorChange('global', c)} />
          <hr style={{ margin: '20px 0', borderColor: '#444' }} />
          <ColorControl label="Émetteur" color={config.colors.emitter} onChange={(c) => handleColorChange('emitter', c)} />
          {config.showRingTop && <ColorControl label="Anneau Haut" color={config.colors.ringTop} onChange={(c) => handleColorChange('ringTop', c)} />}
          <ColorControl label="Corps" color={config.colors.body} onChange={(c) => handleColorChange('body', c)} />
          {config.showRingBottom && <ColorControl label="Anneau Bas" color={config.colors.ringBottom} onChange={(c) => handleColorChange('ringBottom', c)} />}
          <ColorControl label="Pommeau" color={config.colors.pommel} onChange={(c) => handleColorChange('pommel', c)} />
        </div>

        <button className="screenshot-btn" onClick={takeScreenshot}>
          📸 Capturer l'image
        </button>
      </div>

      <div className="canvas-container">
        <Canvas 
          shadows 
          gl={{ preserveDrawingBuffer: true }} // Requis pour la capture d'écran
          onCreated={({ gl }) => { canvasRef.current = gl.domElement }}
          camera={{ position: [350, 350, 350], fov: 50, far: 10000 }}
        >
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.6} adjustCamera={false}>
              <Lightsaber config={config} />
            </Stage>
            {/* enablePan permet de déplacer l'objet avec le clic droit */}
            <OrbitControls makeDefault minDistance={100} maxDistance={2000} enablePan={true} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default App;
