'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, Line, Points, PointMaterial, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// Animated meridian lines on the globe
function MeridianLines() {
  const linesRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  const lines = useMemo(() => {
    const result = []
    // Longitude lines
    for (let i = 0; i < 12; i++) {
      const points = []
      const angle = (i / 12) * Math.PI * 2
      for (let j = 0; j <= 50; j++) {
        const phi = (j / 50) * Math.PI - Math.PI / 2
        const x = Math.cos(phi) * Math.cos(angle) * 2.02
        const y = Math.sin(phi) * 2.02
        const z = Math.cos(phi) * Math.sin(angle) * 2.02
        points.push(new THREE.Vector3(x, y, z))
      }
      result.push(points)
    }
    // Latitude lines
    for (let i = 1; i < 6; i++) {
      const points = []
      const phi = (i / 6) * Math.PI - Math.PI / 2
      for (let j = 0; j <= 50; j++) {
        const angle = (j / 50) * Math.PI * 2
        const x = Math.cos(phi) * Math.cos(angle) * 2.02
        const y = Math.sin(phi) * 2.02
        const z = Math.cos(phi) * Math.sin(angle) * 2.02
        points.push(new THREE.Vector3(x, y, z))
      }
      result.push(points)
    }
    return result
  }, [])

  return (
    <group ref={linesRef}>
      {lines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color="#3b82f6"
          lineWidth={0.5}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  )
}

// Animated knowledge points on the globe
function KnowledgePoints() {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors, sizes } = useMemo(() => {
    const count = 300
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Random points on sphere with varying heights
      const phi = Math.acos(-1 + (2 * Math.random()))
      const theta = Math.random() * Math.PI * 2
      const radius = 2.02 + Math.random() * 0.15

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.cos(phi)
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)

      // Blue-cyan-purple gradient colors
      const colorChoice = Math.random()
      if (colorChoice < 0.33) {
        // Blue
        colors[i * 3] = 0.3
        colors[i * 3 + 1] = 0.5
        colors[i * 3 + 2] = 1.0
      } else if (colorChoice < 0.66) {
        // Cyan
        colors[i * 3] = 0.2
        colors[i * 3 + 1] = 0.8
        colors[i * 3 + 2] = 0.9
      } else {
        // Purple
        colors[i * 3] = 0.6
        colors[i * 3 + 1] = 0.3
        colors[i * 3 + 2] = 0.9
      }

      sizes[i] = 0.03 + Math.random() * 0.04
    }

    return { positions, colors, sizes }
  }, [])

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  )
}

// Pulsing glow effect
function GlobeGlow() {
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02
      glowRef.current.scale.setScalar(scale)
    }
  })

  return (
    <mesh ref={glowRef}>
      <sphereGeometry args={[2.3, 32, 32]} />
      <meshBasicMaterial
        color="#1e40af"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
      />
    </mesh>
  )
}

// Data stream particles
function DataStreams() {
  const particlesRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const positions = new Float32Array(100 * 3)
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2
      const height = (Math.random() - 0.5) * 4
      const radius = 2.5 + Math.random() * 0.5
      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = Math.sin(angle) * radius
    }
    return positions
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array
      for (let i = 0; i < 100; i++) {
        positions[i * 3 + 1] += 0.02
        if (positions[i * 3 + 1] > 2) {
          positions[i * 3 + 1] = -2
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#60a5fa"
        transparent
        opacity={0.6}
      />
    </points>
  )
}

// Main Globe component
function Globe() {
  const globeRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })

  return (
    <group>
      {/* Main globe sphere */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          color="#0f172a"
          metalness={0.3}
          roughness={0.7}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Inner glow */}
      <mesh>
        <sphereGeometry args={[1.98, 32, 32]} />
        <meshBasicMaterial
          color="#1e3a8a"
          transparent
          opacity={0.3}
        />
      </mesh>

      <MeridianLines />
      <KnowledgePoints />
      <GlobeGlow />
      <DataStreams />
    </group>
  )
}

// Ambient particles around the scene
function AmbientParticles() {
  const particlesRef = useRef<THREE.Points>(null)

  const particles = useMemo(() => {
    const positions = new Float32Array(500 * 3)
    for (let i = 0; i < 500; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return positions
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.01
      particlesRef.current.rotation.x = state.clock.elapsedTime * 0.005
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#475569"
        transparent
        opacity={0.4}
      />
    </points>
  )
}

export default function KnowledgeGlobe() {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#3b82f6" />

        <Globe />
        <AmbientParticles />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  )
}
