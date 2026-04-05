import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import logoImg from "../assets/levelup-logo.png";

export default function LogoCard() {
  const mesh = useRef();
  const { mouse } = useThree();
  const texture = useTexture(logoImg);

  // Make the texture crisp
  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
  }, [texture]);

  useFrame((state) => {
    if (!mesh.current) return;

    // smooth mouse tilt
    const targetX = mouse.y * 0.25;
    const targetY = mouse.x * 0.35;

    mesh.current.rotation.x = THREE.MathUtils.lerp(mesh.current.rotation.x, targetX, 0.08);
    mesh.current.rotation.y = THREE.MathUtils.lerp(mesh.current.rotation.y, targetY, 0.08);

    // subtle float
    mesh.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.05;

    // slight intro pop-in
    const t = Math.min(state.clock.elapsedTime / 0.9, 1);
    const s = THREE.MathUtils.lerp(0.85, 1.0, t);
    mesh.current.scale.set(s, s, s);
  });

  return (
    <group>
      {/* Back plate for 3D depth */}
      <mesh ref={mesh} castShadow receiveShadow>
        {/* thin box = “3D card” */}
        <boxGeometry args={[2.2, 1.2, 0.08]} />
        <meshStandardMaterial
          color="#0A1220"
          metalness={0.35}
          roughness={0.25}
        />

        {/* Front logo plane slightly above the box */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[2.05, 1.05]} />
          <meshStandardMaterial
            map={texture}
            transparent
            roughness={0.35}
            metalness={0.15}
          />
        </mesh>
      </mesh>
    </group>
  );
}
