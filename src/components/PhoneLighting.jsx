import { Environment } from "@react-three/drei";

/**
 * The lighting every phone scene uses: strong ambient and key light (the look
 * the phone, cup, shoe and diagram were all tuned under) plus the "city"
 * environment for reflections.
 */
export default function PhoneLighting() {
  return (
    <>
      <directionalLight position={[-1.2, 1, 0.4]} intensity={6} />
      <ambientLight intensity={6} />
      <Environment preset="city" />
    </>
  );
}
