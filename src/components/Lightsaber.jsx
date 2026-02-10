import React, { useMemo, useEffect, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Dimensions en mm
const PIECE_HEIGHTS = {
  emitter: 64,
  body: 180,
  pommel: 34,
  ring: 10,
};

const BLENDER_SCALE = [1, 1, 1];

// PROPRIÉTÉS MATÉRIELLES AVANCÉES
const getMaterialProps = (colorHex, isMatte) => {
  const c = colorHex.toLowerCase();
  const isAluminium = c === '#eceae7';

  // Si l'utilisateur a choisi la finition "Mat" (sauf pour l'Aluminium qui est toujours métal)
  if (isMatte && !isAluminium) {
    return { metalness: 0.1, roughness: 0.7, envMapIntensity: 0.3 };
  }

  // Sinon, finition Métallique (Logique par défaut selon la couleur)
  switch (c) {
    case '#eceae7': // Aluminium
      return { metalness: 1.0, roughness: 0.15, envMapIntensity: 1.5 }; 
    
    case '#c5c5c5': // Lunar Mist
      return { metalness: 0.9, roughness: 0.25, envMapIntensity: 1.2 };
    
    case '#6b2624': // Blood Moon
    case '#2c3f83': // Cobalt Nebula
    case '#723470': // Violet Plasma
    case '#63a878': // Viridian Aurora
    case '#aa0000': 
      return { metalness: 0.8, roughness: 0.2, envMapIntensity: 1.0 }; 

    case '#272728': // Dark Matter
    case '#444444': 
      return { metalness: 0.6, roughness: 0.4, envMapIntensity: 0.8 }; 

    case '#d4af37': // Or
    case '#b87333': // Cuivre
    case '#72583e': // Yggdrasil Mantle
      return { metalness: 1.0, roughness: 0.2, envMapIntensity: 1.2 }; 

    case '#555556': // Sideral Dust
      return { metalness: 0.4, roughness: 0.6, envMapIntensity: 0.5 }; 

    default:
      return { metalness: 0.5, roughness: 0.5, envMapIntensity: 1.0 };
  }
};

function Part({ url, color, position, scale = BLENDER_SCALE, height, name, rotation = [0, 0, 0], isMatte = false }) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const [isEmpty, setIsEmpty] = useState(false);

  // Récupération des propriétés physiques (avec prise en compte du mode Mat)
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
          node.material.color.set(color);

          // Application des propriétés physiques
          node.material.metalness = matProps.metalness;
          node.material.roughness = matProps.roughness;
          node.material.envMapIntensity = matProps.envMapIntensity;
          node.material.needsUpdate = true;
        }
      });
    }
  }, [clonedScene, color, isEmpty, matProps]);

  if (isEmpty) {
    const radius = name.includes('Ring') ? 22 : 18; 
    return (
      <group position={position}>
        <mesh position={[0, height / 2, 0]}>
          <cylinderGeometry args={[radius, radius, height, 32]} />
          <meshStandardMaterial color={color} roughness={0.3} wireframe />
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

export default function Lightsaber({ config }) {
  // On récupère finishes depuis la config
  const { colors, finishes, showRingBottom, showRingTop, orientation } = config;

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

  // Helper pour vérifier si une pièce est en mode Mat
  // Par défaut (si undefined), on considère que c'est false (donc Métal)
  const isMatte = (partName) => finishes && finishes[partName] === 'matte';

  return (
    <group dispose={null} rotation={globalRotation}>
      <Part 
        name="Pommel"
        url="/models/pommel_v2.glb"
        color={colors.pommel || colors.global}
        isMatte={isMatte('pommel')}
        position={pommelPos} 
        height={PIECE_HEIGHTS.pommel}
        rotation={[Math.PI, 0, 0]} 
      />

      {showRingBottom && (
        <Part 
          name="Ring Bottom"
          url="/models/ring_v1.glb"
          color={colors.ringBottom || colors.global}
          isMatte={isMatte('ringBottom')} 
          position={ringBottomPos} 
          height={PIECE_HEIGHTS.ring}
        />
      )}

      <Part 
        name="Body"
        url="/models/body_v2.glb" 
        color={colors.body || colors.global}
        isMatte={isMatte('body')} 
        position={bodyPos} 
        height={PIECE_HEIGHTS.body}
      />

      {showRingTop && (
        <Part 
          name="Ring Top"
          url="/models/ring_v1.glb"
          color={colors.ringTop || colors.global}
          isMatte={isMatte('ringTop')} 
          position={ringTopPos} 
          height={PIECE_HEIGHTS.ring}
        />
      )}

      <Part 
        name="Emitter"
        url="/models/emitter_v2.glb"
        color={colors.emitter || colors.global}
        isMatte={isMatte("emitter")}
        position={emitterPos} 
        height={PIECE_HEIGHTS.emitter}
      />
    </group>
  );
}

// Préchargement avec les noms de fichiers actuels
useGLTF.preload('/models/pommel_v2.glb');
useGLTF.preload('/models/ring_v1.glb');
useGLTF.preload('/models/body_v2.glb');
useGLTF.preload('/models/emitter_v2.glb');
