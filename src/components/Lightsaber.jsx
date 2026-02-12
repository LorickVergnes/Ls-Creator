import React, { useMemo, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Configuration par modèle pour gérer les dimensions et décalages spécifiques
const MODEL_CONFIG = {
  // Pommels
  'models/pommel_v2.glb': { height: 34, offset: 0 },
  'models/Polaris_Evo_Pommel_Fixed.glb': { height: 34, offset: 0 },
  
  // Rings
  'models/ring_v1.glb': { height: 10, offset: 0 },
  
  // Bodies
  'models/body_v2.glb': { height: 180, offset: 0 },
  'models/Polaris_Evo_Mini_Body_Fixed.glb': { height: 150, offset: 0 },
  
  // Emitters
  'models/Polaris_Evo_Emitter_Fixed.glb': { height: 64, offset: -20 },
  'models/emitter_v2.glb': { height: 64, offset: 0 },
  
  // Blades
  'models/blade_long_v1.glb': { height: 900, offset: -20 },
  'models/blade_short_v1.glb': { height: 500, offset: -20 },
};

// Dimensions par défaut si le modèle n'est pas dans la config
const DEFAULT_PIECE_HEIGHTS = {
  emitter: 64,
  body: 180,
  pommel: 34,
  ring: 10,
  blade: 900,
};

const BLENDER_SCALE = [1, 1, 1];

// PROPRIÉTÉS MATÉRIELLES AVANCÉES
const getMaterialProps = (colorHex, isMatte) => {
  const c = colorHex.toLowerCase();
  const isAluminium = c === '#eceae7';

  if (isMatte && !isAluminium) {
    return { metalness: 0.1, roughness: 0.7, envMapIntensity: 0.3 };
  }

  switch (c) {
    case '#eceae7': // Aluminium
      return { metalness: 1.0, roughness: 0.15, envMapIntensity: 1.5 };
    case '#c5c5c5': // Lunar Mist
    case '#b3b3b3':
      return { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.2 };
    case '#6b2624': // Blood Moon
    case '#2c3f83': // Cobalt Nebula
    case '#723470': // Violet Plasma
    case '#5a2958':
    case '#63a878': // Viridian Aurora
    case '#457954':
    case '#aa0000':
      return { metalness: 0.8, roughness: 0.2, envMapIntensity: 1.0 };
    case '#272728': // Dark Matter
    case '#444444':
      return { metalness: 0.6, roughness: 0.4, envMapIntensity: 0.8 };
    case '#d4af37': // Or
    case '#b87333': // Cuivre
    case '#72583e': // Yggdrasil Mantle
    case '#5e4731':
      return { metalness: 1.0, roughness: 0.2, envMapIntensity: 1.2 };
    case '#555556': // Sideral Dust
      return { metalness: 0.4, roughness: 0.6, envMapIntensity: 0.5 };
    default:
      return { metalness: 0.5, roughness: 0.5, envMapIntensity: 1.0 };
  }
};

function Part({ url, color, position, scale = BLENDER_SCALE, height, name, rotation = [0, 0, 0], isMatte = false, isBlade = false }) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const [isEmpty, setIsEmpty] = useState(false);

  const matProps = useMemo(() => getMaterialProps(color, isMatte), [color, isMatte]);

  const isPolaris = useMemo(() => {
    const filename = url.split('/').pop();
    return filename.startsWith('Polaris');
  }, [url]);

  const finalRotation = rotation;

  useEffect(() => {
    let meshCount = 0;
    clonedScene.traverse((obj) => {
      if (obj.isMesh) meshCount++;
    });
    setIsEmpty(meshCount === 0);
  }, [clonedScene, url]);

  useMemo(() => {
    if (!isEmpty) {
      // Correction d'orientation et d'alignement pour les pièces Polaris
      if (isPolaris) {
        clonedScene.rotation.x = Math.PI / 2;
        clonedScene.position.set(0, 0, 0);
        clonedScene.updateMatrixWorld(true);
        
        const box = new THREE.Box3().setFromObject(clonedScene);
        clonedScene.position.x = -(box.min.x + box.max.x) / 2;
        clonedScene.position.z = -(box.min.z + box.max.z) / 2;
        clonedScene.position.y = -box.min.y;
      }

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
              `.replace(
                  '#include <color_fragment>',
                  `diffuseColor.rgb = uBladeColor;`
              ).replace(
                  '#include <emissivemap_fragment>',
                  `
                #include <emissivemap_fragment>
                totalEmissiveRadiance = diffuseColor.rgb * 3.0;
                `
              );
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
    }
  }, [clonedScene, color, isEmpty, matProps, isBlade, isPolaris]);

  if (isEmpty) {
    const radius = name.includes('Ring') ? 22 : 18;
    return (
        <group position={position}>
          <mesh position={[0, height / 2, 0]}>
            <cylinderGeometry args={[radius, radius, height, 32]} />
            <meshStandardMaterial
                color={color}
                roughness={0.3}
                wireframe
                emissive={isBlade ? color : "black"}
                emissiveIntensity={isBlade ? 1 : 0}
            />
          </mesh>
        </group>
    );
  }

  return (
      <group position={position} rotation={finalRotation}>
        <primitive object={clonedScene} scale={scale} />
      </group>
  );
}

export default function Lightsaber({ 
  colors, 
  finishes, 
  showRingBottom, 
  showRingTop, 
  showBlade, 
  orientation, 
  pommelModel = "models/Polaris_Evo_Pommel_Fixed.glb",
  ringBottomModel = "models/ring_v1.glb",
  bodyModel = "models/Polaris_Evo_Mini_Body_Fixed.glb",
  ringTopModel = "models/ring_v1.glb",
  emitterModel = "models/Polaris_Evo_Emitter_Fixed.glb",
  bladeModel = "models/blade_long_v1.glb" 
}) {
  const globalRotation = orientation === 'horizontal' ? [0, 0, -Math.PI / 2] : [0, 0, 0];

  const getDim = (url, type) => MODEL_CONFIG[url] || { height: DEFAULT_PIECE_HEIGHTS[type], offset: 0 };

  // Calcul cumulatif des positions Y
  const pommelDim = getDim(pommelModel, 'pommel');
  const pommelPos = [0, pommelDim.height + pommelDim.offset, 0];

  let currentY = pommelDim.height;

  let ringBottomPos = null;
  let ringBottomDim = { height: 0, offset: 0 };
  if (showRingBottom) {
    ringBottomDim = getDim(ringBottomModel, 'ring');
    ringBottomPos = [0, currentY + ringBottomDim.offset, 0];
    currentY += ringBottomDim.height;
  }

  const bodyDim = getDim(bodyModel, 'body');
  const bodyPos = [0, currentY + bodyDim.offset, 0];
  currentY += bodyDim.height;

  let ringTopPos = null;
  let ringTopDim = { height: 0, offset: 0 };
  if (showRingTop) {
    ringTopDim = getDim(ringTopModel, 'ring');
    ringTopPos = [0, currentY + ringTopDim.offset, 0];
    currentY += ringTopDim.height;
  }

  const emitterDim = getDim(emitterModel, 'emitter');
  const emitterPos = [0, currentY + emitterDim.offset, 0];
  currentY += emitterDim.height;

  const bladeDim = getDim(bladeModel, 'blade');
  const bladePos = [0, currentY + bladeDim.offset, 0];

  const isMatte = (partName) => finishes && finishes[partName] === 'matte';
  const getColor = (partName) => colors[partName] || colors.global;

  return (
      <group dispose={null} rotation={globalRotation}>
        <Part
            name="Pommel"
            url={pommelModel}
            color={getColor('pommel')}
            isMatte={isMatte('pommel')}
            position={pommelPos}
            height={pommelDim.height}
            rotation={[Math.PI, 0, 0]}
        />
        {showRingBottom && (
            <Part
                name="Ring Bottom"
                url={ringBottomModel}
                color={getColor('ringBottom')}
                isMatte={isMatte('ringBottom')}
                position={ringBottomPos}
                height={ringBottomDim.height}
            />
        )}
        <Part
            name="Body"
            url={bodyModel}
            color={getColor('body')}
            isMatte={isMatte('body')}
            position={bodyPos}
            height={bodyDim.height}
        />
        {showRingTop && (
            <Part
                name="Ring Top"
                url={ringTopModel}
                color={getColor('ringTop')}
                isMatte={isMatte('ringTop')}
                position={ringTopPos}
                height={ringTopDim.height}
            />
        )}
        <Part
            name="Emitter"
            url={emitterModel}
            color={getColor('emitter')}
            isMatte={isMatte("emitter")}
            position={emitterPos}
            height={emitterDim.height}
        />
        {showBlade && (
            <Part
                name="Blade"
                url={bladeModel}
                color={getColor('blade')}
                position={bladePos}
                height={bladeDim.height}
                isBlade={true}
            />
        )}
      </group>
  );
}

useGLTF.preload('models/Polaris_Evo_Pommel_Fixed.glb');
useGLTF.preload('models/ring_v1.glb');
useGLTF.preload('models/Polaris_Evo_Mini_Body_Fixed.glb');
useGLTF.preload('models/Polaris_Evo_Emitter_Fixed.glb');
useGLTF.preload('models/blade_long_v1.glb');
useGLTF.preload('models/blade_short_v1.glb');

useGLTF.preload('models/Polaris_Evo_Pommel_Fixed.glb');
useGLTF.preload('models/ring_v1.glb');
useGLTF.preload('models/Polaris_Evo_Mini_Body_Fixed.glb');
useGLTF.preload('models/Polaris_Evo_Emitter_Fixed.glb');
useGLTF.preload('models/blade_long_v1.glb');
useGLTF.preload('models/blade_short_v1.glb');