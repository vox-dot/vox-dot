import React, { useRef, useEffect, useState } from "react";

import { useVoice } from "./voice-context";
import * as THREE from "three";

const VoiceVisualizer: React.FC<any> = ({ parentDivRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Mesh[]>([]);
  const lightningRef = useRef<THREE.PointLight[]>([]);
  const clockRef = useRef<THREE.Clock | null>(null);
  const frameIdRef = useRef<number>(0);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  const { isListening, transcript, detectedCommand, commandValue, volume, startListening } =
    useVoice();

  let containerWidth = 0;
  let containerHeight = 0;
  useEffect(() => {
    transformParticlesTo("sphere");
    if (!parentDivRef.current) return;
    console.log("Parent div ref:", containerWidth);
    // Ensure the parentDivRef is set before calculating dimensions
    if (
      parentDivRef?.current?.clientWidth ||
      parentDivRef?.current?.clientHeight
    ) {
      // If container is a ref, use its current value
      containerWidth = parentDivRef?.current.clientWidth;
      containerHeight = parentDivRef?.current?.clientHeight;
    }
    console.log("Container dimensions:", containerWidth, containerHeight);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerWidth / containerHeight,
      1,
      10000
    );
    camera.position.z = 1000;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.className = `${renderer.domElement.className} rounded-lg`;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    light.position.set(-1, 0, 1);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);

    // Create lightning effects
    for (let i = 0; i < 3; i++) {
      const lightning = new THREE.PointLight(0x4444ff, 0, 500);
      lightning.position.set(
        Math.random() * 400 - 200,
        Math.random() * 400 - 200,
        Math.random() * 400 - 200
      );
      scene.add(lightning);
      lightningRef.current.push(lightning);
    }

    const textureLoader = new THREE.TextureLoader();
    const smokeTexture = textureLoader.load(
      "https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png"
    );

    const smokeMaterial = new THREE.MeshLambertMaterial({
      color: 0x0ea5e9,
      map: smokeTexture,
      transparent: true,
      opacity: 0.7,
    });

    const smokeGeo = new THREE.PlaneGeometry(300, 300);

    for (let p = 0; p < 150; p++) {
        let x, y, z;
        const totalParticles = particlesRef.current.length;
      const idx = p / totalParticles;
      const particle = new THREE.Mesh(smokeGeo, smokeMaterial.clone());
    //   particle.position.set(
    //     Math.random() * 500 - 250,
    //     Math.random() * 500 - 250,
    //     Math.random() * 1000 - 100
    //   );
      particle.rotation.z = Math.random() * 360;
    const phi = Math.acos(1 - (2 * p) / totalParticles);
          const theta = Math.PI * (1 + Math.sqrt(5)) * p;
          const radius = 400;

          x = radius * Math.sin(phi) * Math.cos(theta);
          y = radius * Math.sin(phi) * Math.sin(theta);
          z = radius * Math.cos(phi);
      scene.add(particle);
      particlesRef.current.push(particle);
      gsapLikeAnimate(particle.position, { x, y, z }, 1.5);
    }

    clockRef.current = new THREE.Clock();

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current || !containerRef) return;

      setIsResizing(true);
      containerWidth = parentDivRef?.current?.clientWidth || window.innerWidth;
      containerHeight =
        parentDivRef?.current?.clientHeight || window.innerHeight;
      console.log("Resize event:", containerWidth, containerHeight);
      cameraRef.current.aspect = containerWidth / containerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerWidth, containerHeight);
      setIsResizing(false);
    };

    window.addEventListener("resize", handleResize);

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (
        !sceneRef.current ||
        !cameraRef.current ||
        !rendererRef.current ||
        !clockRef.current
      )
        return;

      const delta = clockRef.current.getDelta();
      const time = clockRef.current.getElapsedTime();

      // Animate smoke particles with enhanced reactivity
      particlesRef.current.forEach((particle, i) => {
        // Base rotation
        particle.rotation.z += delta * 0.2;

        // Dynamic movement when listening
        if (isListening) {
          // Create a swirling effect
          const radius = 100 + Math.sin(time + i) * 50;
        //   const radius = 20;
          const angle = time * 0.5 + i * 0.05;

          // Add volume-based turbulence
          const turbulence = volume * 5;
          particle.position.x +=
            Math.sin(angle) * radius * 0.01 +
            (Math.random() - 0.5) * turbulence;
          particle.position.y +=
            Math.cos(angle) * radius * 0.01 +
            (Math.random() - 0.5) * turbulence;

          // Add vertical drift based on volume
          particle.position.y += volume * 2;

          // Contain particles within bounds
          if (Math.abs(particle.position.x) > 500) particle.position.x *= -0.8;
          if (Math.abs(particle.position.y) > 500) particle.position.y *= -0.8;

          // Scale based on volume
          const scale = 1 + volume * 0.8;
          particle.scale.set(scale, scale, scale);

          // Adjust opacity based on volume
          if (particle.material instanceof THREE.MeshLambertMaterial) {
            particle.material.opacity = 0.4 + volume * 0.6;
          }
        } else {
          // Gentle floating motion when not listening
          particle.position.y += Math.sin(time + i) * 0.1;
          particle.scale.setScalar(1);
        }
      });

      // Animate lightning
      lightningRef.current.forEach((lightning, i) => {
        if (isListening && volume > 0.2 && Math.random() < 0.03) {
          lightning.intensity = 2 + Math.random() * 3;
          setTimeout(() => {
            lightning.intensity = 0;
          }, 50 + Math.random() * 50);
        }
      });

      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(frameIdRef.current);

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }

      particlesRef.current.forEach((particle) => {
        particle.geometry.dispose();
        if (particle.material instanceof THREE.Material) {
          particle.material.dispose();
        }
      });

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !detectedCommand) return;

    if (detectedCommand === "color") {
      let color;
      switch (commandValue) {
        case "blue":
          color = new THREE.Color(0x0ea5e9);
          break;
        case "red":
          color = new THREE.Color(0xef4444);
          break;
        case "green":
          color = new THREE.Color(0x10b981);
          break;
        case "purple":
          color = new THREE.Color(0x8b5cf6);
          break;
        case "yellow":
          color = new THREE.Color(0xf59e0b);
          break;
        case "orange":
          color = new THREE.Color(0xf97316);
          break;
        case "pink":
          color = new THREE.Color(0xec4899);
          break;
        case "teal":
          color = new THREE.Color(0x14b8a6);
          break;
        default:
          color = new THREE.Color(0x43c9eb);
      }

      particlesRef.current.forEach((particle) => {
        if (particle.material instanceof THREE.MeshLambertMaterial) {
          particle.material.color = color;
        }
      });
    }

    if (detectedCommand === "shape") {
      switch (commandValue) {
        case "sphere":
          transformParticlesTo("sphere");
          break;
        case "cube":
          transformParticlesTo("sphere");
          break;
        case "spiral":
          transformParticlesTo("spiral");
          break;
        case "wave":
          transformParticlesTo("wave");
          break;
        case "particles":
          resetParticles();
          break;
      }
    }

    if (detectedCommand === "speed") {
      let speedFactor;
      switch (commandValue) {
        case "slow":
          speedFactor = 0.1;
          break;
        case "fast":
          speedFactor = 0.5;
          break;
        case "faster":
          speedFactor = 0.8;
          break;
        case "slower":
          speedFactor = 0.05;
          break;
        case "medium":
        default:
          speedFactor = 0.2;
      }

      (window as any).particleSpeedFactor = speedFactor;
    }

    if (detectedCommand === "reset") {
      resetParticles();
      particlesRef.current.forEach((particle) => {
        if (particle.material instanceof THREE.MeshLambertMaterial) {
          particle.material.color = new THREE.Color(0x0ea5e9);
        }
      });
      (window as any).particleSpeedFactor = 0.2;
    }
  }, [detectedCommand, commandValue, transcript]);

  const transformParticlesTo = (shape: string) => {
    if (!particlesRef.current.length) return;

    // console.log("Transforming particles to shape:", shape);
    const totalParticles = particlesRef.current.length;

    particlesRef.current.forEach((particle, i) => {
      let x, y, z;
      const idx = i / totalParticles;

      switch (shape) {
        case "sphere": {
          const phi = Math.acos(1 - (2 * i) / totalParticles);
          const theta = Math.PI * (1 + Math.sqrt(5)) * i;
          const radius = 400;

          x = radius * Math.sin(phi) * Math.cos(theta);
          y = radius * Math.sin(phi) * Math.sin(theta);
          z = radius * Math.cos(phi);
          break;
        }
        case "cube": {
          const size = 400;
          const edge = Math.cbrt(totalParticles);
          const ix = i % edge;
          const iy = Math.floor(i / edge) % edge;
          const iz = Math.floor(i / (edge * edge));

          x = (ix / edge) * size - size / 2;
          y = (iy / edge) * size - size / 2;
          z = (iz / edge) * size - size / 2;
          break;
        }
        case "spiral": {
          const angle = i * 0.1;
          const radius = 10 + i;

          x = radius * Math.cos(angle);
          y = radius * Math.sin(angle);
          z = i * 2 - totalParticles;
          break;
        }
        case "wave": {
          const t = i / totalParticles;
          const radius = 400;

          x = (t * 2 - 1) * radius;
          y = Math.sin(t * Math.PI * 4) * 100;
          z = Math.cos(t * Math.PI * 4) * 100;
          break;
        }
        default: {
          x = Math.random() * 500 - 250;
          y = Math.random() * 500 - 250;
          z = Math.random() * 1000 - 100;
        }
      }

      gsapLikeAnimate(particle.position, { x, y, z }, 1.5);
    });
  };

  const resetParticles = () => {
    particlesRef.current.forEach((particle) => {
      const x = Math.random() * 500 - 250;
      const y = Math.random() * 500 - 250;
      const z = Math.random() * 1000 - 100;

      gsapLikeAnimate(particle.position, { x, y, z }, 1.5);
      particle.rotation.z = Math.random() * 360;
    });
  };

  const gsapLikeAnimate = (
    obj: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
    duration: number
  ) => {
    const startX = obj.x;
    const startY = obj.y;
    const startZ = obj.z;
    const startTime = Date.now();

    const updatePosition = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeOutCubic(progress);

      obj.x = startX + (target.x - startX) * easeProgress;
      obj.y = startY + (target.y - startY) * easeProgress;
      obj.z = startZ + (target.z - startZ) * easeProgress;

      if (progress < 1) {
        requestAnimationFrame(updatePosition);
      }
    };

    updatePosition();
  };

  const easeOutCubic = (x: number): number => {
    return 1 - Math.pow(1 - x, 3);
  };

  return (
    <>
        <div
        ref={containerRef}
        style={{ display: `${isResizing ? "none" : "block"}` }}
        className="inset-0 rounded-lg"
        />
    </>
  );
};

export default VoiceVisualizer;
