import * as THREE from './thirdparty/three.module.js'
import { GLTFLoader } from './thirdparty/GLTFLoader.js'
import { OBJLoader } from './thirdparty/OBJLoader.js'
import { OrbitControls } from './thirdparty/OrbitControls.js'

import { UIElements } from './uielements.js'
import { Navigation } from './navigation.js'

class Papierfabrik {
    init() {
        this.checkPlatform();

        this.canvas = document.getElementById('render-canvas');
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            canvas: this.canvas,
        });

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.raycaster = new THREE.Raycaster();

        this.initScene();
        this.initPerspectiveCamera();
        this.initMaterials();

        this.leftToLoad = 3;
        this.loadModel();
        this.loadNavpath();
        this.loadRoomlist();

        this.ui = new UIElements(this);
        this.ui.setupCallbacks();

        document.getElementById("threesixty-button").onclick = (event) => {
            this.ui.showPanoramaView();
            this.loadPanoramaPicture();
        }

        this.isNavigating = false;
    }

    checkPlatform() {
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)|(tablet|ipad|playbook|silk)|(android(?!.*mobi))/.test(navigator.userAgent)) {
            this.isMobile = true;
        } else {
            this.isMobile = false;
        }

        this.iOS =
            /Mac|iPad|iPhone|iPod/.test(navigator.userAgent) &&
            !window.MSStream;
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('#8CC3BD');

        this.ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.65);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
        this.sunLight.position.set(1, 5, 1);
        this.scene.add(this.sunLight);
    }

    initPerspectiveCamera() {
        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 256);
        this.camera.position.set(-100, 0, 64);

        this.initOrbitControls(Math.PI / 4, new THREE.Vector3(-10, 0, 0));
    }

    initOrthogonalCamera() {
        const scaledWidth = window.innerWidth / 16;
        const scaledHeight = window.innerHeight / 16;

        this.camera = new THREE.OrthographicCamera(-scaledWidth, scaledWidth, scaledHeight, -scaledHeight, 1, 256);

        if (this.isMobile) {
            this.camera.position.set(-64, 0, 0);
        } else {
            this.camera.position.set(0, 64, 0);
        }

        this.initOrbitControls(0, new THREE.Vector3(0, 0, 0));
    }

    initOrbitControls(polarAngle, target) {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = false;
        this.controls.target = target;
        this.controls.maxDistance = 150;
        this.controls.maxZoom = 50;
        this.controls.minPolarAngle = polarAngle;
        this.controls.maxPolarAngle = polarAngle;
        this.controls.mouseButtons = {
            LEFT: THREE.MOUSE.PAN,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE
        };
        this.controls.touches = {
            ONE: THREE.TOUCH.PAN,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
        };
    }

    initMaterials() {
        this.selectedMaterial = new THREE.MeshStandardMaterial(
            { color: new THREE.Color("red") });

        this.navigationLineMaterial = new THREE.MeshStandardMaterial(
            { color: new THREE.Color("red") });

        this.greyMaterial = new THREE.MeshStandardMaterial(
            { color: new THREE.Color("grey") });
    }

    resetCamera() {
        if (this.camera.type === 'PerspectiveCamera') {
            this.initPerspectiveCamera();
        } else {
            this.initOrthogonalCamera();
        }
    }

    resizeCamera() {
        if (this.camera.type === 'PerspectiveCamera') {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        } else {
            const scaledWidth = window.innerWidth / 16;
            const scaledHeight = window.innerHeight / 16;

            this.camera.left = -scaledWidth;
            this.camera.right = scaledWidth;
            this.camera.top = scaledHeight;
            this.camera.bottom = -scaledHeight;
            this.camera.updateProjectionMatrix();
        }
    }

    loadingFinished() {
        this.updateCurrentLevel();

        for (let i = 0; i < this.level.length; i++) {
            this.level[i].position.y = i * i * 100;
        }

        this.pulseBallPostion = 0;

        this.clock = new THREE.Clock();

        this.tokenizeNodeNames();

        this.renderer.setAnimationLoop(() => {
            this.update();
        });

    }

    loadModel() {
        const loader = new GLTFLoader();

        this.billboardObjects = [];
        this.staircaseObjects = [];
        this.lastSelectedMeshes = [];
        this.level = [];

        loader.load('glb/papierfabrik.glb',
            (gltf) => {
                gltf.scene.traverse((o) => {
                    const splitName = o.name.split('_');
                    if ((splitName[3] === 'Icon' && splitName[1] === 'WC')
                        || (splitName[2] === 'Icon' && splitName[1] === 'Aufzug')) {
                        o.level = parseInt(splitName[0][1]);
                        this.billboardObjects.push(o);
                    }

                    if (splitName[1] === 'Treppe' && splitName[2] === 'Icon') {
                        this.staircaseObjects.push(o);
                    }
                });

                this.level = gltf.scene.children;
                this.level.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });

                this.scene.add(gltf.scene)

                this.leftToLoad--;
                if (this.leftToLoad === 0)
                    this.loadingFinished();
            });

        this.navigationBallGeometry = new THREE.BoxGeometry(0.7, 0.7, 0.7);
        this.navigationLineGeometry = new THREE.BoxGeometry(0.5, 0.5);
    }

    loadNavpath() {
        const loader = new OBJLoader();

        loader.load('obj/navpath.obj',
            (obj) => {
                this.navigation = new Navigation(obj.children[0].geometry);

                this.leftToLoad--;
                if (this.leftToLoad === 0)
                    this.loadingFinished();
            });
    }

    loadRoomlist() {
        const loader = new THREE.FileLoader();

        this.rooms = {};

        loader.load(
            'csv/roomlist.csv',
            (data) => {
                const rooms = data.split('\n');

                for (const room of rooms) {
                    const roomData = room.split('|');
                    const id = roomData[0];

                    this.rooms[id] = roomData;
                    if (this.rooms[id][0].charAt(0) == '9') {
                        this.rooms[id][0] = this.rooms[id][0].substring(0, 1) + "." + this.rooms[id][0].substring(1, this.rooms[id][0].length);
                    }
                }

                this.leftToLoad--;
                if (this.leftToLoad === 0)
                    this.loadingFinished();
            },
        );
    }

    tokenizeNodeNames() {
        this.scene.traverse((node) => {
            if (node.name[0] != '9') return;

            const id = node.name.substring(0, 4);

            const csvRoom = this.rooms[id];
            if (csvRoom) {
                node.name += ' ' + csvRoom[1];
            }

            node.name = node.name
                .replace(/([ &/_-])/g, ' ')
                .replace(/([.])/g, '')
                .toLowerCase();
        });
    }

    resize() {
        this.resizeCamera();

        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    removeAllHighlights() {
        for (const mesh of this.lastSelectedMeshes) {
            mesh.material = mesh.previousMaterial;
            mesh.previousMaterial = null;
        }

        this.lastSelectedMeshes = [];

        this.ui.cancelDescribeSelectedRoom();
    }

    highlight(node) {
        this.removeAllHighlights();

        for (const mesh of node.children) {
            if (mesh.material && mesh.material.name !== 'Base_Material')
                continue;

            mesh.previousMaterial = mesh.material;
            mesh.material = this.selectedMaterial;

            this.lastSelectedMeshes.push(mesh);
        }

        const room = this.rooms[node.name.substring(0, 4)];

        if (room) {
            this.ui.describeSelectedRoom(room[0] + " " + room[1], room[3], room[5] === (this.iOS ? "Ja" : "Ja\r"));

            if (room[5] === (this.iOS ? "Ja" : "Ja\r")) {
                this.setPanoramaPicture(room[0]);
            }
        }
    }

    setPanoramaPicture(roomID) {
        this.panoramaViewer = new PhotoSphereViewer({
            panorama: "./png/360/" + roomID.replaceAll('.', '') + "_360.jpg",
            container: document.getElementById("panorama-viewer"),
            loading_msg: "Panorama-Bild wird geladen...",
            autoload: false
        });
    }

    loadPanoramaPicture() {
        this.panoramaViewer.load();
    }

    search(searchValue) {
        if (searchValue.length < 1) return null;

        const matchingNodes = [];
        const lowercaseName = searchValue
            .replace(/([ &/_-])/g, ' ')
            .replace(/([.])/g, '')
            .toLowerCase();

        this.scene.traverse((node) => {
            if (node.name[0] != '9') return;

            if (node.name.includes(lowercaseName)) {
                matchingNodes.push(node);
            }
        });

        let resultNode = null;
        if (matchingNodes.length > 1) {
            for (const node of matchingNodes) {
                if (node.name.includes(' ' + lowercaseName + ' ')) {
                    resultNode = node;

                    break;
                }
            }
        } else if (matchingNodes.length == 1) {
            resultNode = matchingNodes[0];
        }

        return resultNode;
    }

    pick(event) {
        if (this.navigationLines) return;

        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(mouse, this.camera);

        const intersects = this.raycaster.intersectObjects(this.scene.children);

        if (intersects.length != 0) {
            if (intersects[0].object.cannotSelect
                || intersects[0].object.parent.name[0] !== '9')
                return;

            this.highlight(intersects[0].object.parent);
        } else {
            this.removeAllHighlights();
        }
    }

    deleteNavigationLine() {
        for (const line of this.navigationLines) {
            this.level[line.belongs].remove(line);
        }

        this.navigationLines = null;
        this.isNavigating = false;
    }

    startNavigation(start, destination) {
        this.removeAllHighlights();
        this.isNavigating = true;

        if (this.navigationLines) {
            this.deleteNavigationLine();
        }

        const path = this.navigation.findPath(start.position, destination.position);

        if (!path) {
            console.error("Failed to find path");

            return;
        }

        this.navigationLines = [];

        const belongsTo = (v) => {
            const y = v.y;

            if (y < -2.5) {
                return 0;
            } else if (y < 1) {
                return 1;
            } else if (y < 4.6) {
                return 2;
            } else {
                return 3;
            }
        };

        const lineToLevel = new Array(4);

        for (let i = 0; i < path.length - 1; i++) {
            const levelSegment = new THREE.CurvePath();
            levelSegment.pathLength = 0;

            let lastSegmentToLevel = belongsTo(path[i]);

            const levelNavLine = new THREE.Group();

            for (; i < path.length - 1; i++) {
                const fromTo = path[i].clone().sub(path[i + 1]);

                const curvePart = new THREE.LineCurve3(path[i], path[i + 1]);
                const partLength = fromTo.length();
                levelSegment.pathLength += partLength;
                levelSegment.add(curvePart);

                const meshPart = new THREE.Mesh(this.navigationLineGeometry, this.navigationLineMaterial);
                meshPart.position.copy(path[i].clone().sub(fromTo.multiplyScalar(0.5)));
                meshPart.scale.set(1, 1, partLength + 0.5);
                meshPart.up = new THREE.Vector3(1, 0, 0);
                meshPart.lookAt(path[i + 1]);
                levelNavLine.add(meshPart);

                const nextBelong = belongsTo(path[i + 1]);

                if (lastSegmentToLevel != nextBelong) {
                    break;
                }

                lastSegmentToLevel = nextBelong;
            }

            levelNavLine.curve = levelSegment;
            levelNavLine.pulseBalls = [];

            for (let i = 0; i < Math.floor(levelSegment.pathLength / 2); i++) {
                const ball = new THREE.Mesh(this.navigationBallGeometry, this.navigationLineMaterial);
                levelNavLine.pulseBalls.push(ball);
                levelNavLine.add(ball);
            }

            this.navigationLines.push(levelNavLine);

            levelNavLine.belongs = lastSegmentToLevel;
            this.level[lastSegmentToLevel].add(levelNavLine);
            lineToLevel[lastSegmentToLevel] = levelNavLine;
        }

        const startMarker = new THREE.Mesh(this.navigationBallGeometry, this.navigationLineMaterial);
        startMarker.position.copy(path[0]);
        startMarker.belongs = belongsTo(path[0]);
        lineToLevel[startMarker.belongs].add(startMarker);

        const destinationMarker = new THREE.Mesh(this.navigationBallGeometry, this.navigationLineMaterial);
        destinationMarker.position.copy(path[path.length - 1]);
        destinationMarker.belongs = belongsTo(path[path.length - 1]);
        lineToLevel[destinationMarker.belongs].add(destinationMarker);

        this.ui.toggleNavigationForm();

        this.ui.describeNavigation(this.rooms[start.name.substring(0, 4)][1], this.rooms[destination.name.substring(0, 4)][1]);
    }

    updateCurrentLevel() {
        if (!this.isNavigating) {
            this.removeAllHighlights();
        }

        for (const bo of this.billboardObjects) {
            if (this.camera.type !== 'PerspectiveCamera') {
                bo.rotation.set(0, 0, 0);
            }

            if (['G3_WC_Herren_Icon_02', 'G3_WC_Damen_Icon_02', 'G3_Aufzug_Icon_03'].includes(bo.name))
                continue;

            if (bo.level < this.ui.selectedLevel) {
                bo.visible = false;
            } else {
                bo.visible = true;
            }
        }

        if (this.camera.type === 'PerspectiveCamera') {
            for (const staircaseArrow of this.staircaseObjects) {
                staircaseArrow.visible = false;
            }
        } else {
            for (const staircaseArrow of this.staircaseObjects) {
                staircaseArrow.visible = true;
            }
        }

        for (let i = 0; i < this.ui.selectedLevel - 1; i++) {
            this.level[i].traverse((e) => {
                if (e.material && !e.nonGreyMaterial
                    && (e.material.name === 'Base_Material' || e.material.name === 'POI_Material')) {
                    e.nonGreyMaterial = e.material;
                    e.material = this.greyMaterial;
                }
                e.cannotSelect = true;
            });
        }

        for (let i = this.ui.selectedLevel - 1; i < this.level.length; i++) {
            this.level[i].traverse((e) => {
                if (e.material && e.nonGreyMaterial) {
                    e.material = e.nonGreyMaterial;
                    e.nonGreyMaterial = undefined;
                }
                e.cannotSelect = false;
            });
        }
    }

    update() {
        this.controls.update();

        const delta = Math.min(this.clock.getDelta(), 0.1);

        this.pulseBallPostion = (this.pulseBallPostion + delta) % 1;

        if (this.navigationLines) {
            for (const line of this.navigationLines) {
                for (let i = 0; i < line.pulseBalls.length; i++) {
                    line.pulseBalls[i].position.copy(
                        line.curve.getPoint(1 - (this.pulseBallPostion + i) / line.pulseBalls.length % 1));
                }
            }
        }

        if (this.camera.type === 'PerspectiveCamera') {
            for (const bo of this.billboardObjects) {
                bo.rotation.set(Math.PI / 2, 0, -this.camera.rotation.z);
            }

            for (let i = 0; i < this.ui.selectedLevel; i++) {
                this.level[i].position.lerp(new THREE.Vector3(0, 0, 0), delta * 6);
            }

            for (let i = this.ui.selectedLevel; i < this.level.length; i++) {
                this.level[i].position.lerp(new THREE.Vector3(0, 300, 0), delta * 0.6);
            }
        } else {
            for (let i = 0; i < this.ui.selectedLevel; i++) {
                this.level[i].position.lerp(new THREE.Vector3(0, 0, 0), delta * 6);
            }

            for (let i = this.ui.selectedLevel; i < this.level.length; i++) {
                this.level[i].position.lerp(new THREE.Vector3(0, 0, -300), delta * 0.6);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}

const papierfabrik = new Papierfabrik();
papierfabrik.init();