/* Galaxa Tech 3D hero: glossy orange knot, orbit rings and floating cubes (Three.js). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function start(canvas, hero) {
  var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return false;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  var scene = new THREE.Scene();
  var pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;

  var cam = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  cam.position.set(0, 0, 10);

  var group = new THREE.Group(); scene.add(group);
  var knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.35, 0.42, 280, 48, 2, 3),
    new THREE.MeshPhysicalMaterial({ color: 0xff4d06, metalness: 0.3, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25 })
  );
  group.add(knot);

  var rings = [];
  [2.55, 3.25, 4.0].forEach(function (r, i) {
    var m = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 200), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xff4d06 : 0x0b0b0b, transparent: true, opacity: i === 1 ? 0.7 : 0.45 }));
    m.rotation.set(1 + i * 0.5, i * 0.7, 0); group.add(m); rings.push(m);
  });

  var COUNT = 64, cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.11, 0.11), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.2 }), COUNT);
  var seeds = [], tmp = new THREE.Object3D(), col = new THREE.Color();
  for (var i = 0; i < COUNT; i++) {
    seeds.push({ r: 2.6 + Math.random() * 2.4, a: Math.random() * 6.28, y: (Math.random() - 0.5) * 3.4, s: 0.15 + Math.random() * 0.35, sc: 0.6 + Math.random() * 1.6 });
    cubes.setColorAt(i, col.set(Math.random() > 0.4 ? 0xff4d06 : 0x0b0b0b));
  }
  group.add(cubes);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  var key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(4, 5, 6); scene.add(key);
  var rim = new THREE.PointLight(0xff4d06, 60, 24); rim.position.set(-5, -2, 4); scene.add(rim);

  var mx = 0, my = 0, tx = 0, ty = 0, running = true, last = performance.now(), time = 0;
  addEventListener('pointermove', function (e) { tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
    var vh = 2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.z, vw = vh * cam.aspect;
    group.position.set(vw * 0.1, vh * 0.05, 0);
    var s = Math.min(1.3, (vh * 0.62) / 6.2 * 1.5); group.scale.setScalar(s);
  }
  resize(); addEventListener('resize', resize);

  new IntersectionObserver(function (es) { running = es[0].isIntersecting; }, { threshold: 0.02 }).observe(hero);
  document.addEventListener('visibilitychange', function () { running = !document.hidden; });

  function tick(now) {
    requestAnimationFrame(tick);
    if (!running) { last = now; return; }
    var dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    mx += (tx - mx) * 0.05; my += (ty - my) * 0.05;
    knot.rotation.x = time * 0.22 + my * 0.5;
    knot.rotation.y = time * 0.3 + mx * 0.7;
    rings.forEach(function (r, i) { r.rotation.z += dt * (0.12 + i * 0.07) * (i % 2 ? -1 : 1); r.rotation.x += dt * 0.05; });
    group.rotation.y = mx * 0.18; group.rotation.x = my * 0.1;
    for (var i = 0; i < COUNT; i++) {
      var sd = seeds[i], a = sd.a + time * sd.s * 0.4;
      tmp.position.set(Math.cos(a) * sd.r, sd.y + Math.sin(time * sd.s + i) * 0.2, Math.sin(a) * sd.r * 0.7);
      tmp.rotation.set(time * sd.s, time * sd.s * 1.3, 0); tmp.scale.setScalar(sd.sc);
      tmp.updateMatrix(); cubes.setMatrixAt(i, tmp.matrix);
    }
    cubes.instanceMatrix.needsUpdate = true;
    renderer.render(scene, cam);
  }
  requestAnimationFrame(tick);
  return true;
}
