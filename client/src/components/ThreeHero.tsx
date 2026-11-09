import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Fondo animado para la cabecera: red de nodos flotando entre sólidos
 * geométricos de baja poligonización, en los tonos morado/amarillo de la marca.
 * Se desactiva si el usuario prefiere menos movimiento.
 */
export default function ThreeHero({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    const purpleLight = new THREE.PointLight(0x9d7bf7, 2.2, 60);
    purpleLight.position.set(-10, 6, 10);
    const yellowLight = new THREE.PointLight(0xfacc15, 1.6, 60);
    yellowLight.position.set(10, -4, 8);
    scene.add(ambient, purpleLight, yellowLight);

    // Sólidos geométricos flotantes (icosaedros/octaedros de alambre)
    const shapeGeometries = [
      new THREE.IcosahedronGeometry(1.6, 0),
      new THREE.OctahedronGeometry(1.3, 0),
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.TetrahedronGeometry(1.4, 0),
      new THREE.OctahedronGeometry(0.9, 0),
    ];
    const shapeColors = [0x9d7bf7, 0xfacc15, 0x6d28d9, 0xc4b5fd, 0xfde68a];

    const shapes: { mesh: THREE.Mesh; speed: THREE.Vector3; bobSpeed: number; bobOffset: number; baseY: number }[] = [];
    const spread = { x: 13, y: 7, z: 6 };
    for (let i = 0; i < shapeGeometries.length; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: shapeColors[i],
        wireframe: true,
        transparent: true,
        opacity: 0.55,
      });
      const mesh = new THREE.Mesh(shapeGeometries[i], material);
      const x = (Math.random() - 0.5) * spread.x * 2;
      const y = (Math.random() - 0.5) * spread.y * 2;
      const z = (Math.random() - 0.5) * spread.z - 2;
      mesh.position.set(x, y, z);
      scene.add(mesh);
      shapes.push({
        mesh,
        speed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
          (Math.random() - 0.5) * 0.004,
        ),
        bobSpeed: 0.3 + Math.random() * 0.3,
        bobOffset: Math.random() * Math.PI * 2,
        baseY: y,
      });
    }

    // Partículas (red de puntos tipo constelación)
    const particleCount = 90;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 3;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.09,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    function resize() {
      if (!mount) return;
      const { clientWidth, clientHeight } = mount;
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    }
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    const pointer = { x: 0, y: 0 };
    function handlePointerMove(e: PointerEvent) {
      const rect = mount!.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    }
    mount.addEventListener('pointermove', handlePointerMove);

    let frameId = 0;
    let t = 0;
    function animate() {
      t += 0.016;
      for (const s of shapes) {
        s.mesh.rotation.x += s.speed.x * 6;
        s.mesh.rotation.y += s.speed.y * 6;
        s.mesh.position.y = s.baseY + Math.sin(t * s.bobSpeed + s.bobOffset) * 0.6;
      }
      particles.rotation.y += 0.0006;

      camera.position.x += (pointer.x * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (-pointer.y * 1 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }

    if (reduceMotion) {
      renderer.render(scene, camera);
    } else {
      animate();
    }

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      mount.removeEventListener('pointermove', handlePointerMove);
      shapeGeometries.forEach((g) => g.dispose());
      shapes.forEach((s) => (s.mesh.material as THREE.Material).dispose());
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className={`three-hero ${className ?? ''}`} aria-hidden="true" />;
}
