import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cameraDistance, Galaxy, Point } from './universe-data';
import { EnterpriseShip } from './enterprise-ship';

/** Owns all GPU resources and DOM listeners; Angular only receives semantic events. */
export class UniverseRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly observer: ResizeObserver;
  private readonly planets: THREE.InstancedMesh;
  private readonly halos: THREE.InstancedMesh;
  private readonly lines: THREE.LineSegments;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly dummy = new THREE.Object3D();
  private readonly color = new THREE.Color();
  private readonly time = { value: 0 };
  private stars?: THREE.Points;
  private enterprise?: EnterpriseShip;
  private flightLabel?: HTMLSpanElement;
  private readonly labels: { element: HTMLSpanElement; position: THREE.Vector3; index: number }[] = [];
  private readonly media = matchMedia('(prefers-reduced-motion: reduce)');
  private readonly cleanups: (() => void)[] = [];
  private flight?: {
    start: number;
    from: THREE.Vector3;
    targetFrom: THREE.Vector3;
    to: THREE.Vector3;
    target: THREE.Vector3;
  };
  private hover = -1;
  private selected = -1;
  private filter = new Set<number>();
  private showLabels = true;
  private showConnections = true;
  private disposed = false;
  private pointerDown = new THREE.Vector2();
  private pendingPointer?: PointerEvent;
  private readonly extent: number;

  constructor(
    private host: HTMLElement,
    private galaxy: Galaxy,
    private onSelect: (index: number, focus: boolean) => void,
    private onHover: (index: number, x: number, y: number) => void,
    private onManual: () => void,
    private onFailure: () => void
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    try {
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 600 ? 1.25 : 1.75));
      this.renderer.setClearColor(0x030711, 0);
      this.renderer.domElement.setAttribute(
        'aria-label',
        'Dreidimensionale Büchergalaxie. Bücher auch über Suche und Buchliste auswählen.'
      );
      this.host.append(this.renderer.domElement);
      this.enterprise = new EnterpriseShip();
      this.camera.add(this.enterprise);
      this.scene.add(this.camera);
      this.flightLabel = document.createElement('span');
      this.flightLabel.className = 'space-label';
      this.flightLabel.textContent = 'USS ENTERPRISE · NCC-1701-D';
      this.flightLabel.setAttribute('aria-hidden', 'true');
      this.flightLabel.style.cssText =
        'left:45%;top:60%;max-width:none;transform:translateX(-50%);color:#a9dcff;font-size:10px;letter-spacing:0.12em';
      this.flightLabel.hidden = true;
      this.host.append(this.flightLabel);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.minDistance = 4;
      this.controls.maxDistance = 12000;
      this.controls.autoRotateSpeed = 0.3;
      this.controls.addEventListener('start', this.manual);
      this.media.addEventListener('change', this.motionChanged);
      const geometry = new THREE.SphereGeometry(1, 24, 16);
      const material = new THREE.MeshStandardMaterial({
        roughness: 0.48,
        metalness: 0.25,
        emissive: 0xffffff,
        emissiveIntensity: 0.24
      });
      // Procedural bands rotate on the GPU; no per-book textures or frame-by-frame matrix uploads.
      material.onBeforeCompile = shader => {
        shader.uniforms['universeTime'] = this.time;
        shader.vertexShader = 'uniform float universeTime;\nvarying vec3 universeLocal;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nuniverseLocal = position;\ntransformed.y += sin(universeTime * 0.6 + instanceMatrix[3].x) * 0.08;'
        );
        shader.fragmentShader = 'uniform float universeTime;\nvarying vec3 universeLocal;\n' + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          `#include <color_fragment>
        float longitude = atan(universeLocal.z, universeLocal.x) + universeTime * 0.07;
        float bands = sin(universeLocal.y * 19.0 + sin(longitude * 4.0) * 1.2);
        diffuseColor.rgb *= 0.84 + bands * 0.16;`
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <emissivemap_fragment>',
          '#include <emissivemap_fragment>\n#ifdef USE_COLOR\ntotalEmissiveRadiance *= vColor.rgb;\n#endif'
        );
      };
      this.planets = new THREE.InstancedMesh(geometry, material, galaxy.planets.length);
      this.halos = new THREE.InstancedMesh(
        geometry,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.BackSide
        }),
        galaxy.planets.length
      );
      this.scene.add(this.planets, this.halos, new THREE.AmbientLight(0x9aabff, 1.8));
      const light = new THREE.DirectionalLight(0xffffff, 3);
      light.position.set(30, 60, 40);
      this.scene.add(light);
      const vertices: number[] = [];
      galaxy.connections.forEach(edge =>
        vertices.push(...galaxy.planets[edge.source].position, ...galaxy.planets[edge.target].position)
      );
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(vertices.length), 3));
      this.lines = new THREE.LineSegments(
        lineGeometry,
        new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false })
      );
      this.scene.add(this.lines);
      this.extent = Math.max(15, ...galaxy.planets.map(p => Math.hypot(...p.position) + p.radius + 5));
      this.addStars();
      for (const cluster of galaxy.clusters) {
        const anchor: Point = [cluster.position[0], cluster.radius * 0.3, cluster.position[2]];
        this.addLabel(cluster.name, anchor, cluster.color, true);
      }
      const labelCounts = new Map<string, number>();
      galaxy.planets.forEach((planet, index) => {
        const count = labelCounts.get(planet.topic) ?? 0;
        if (count < 2) this.addLabel(planet.book.title, planet.position, planet.color, false, index);
        labelCounts.set(planet.topic, count + 1);
      });
      this.updateAppearance();
      this.resize();
      this.fit(true);
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(host);
      this.listen('pointerdown', event => this.pointerDown.set(event.clientX, event.clientY));
      this.listen('pointermove', event => {
        this.pendingPointer = event;
      });
      this.listen('pointerleave', () => {
        this.pendingPointer = undefined;
        this.setHover(-1, 0, 0);
      });
      this.listen('pointerup', event => {
        if (event.button !== 0 || this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > 5)
          return;
        const index = this.pick(event);
        if (index >= 0) this.onSelect(index, false);
      });
      this.listen('dblclick', event => {
        const index = this.pick(event);
        if (index >= 0) this.onSelect(index, true);
      });
      const lost = (event: Event) => {
        event.preventDefault();
        this.renderer.setAnimationLoop(null);
        this.onFailure();
      };
      this.renderer.domElement.addEventListener('webglcontextlost', lost);
      this.cleanups.push(() => this.renderer.domElement.removeEventListener('webglcontextlost', lost));
      this.renderer.setAnimationLoop(this.frame);
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private listen(type: string, handler: (event: PointerEvent) => void): void {
    const listener = handler as EventListener;
    this.renderer.domElement.addEventListener(type, listener);
    this.cleanups.push(() => this.renderer.domElement.removeEventListener(type, listener));
  }
  private readonly manual = (): void => {
    this.stopFlight();
    this.controls.autoRotate = false;
    this.onManual();
  };
  private readonly motionChanged = (): void => {
    if (this.media.matches) {
      this.controls.autoRotate = false;
      this.stopFlight();
    }
  };
  private resize(): void {
    const width = this.host.clientWidth,
      height = this.host.clientHeight;
    const previousAspect = this.camera.aspect;
    this.camera.aspect = width / Math.max(1, height);
    if (this.flightLabel) {
      const portrait = this.camera.aspect < 0.9;
      this.flightLabel.style.left = portrait ? '78%' : '45%';
      this.flightLabel.style.top = portrait ? '26%' : '60%';
      this.flightLabel.style.fontSize = portrait ? '6px' : '10px';
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (Math.abs(previousAspect - this.camera.aspect) > 0.05 && this.extent) {
      const planet = this.galaxy.planets[this.selected];
      if (planet) this.focus(planet.position, Math.max(7, planet.radius * 5), true);
      else this.fit(true);
    }
  }
  private addStars(): void {
    const positions: number[] = [];
    let seed = 42;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 1800; i++) {
      const angle = random() * Math.PI * 2,
        y = random() * 2 - 1,
        radius = this.extent * (2 + random() * 3);
      positions.push(
        Math.cos(angle) * Math.sqrt(1 - y * y) * radius,
        y * radius,
        Math.sin(angle) * Math.sqrt(1 - y * y) * radius
      );
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xb5c8f3,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
      depthWrite: false
    });
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `
        float glow = 1.0 - smoothstep(0.05, 0.5, length(gl_PointCoord - vec2(0.5)));
        diffuseColor.a *= glow;
        #include <opaque_fragment>`
      );
    };
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }
  private addLabel(text: string, position: Point, color: string, cluster: boolean, index = -1): void {
    const element = document.createElement('span');
    element.textContent = text;
    element.className = cluster ? 'space-label cluster-label' : 'space-label';
    element.style.color = color;
    element.setAttribute('aria-hidden', 'true');
    this.host.append(element);
    this.labels.push({
      element,
      position: new THREE.Vector3(...position).add(new THREE.Vector3(0, cluster ? 6 : 2.8, 0)),
      index
    });
  }
  private pick(event: PointerEvent | MouseEvent): number {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObject(this.planets)[0]?.instanceId ?? -1;
  }
  private setHover(index: number, x: number, y: number): void {
    if (index === this.hover) return;
    this.hover = index;
    this.host.style.cursor = index >= 0 ? 'pointer' : 'grab';
    this.updateAppearance();
    this.onHover(index, x, y);
  }
  setState(selected: number, matching: Set<number>, labels: boolean, connections: boolean, rotation: boolean): void {
    this.selected = selected;
    this.filter = matching;
    this.showLabels = labels;
    this.showConnections = connections;
    this.controls.autoRotate = rotation && !this.media.matches;
    if (selected >= 0 && !this.labels.some(label => label.index === selected)) {
      // Keep the bounded label pool, replacing only its previous dynamically selected book.
      const dynamic = this.labels.find(label => label.element.dataset['dynamic']);
      if (dynamic) {
        dynamic.element.remove();
        this.labels.splice(this.labels.indexOf(dynamic), 1);
      }
      const planet = this.galaxy.planets[selected];
      this.addLabel(planet.book.title, planet.position, planet.color, false, selected);
      this.labels[this.labels.length - 1].element.dataset['dynamic'] = 'true';
    }
    this.updateAppearance();
  }
  private updateAppearance(): void {
    this.galaxy.planets.forEach((planet, index) => {
      const active = index === this.selected || index === this.hover;
      this.dummy.position.set(...planet.position);
      this.dummy.scale.setScalar(planet.radius * (active ? 1.18 : 1));
      this.dummy.updateMatrix();
      this.planets.setMatrixAt(index, this.dummy.matrix);
      this.color.set(planet.color).multiplyScalar(active ? 1.5 : this.filter.has(index) ? 1 : 0.12);
      this.planets.setColorAt(index, this.color);
      this.dummy.scale.multiplyScalar(active ? 1.6 : 1.28);
      this.dummy.updateMatrix();
      this.halos.setMatrixAt(index, this.dummy.matrix);
      this.halos.setColorAt(index, this.color);
    });
    this.planets.instanceMatrix.needsUpdate = true;
    this.halos.instanceMatrix.needsUpdate = true;
    if (this.planets.instanceColor) this.planets.instanceColor.needsUpdate = true;
    if (this.halos.instanceColor) this.halos.instanceColor.needsUpdate = true;
    this.planets.computeBoundingSphere();
    this.halos.computeBoundingSphere();
    this.lines.visible = this.showConnections;
    const colors = this.lines.geometry.getAttribute('color');
    const focus = this.hover >= 0 ? this.hover : this.selected;
    this.galaxy.connections.forEach((edge, index) => {
      const strength =
        !this.filter.has(edge.source) || !this.filter.has(edge.target)
          ? 0.015
          : focus < 0
            ? 0.16
            : edge.source === focus || edge.target === focus
              ? 1
              : 0.025;
      this.color.set(0x8ab9ff).multiplyScalar(strength);
      colors.setXYZ(index * 2, this.color.r, this.color.g, this.color.b);
      colors.setXYZ(index * 2 + 1, this.color.r, this.color.g, this.color.b);
    });
    colors.needsUpdate = true;
  }
  focus(position: Point, radius: number, immediate = false): void {
    const target = new THREE.Vector3(...position);
    const distance = cameraDistance(radius, this.camera.aspect);
    const to = target.clone().add(new THREE.Vector3(0, distance * 0.75, distance * 0.66));
    if (immediate || this.media.matches) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.stopFlight();
      this.controls.update();
      return;
    }
    this.flight = {
      start: performance.now(),
      from: this.camera.position.clone(),
      targetFrom: this.controls.target.clone(),
      to,
      target
    };
  }
  fit(immediate = false): void {
    this.focus([0, 0, 0], this.extent, immediate);
  }
  stopFlight(): void {
    this.flight = undefined;
    if (this.enterprise) this.enterprise.visible = false;
    if (this.flightLabel) this.flightLabel.hidden = true;
  }
  private readonly frame = (now: number): void => {
    if (this.disposed || document.hidden) return;
    if (this.media.matches && this.flight) this.stopFlight();
    if (this.pendingPointer) {
      const event = this.pendingPointer;
      this.pendingPointer = undefined;
      this.setHover(this.pick(event), event.offsetX, event.offsetY);
    }
    if (this.flight) {
      const t = Math.min(1, (now - this.flight.start) / 1100),
        eased = t * t * (3 - 2 * t);
      this.camera.position.lerpVectors(this.flight.from, this.flight.to, eased);
      this.controls.target.lerpVectors(this.flight.targetFrom, this.flight.target, eased);
      this.enterprise?.animate(t, this.camera.aspect);
      if (this.flightLabel) this.flightLabel.hidden = !this.enterprise?.visible;
      if (t === 1) this.stopFlight();
    }
    this.controls.update();
    this.time.value = this.media.matches ? 0 : now / 1000;
    if (this.stars && !this.media.matches) this.stars.rotation.y = now * 0.000002;
    if (!this.media.matches && this.selected >= 0) {
      const planet = this.galaxy.planets[this.selected];
      this.dummy.position.set(...planet.position);
      this.dummy.scale.setScalar(planet.radius * (1.8 + Math.sin(now * 0.002) * 0.08));
      this.dummy.updateMatrix();
      this.halos.setMatrixAt(this.selected, this.dummy.matrix);
      this.halos.instanceMatrix.needsUpdate = true;
    }
    const occupied: { x: number; y: number }[] = [];
    for (const label of this.labels) {
      const point = label.position.clone().project(this.camera);
      const x = ((point.x + 1) * this.host.clientWidth) / 2;
      const y = ((1 - point.y) * this.host.clientHeight) / 2;
      const bookVisible =
        label.index < 0 || label.index === this.selected || this.camera.position.distanceTo(label.position) < 50;
      const visible =
        bookVisible &&
        this.showLabels &&
        point.z > -1 &&
        point.z < 1 &&
        Math.abs(point.x) < 0.96 &&
        Math.abs(point.y) < 0.94;
      const overlaps = occupied.some(other => Math.abs(other.x - x) < 145 && Math.abs(other.y - y) < 22);
      label.element.hidden = !visible || overlaps;
      if (visible && !overlaps) {
        occupied.push({ x, y });
        label.element.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      }
    }
    try {
      this.renderer.render(this.scene, this.camera);
    } catch {
      this.renderer.setAnimationLoop(null);
      this.onFailure();
    }
  };
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopFlight();
    this.renderer.setAnimationLoop(null);
    this.observer?.disconnect();
    this.controls?.removeEventListener('start', this.manual);
    this.controls?.dispose();
    this.media.removeEventListener('change', this.motionChanged);
    this.cleanups.forEach(cleanup => cleanup());
    const resources = new Set<THREE.BufferGeometry | THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        resources.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material])
          resources.add(material);
      }
      if (object instanceof THREE.InstancedMesh) object.dispose();
    });
    resources.forEach(resource => resource.dispose());
    this.scene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.labels.forEach(label => label.element.remove());
    this.flightLabel?.remove();
    this.renderer.domElement.remove();
  }
}
