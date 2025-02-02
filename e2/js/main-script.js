import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import * as Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

var scene, renderer;

var geometry, material, mesh;

var cabin, cart, clawCable, clawBlock, clawFingers = [];
var cameras = [];
var currentCamera = null;

var materials = [];

var inAnimation = false;
var animationStep = 0;

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

//////////////////
/* CREATE CRANE */
//////////////////

function addBase(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(5, 2, 5);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    obj.add(mesh);
    materials.push(material)
}

function addTower(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(2, 20, 2);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    obj.add(mesh);
    materials.push(material)
}

function addCabin(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(3, 3, 3);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    cabin = new THREE.Mesh(geometry, material);
    cabin.position.set(x, y, z);
    obj.add(cabin);
    materials.push(material)
}

function addJib(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(30, 2, 2);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    obj.add(mesh);
    materials.push(material)
}

function addCounterWeight(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(3, 2, 2);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    obj.add(mesh);
    materials.push(material)
}

function addApex(obj, x, y, z) {
    'use strict';
    geometry = new THREE.CylinderGeometry(0, 1, 3);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    obj.add(mesh);
    materials.push(material)
}

function addCable(obj, x1, y1, x2, y2) {
    'use strict';
    var dx = x2 - x1;
    var dy = y2 - y1;
    var length = Math.sqrt(dx * dx + dy * dy);
    geometry = new THREE.CylinderGeometry(0.05, 0.05, length);
    geometry.translate(0, -length / 2, 0);
    material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x1, y1, 0);
    mesh.rotation.z = Math.atan((y2 - y1) / (x2 - x1)) + Math.PI / 2;
    obj.add(mesh);
    materials.push(material)
}

function addCart(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(2, 2, 2);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    cart = new THREE.Mesh(geometry, material);
    cart.position.set(x, y, z);
    obj.add(cart);
    materials.push(material)
}

function addClawCable(obj, x, y, z) {
    'use strict';
    geometry = new THREE.CylinderGeometry(0.05, 0.05, 5);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    clawCable = new THREE.Mesh(geometry, material);
    clawCable.position.set(x, y, z);
    obj.add(clawCable);
    materials.push(material)
}

function addClawBlock(obj, x, y, z) {
    'use strict';
    geometry = new THREE.BoxGeometry(2, 1, 2);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    clawBlock = new THREE.Mesh(geometry, material);
    clawBlock.position.set(x, y, z);
    obj.add(clawBlock);
    materials.push(material)
}

function addClawFinger(obj, x, y, z, i) {
    'use strict'
    geometry = new THREE.CylinderGeometry(0.5, 0, 1.5);
    geometry.translate(0, -1.5 / 2, 0);
    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    clawFingers[i] = new THREE.Mesh(geometry, material);
    clawFingers[i].position.set(x, y, z);
    obj.add(clawFingers[i]);
    materials.push(material)
}

function circle_intersects(pos1, pos2, r1 = 1, r2 = 1) {
    return pos1.distanceTo(pos2) < (r1 + r2);
}

function random(start = 0, end = 1) {
    return Math.random() * (end - start) + start;
}

var container;
var cargos = [];

function addContainer(vec = 0) {
    var obj = new THREE.Object3D();
    var material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
    materials.push(material)

    var geometry = new THREE.BoxGeometry(1, 0, 1);
    var mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, -0.5, 0);
    obj.add(mesh);
    geometry = new THREE.BoxGeometry(0, 1, 1);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(-0.5, 0, 0);
    obj.add(mesh);
    geometry = new THREE.BoxGeometry(0, 1, 1);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0.5, 0, 0);
    obj.add(mesh);
    geometry = new THREE.BoxGeometry(1, 1, 0);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, 0.5);
    obj.add(mesh);
    geometry = new THREE.BoxGeometry(1, 1, 0);
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 0, -0.5);
    obj.add(mesh);

    obj.position.set(18, 0, 0);
    obj.scale.set(4, 2, 4);

    scene.add(obj);
    container = obj;
}

function addCargo(count) {
    'use strict';

    for (var i = 0; i < count; i++) {
        var found;
        var rx, rz;
        var rpos;

        do {
            found = true;
            rx = random(-10, 10), rz = random(-10, 10);
            rpos = new THREE.Vector3(rx, 0, rz);

            found = !cargos.some((it) => circle_intersects(it.position, rpos, Math.sqrt(3) / 2, Math.sqrt(3) / 2))

        } while (!found || circle_intersects(rpos, new THREE.Vector3(0, 0, 0), 2, 2));

        var obj = new THREE.Object3D()
        var geometry = new THREE.BoxGeometry(1, 1, 1);
        var material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
        materials.push(material)
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(rx, 0, rz);
        obj.add(mesh);

        cargos.push(mesh);
        scene.add(obj);
    }
}

function createCrane(x, y, z) {
    'use strict';

    var crane = new THREE.Object3D();

    material = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });

    addBase(crane, 0, 1, 0);
    addTower(crane, 0, 12, 0);
    addCabin(crane, 0, 23.5, 0);
    addJib(cabin, 6.5, 2.5, 0);
    addCounterWeight(cabin, -6.5, 0.5, 0)
    addApex(cabin, 0, 4.5, 0);
    addCable(cabin, -8, 3.4, 0, 5.9);
    addCable(cabin, 0, 5.9, 16, 3.4);
    addCart(cabin, 18, 0.5, 0);
    addClawCable(cart, 0, -3.5, 0);
    addClawBlock(cart, 0, -6.5, 0);
    addClawFinger(clawBlock, 1, -0.5, 0, 0);
    addClawFinger(clawBlock, -1, -0.5, 0, 1);
    addClawFinger(clawBlock, 0, -0.5, -1, 2);
    addClawFinger(clawBlock, 0, -0.5, 1, 3);
    scene.add(crane);
    crane.position.set(x, y, z);

    addContainer();
    addCargo(20);
}

////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
    'use strict';

    scene = new THREE.Scene();

    scene.background = new THREE.Color(0xffffff);

    scene.add(new THREE.AxesHelper(10));

    createCrane(0, 0, 0);
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

    var cam;

    // Perspective Cameras
    cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    cam.position.set(50, 50, 0);
    cam.lookAt(scene.position);
    cameras.push(cam)

    cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    cam.position.set(0, 50, 50);
    cam.lookAt(scene.position);
    cameras.push(cam)

    cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    cam.position.set(0, 50, 0);
    cam.lookAt(scene.position);
    cameras.push(cam);

    // Orthographic Camera
    cam = new THREE.OrthographicCamera(width / - 2, width / 2, height / 2, height / - 2, near, far);
    cam.position.set(50, 50, 50);
    cam.lookAt(scene.position);
    cameras.push(cam);

    // Additional Perspective Camera
    cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    cam.position.set(50, 50, 50);
    cam.lookAt(scene.position);
    cameras.push(cam);

    currentCamera = cam;

    // Zoom Functionality
    function zoomCamera(delta) {
        currentCamera.zoom -= delta;
        currentCamera.updateProjectionMatrix();
    }

    // Listen to mouse wheel events for zooming
    window.addEventListener('wheel', function (event) {
        // event.preventDefault();
        var delta = clamp(event.deltaY, -0.1, 0.1);
        zoomCamera(delta);
    });
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
var collision = false;

function checkCollisions() {
    'use strict';
    if (collision)
        return;

    var r1 = 1.5; // FIXME these are guesses

    var globalPosition = new THREE.Vector3();
    clawBlock.getWorldPosition(globalPosition);

    for (var it of cargos) {
        var r2 = 1.5;

        if (circle_intersects(globalPosition, it.position, r1, r2)) {

            alert("COLLISION (FIXME estimation) NOTE: INPUT now STOPPED");

            collision = true;
            handleCollisions();
            return;
        }
    }
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
    'use strict';

    inAnimation = true;
    inputManager.disableInput();
}

////////////
/* UPDATE */
////////////
function updateCartPosition(value) {
    cart.position.x = clamp(cart.position.x + value, 2.5, 18);

    return isClamped(cart.position.x, 2.5, 18);
}

function updateCableLength(value) {
    var clawCableLength = -2 * (clawCable.position.y + 1);
    clawCableLength += value;
    clawCableLength = clamp(clawCableLength, 0, 20);
    clawCable.geometry.dispose();
    clawCable.geometry = new THREE.CylinderGeometry(0.05, 0.05, clawCableLength);
    clawCable.position.y = -(clawCableLength / 2) - 1;
    clawBlock.position.y = -(clawCableLength + 1.5);

    return isClamped(clawCableLength, 0, 20);
}

function updateClaw(value) {
    clawFingers[0].rotation.z = clamp(clawFingers[0].rotation.z - value, -Math.PI / 4, 0);
    clawFingers[1].rotation.z = clamp(clawFingers[1].rotation.z + value, 0, Math.PI / 4);
    clawFingers[2].rotation.x = clamp(clawFingers[2].rotation.x - value, -Math.PI / 4, 0);
    clawFingers[3].rotation.x = clamp(clawFingers[3].rotation.x + value, 0, Math.PI / 4);

    return isClamped(clawFingers[3].rotation.x, 0, Math.PI / 4);
}

function updateCabin(value, lockin = false) {
    value %= Math.PI * 2;

    cabin.rotation.y %= Math.PI * 2;

    if (cabin.rotation.y < 0)
        cabin.rotation.y = Math.PI * 2 + cabin.rotation.y;

    var newValue = (cabin.rotation.y + value) % (Math.PI * 2.0);

    if (lockin) {
        if (floatEqual(cabin.rotation.y, 0))
            return true;

        if ((cabin.rotation.y + value) - newValue > Math.PI) {
            cabin.rotation.y = 0;
            return true;
        }
    }

    cabin.rotation.y = newValue;

    return floatEqual(cabin.rotation.y, 0);
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

const HUDKeys = ['KeyQ', 'KeyA', 'KeyW', 'KeyS', 'KeyE', 'KeyD', 'KeyR', 'KeyF']
var wireFrameToggled = false

function updateHUD() {
    const pressedKeys = HUDKeys.filter((key) => inputManager.isKeyPressed(key));
    const cameraNo = cameras.indexOf(currentCamera) + 1;
    if (wireFrameToggled) {
        document.querySelector('.hud .wireframe').style.backgroundColor = 'orange';
    } else {
        document.querySelector('.hud .wireframe').style.backgroundColor = 'black';
    }
    document.querySelector('.hud .camera').textContent = 'Camera: ' + cameraNo
    document.querySelectorAll('.hud .key').forEach((key) => {
        if (pressedKeys.includes('Key' + key.textContent)) { // was clicked
            key.style.backgroundColor = 'orange';
        } else {
            key.style.backgroundColor = 'black';
        }
    });
}

const inputManager = new KeyboardInputManager();

function update() {
    'use strict';
    
    if (inputManager.isKeyClicked('Digit1'))
        currentCamera = cameras[0];

    if (inputManager.isKeyClicked('Digit2'))
        currentCamera = cameras[1];

    if (inputManager.isKeyClicked('Digit3'))
        currentCamera = cameras[2];

    if (inputManager.isKeyClicked('Digit4'))
        currentCamera = cameras[3];

    if (inputManager.isKeyClicked('Digit5'))
        currentCamera = cameras[4];

    if (inputManager.isKeyPressed('ArrowUp'))
        currentCamera.position.add(new THREE.Vector3(0, -1, 0));

    if (inputManager.isKeyPressed('ArrowDown'))
        currentCamera.position.add(new THREE.Vector3(0, 1, 0));

    if (inputManager.isKeyPressed('ArrowLeft'))
        currentCamera.position.add(new THREE.Vector3(1, 0, 0));

    if (inputManager.isKeyPressed('ArrowRight'))
        currentCamera.position.add(new THREE.Vector3(-1, 0, 0));

    if (inputManager.isKeyPressed('KeyE'))
        updateCableLength(0.3);

    if (inputManager.isKeyPressed('KeyD'))
        updateCableLength(-0.3);

    if (inputManager.isKeyPressed('KeyA'))
        cabin.rotation.y += 0.07;

    if (inputManager.isKeyPressed('KeyQ'))
        cabin.rotation.y -= 0.07;

    if (inputManager.isKeyPressed('KeyS'))
        updateCartPosition(0.2);

    if (inputManager.isKeyPressed('KeyW'))
        updateCartPosition(-0.2);

    if (inputManager.isKeyPressed('KeyF'))
        updateClaw(0.05);

    if (inputManager.isKeyPressed('KeyR'))
        updateClaw(-0.05);

    if (inputManager.isKeyClicked('Digit7')) {
        wireFrameToggled = !wireFrameToggled;
        materials.forEach((material) => {
            material.wireframe = !material.wireframe;
        });
        /** 
        scene.traverse(function (node) {
            if (node instanceof THREE.Mesh) {
                node.material.wireframe = !node.material.wireframe;
            }
        });
        */
    }

    updateHUD();
    checkCollisions();
}

/////////////
/* DISPLAY */
/////////////
function render() {
    'use strict';
    renderer.render(scene, currentCamera);
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

    createScene();
    createCamera();

    render();

    window.addEventListener("resize", onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////

var time = new THREE.Clock();

function animate() {
    'use strict';

    var delta = time.getDelta();

    if (inAnimation) {
        switch (animationStep) {
            case 0:
                if (updateClaw(2 * delta))
                    animationStep++;
                break;
            case 1:
                if (updateCableLength(-8 * delta))
                    animationStep++;
                break;
            case 2:
                if (updateCartPosition(5*delta))
                    animationStep++;
                break;
            case 3:
                if (updateCabin(delta, true))
                    animationStep++;
                break;
            case 4:
                if (updateCableLength(8 * delta))
                    animationStep++;
                break;
            case 5:
                if (updateClaw(-2 * delta))
                    animationStep++;
                break;
        }

        if (animationStep == 6) {
            collision = false;
            animationStep = 0;
            inAnimation = false;
            inputManager.enableInput();
        }
    }

    update();
    render();

    requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////

function onResize() {
    'use strict';

    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerHeight > 0 && window.innerWidth > 0) {
        var aspectRatio = window.innerWidth / window.innerHeight;

        cameras.forEach((cam) => {
            cam.aspect = aspectRatio;
            cam.updateProjectionMatrix();
        });
    }
}


init();
animate();