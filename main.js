import * as THREE from "https://threejsfundamentals.org/threejs/resources/threejs/r127/build/three.module.js";

const videoElement = document.getElementsByClassName("input_video")[0];
const canvasElement = document.getElementsByClassName("output_canvas")[0];

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

function initThreeApp(canvas, w, h) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
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
  const color = 0xffffff;
  const intensity = 1;
  const light = new THREE.DirectionalLight(color, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);

  // add a box
  const boxWidth = 0.2;
  const boxHeight = 0.2;
  const boxDepth = 0.2;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const material = new THREE.MeshPhongMaterial({
    color: 0x44aa88,
    transparent: true,
    opacity: 0.8,
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(4, 3), new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.9, transparent: true, map: new THREE.VideoTexture( videoElement ) }));
  scene.add(plane);

  return {
    renderer,
    camera,
    scene,
    resize,
    render,
    cube,
  };
}

initVideo(videoElement, 1024, 768);
const threeApp = initThreeApp(canvasElement, 1024, 768);
const onResults = function (res) {
  const landmarks = res.multiHandLandmarks;
  if (landmarks?.length > 0) {
    console.log(res);
    console.log(landmarks);
  }

  if (!landmarks || !landmarks[0] || !landmarks[0][14] || !landmarks[0][13]) return;
  const { x, y, z } = landmarks[0][14];
  console.log(landmarks[0][14]);

  // landmarks[0][1] == nose position(face center point)
  // use landmarks xy value to calculate the screen xy
  let vec = new THREE.Vector3();
  let pos = new THREE.Vector3();
  vec.set(x * 2 - 1, -y * 2 + 1, z);
  vec.unproject(threeApp.camera);
  vec.sub(threeApp.camera.position).normalize();
  let distance = -threeApp.camera.position.z / vec.z;
  pos.copy(threeApp.camera.position).add(vec.multiplyScalar(distance));
  threeApp.cube.position.x = pos.x;
  threeApp.cube.position.y = pos.y;

  // todo
  // got the cube xy then how to get the z value?
};

handMesh.onResults(onResults);

const run = async function () {
  threeApp.render();
  await handMesh.send({ image: videoElement });
  requestAnimationFrame(run);
};

document.getElementById("run").addEventListener("click", run);

function initVideo(video, w, h) {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const constraints = { video: { width: w, height: h, facingMode: "user" } };

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
