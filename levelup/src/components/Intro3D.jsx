import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import LogoCard from "./LogoCard";

export default function Intro3D() {
  return (
    <div style={{ height: "100vh", background: "#050A10" }}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 42 }}>
        {/* lights */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 3]} intensity={1.3} />
        <pointLight position={[-2, 1, 2]} intensity={1.0} />

        {/* Logo object */}
        <LogoCard />

        {/* gives a premium studio reflection feel */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
}
