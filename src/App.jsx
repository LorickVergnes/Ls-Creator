import React, { useState, useEffect, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage } from '@react-three/drei';
import clarity from '@microsoft/clarity';
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

// ------------------------------------------------------------------
// LISTE DES MODÈLES DISPONIBLES
// ------------------------------------------------------------------
const PART_MODELS = {
  pommel: [
    { name: 'Polaris Evo', url: 'models/Polaris_Evo_Pommel_Fixed.glb', height: 46 },
  ],
  ring: [
    { name: 'Anneau Evo', url: 'models/ring_v1.glb', height: 10 },
  ],
  body: [
    { name: 'Polaris Evo', url: 'models/body_v1.glb', height: 180 },
    { name: 'Polaris Evo Mini', url: 'models/Polaris_Evo_Mini_Body_Fixed.glb', height: 150 },
  ],
  emitter: [
    { name: 'Polaris Evo', url: 'models/Polaris_Evo_Emitter_Fixed.glb', height: 34 },
  ],
  blade: [
    { name: 'Lame Longue', url: 'models/blade_long_v1.glb', height: 870 },
    { name: 'Lame Moyenne', url: 'models/blade_medium_v1.glb', height: 730 },
    { name: 'Lame Courte', url: 'models/blade_short_v1.glb', height: 600 },
  ]
};

// ------------------------------------------------------------------
// CONTRAINTES DE TAILLE (mm)
// ------------------------------------------------------------------
const WEAPON_CONSTRAINTS = {
  saber: { min: 258, max: 322, label: 'Sabre Long' },
  daggers: { min: 178, max: 252, label: 'Dague' },
  staff: { min: 358, max: 542, label: 'Bâton' },
};

const ColorControl = ({ label, color, finish, onChangeColor, onChangeFinish, models, currentModel, onChangeModel }) => {
  const safeColor = Array.isArray(color) ? color[0] : (color || '');
  const isAluminium = safeColor.toLowerCase() === '#eceae7';
  const isMatte = finish === 'matte' && !isAluminium;
  
  return (
    <div className="color-control-wrapper">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--accent-secondary)', fontFamily: 'var(--font-display)', letterSpacing: '1px' }}>{label}</label>
        
        {onChangeFinish && (
          <div 
            className={`finish-toggle ${isMatte ? 'matte' : 'metal'} ${isAluminium ? 'disabled' : ''}`}
            onClick={() => !isAluminium && onChangeFinish(isMatte ? 'metal' : 'matte')}
            title={isAluminium ? "L'aluminium doit rester métallique" : "Changer la finition"}
          >
            <div className="finish-slider" />
            <div className={`finish-option ${!isMatte ? 'active' : ''}`}>Métal</div>
            <div className={`finish-option ${isMatte ? 'active' : ''}`}>Mat</div>
          </div>
        )}
      </div>

      {models && (
        <select 
          value={currentModel} 
          onChange={(e) => onChangeModel(e.target.value)}
          className="sci-fi-select"
          style={{ marginBottom: '12px' }}
        >
          {models.map((m) => (
            <option key={m.url} value={m.url}>{m.name}</option>
          ))}
        </select>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <select 
          className="sci-fi-select"
          value={COLOR_PRESETS.find((p) => p.value.toLowerCase() === safeColor.toLowerCase())?.value || 'custom'} 
          onChange={(e) => { if (e.target.value !== 'custom') onChangeColor(e.target.value); }}
          style={{ flex: 1 }}
        >
          {COLOR_PRESETS.map((preset) => (
            <option key={preset.name} value={preset.value}>{preset.name}</option>
          ))}
          {!COLOR_PRESETS.find((p) => p.value.toLowerCase() === safeColor.toLowerCase()) && <option value="custom">Couleur Perso</option>}
        </select>
        
        <div className="custom-color-trigger" style={{ backgroundColor: safeColor }}>
          <input 
            type="color" 
            value={safeColor} 
            onChange={(e) => onChangeColor(e.target.value)} 
          />
        </div>
      </div>
    </div>
  );
};

function App() {
  const canvasRef = useRef();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Initialisation de Microsoft Clarity
    clarity.init("vf5t992rjs");
  }, []);

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('ls-config');
    const initial = saved ? JSON.parse(saved) : {};
    
    const ensureString = (c, fallback) => {
      if (Array.isArray(c)) return c[0];
      if (typeof c === 'string') return c;
      return fallback;
    };

    const defaultColors = {
      global: '#eceae7',
      emitter: '#eceae7',
      ringTop: '#eceae7',
      body: '#eceae7',
      ringBottom: '#eceae7',
      pommel: '#eceae7',
      blade: '#6b2624', // Rouge par défaut pour la lame
    };

    const defaultFinishes = {
      global: 'metal',
      emitter: 'metal',
      ringTop: 'metal',
      body: 'metal',
      ringBottom: 'metal',
      pommel: 'metal',
    };

    const defaultModels = {
      emitter: 'models/Polaris_Evo_Emitter_Fixed.glb',
      ringTop: 'models/ring_v1.glb',
      body: 'models/body_v1.glb',
      ringBottom: 'models/ring_v1.glb',
      pommel: 'models/Polaris_Evo_Pommel_Fixed.glb',
      blade: 'models/blade_long_v1.glb',
    };

    return {
      weaponType: initial.weaponType || 'saber', // 'saber', 'daggers', 'staff'
      showBlade: initial.showBlade ?? false,
      orientation: initial.orientation || 'vertical',
      saber1: {
        showRingTop: initial.saber1?.showRingTop ?? initial.showRingTop ?? true,
        showRingBottom: initial.saber1?.showRingBottom ?? initial.showRingBottom ?? true,
        colors: {
          global: ensureString(initial.saber1?.colors?.global || initial.colors?.global, defaultColors.global),
          emitter: ensureString(initial.saber1?.colors?.emitter || initial.colors?.emitter, defaultColors.emitter),
          ringTop: ensureString(initial.saber1?.colors?.ringTop || initial.colors?.ringTop, defaultColors.ringTop),
          body: ensureString(initial.saber1?.colors?.body || initial.colors?.body, defaultColors.body),
          ringBottom: ensureString(initial.saber1?.colors?.ringBottom || initial.colors?.ringBottom, defaultColors.ringBottom),
          pommel: ensureString(initial.saber1?.colors?.pommel || initial.colors?.pommel, defaultColors.pommel),
          blade: ensureString(initial.saber1?.colors?.blade || initial.colors?.blade, defaultColors.blade),
        },
        finishes: {
          global: initial.saber1?.finishes?.global || initial.finishes?.global || defaultFinishes.global,
          emitter: initial.saber1?.finishes?.emitter || initial.finishes?.emitter || defaultFinishes.emitter,
          ringTop: initial.saber1?.finishes?.ringTop || initial.finishes?.ringTop || defaultFinishes.ringTop,
          body: initial.saber1?.finishes?.body || initial.finishes?.body || defaultFinishes.body,
          ringBottom: initial.saber1?.finishes?.ringBottom || initial.finishes?.ringBottom || defaultFinishes.ringBottom,
          pommel: initial.saber1?.finishes?.pommel || initial.finishes?.pommel || defaultFinishes.pommel,
        },
        models: {
          emitter: initial.saber1?.models?.emitter || defaultModels.emitter,
          ringTop: initial.saber1?.models?.ringTop || defaultModels.ringTop,
          body: initial.saber1?.models?.body || defaultModels.body,
          ringBottom: initial.saber1?.models?.ringBottom || defaultModels.ringBottom,
          pommel: initial.saber1?.models?.pommel || defaultModels.pommel,
          blade: initial.saber1?.models?.blade || defaultModels.blade,
        }
      },
      saber2: {
        showRingTop: initial.saber2?.showRingTop ?? initial.showRingTop ?? true,
        showRingBottom: initial.saber2?.showRingBottom ?? initial.showRingBottom ?? true,
        colors: { ...defaultColors },
        finishes: { ...defaultFinishes },
        models: { ...defaultModels }
      }
    };
  });

  useEffect(() => {
    localStorage.setItem('ls-config', JSON.stringify(config));
  }, [config]);

  const handleColorChange = (saberKey, part, color) => {
    setConfig((prev) => {
      const newSaber = { ...prev[saberKey] };
      const newColors = { ...newSaber.colors };
      const newFinishes = { ...newSaber.finishes };
      const isAluminium = color.toLowerCase() === '#eceae7';

      if (part === 'global') {
        Object.keys(newColors).forEach(k => {
          newColors[k] = color;
          if (isAluminium && k !== 'blade') newFinishes[k] = 'metal';
        });
      } else {
        newColors[part] = color;
        if (isAluminium && part !== 'blade') newFinishes[part] = 'metal';
      }

      return { 
        ...prev, 
        [saberKey]: { ...newSaber, colors: newColors, finishes: newFinishes } 
      };
    });
  };

  const handleFinishChange = (saberKey, part, finish) => {
    setConfig((prev) => {
      const newSaber = { ...prev[saberKey] };
      const newFinishes = { ...newSaber.finishes };
      if (part === 'global') {
        Object.keys(newFinishes).forEach(k => newFinishes[k] = finish);
      } else {
        newFinishes[part] = finish;
      }
      return { 
        ...prev, 
        [saberKey]: { ...newSaber, finishes: newFinishes } 
      };
    });
  };

  const handleModelChange = (saberKey, part, model) => {
    setConfig((prev) => {
      const newSaber = { ...prev[saberKey] };
      const newModels = { ...newSaber.models, [part]: model };
      return { 
        ...prev, 
        [saberKey]: { ...newSaber, models: newModels } 
      };
    });
  };

  const toggleConfig = (key, saberKey = null) => {
    setConfig((prev) => {
      if (saberKey) {
        return {
          ...prev,
          [saberKey]: {
            ...prev[saberKey],
            [key]: !prev[saberKey][key]
          }
        };
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const setOrientation = (orientation) => {
    setConfig((prev) => ({ ...prev, orientation }));
  };

  const setWeaponType = (type) => {
    if (type === 'staff') return; // Non cliquable pour l'instant
    setConfig((prev) => ({ ...prev, weaponType: type }));
  };

  const takeScreenshot = () => {
    const link = document.createElement('a');
    link.setAttribute('download', 'my-lightsaber.png');
    link.setAttribute('href', canvasRef.current.toDataURL('image/png').replace('image/png', 'image/octet-stream'));
    link.click();
  };

  const renderColorControls = (saberKey, title) => {
    const saber = config[saberKey];
    return (
      <div className="control-group">
        <h3>{title}</h3>
        
        <div style={{ marginBottom: '20px', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', cursor: 'pointer', fontSize: '0.8rem' }}>
            <input type="checkbox" checked={saber.showRingTop} onChange={() => toggleConfig('showRingTop', saberKey)} className="tech-checkbox" /> 
            <span style={{ marginLeft: '10px' }}>Anneau Haut</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '0.8rem' }}>
            <input type="checkbox" checked={saber.showRingBottom} onChange={() => toggleConfig('showRingBottom', saberKey)} className="tech-checkbox" /> 
            <span style={{ marginLeft: '10px' }}>Anneau Bas</span>
          </label>
        </div>

        <ColorControl 
          label="Globale (Tout)" 
          color={saber.colors.global} 
          finish={saber.finishes.global}
          onChangeColor={(c) => handleColorChange(saberKey, 'global', c)} 
          onChangeFinish={(f) => handleFinishChange(saberKey, 'global', f)}
        />
        <hr style={{ margin: '20px 0', borderColor: '#444' }} />
        <ColorControl 
          label="Émetteur" 
          color={saber.colors.emitter} 
          finish={saber.finishes.emitter} 
          onChangeColor={(c) => handleColorChange(saberKey, 'emitter', c)} 
          onChangeFinish={(f) => handleFinishChange(saberKey, 'emitter', f)}
          models={PART_MODELS.emitter}
          currentModel={saber.models.emitter}
          onChangeModel={(m) => handleModelChange(saberKey, 'emitter', m)}
        />
        {saber.showRingTop && (
          <ColorControl 
            label="Anneau Haut" 
            color={saber.colors.ringTop} 
            finish={saber.finishes.ringTop} 
            onChangeColor={(c) => handleColorChange(saberKey, 'ringTop', c)} 
            onChangeFinish={(f) => handleFinishChange(saberKey, 'ringTop', f)} 
            models={PART_MODELS.ring}
            currentModel={saber.models.ringTop}
            onChangeModel={(m) => handleModelChange(saberKey, 'ringTop', m)}
          />
        )}
        <ColorControl 
          label="Corps" 
          color={saber.colors.body} 
          finish={saber.finishes.body} 
          onChangeColor={(c) => handleColorChange(saberKey, 'body', c)} 
          onChangeFinish={(f) => handleFinishChange(saberKey, 'body', f)} 
          models={PART_MODELS.body}
          currentModel={saber.models.body}
          onChangeModel={(m) => handleModelChange(saberKey, 'body', m)}
        />
        {saber.showRingBottom && (
          <ColorControl 
            label="Anneau Bas" 
            color={saber.colors.ringBottom} 
            finish={saber.finishes.ringBottom} 
            onChangeColor={(c) => handleColorChange(saberKey, 'ringBottom', c)} 
            onChangeFinish={(f) => handleFinishChange(saberKey, 'ringBottom', f)} 
            models={PART_MODELS.ring}
            currentModel={saber.models.ringBottom}
            onChangeModel={(m) => handleModelChange(saberKey, 'ringBottom', m)}
          />
        )}
        <ColorControl 
          label="Pommeau" 
          color={saber.colors.pommel} 
          finish={saber.finishes.pommel} 
          onChangeColor={(c) => handleColorChange(saberKey, 'pommel', c)} 
          onChangeFinish={(f) => handleFinishChange(saberKey, 'pommel', f)} 
          models={PART_MODELS.pommel}
          currentModel={saber.models.pommel}
          onChangeModel={(m) => handleModelChange(saberKey, 'pommel', m)}
        />
        {config.showBlade && (
          <>
            <hr style={{ margin: '20px 0', borderColor: '#444' }} />
            <ColorControl 
              label="Lame" 
              color={saber.colors.blade} 
              onChangeColor={(c) => handleColorChange(saberKey, 'blade', c)} 
              models={PART_MODELS.blade}
              currentModel={saber.models.blade}
              onChangeModel={(m) => handleModelChange(saberKey, 'blade', m)}
            />
          </>
        )}
      </div>
    );
  };

  const renderHeightSummary = (saberKey, title = 'Dimensions du Manche', className = "") => {
    const saber = config[saberKey];
    const weaponType = config.weaponType;
    const constraints = WEAPON_CONSTRAINTS[weaponType];
    
    const parts = [
      { label: 'Pommeau', url: saber.models.pommel, type: 'pommel' },
      { label: 'Anneau Bas', url: saber.models.ringBottom, type: 'ring', show: saber.showRingBottom },
      { label: 'Corps', url: saber.models.body, type: 'body' },
      { label: 'Anneau Haut', url: saber.models.ringTop, type: 'ring', show: saber.showRingTop },
      { label: 'Émetteur', url: saber.models.emitter, type: 'emitter' },
    ];

    let totalHeight = 0;
    const details = parts.filter(p => p.show !== false).map(p => {
      const model = PART_MODELS[p.type].find(m => m.url === p.url);
      const h = model ? model.height : 0;
      totalHeight += h;
      return { label: p.label, height: h };
    });

    const isValid = totalHeight >= constraints.min && totalHeight <= constraints.max;

    return (
      <div className={`height-summary-box ${className} ${!isValid ? 'invalid' : 'valid'}`}>
        <h4>{title}</h4>
        <div className="height-details">
          {details.map((d, i) => (
            <div key={i} className="height-row">
              <span>{d.label}</span>
              <span className="value">{d.height} mm</span>
            </div>
          ))}
          <div className="total-row">
            <span>TOTAL</span>
            <span className="value">{totalHeight} mm</span>
          </div>
          <div className="status-row" style={{ marginTop: '8px', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim)' }}>Requis: {constraints.min}-{constraints.max}mm</span>
            <span className="status-badge" style={{ 
              padding: '2px 6px', 
              borderRadius: '2px', 
              fontSize: '0.6rem', 
              fontWeight: 'bold',
              background: isValid ? 'rgba(0, 255, 100, 0.2)' : 'rgba(255, 50, 50, 0.2)',
              color: isValid ? '#00ff64' : '#ff3232',
              border: `1px solid ${isValid ? '#00ff64' : '#ff3232'}`
            }}>
              {isValid ? 'VALIDE' : 'HORS LIMITES'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        <h1 onClick={() => setIsCollapsed(!isCollapsed)} style={{ cursor: 'pointer' }}>
          LS Creator
        </h1>
        
        <div className="control-group">
          <h3>Type d'arme</h3>
          <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
            <button className={`sci-fi-btn ${config.weaponType === 'saber' ? 'active' : ''}`} onClick={() => setWeaponType('saber')} style={{ flex: 1, fontSize: '0.7rem' }}>Sabre Long</button>
            <button className={`sci-fi-btn ${config.weaponType === 'daggers' ? 'active' : ''}`} onClick={() => setWeaponType('daggers')} style={{ flex: 1, fontSize: '0.7rem' }}>Dagues</button>
            <button className="sci-fi-btn" disabled style={{ flex: 1, opacity: 0.3, cursor: 'not-allowed', fontSize: '0.7rem' }}>Bâton</button>
          </div>
        </div>

        <div className="control-group">
          <h3>Position & Structure</h3>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button onClick={() => setOrientation('vertical')} className={`sci-fi-btn ${config.orientation === 'vertical' ? 'active' : ''}`} style={{ flex: 1 }}>Verticale</button>
            <button onClick={() => setOrientation('horizontal')} className={`sci-fi-btn ${config.orientation === 'horizontal' ? 'active' : ''}`} style={{ flex: 1 }}>Horizontale</button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={config.showBlade} onChange={() => toggleConfig('showBlade')} className="tech-checkbox" /> 
            <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>Activer la Lame</span>
          </label>
        </div>

        {renderHeightSummary('saber1', config.weaponType === 'daggers' ? 'Dimensions Sabre 1' : 'Dimensions', 'mobile-only')}
        {config.weaponType === 'daggers' && renderHeightSummary('saber2', 'Dimensions Sabre 2', 'mobile-only')}

        {renderColorControls('saber1', config.weaponType === 'daggers' ? 'Couleurs Sabre 1' : 'Couleurs & Finitions')}
        {config.weaponType === 'daggers' && renderColorControls('saber2', 'Couleurs Sabre 2')}

        <button className="screenshot-btn" onClick={takeScreenshot}>📸 Capturer l'image</button>
      </div>

      <div className="dimensions-overlay desktop-only">
        {renderHeightSummary('saber1', config.weaponType === 'daggers' ? 'Sabre 1' : 'Dimensions')}
        {config.weaponType === 'daggers' && renderHeightSummary('saber2', 'Sabre 2')}
      </div>

      <div className="canvas-container">
        <Canvas shadows gl={{ preserveDrawingBuffer: true }} onCreated={({ gl }) => { canvasRef.current = gl.domElement }} camera={{ position: [350, 350, 350], fov: 50, far: 10000 }}>
          <Suspense fallback={null}>
            <Stage environment="warehouse" intensity={0.5} adjustCamera={false}>
              {config.weaponType === 'saber' ? (
                <Lightsaber 
                  colors={config.saber1.colors} 
                  finishes={config.saber1.finishes} 
                  showRingTop={config.saber1.showRingTop} 
                  showRingBottom={config.saber1.showRingBottom} 
                  showBlade={config.showBlade}
                  orientation={config.orientation}
                  emitterModel={config.saber1.models.emitter}
                  ringTopModel={config.saber1.models.ringTop}
                  bodyModel={config.saber1.models.body}
                  ringBottomModel={config.saber1.models.ringBottom}
                  pommelModel={config.saber1.models.pommel}
                  bladeModel={config.saber1.models.blade}
                />
              ) : (
                <group>
                  <group position={config.orientation === 'vertical' ? [-50, 0, 0] : [0, 50, 0]}>
                    <Lightsaber 
                      colors={config.saber1.colors} 
                      finishes={config.saber1.finishes} 
                      showRingTop={config.saber1.showRingTop} 
                      showRingBottom={config.saber1.showRingBottom} 
                      showBlade={config.showBlade}
                      orientation={config.orientation} 
                      emitterModel={config.saber1.models.emitter}
                      ringTopModel={config.saber1.models.ringTop}
                      bodyModel={config.saber1.models.body}
                      ringBottomModel={config.saber1.models.ringBottom}
                      pommelModel={config.saber1.models.pommel}
                      bladeModel={config.saber1.models.blade}
                    />
                  </group>
                  <group position={config.orientation === 'vertical' ? [50, 0, 0] : [0, -50, 0]}>
                    <Lightsaber 
                      colors={config.saber2.colors} 
                      finishes={config.saber2.finishes} 
                      showRingTop={config.saber2.showRingTop} 
                      showRingBottom={config.saber2.showRingBottom} 
                      showBlade={config.showBlade}
                      orientation={config.orientation} 
                      emitterModel={config.saber2.models.emitter}
                      ringTopModel={config.saber2.models.ringTop}
                      bodyModel={config.saber2.models.body}
                      ringBottomModel={config.saber2.models.ringBottom}
                      pommelModel={config.saber2.models.pommel}
                      bladeModel={config.saber2.models.blade}
                    />
                  </group>
                </group>
              )}
            </Stage>
            <directionalLight position={[300, 300, 300]} intensity={2} color="#fff" castShadow />
            <OrbitControls makeDefault minDistance={100} maxDistance={2000} enablePan={true} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export default App;