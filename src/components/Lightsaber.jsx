import React, { useMemo, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Dimensions en mm
const PIECE_HEIGHTS = {
  emitter: 64,
  body: 180,
  pommel: 34,
  ring: 10,
  blade: 900, // Hauteur arbitraire pour la lame si nécessaire, mais on utilise le modèle
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

  useEffect(() => {
    let meshCount = 0;
    clonedScene.traverse((obj) => {
      if (obj.isMesh) meshCount++;
    });
    setIsEmpty(meshCount === 0);
  }, [clonedScene, url]);

  useMemo(() => {
    if (!isEmpty) {
      clonedScene.traverse((node) => {
        if (node.isMesh) {
          node.material = node.material.clone();
          
          if (isBlade) {
            // Propriétés spécifiques pour la lame (émissive)
            node.material.color.set(color);
            node.material.emissive = new THREE.Color(color);
            node.material.emissiveIntensity = 2;
            node.material.transparent = true;
            node.material.opacity = 0.9;
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
  }, [clonedScene, color, isEmpty, matProps, isBlade]);

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
    <group position={position} rotation={rotation}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  );
}

export default function Lightsaber({ colors, finishes, showRingBottom, showRingTop, showBlade, orientation }) {
  const globalRotation = orientation === 'horizontal' ? [0, 0, -Math.PI / 2] : [0, 0, 0];

  const pommelPos = [0, PIECE_HEIGHTS.pommel, 0]; 
  const ringBottomY = PIECE_HEIGHTS.pommel;
  const ringBottomPos = showRingBottom ? [0, ringBottomY, 0] : null;
  const bodyY = PIECE_HEIGHTS.pommel + (showRingBottom ? PIECE_HEIGHTS.ring : 0);
  const bodyPos = [0, bodyY, 0];
  const ringTopY = bodyY + PIECE_HEIGHTS.body;
  const ringTopPos = showRingTop ? [0, ringTopY, 0] : null;
  const emitterY = ringTopY + (showRingTop ? PIECE_HEIGHTS.ring : 0);
  const emitterPos = [0, emitterY, 0];
  
  // Position de la lame au sommet de l'émetteur (ajustée pour le contact)
  const bladeY = emitterY + PIECE_HEIGHTS.emitter - 20;
  const bladePos = [0, bladeY, 0];

  const isMatte = (partName) => finishes && finishes[partName] === 'matte';
  const getColor = (partName) => colors[partName] || colors.global;

  return (
    <group dispose={null} rotation={globalRotation}>
      <Part 
        name="Pommel"
        url="models/pommel_v2.glb"
        color={getColor('pommel')}
        isMatte={isMatte('pommel')}
        position={pommelPos} 
        height={PIECE_HEIGHTS.pommel}
        rotation={[Math.PI, 0, 0]} 
      />
      {showRingBottom && (
        <Part 
          name="Ring Bottom"
          url="models/ring_v1.glb"
          color={getColor('ringBottom')}
          isMatte={isMatte('ringBottom')} 
          position={ringBottomPos} 
          height={PIECE_HEIGHTS.ring}
        />
      )}
      <Part 
        name="Body"
        url="models/body_v2.glb" 
        color={getColor('body')}
        isMatte={isMatte('body')} 
        position={bodyPos} 
        height={PIECE_HEIGHTS.body}
      />
      {showRingTop && (
        <Part 
          name="Ring Top"
          url="models/ring_v1.glb"
          color={getColor('ringTop')}
          isMatte={isMatte('ringTop')} 
          position={ringTopPos} 
          height={PIECE_HEIGHTS.ring}
        />
      )}
      <Part 
        name="Emitter"
        url="models/emitter_v2.glb"
        color={getColor('emitter')}
        isMatte={isMatte("emitter")}
        position={emitterPos} 
        height={PIECE_HEIGHTS.emitter}
      />
      {showBlade && (
        <Part 
          name="Blade"
          url="models/blade_v1.glb"
          color={getColor('blade')} // Utilise la couleur 'blade' ou 'global'
          position={bladePos}
          height={PIECE_HEIGHTS.blade}
          isBlade={true}
        />
      )}
    </group>
  );
}

useGLTF.preload('models/pommel_v2.glb');
useGLTF.preload('models/ring_v1.glb');
useGLTF.preload('models/body_v2.glb');
useGLTF.preload('models/emitter_v2.glb');
useGLTF.preload('models/blade_v1.glb');
