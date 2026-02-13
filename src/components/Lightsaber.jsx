import React, { useMemo, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Configuration par modèle pour gérer les dimensions, décalages et rotations spécifiques
const MODEL_CONFIG = {

  // Emitters
  'models/Polaris_Evo_Emitter_Fixed.glb': { height: 64, offset: -20, rotation: [0, 0, 0] },

  // Bodies
  'models/body_v1.glb': { height: 180, offset: 0, rotation: [0, 0, 0] },
  'models/Polaris_Evo_Mini_Body_Fixed.glb': { height: 150, offset: 0, rotation: [0, 0, 0] },

  // Pommels
  'models/Polaris_Evo_Pommel_Fixed.glb': { height: 34, offset: -34, rotation: [0, 0, 0] },
  'models/pommel_Mini_v1.glb': { height: 20, offset: 0, rotation: [Math.PI, 0, 0] },

  // Rings
  'models/ring_S_v1.glb': { height: 5, offset: 0, rotation: [0, 0, 0] },
  'models/ring_M_v1.glb': { height: 10, offset: 0, rotation: [0, 0, 0] },
  'models/ring_L_v1.glb': { height: 15, offset: 0, rotation: [0, 0, 0] },
  
  // Blades
  'models/blade_long_v1.glb': { height: 870, offset: -20, rotation: [0, 0, 0] },
  'models/blade_medium_v1.glb': { height: 730, offset: -20, rotation: [0, 0, 0] },
  'models/blade_short_v1.glb': { height: 600, offset: -20, rotation: [0, 0, 0] },
};

const DEFAULT_PIECE_HEIGHTS = {
  emitter: 64,
  body: 180,
  pommel: 34,
  ring: 10,
  blade: 870,
};

const BLENDER_SCALE = [1, 1, 1];

const getMaterialProps = (colorHex, isMatte) => {
  const c = colorHex.toLowerCase();
  const isAluminium = c === '#eceae7';
  if (isMatte && !isAluminium) return { metalness: 0.1, roughness: 0.7, envMapIntensity: 0.3 };
  switch (c) {
    case '#eceae7': return { metalness: 1.0, roughness: 0.15, envMapIntensity: 1.5 };
    case '#c5c5c5':
    case '#b3b3b3': return { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.2 };
    case '#6b2624':
    case '#2c3f83':
    case '#723470':
    case '#5a2958':
    case '#63a878':
    case '#457954':
    case '#aa0000': return { metalness: 0.8, roughness: 0.2, envMapIntensity: 1.0 };
    case '#272728':
    case '#444444': return { metalness: 0.6, roughness: 0.4, envMapIntensity: 0.8 };
    case '#d4af37':
    case '#b87333':
    case '#72583e':
    case '#5e4731': return { metalness: 1.0, roughness: 0.2, envMapIntensity: 1.2 };
    case '#555556': return { metalness: 0.4, roughness: 0.6, envMapIntensity: 0.5 };
    default: return { metalness: 0.5, roughness: 0.5, envMapIntensity: 1.0 };
  }
};

function Part({ url, color, position, scale = BLENDER_SCALE, height, name, rotation = [0, 0, 0], isMatte = false, isBlade = false }) {
  const { scene } = useGLTF(url);
  
  // Clone et correction d'orientation stable
  const clonedScene = useMemo(() => {
    const s = scene.clone();
    const filename = url.split('/').pop();
    
    if (filename.startsWith('Polaris')) {
      s.rotation.x = Math.PI / 2;
      s.position.set(0, 0, 0);
      s.updateMatrixWorld(true);
      
      const box = new THREE.Box3().setFromObject(s);
      s.position.x = -(box.min.x + box.max.x) / 2;
      s.position.z = -(box.min.z + box.max.z) / 2;
      s.position.y = -box.min.y;
    }
    return s;
  }, [scene, url]);

  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    let meshCount = 0;
    clonedScene.traverse((obj) => { if (obj.isMesh) meshCount++; });
    setIsEmpty(meshCount === 0);
  }, [clonedScene]);

  // Mise à jour des matériaux séparée
  useEffect(() => {
    if (isEmpty) return;
    const matProps = getMaterialProps(color, isMatte);
    
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        node.material = node.material.clone();
        if (isBlade) {
          node.material.transparent = true;
          node.material.opacity = 0.6;
          node.material.side = THREE.DoubleSide;
          node.material.depthWrite = false;
          node.material.onBeforeCompile = (shader) => {
            shader.uniforms.uBladeColor = { value: new THREE.Color(color) };
            shader.fragmentShader = `
              uniform vec3 uBladeColor;
              ${shader.fragmentShader}
            `.replace('#include <color_fragment>', `diffuseColor.rgb = uBladeColor;`)
             .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance = diffuseColor.rgb * 3.0;`);
          };
        } else {
          node.material.color.set(color);
          node.material.metalness = matProps.metalness;
          node.material.roughness = matProps.roughness;
          node.material.envMapIntensity = matProps.envMapIntensity;
        }
        node.material.needsUpdate = true;
      }
    });
  }, [clonedScene, color, isMatte, isBlade, isEmpty]);

  if (isEmpty) {
    const radius = name.includes('Ring') ? 22 : 18;
    return (
      <group position={position}>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial color={color} roughness={0.3} wireframe emissive={isBlade ? color : "black"} emissiveIntensity={isBlade ? 1 : 0} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={position} rotation={rotation}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  );
}

export default function Lightsaber({ 
  colors, finishes, showRingBottom, showRingTop, showBlade, orientation, 
  pommelModel = "models/Polaris_Evo_Pommel_Fixed.glb",
  ringBottomModel = "models/ring_M_v1.glb",
  bodyModel = "models/Polaris_Evo_Mini_Body_Fixed.glb",
  ringTopModel = "models/ring_M_v1.glb",
  emitterModel = "models/Polaris_Evo_Emitter_Fixed.glb",
  bladeModel = "models/blade_long_v1.glb" 
}) {
  const globalRotation = orientation === 'horizontal' ? [0, 0, -Math.PI / 2] : [0, 0, 0];
  const getConfig = (url, type) => MODEL_CONFIG[url] || { height: DEFAULT_PIECE_HEIGHTS[type], offset: 0, rotation: [0, 0, 0] };

  const pommelCfg = getConfig(pommelModel, 'pommel');
  const pommelPos = [0, pommelCfg.height + pommelCfg.offset, 0];
  let currentY = pommelCfg.height;

  let ringBottomPos = null;
  let ringBottomCfg = { height: 0, offset: 0, rotation: [0, 0, 0] };
  if (showRingBottom) {
    ringBottomCfg = getConfig(ringBottomModel, 'ring');
    ringBottomPos = [0, currentY + ringBottomCfg.offset, 0];
    currentY += ringBottomCfg.height;
  }

  const bodyCfg = getConfig(bodyModel, 'body');
  const bodyPos = [0, currentY + bodyCfg.offset, 0];
  currentY += bodyCfg.height;

  let ringTopPos = null;
  let ringTopCfg = { height: 0, offset: 0, rotation: [0, 0, 0] };
  if (showRingTop) {
    ringTopCfg = getConfig(ringTopModel, 'ring');
    ringTopPos = [0, currentY + ringTopCfg.offset, 0];
    currentY += ringTopCfg.height;
  }

  const emitterCfg = getConfig(emitterModel, 'emitter');
  const emitterPos = [0, currentY + emitterCfg.offset, 0];
  currentY += emitterCfg.height;

  const bladeCfg = getConfig(bladeModel, 'blade');
  const bladePos = [0, currentY + bladeCfg.offset, 0];

  const getColor = (partName) => colors[partName] || colors.global;
  const isMatte = (partName) => finishes && finishes[partName] === 'matte';

  return (
    <group dispose={null} rotation={globalRotation}>
      <Part name="Pommel" url={pommelModel} color={getColor('pommel')} isMatte={isMatte('pommel')} position={pommelPos} height={pommelCfg.height} rotation={pommelCfg.rotation} />
      {showRingBottom && <Part name="Ring Bottom" url={ringBottomModel} color={getColor('ringBottom')} isMatte={isMatte('ringBottom')} position={ringBottomPos} height={ringBottomCfg.height} rotation={ringBottomCfg.rotation} />}
      <Part name="Body" url={bodyModel} color={getColor('body')} isMatte={isMatte('body')} position={bodyPos} height={bodyCfg.height} rotation={bodyCfg.rotation} />
      {showRingTop && <Part name="Ring Top" url={ringTopModel} color={getColor('ringTop')} isMatte={isMatte('ringTop')} position={ringTopPos} height={ringTopCfg.height} rotation={ringTopCfg.rotation} />}
      <Part name="Emitter" url={emitterModel} color={getColor('emitter')} isMatte={isMatte("emitter")} position={emitterPos} height={emitterCfg.height} rotation={emitterCfg.rotation} />
      {showBlade && <Part name="Blade" url={bladeModel} color={getColor('blade')} position={bladePos} height={bladeCfg.height} rotation={bladeCfg.rotation} isBlade={true} />}
    </group>
  );
}

useGLTF.preload('models/Polaris_Evo_Pommel_Fixed.glb');
useGLTF.preload('models/pommel_Mini_v1.glb');
useGLTF.preload('models/ring_S_v1.glb');
useGLTF.preload('models/ring_M_v1.glb');
useGLTF.preload('models/ring_L_v1.glb');
useGLTF.preload('models/body_v1.glb');
useGLTF.preload('models/Polaris_Evo_Mini_Body_Fixed.glb');
useGLTF.preload('models/Polaris_Evo_Emitter_Fixed.glb');
useGLTF.preload('models/blade_long_v1.glb');
useGLTF.preload('models/blade_medium_v1.glb');
useGLTF.preload('models/blade_short_v1.glb');
