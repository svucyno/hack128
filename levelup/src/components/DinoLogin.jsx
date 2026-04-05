import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

function DinoMesh({ mood, eyesClosed, typing }) {
  const headRef = useRef(null);
  const leftEyeRef = useRef(null);
  const rightEyeRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const smileRef = useRef(null);
  const jawRef = useRef(null);
  const leftArmRef = useRef(null);
  const rightArmRef = useRef(null);
  const blinkUntilRef = useRef(0);
  const nextBlinkRef = useRef(2);

  const colors = useMemo(
    () => ({
      head: "#6DFF8F",
      body: "#2D6E3F",
      accent: "#B6FF7C",
      dark: "#0B1B12",
    }),
    []
  );

  useFrame((state) => {
    if (
      !headRef.current ||
      !leftEyeRef.current ||
      !rightEyeRef.current ||
      !leftPupilRef.current ||
      !rightPupilRef.current ||
      !smileRef.current ||
      !jawRef.current ||
      !leftArmRef.current ||
      !rightArmRef.current
    ) {
      return;
    }

    const t = state.clock.elapsedTime;
    const bob = Math.sin(t * 2.2) * (typing ? 0.18 : 0.08);
    const tilt = Math.sin(t * 1.4) * (typing ? 0.22 : 0.1);
    headRef.current.position.y = bob + (mood === "excited" ? 0.14 : 0);
    headRef.current.rotation.y = tilt;
    headRef.current.rotation.x = typing ? -0.28 : eyesClosed ? -0.18 : -0.1;
    headRef.current.rotation.z = eyesClosed ? -0.08 : 0;

    if (!eyesClosed && t > nextBlinkRef.current) {
      blinkUntilRef.current = t + 0.18;
      nextBlinkRef.current = t + 2.5 + Math.random() * 2.5;
    }

    const blinking = t < blinkUntilRef.current;
    const eyeScaleY = eyesClosed || blinking ? 0.12 : 1;
    leftEyeRef.current.scale.y = eyeScaleY;
    rightEyeRef.current.scale.y = eyeScaleY;

    const smileScale = mood === "excited" ? 1.2 : mood === "happy" ? 1.05 : 0.9;
    smileRef.current.scale.set(smileScale, smileScale, 1);

    const jawOpen = typing ? 0.15 : 0.05;
    jawRef.current.rotation.x = jawOpen;

    const lookX = Math.sin(t * 0.7) * 0.08;
    const lookY = Math.cos(t * 0.6) * 0.05;
    leftPupilRef.current.position.set(-0.25 + lookX, 0.55 + lookY, 1.02);
    rightPupilRef.current.position.set(0.25 + lookX, 0.55 + lookY, 1.02);

    const wave = typing ? Math.sin(t * 8) * 0.8 : Math.sin(t * 2) * 0.2;
    leftArmRef.current.rotation.z = Math.PI / 2 + wave;
    rightArmRef.current.rotation.z = -Math.PI / 2 - wave;
    leftArmRef.current.position.y = -0.4 + (typing ? 0.12 : 0);
    rightArmRef.current.position.y = -0.4 + (typing ? 0.12 : 0);
  });

  return (
    <group ref={headRef} position={[0, 0.2, 0]}>
      <mesh>
        <sphereGeometry args={[1.1, 32, 32]} />
        <meshStandardMaterial color={colors.head} roughness={0.4} metalness={0.15} />
      </mesh>

      <mesh position={[0, 0.2, 1.25]}>
        <boxGeometry args={[0.9, 0.6, 1.2]} />
        <meshStandardMaterial color={colors.head} roughness={0.35} metalness={0.1} />
      </mesh>

      <mesh ref={jawRef} position={[0, -0.1, 1.35]}>
        <boxGeometry args={[0.9, 0.25, 0.9]} />
        <meshStandardMaterial color={colors.body} roughness={0.4} metalness={0.05} />
      </mesh>

      <mesh position={[0, -1.2, -0.2]}>
        <capsuleGeometry args={[0.6, 1.2, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.5} metalness={0.1} />
      </mesh>

      <mesh position={[0.9, -1.3, -0.6]}>
        <capsuleGeometry args={[0.18, 1.2, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh position={[-0.9, -1.3, -0.6]}>
        <capsuleGeometry args={[0.18, 1.2, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.45} metalness={0.05} />
      </mesh>

      <mesh position={[0, -0.1, -1.4]} rotation={[0, 0, Math.PI / 12]}>
        <capsuleGeometry args={[0.18, 2.2, 8, 16]} />
        <meshStandardMaterial color={colors.body} roughness={0.45} metalness={0.05} />
      </mesh>

      <mesh ref={leftArmRef} position={[-1.0, -0.4, 0.2]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.16, 0.9, 6, 12]} />
        <meshStandardMaterial color={colors.body} roughness={0.45} metalness={0.05} />
      </mesh>
      <mesh ref={rightArmRef} position={[1.0, -0.4, 0.2]} rotation={[0, 0, -Math.PI / 2]}>
        <capsuleGeometry args={[0.16, 0.9, 6, 12]} />
        <meshStandardMaterial color={colors.body} roughness={0.45} metalness={0.05} />
      </mesh>

      <mesh position={[0, 1.0, -0.2]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.5, 0.8, 3]} />
        <meshStandardMaterial color={colors.accent} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[0.2, 0.9, -0.6]} rotation={[0.2, 0.2, 0]}>
        <coneGeometry args={[0.35, 0.6, 3]} />
        <meshStandardMaterial color={colors.accent} roughness={0.3} metalness={0.1} />
      </mesh>
      <mesh position={[-0.2, 0.8, -1.0]} rotation={[0.2, -0.2, 0]}>
        <coneGeometry args={[0.28, 0.5, 3]} />
        <meshStandardMaterial color={colors.accent} roughness={0.3} metalness={0.1} />
      </mesh>

      <mesh ref={leftEyeRef} position={[-0.35, 0.35, 1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.35, 0.35, 1]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#0A0A0A" />
      </mesh>

      <mesh ref={smileRef} position={[0, -0.15, 1.8]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.04, 8, 24, Math.PI]} />
        <meshStandardMaterial color={colors.dark} />
      </mesh>

      <mesh position={[-0.25, 0.55, 0.9]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={colors.dark} />
      </mesh>
      <mesh position={[0.25, 0.55, 0.9]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color={colors.dark} />
      </mesh>

      <mesh ref={leftPupilRef} position={[-0.25, 0.55, 1.02]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh ref={rightPupilRef} position={[0.25, 0.55, 1.02]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

export default function DinoLogin({ mood = "idle", eyesClosed = false, typing = false }) {
  return (
    <div className="dinoStage">
      <Canvas camera={{ position: [0, 0.8, 4.2], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 3, 4]} intensity={1.2} />
        <pointLight position={[-2, 1, 2]} intensity={0.6} />
        <DinoMesh mood={mood} eyesClosed={eyesClosed} typing={typing} />
      </Canvas>
    </div>
  );
}
