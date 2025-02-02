import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

var scene, renderer;

var geometry, material, mesh;

var cylinder, rings =[], skydome, skydomeTexture;
var camera

var directionalLight;

var mobiusStrip;

var objects = [];
var currentMaterial = 'normal'
const materials = {
    lambert: new THREE.MeshLambertMaterial({side: THREE.DoubleSide }),
    phong: new THREE.MeshPhongMaterial({shininess: 100, side: THREE.DoubleSide }),
    toon: new THREE.MeshToonMaterial({side: THREE.DoubleSide }),
    normal: new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }),
    basic: new THREE.MeshBasicMaterial({side: THREE.DoubleSide })
};

//////////////////////
/*     UTILITY      */
//////////////////////

function floatEqual(v1, v2, delta = 0.001) {
    return Math.abs(v1 - v2) <= delta;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isClamped(value, min, max, delta = 0.001) {
    return floatEqual(value, min, delta) || floatEqual(value, max, delta);
}

/////////////////////
/* CREATE CAROUSEL */
/////////////////////

function addMobiusStrip(obj, x, y, z) {
    'use strict';
    var radius = 1.5;
    var strips = 16;
    var segments = 5;
    const vertices = [];

    const angleIncrement = (2 * Math.PI) / strips;
    const widthIncrement = 2 / segments;

    for (let i = 0; i < strips; i++) {
        const angle = i * angleIncrement;
        const nextAngle = (i + 1) * angleIncrement;

        for (let j = 0; j < segments; j++) {
            const t = j * widthIncrement - 1;
            const nextT = (j + 1) * widthIncrement - 1;

            const x1 = (radius + t * Math.cos(angle / 2)) * Math.cos(angle);
            const z1 = (radius + t * Math.cos(angle / 2)) * Math.sin(angle);
            const y1 = t * Math.sin(angle / 2);

            const x2 = (radius + nextT * Math.cos(angle / 2)) * Math.cos(angle);
            const z2 = (radius + nextT * Math.cos(angle / 2)) * Math.sin(angle);
            const y2 = nextT * Math.sin(angle / 2);

            const x3 = (radius + t * Math.cos(nextAngle / 2)) * Math.cos(nextAngle);
            const z3 = (radius + t * Math.cos(nextAngle / 2)) * Math.sin(nextAngle);
            const y3 = t * Math.sin(nextAngle / 2);

            const x4 = (radius + nextT * Math.cos(nextAngle / 2)) * Math.cos(nextAngle);
            const z4 = (radius + nextT * Math.cos(nextAngle / 2)) * Math.sin(nextAngle);
            const y4 = nextT * Math.sin(nextAngle / 2);

            vertices.push(x1, y1, z1);
            vertices.push(x2, y2, z2);
            vertices.push(x3, y3, z3);

            vertices.push(x2, y2, z2);
            vertices.push(x4, y4, z4);
            vertices.push(x3, y3, z3);
        }

    }

    const verticesArray = new Float32Array(vertices);

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(verticesArray, 3));
    geometry.computeVertexNormals();

    material = new THREE.MeshPhongMaterial({ color: 0x4bb1df, side: THREE.DoubleSide });
    mesh = new THREE.Mesh(geometry, material);
    mobiusStrip = mesh;

    var newobj = new THREE.Object3D();
    newobj.position.set(x, y, z);

    const r = 5;
    var angle = 0.0;
    for (var i = 0; i < 8; i++) {
        var light = new THREE.PointLight(0xffffff, 3);
        light.position.set(r * Math.sin(angle), 0, r * Math.cos(angle));
        newobj.add(light);

        angle += (Math.PI * 2) / 8;
    }

    newobj.add(mesh);

    obj.add(newobj);
    objects.push(mesh);

    return mesh;
}

function createRing(obj, i, color) {
    'use strict';
    const innerRadius = i * 4 + 1;
    const outerRadius = (i + 1) * 4 + 1;

    const shape = new THREE.Shape();

    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2);

    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2);
    shape.holes.push(holePath);

    const extrudeSettings = {
        depth: 1,
        bevelEnabled: false
    };

    geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    material = new THREE.MeshStandardMaterial({ color: color });
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = Math.PI / 2;

    var ring = new THREE.Object3D();
    ring.position.set(0, 2 - i, 0)
    ring.add(mesh);
    rings.push(ring);

    obj.add(ring);
    objects.push(mesh);
    return ring;
}

function createCylinder(obj) {
    'use strict';
    
    var length = 5;
    geometry = new THREE.CylinderGeometry(1, 1, length);
    geometry.translate(0, length / 2, 0);
    material = new THREE.MeshStandardMaterial({ color: 0xea7c22 });
    cylinder = new THREE.Mesh(geometry, material);
    obj.add(cylinder);
    objects.push(cylinder);
    return cylinder;
}


function random(start = 0, end = 1) {
    return Math.random() * (end - start) + start;
}

// ==============================================

var parametric_funcs_index = 0;
const parametric_funcs = [
    (x, z) => { return Math.sin(x + z); },
    (x, z) => { return Math.cos(x + z); },
    (x, z) => { return x**2 + z**2; },
    (x, z) => { return Math.sqrt(Math.abs(3 - x ** 2 - z ** 2)); },
    (x, z) => { return Math.sqrt(x ** 2 + z ** 2); },
    (x, z) => { return Math.sqrt(Math.abs(x + z)); },
    (x, z) => { return Math.exp(x + z); },
    (x, z) => { return x + z; },
];

function parametric_funcs_wrapper(x, z, target) {
    x = (x - 0.5) * 4; z = (z - 0.5) * 4;

    const y = parametric_funcs[parametric_funcs_index](x, z);

    target.set(x, clamp(y, -3, 3), z);
}

// ==============================================


var lights = [];
var param_surf = [];
var rotatables = [];

function createParametric(func) {
    'use strict';
    geometry = new ParametricGeometry(func, 15, 15);

    material = new THREE.MeshStandardMaterial({ color: 0xb2568c, side: THREE.DoubleSide });

    mesh = new THREE.Mesh(geometry, material);

    param_surf.push(mesh);
}

function createObjects(x, y, z) {
    'use strict';

    for (var i = 0; i < 8; i++) {
        createParametric(parametric_funcs_wrapper);
        parametric_funcs_index = i;
    }

    var carousel = new THREE.Object3D();

    cylinder = createCylinder(carousel);
    addMobiusStrip(cylinder, 0, 10, 0);
    createRing(cylinder, 0, 0xd44343);
    createRing(cylinder, 1, 0xffb400);
    createRing(cylinder, 2, 0x9ed450);

    var radius = 2;
    const rad_incr = 4;
    rings.forEach(ring => {
        const incr = (2 * Math.PI) / 8;
        var rot = incr * random(0, 7);

        param_surf.forEach(surf => {
            var tmp = new THREE.Object3D();

            const rand = random(0.2, 0.4);
            tmp.position.set(radius * Math.sin(rot), 1, radius * Math.cos(rot));

            mesh = surf.clone();
            mesh.scale.set(rand, rand, rand);

            var light = new THREE.SpotLight(0xffffff, 30);

            light.target = mobiusStrip;

            light.position.set(0, 1, 0);
            light.visible = true;
            lights.push(light);

            tmp.add(mesh, light);

            objects.push(mesh);
            ring.add(tmp);
            rotatables.push(mesh);
            const randomAxis = Math.floor(Math.random() * 3);
            mesh.userData.axis = randomAxis;
            
            rot += incr;
        });
        radius += rad_incr;
    });

    carousel.position.set(x, y, z);
    scene.add(carousel);
}

function switchMaterial(materialName) {
    currentMaterial = materialName;
    objects.forEach((obj) => {
        if (!obj.originalColor) {
            obj.originalColor = obj.material.color.clone();
        }
        
        if (materialName === 'normal') {
            obj.material = materials[materialName].clone();
        } else {
            obj.material = materials[materialName].clone();
            obj.material.color.copy(obj.originalColor);
            skydome.material.map = skydomeTexture;
        }
    });
}



////////////////////
/* CREATE SKYDOME */
////////////////////
function createSkydome() {
    'use strict';
    const loader = new THREE.TextureLoader();
    const texture = loader.load('snapshot.jpg');

    geometry = new THREE.SphereGeometry(30, 60, 40, 0, Math.PI * 2, 0, Math.PI / 2);
    geometry.scale(-1, 1, 1);
    material = new THREE.MeshBasicMaterial({
        map: texture
    });

    skydome = new THREE.Mesh(geometry,material);
    objects.push(skydome);
    scene.add(skydome);
    skydomeTexture = texture;
}

////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    'use strict';

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0x392954);
    scene.add(new THREE.AxesHelper(10));

    createObjects(0, 0, 0);
    createSkydome();

    var ambientLight = new THREE.AmbientLight(0xffa500, 0.2);
    scene.add(ambientLight);
    directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.lookAt(0, 0, 0);
    scene.add(directionalLight);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////

function createCamera() {
    'use strict';

    var width = window.innerWidth, height = window.innerHeight;
    var fov = 70;
    var aspect = width / height;
    var near = 1, far = 1000;

    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(15, 15, 15);
    camera.lookAt(scene.position);
}

////////////
/* UPDATE */
////////////
function updateRing(ring, value) {
    if (typeof ring.direction === 'undefined') {
        ring.direction = 1;
    }

    ring.position.y += value * ring.direction;

    if (ring.position.y >= 5) {
        ring.position.y = 5;
        ring.direction = -1;
    } else if (ring.position.y <= 1) {
        ring.position.y = 1;
        ring.direction = 1;
    }
}

class KeyboardInputManager {
    constructor() {
        this.eventQueue = [];

        this.disabled = false;
        this.currentKeys = {};
        this.lastKeys = {};

        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
    }

    handleKeyDown(event) {
        this.lastKeys[event.code] = this.currentKeys[event.code];
        this.currentKeys[event.code] = true;
    }

    handleKeyUp(event) {
        this.lastKeys[event.code] = this.currentKeys[event.code];
        this.currentKeys[event.code] = false;
    }

    disableInput() {
        this.disabled = true;
        this.currentKeys = {};
        this.lastKeys = {};
    }

    enableInput() {
        this.disabled = false;
    }

    isKeyPressed(code) {
        if (this.disabled)
            return false;

        return this.currentKeys[code] === true;
    }

    isKeyClicked(code) {
        if (this.disabled)
            return false;

        var r = (this.lastKeys[code] === false || this.lastKeys[code] === undefined) && this.currentKeys[code] === true;

        if (r) this.handleKeyDown({ code: code });

        return r;
    }
}

const inputManager = new KeyboardInputManager();
var time = new THREE.Clock();

function update() {
    'use strict';
    if (inputManager.isKeyPressed('Digit1'))
        updateRing(rings[0], 0.1);
    if (inputManager.isKeyPressed('Digit2'))
        updateRing(rings[1], 0.1);
    if (inputManager.isKeyPressed('Digit3'))
        updateRing(rings[2], 0.1);
    if (inputManager.isKeyClicked('KeyD'))
        directionalLight.visible = !directionalLight.visible;
    if (inputManager.isKeyClicked('KeyP'))
        lights.forEach(light => { light.visible = true; });
    if (inputManager.isKeyClicked('KeyS'))
        lights.forEach(light => { light.visible = false; });
    if (inputManager.isKeyClicked('KeyQ'))
        switchMaterial('lambert');
    if (inputManager.isKeyClicked('KeyW'))
        switchMaterial('phong');
    if (inputManager.isKeyClicked('KeyE'))
        switchMaterial('toon');
    if (inputManager.isKeyClicked('KeyR'))
        switchMaterial('normal');
    if (inputManager.isKeyClicked('KeyT'))
        switchMaterial('basic');

    var delta = time.getDelta();
    rotatables.forEach((it) => {
        if (it.userData.axis !== undefined) {
            switch (it.userData.axis) {
                case 0:
                    it.rotation.x += 0.5 * delta;
                    break;
                case 1:
                    it.rotation.y += 0.5 * delta;
                    break;
                case 2:
                    it.rotation.z += 0.5 * delta;
                    break;
            }
        }
    });
    cylinder.rotation.y += 0.1 * delta;
}

/////////////
/* DISPLAY */
/////////////
function render() {
    'use strict';
    renderer.render(scene, camera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
    'use strict';
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    document.body.appendChild(VRButton.createButton(renderer));
    renderer.xr.enabled = true;

    createScene();
    createCamera();

    window.addEventListener("resize", onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////

function animate() {
    'use strict';

    renderer.setAnimationLoop(() => {
        update();
        render();
    });
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////

function onResize() {
    'use strict';

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerHeight > 0 && window.innerWidth > 0) {
        var aspectRatio = window.innerWidth / window.innerHeight;
        camera.aspect = aspectRatio;
        camera.updateProjectionMatrix();
    }
}

init();
animate();