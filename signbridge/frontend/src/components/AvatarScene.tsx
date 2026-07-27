import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { GESTURE_ANIMATIONS } from '@/types';
import { cn } from '@/lib/utils';

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("Avatar GLTF failed to load, switching to 3D fallback:", error);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

interface AvatarModelProps {
  avatarUrl: string;
  currentGesture: string | null;
  expressions: Record<string, number>;
}

function AvatarModel({ avatarUrl, currentGesture, expressions }: AvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(avatarUrl);
  const { actions, mixer } = useAnimations(animations, group);
  const blinkRef = useRef(0);

  useEffect(() => {
    if (!currentGesture || !actions) return;
    const animPath = GESTURE_ANIMATIONS[currentGesture];
    if (!animPath) {
      const firstAction = Object.values(actions)[0];
      firstAction?.reset().fadeIn(0.3).play();
      return;
    }
    Object.values(actions).forEach((action) => action?.fadeOut(0.3));
    const gestureAction = actions[currentGesture] || Object.values(actions)[0];
    gestureAction?.reset().fadeIn(0.3).play();
  }, [currentGesture, actions]);

  useFrame((state) => {
    if (group.current) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.02;
    }
    blinkRef.current += 0.016;
    if (blinkRef.current > 3 + Math.random() * 2) {
      blinkRef.current = 0;
    }
  });

  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
          Object.entries(expressions).forEach(([name, weight]) => {
            const idx = mesh.morphTargetDictionary![name];
            if (idx !== undefined) mesh.morphTargetInfluences![idx] = weight;
          });
        }
      }
    });
  }, [scene, expressions]);

  return (
    <group ref={group}>
      <primitive object={scene.clone()} scale={1.8} position={[0, -1.6, 0]} />
      {mixer && null}
    </group>
  );
}

function Fallback3DModel({ currentGesture }: { currentGesture: string | null }) {
  const group = useRef<THREE.Group>(null);
  const leftHand = useRef<THREE.Mesh>(null);
  const rightHand = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.y = Math.sin(t * 0.8) * 0.04;
    }
    
    if (leftHand.current && rightHand.current) {
      if (currentGesture === 'hello') {
        leftHand.current.position.x = -0.5 + Math.sin(t * 10) * 0.03;
        leftHand.current.position.y = 0.2 + Math.cos(t * 10) * 0.03;
        rightHand.current.position.y = -0.2 + Math.cos(t * 2) * 0.01;
      } else if (currentGesture === 'thank_you') {
        leftHand.current.position.y = Math.sin(t * 6) * 0.08;
        rightHand.current.position.y = Math.sin(t * 6) * 0.08;
      } else if (currentGesture === 'yes') {
        leftHand.current.position.y = -0.2 + Math.sin(t * 8) * 0.06;
      } else if (currentGesture === 'no') {
        leftHand.current.position.x = -0.5 + Math.sin(t * 8) * 0.06;
      } else {
        leftHand.current.position.y = -0.2 + Math.sin(t * 1.5) * 0.015;
        rightHand.current.position.y = -0.2 + Math.cos(t * 1.5) * 0.015;
      }
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.24, 32, 32]} />
        <meshStandardMaterial color="#818cf8" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.26, 0.35, 0.7, 32]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.4} />
      </mesh>
      <mesh ref={leftHand} position={[-0.45, -0.2, 0.1]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#c084fc" roughness={0.1} metalness={0.8} />
      </mesh>
      <mesh ref={rightHand} position={[0.45, -0.2, 0.1]}>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshStandardMaterial color="#c084fc" roughness={0.1} metalness={0.8} />
      </mesh>
    </group>
  );
}

interface AvatarSceneProps {
  className?: string;
}

export function AvatarScene({ className }: AvatarSceneProps) {
  const { avatarConfig, currentAvatarMessage } = useAppStore();
  const [isOffline, setIsOffline] = useState(false);

  return (
    <div className={cn("relative", className)}>
      <Canvas
        shadows
        camera={{ position: [0, 0.5, 2.5], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#0a0a0f']} />
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-3, 2, 2]} intensity={0.6} color="#818cf8" />
        <pointLight position={[3, 1, -2]} intensity={0.4} color="#c084fc" />
        <Environment preset="city" />
        <CanvasErrorBoundary
          onError={() => setIsOffline(true)}
          fallback={
            <Fallback3DModel currentGesture={currentAvatarMessage?.gesture || null} />
          }
        >
          <Suspense fallback={null}>
            <AvatarModel
              avatarUrl={avatarConfig.avatarUrl}
              currentGesture={currentAvatarMessage?.gesture || null}
              expressions={currentAvatarMessage?.expressions || { neutral: 0.5 }}
            />
          </Suspense>
        </CanvasErrorBoundary>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {isOffline && (
        <div className="absolute top-3 right-3 px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 text-[10px] uppercase font-semibold tracking-wider select-none pointer-events-none">
          Offline Fallback
        </div>
      )}
    </div>
  );
}

try {
  useGLTF.preload('https://models.readyplayer.me/64bfa15f0e72c63d7c3934a6.glb');
} catch {
  // ignore preload failures in offline mode
}
