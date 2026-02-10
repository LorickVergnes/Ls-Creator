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
  { name: 'Lunar Mist', value: '#B3B3B3' },
  { name: 'Sideral Dust', value: '#555556' },
  { name: 'Violet Plasma', value: '#5A2958' },
  { name: 'Viridian Aurora', value: '#457954' },
  { name: 'Yggdrasil Mantle', value: '#5E4731' },
  { name: 'Aluminium', value: '#eceae7' },
];

const ColorControl = ({ label, color, finish, onChangeColor, onChangeFinish }) => {
  // Sécurité : s'assurer que color est une chaîne
  const safeColor = Array.isArray(color) ? color[0] : (color || '');
  const currentPreset = COLOR_PRESETS.find((p) => p.value.toLowerCase() === safeColor.toLowerCase());
  const isAluminium = safeColor.toLowerCase() === '#eceae7';
  const isMatte = finish === 'matte' && !isAluminium;
  
  return (
    <div className="color-control-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{label}</label>
        {/* Toggle Finition */}
        {onChangeFinish && (
          <label style={{ 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            cursor: isAluminium ? 'not-allowed' : 'pointer', 
            color: isAluminium ? '#555' : (isMatte ? '#aaa' : '#fff'),
            opacity: isAluminium ? 0.6 : 1
          }}>
            <input 
              type="checkbox" 
              checked={isMatte} 
              disabled={isAluminium}
              onChange={(e) => onChangeFinish(e.target.checked ? 'matte' : 'metal')}
              style={{ width: '14px', height: '14px', marginRight: '4px', accentColor: '#555' }}
            />
            Mat
          </label>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <select 
          value={currentPreset ? currentPreset.value : 'custom'} 
          onChange={(e) => { if (e.target.value !== 'custom') onChangeColor(e.target.value); }}
          style={{ flex: 1 }}
        >
          {COLOR_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.value}>{preset.name}</option>
          ))}
          {!currentPreset && <option value="custom">Perso...</option>}
        </select>
        <input type="color" value={safeColor} onChange={(e) => onChangeColor(e.target.value)} />
      </div>
    </div>
  );
};

function App() {
  const canvasRef = useRef();

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('ls-config');
    const initial = saved ? JSON.parse(saved) : {};
    
    // Helper pour s'assurer qu'une couleur est bien une chaîne (nettoyage si reste de l'ancienne version)
    const ensureString = (c, fallback) => {
      if (Array.isArray(c)) return c[0];
      if (typeof c === 'string') return c;
      return fallback;
    };

    // Valeurs par défaut robustes (si localStorage partiel)
    return {
      showRingTop: initial.showRingTop ?? true,
      showRingBottom: initial.showRingBottom ?? true,
      orientation: initial.orientation || 'vertical',
      colors: {
        global: ensureString(initial.colors?.global, '#c5c5c5'),
        emitter: ensureString(initial.colors?.emitter, '#c5c5c5'),
        ringTop: ensureString(initial.colors?.ringTop, '#6b2624'),
        body: ensureString(initial.colors?.body, '#c5c5c5'),
        ringBottom: ensureString(initial.colors?.ringBottom, '#6b2624'),
        pommel: ensureString(initial.colors?.pommel, '#c5c5c5'),
      },
      finishes: {
        // 'metal' par défaut
        global: initial.finishes?.global || 'metal',
        emitter: initial.finishes?.emitter || 'metal',
        ringTop: initial.finishes?.ringTop || 'metal',
        body: initial.finishes?.body || 'metal',
        ringBottom: initial.finishes?.ringBottom || 'metal',
        pommel: initial.finishes?.pommel || 'metal',
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('ls-config', JSON.stringify(config));
  }, [config]);

  const handleColorChange = (part, color) => {
    setConfig((prev) => {
      const newColors = { ...prev.colors };
      const newFinishes = { ...prev.finishes };
      const isAluminium = color.toLowerCase() === '#eceae7';

      if (part === 'global') {
        Object.keys(newColors).forEach(k => {
          newColors[k] = color;
          if (isAluminium) newFinishes[k] = 'metal';
        });
      } else {
        newColors[part] = color;
        if (isAluminium) newFinishes[part] = 'metal';
      }
      return { ...prev, colors: newColors, finishes: newFinishes };
    });
  };

  const handleFinishChange = (part, finish) => {
    setConfig((prev) => {
      const newFinishes = { ...prev.finishes };
      if (part === 'global') {
        Object.keys(newFinishes).forEach(k => newFinishes[k] = finish);
      } else {
        newFinishes[part] = finish;
      }
      return { ...prev, finishes: newFinishes };
    });
  };

  const toggleRing = (ring) => {
    setConfig((prev) => ({ ...prev, [ring]: !prev[ring] }));
  };

  const setOrientation = (orientation) => {
    setConfig((prev) => ({ ...prev, orientation }));
  };

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
          <h3>Couleurs & Finitions</h3>
          
          <ColorControl 
            label="Globale (Tout)" 
            color={config.colors.global} 
            finish={config.finishes.global}
            onChangeColor={(c) => handleColorChange('global', c)} 
            onChangeFinish={(f) => handleFinishChange('global', f)}
          />
          
          <hr style={{ margin: '20px 0', borderColor: '#444' }} />
          
          <ColorControl 
            label="Émetteur" 
            color={config.colors.emitter} 
            finish={config.finishes.emitter}
            onChangeColor={(c) => handleColorChange('emitter', c)} 
            onChangeFinish={(f) => handleFinishChange('emitter', f)}
          />

          {config.showRingTop && (
            <ColorControl 
              label="Anneau Haut" 
              color={config.colors.ringTop} 
              finish={config.finishes.ringTop}
              onChangeColor={(c) => handleColorChange('ringTop', c)} 
              onChangeFinish={(f) => handleFinishChange('ringTop', f)}
            />
          )}

          <ColorControl 
            label="Corps" 
            color={config.colors.body} 
            finish={config.finishes.body}
            onChangeColor={(c) => handleColorChange('body', c)} 
            onChangeFinish={(f) => handleFinishChange('body', f)}
          />

          {config.showRingBottom && (
            <ColorControl 
              label="Anneau Bas" 
              color={config.colors.ringBottom} 
              finish={config.finishes.ringBottom}
              onChangeColor={(c) => handleColorChange('ringBottom', c)} 
              onChangeFinish={(f) => handleFinishChange('ringBottom', f)}
            />
          )}

          <ColorControl 
            label="Pommeau" 
            color={config.colors.pommel} 
            finish={config.finishes.pommel}
            onChangeColor={(c) => handleColorChange('pommel', c)} 
            onChangeFinish={(f) => handleFinishChange('pommel', f)}
          />
        </div>

        <button className="screenshot-btn" onClick={takeScreenshot}>
          📸 Capturer l'image
        </button>
      </div>

      <div className="canvas-container">
        <Canvas 
          shadows 
          gl={{ preserveDrawingBuffer: true }}
          onCreated={({ gl }) => { canvasRef.current = gl.domElement }}
          camera={{ position: [350, 350, 350], fov: 50, far: 10000 }}
        >
          <Suspense fallback={null}>
            <Stage environment="warehouse" intensity={0.5} adjustCamera={false}>
              <Lightsaber config={config} />
            </Stage>
            
            <directionalLight position={[300, 300, 300]} intensity={2} color="#fff" castShadow />
            <directionalLight position={[-300, 0, 300]} intensity={0.8} color="#dbeeff" />
            <spotLight position={[0, 500, -500]} intensity={5} color="#ffffff" angle={0.5} penumbra={1} />
            <pointLight position={[-200, -200, -200]} intensity={0.5} color="#4488ff" />

            <OrbitControls makeDefault minDistance={100} maxDistance={2000} enablePan={true} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default App;
