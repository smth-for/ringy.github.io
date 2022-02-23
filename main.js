import * as THREE from "./res/js/three.module.js";
import { DRACOLoader } from "./res/js/DRACOLoader.js";
import { GLTFLoader } from "./res/js/GLTFLoader.js";

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];
const btnRun = document.getElementById("run");

const handMesh = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  },
});
handMesh.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

let ring;

function initThreeApp(canvas, w, h) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: true,
  });

  const fov = 75;
  const near = 0.01;
  const far = 1000;
  const camera = new THREE.PerspectiveCamera(fov, 800 / 720, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();

  function resize() {
    const width = w || window.innerWidth;
    const height = h || window.innerHeight;

    renderer.setSize(width, height);
    renderer.setPixelRatio(window.pixelRatio);

    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
    }
    camera.updateProjectionMatrix();
  }

  function render() {
    renderer.render(scene, camera);
  }

  // initial resize and render
  resize();
  render();

  // add a light
  const color = 0xfefefe;
  const intensity = 4;
  const dirLight = new THREE.DirectionalLight(color, intensity);
  dirLight.position.set(-1, 2, 4);
  scene.add(dirLight);

  const spotLight = new THREE.SpotLight(color, 2);
  spotLight.position.copy(camera.position);
  scene.add(spotLight);

  spotLight.onAfterRender(() => {
    spotLight.lookAt(ring.position);
  })

  // add a box
  const boxWidth = 0.2;
  const boxHeight = 0.2;
  const boxDepth = 0.2;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const material = new THREE.MeshPhongMaterial({
    color: 0x44aa88,
    //transparent: true,
    //opacity: 0.8,
  });
  const cube = new THREE.Mesh(geometry, material);
  //scene.add(cube);

  const plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(3.1, 3.1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      //opacity: 0.95,
      //transparent: true,
      map: new THREE.VideoTexture(videoElement),
    })
  );
  scene.add(plane);

  const textureLoader = new THREE.TextureLoader();

	const textureEquirec = textureLoader.load( './res/textures/envMap.jpeg' );
	textureEquirec.mapping = THREE.EquirectangularReflectionMapping;
	textureEquirec.encoding = THREE.sRGBEncoding;

	scene.background = textureEquirec;
	scene.environment = textureEquirec;

  const gltfLoader = new GLTFLoader();
  // Optional: Provide a DRACOLoader instance to decode compressed mesh data
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath("./res/js/draco/");
  gltfLoader.setDRACOLoader(dracoLoader);

  // Load a glTF resource
  gltfLoader.load(
    // resource URL
    "./res/models/Pomellato.glb",
    // called when the resource is loaded
    (gltf) => {
      ring = gltf.scene;
      ring.scale.set(4, 4, 4);
      ring.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.side = THREE.DoubleSide;
          child.material.needsUpdate = true;
          child.position.z = -0.8;
          child.updateMatrixWorld();
          if(child?.userData?.name === "pomellatoNudo_gem49"){
            //child.material.map = null;
            child.material.transmission = 0.8;
            child.material.sheen = 0.5;
            child.material.needsUpdate = true;
          }
          console.log(child);
        }
      });
      ring.visible = false;
      scene.add(ring);

      gltf.animations; // Array<THREE.AnimationClip>
      gltf.scene; // THREE.Group
      gltf.scenes; // Array<THREE.Group>
      gltf.cameras; // Array<THREE.Camera>
      gltf.asset; // Object
    },
    // called while loading is progressing
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    // called when loading has errors
    function (error) {
      console.log("An error happened");
    }
  );

  return {
    renderer,
    camera,
    scene,
    resize,
    render,
    cube,
  };
}

initVideo(videoElement, 800, 800);
const threeApp = initThreeApp(canvasElement, 800, 800);

const onResults = function (res) {
  btnRun.style.display = "none";
  const landmarks = res.multiHandLandmarks;
  if (landmarks?.length > 0) {
    //console.log(res);
    //console.log(landmarks);
  }

  if (
    !ring ||
    !landmarks ||
    !landmarks[0] ||
    !landmarks[0][14] ||
    !landmarks[0][13] ||
    !landmarks[0][0] ||
    !landmarks[0][9]
  ){
    ring.visible = false;
    return;
  }

  ring.visible = true;
  //const { x, y, z } = landmarks[0][13];
  //console.log(landmarks[0][14]);

  const wrist = new THREE.Vector3(
    landmarks[0][0].x,
    landmarks[0][0].y,
    landmarks[0][0].z
  );
  const pointA = new THREE.Vector3(
    landmarks[0][13].x,
    landmarks[0][13].y,
    landmarks[0][13].z
  );
  const pointB = new THREE.Vector3(
    landmarks[0][14].x,
    landmarks[0][14].y,
    landmarks[0][14].z
  );
  const pointN = new THREE.Vector3(
    landmarks[0][9].x,
    landmarks[0][9].y,
    landmarks[0][9].z
  );
  const percentage = 0.65;

  var dir = pointB.clone().sub(pointA);
  var length = dir.length();
  dir = dir.normalize().multiplyScalar(length * percentage);
  const point = pointA.clone().add(dir);

  const rotateZ = Math.atan(
    (landmarks[0][14].y - landmarks[0][13].y) /
      (landmarks[0][14].x - landmarks[0][13].x)
  );
  const rotateX = Math.atan(
    (landmarks[0][14].z - landmarks[0][0].z) /
      (landmarks[0][14].y - landmarks[0][0].y)
  );
  const rotateY = Math.atan(
    (landmarks[0][9].z - landmarks[0][13].z) /
      (landmarks[0][9].x - landmarks[0][13].x)
  );

  const scale_x = landmarks[0][13].x - landmarks[0][14].x;
  const scale_y = landmarks[0][13].y - landmarks[0][14].y;
  const scale_z = landmarks[0][13].z - landmarks[0][14].z;
  //calculate the distance between landmarks[13] and [14]
  const scale = Math.sqrt(
    (landmarks[0][14].x - landmarks[0][13].x) ** 2 +
      (landmarks[0][14].y - landmarks[0][13].y) ** 2 +
      (landmarks[0][14].z - landmarks[0][13].z) ** 2
  );

  // landmarks[0][1] == nose position(face center point)
  // use landmarks xy value to calculate the screen xy
  let vec = new THREE.Vector3();
  let pos = new THREE.Vector3();
  vec.set(point.x * 2 - 1, -point.y * 2 + 1, point.z);
  vec.unproject(threeApp.camera);
  vec.sub(threeApp.camera.position).normalize();
  let distance = -threeApp.camera.position.z / vec.z;
  pos.copy(threeApp.camera.position).add(vec.multiplyScalar(distance));
  threeApp.cube.position.x = pos.x;
  threeApp.cube.position.y = pos.y;
  
  ring.position.x = pos.x;
  ring.position.y = pos.y;
  //ring.position.z = pos.z - 0.1;

  //ring.scale.x = scale*45;
  //ring.scale.y = scale*45;
  //ring.scale.z = scale*45;
  ring.scale.x = scale * 1.5;
  ring.scale.y = scale * 1.5;
  ring.scale.z = scale * 1.5;

  const hand_info = res.multiHandedness[0].label;
  // ring.rotation.x = rotateX + Math.PI / 2;
  ring.rotation.z = -rotateZ + Math.PI / 2;

  if (hand_info === "Left") {
    if (rotateY < 0) {
      ring.rotation.y = rotateY + Math.PI / 16;
    } else {
      ring.rotation.y = rotateY + Math.PI + Math.PI / 16;
    }
  } else {
    if (rotateY > 0) {
      ring.rotation.y = rotateY - Math.PI / 16;
    } else {
      ring.rotation.y = rotateY + Math.PI - Math.PI / 16;
    }
  }

  // ring.lookAt(pointA);

  // todo
  // got the cube xy then how to get the z value?
};

handMesh.onResults(onResults);

const run = async function () {
  threeApp.render();
  await handMesh.send({ image: videoElement });
  requestAnimationFrame(run);
  //ring.rotation.z += 0.1;
};


btnRun.addEventListener("click", (evt) => {
  console.log(evt);
  evt.target.innerText = 'WAITING...';
  run();
});

function initVideo(video, w, h) {
  const width = w || window.innerWidth;
  const height = h || window.innerHeight;
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = { video: { width, height, facingMode: "environment" } };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function (stream) {
        // apply the stream to the video element used in the texture
        video.srcObject = stream;
        video.play();
      })
      .catch(function (error) {
        console.error("Unable to access the camera/webcam.", error);
      });
  } else {
    console.error("MediaDevices interface not available.");
  }
}
