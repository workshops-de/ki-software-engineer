import * as THREE from 'three';

/** A small, asset-free Galaxy-class ship, viewed from a chase camera. Forward is -Z. */
export class EnterpriseShip extends THREE.Group {
  private readonly hull = new THREE.MeshStandardMaterial({ color: 0xb6c5d4, metalness: 0.55, roughness: 0.4 });
  private readonly trim = new THREE.MeshStandardMaterial({ color: 0x516479, metalness: 0.65, roughness: 0.35 });
  private readonly warp = new THREE.MeshBasicMaterial({ color: 0x52cfff });
  private readonly bussard = new THREE.MeshBasicMaterial({ color: 0xff543b });
  private readonly deflector = new THREE.MeshBasicMaterial({ color: 0x79baff });

  constructor() {
    super();
    this.name = 'USS Enterprise NCC-1701-D';
    const sphere = new THREE.SphereGeometry(1, 32, 16);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const part = (
      name: string,
      geometry: THREE.BufferGeometry,
      material: THREE.Material,
      position: [number, number, number],
      scale: [number, number, number]
    ) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name;
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      this.add(mesh);
      return mesh;
    };

    part('Oval saucer rim', sphere, this.trim, [0, 0.24, -0.8], [1.6, 0.13, 1.15]);
    part('Saucer section', sphere, this.hull, [0, 0.3, -0.8], [1.55, 0.18, 1.1]);
    part('Bridge', sphere, this.hull, [0, 0.49, -0.65], [0.27, 0.1, 0.32]);
    part('Neck', sphere, this.hull, [0, 0.04, 0.25], [0.32, 0.3, 0.8]);
    part('Engineering hull', sphere, this.hull, [0, -0.18, 0.85], [0.48, 0.3, 1.3]);
    part('Navigational deflector', sphere, this.deflector, [0, -0.2, -0.3], [0.26, 0.16, 0.06]);
    for (const side of [-1, 1]) {
      const pylon = part('Swept nacelle pylon', box, this.hull, [side * 0.75, -0.02, 1.15], [1.2, 0.1, 0.3]);
      pylon.rotation.z = side * 0.24;
      pylon.rotation.y = -side * 0.3;
      part('Warp nacelle', sphere, this.hull, [side * 1.35, 0.14, 1.3], [0.22, 0.19, 1.25]);
      part('Blue warp grille', sphere, this.warp, [side * 1.35, 0.32, 1.35], [0.13, 0.05, 1.02]);
      part('Red Bussard collector', sphere, this.bussard, [side * 1.35, 0.14, 0.12], [0.18, 0.15, 0.18]);
      part('Impulse engine', box, this.bussard, [side * 0.48, 0.3, 0.22], [0.28, 0.06, 0.06]);
    }
    this.scale.setScalar(0.58);
    this.visible = false;
  }

  animate(progress: number, aspect: number): void {
    this.visible = progress > 0 && progress < 1;
    const envelope = Math.sin(Math.PI * progress);
    const viewportScale = Math.min(1, aspect / 0.9);
    this.scale.setScalar(0.58 * viewportScale);
    this.position.set((-0.55 + Math.sin(progress * Math.PI * 2) * 0.22) * viewportScale, 0.05 + envelope * 0.12, -5);
    if (aspect < 0.9) {
      // The mobile details sheet covers the centre; fly beside the topic controls above it.
      this.scale.setScalar((0.18 * aspect) / 0.55);
      this.position.set(5 * Math.tan(THREE.MathUtils.degToRad(25)) * aspect * 0.62, 1.22, -5);
    }
    this.rotation.set(
      0.2 + envelope * 0.08,
      Math.sin(progress * Math.PI * 2) * 0.12,
      -Math.sin(progress * Math.PI * 2) * 0.18
    );
    // Ease into and out of view without changing the existing camera-flight duration.
    const opacity = Math.min(1, progress * 8, (1 - progress) * 8);
    for (const material of [this.hull, this.trim, this.warp, this.bussard, this.deflector]) {
      material.transparent = true;
      material.opacity = opacity;
    }
  }
}
