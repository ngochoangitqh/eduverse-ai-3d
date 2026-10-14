import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function KnowledgeCore3D() {
  const mountRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 5.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(220, 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Lõi đa diện phát sáng (Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.15, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      emissive: 0x312e81,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // Khung dây bên ngoài (Wireframe)
    const wireGeo = new THREE.IcosahedronGeometry(1.55, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      wireframe: true,
      transparent: true,
      opacity: 0.45
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    // Vòng quỹ đạo Cyan (Torus Ring)
    const ringGeo = new THREE.TorusGeometry(2.0, 0.03, 16, 100);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.75
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.6;
    ringMesh.rotation.y = Math.PI / 8;
    group.add(ringMesh);

    // Ánh sáng
    const light1 = new THREE.DirectionalLight(0xffffff, 2.2);
    light1.position.set(4, 5, 5);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 3, 10);
    light2.position.set(-4, -3, 3);
    scene.add(light2);

    scene.add(new THREE.AmbientLight(0x404070, 1.5));

    // Kéo chuột để xoay 3D
    let isDragging = false;
    let prev = { x: 0, y: 0 };

    const onDown = (e) => { isDragging = true; prev = { x: e.clientX, y: e.clientY }; };
    const onUp = () => { isDragging = false; };
    const onMove = (e) => {
      if (!isDragging) return;
      group.rotation.y += (e.clientX - prev.x) * 0.012;
      group.rotation.x += (e.clientY - prev.y) * 0.012;
      prev = { x: e.clientX, y: e.clientY };
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      if (!isDragging) {
        coreMesh.rotation.y += 0.008;
        coreMesh.rotation.x += 0.004;
        wireMesh.rotation.y -= 0.005;
        ringMesh.rotation.z += 0.012;
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      dom.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <div ref={mountRef} className="w-[220px] h-[220px] cursor-grab active:cursor-grabbing flex items-center justify-center" />
      <span className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1">
        👆 Kéo chuột trên khối cầu 3D để xoay góc nhìn
      </span>
    </div>
  );
}