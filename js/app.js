/* -----------------------------------------------------------
   Chinese History Globe - Main Engine (app.js)
----------------------------------------------------------- */

let scene, camera, renderer, controls;
let earthMesh;
let activeDynastyMesh = null;

// Earth textures (CDN)
const earthTextures = {
    diffuse: "https://raw.githubusercontent.com/ajd-123/earth-textures/main/earth_diffuse.jpg",
    bump: "https://raw.githubusercontent.com/ajd-123/earth-textures/main/earth_bump.jpg",
    specular: "https://raw.githubusercontent.com/ajd-123/earth-textures/main/earth_specular.jpg"
};

// Dynasty dataset folder
const DYNASTY_PATH = "assets/dynasties/";

const DYNASTY_FILES = {
    qin: "qin.geojson",
    han_west: "han_west.geojson",
    han_east: "han_east.geojson",
    tang: "tang.geojson",
    song_n: "song_n.geojson",
    song_s: "song_s.geojson",
    yuan: "yuan.geojson",
    ming: "ming.geojson",
    qing: "qing.geojson",
};

/* -----------------------------------------------------------
   Initialize Globe
----------------------------------------------------------- */
function initGlobe() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const container = document.getElementById("globe-panel");
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000);
    camera.position.set(0, 0, 400);

    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById("globe-canvas"),
        antialias: true
    });
    renderer.setSize(width, height);

    // Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(200, 200, 300);
    scene.add(ambient);
    scene.add(sun);

    // Load Earth textures
    const loader = new THREE.TextureLoader();
    const diffuse = loader.load(earthTextures.diffuse);
    const bump = loader.load(earthTextures.bump);
    const spec = loader.load(earthTextures.specular);

    const geo = new THREE.SphereGeometry(150, 64, 64);
    const mat = new THREE.MeshPhongMaterial({
        map: diffuse,
        bumpMap: bump,
        bumpScale: 0.8,
        specularMap: spec,
        shininess: 12
    });

    earthMesh = new THREE.Mesh(geo, mat);
    scene.add(earthMesh);

    // Orbit Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;

    animate();
}

/* -----------------------------------------------------------
   Animation Loop
----------------------------------------------------------- */
function animate() {
    requestAnimationFrame(animate);

    earthMesh.rotation.y += 0.0009;

    // Heatmap animation
    if (activeDynastyMesh) {
        activeDynastyMesh.children.forEach(mesh => {
            mesh.material.uniforms.time.value += 0.02;
        });
    }

    renderer.render(scene, camera);
}

/* -----------------------------------------------------------
   Convert Latitude/Longitude to 3D position
----------------------------------------------------------- */
function convertLatLngTo3D(lat, lng, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    return {
        x: -radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta)
    };
}

/* -----------------------------------------------------------
   Load Dynasty territory (GeoJSON)
----------------------------------------------------------- */
async function loadDynasty(dynastyKey) {

    if (!DYNASTY_FILES[dynastyKey]) return;

    // Remove previous dynasty mesh
    if (activeDynastyMesh) {
        scene.remove(activeDynastyMesh);
    }

    const url = DYNASTY_PATH + DYNASTY_FILES[dynastyKey];
    const response = await fetch(url);
    const data = await response.json();

    const group = new THREE.Group();

    data.features.forEach(feature => {
        feature.geometry.coordinates.forEach(poly => {
            const shape = new THREE.Shape();

            poly[0].forEach(([lng, lat], i) => {
                const p = convertLatLngTo3D(lat, lng, 152);
                if (i === 0) shape.moveTo(p.x, p.y);
                else shape.lineTo(p.x, p.y);
            });

            const geom = new THREE.ExtrudeGeometry(shape, { depth: 4, bevelEnabled: false });

            const mat = new THREE.ShaderMaterial({
                vertexShader: HEATMAP_VERTEX,
                fragmentShader: HEATMAP_FRAGMENT,
                transparent: true,
                side: THREE.DoubleSide,
                uniforms: {
                    time: { value: 0.0 },
                    intensity: { value: 1.2 }
                }
            });

            const mesh = new THREE.Mesh(geom, mat);
            mesh.position.z += 153; // Push above Earth surface

            group.add(mesh);
        });
    });

    activeDynastyMesh = group;
    scene.add(group);

    console.log("Loaded dynasty:", dynastyKey);
}

/* -----------------------------------------------------------
   Dynasty Click Events
----------------------------------------------------------- */
function setupDynastyClicks() {
    document.querySelectorAll("#dynasty-list li").forEach(item => {
        item.addEventListener("click", () => {

            // Highlight selected item
            document.querySelectorAll("#dynasty-list li").forEach(i => i.classList.remove("active"));
            item.classList.add("active");

            const dynasty = item.getAttribute("data-dynasty");
            loadDynasty(dynasty);
        });
    });
}

// Initialize everything
window.onload = () => {
    initGlobe();
    setupDynastyClicks();
};
