<template>
  <div ref="mountRef" class="three-container">
    <div class="controls-info">
      <h3>Three.js Controls:</h3>
      <ul>
        <li>Left Mouse: Rotate camera</li>
        <li>Right Mouse: Pan camera</li>
        <li>Scroll: Zoom in/out</li>
      </ul>
      <p>Yellow box = Model bounding box</p>
      <p>Check console for model dimensions</p>
      <button @click="">click me</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import * as THREE from 'three'
import type { 
  Scene, 
  PerspectiveCamera, 
  WebGLRenderer, 
  DirectionalLight,
  AmbientLight,
  Mesh,
  PlaneGeometry,
  MeshStandardMaterial,
  GridHelper,
  AxesHelper,
  Clock,
} from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Player1Controls } from './Player1Controls.ts'
import { GLTFCharacter } from '../assets/gltfCharacter.ts'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Template ref for mounting Three.js
const mountRef: Ref<HTMLDivElement | undefined> = ref<HTMLDivElement>()

// Three.js references with explicit types
let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer
let controls: OrbitControls


const clock: Clock = new THREE.Clock()

// Initialize Three.js scene
const initScene = (): void => {
  if (!mountRef.value) return

  // Scene setup
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x87CEEB) // Sky blue
  scene.fog = new THREE.Fog(0x87CEEB, 10, 50)

  // Camera setup - PerspectiveCamera(fov, aspect, near, far)
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(-10, 3, 0)
  camera.lookAt(0, 0, 0)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  mountRef.value.appendChild(renderer.domElement)

  // Orbit Controls - allows mouse control of camera
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.target.set(0, 5, 0) // Look at character height

  // Lighting
  const ambientLight: AmbientLight = new THREE.AmbientLight(0xffffff, 1)
  scene.add(ambientLight)

  const directionalLight: DirectionalLight = new THREE.DirectionalLight(0xffffff, 2)
  directionalLight.position.set(5, 10, 5)
  directionalLight.castShadow = true
  directionalLight.shadow.camera.near = 0.1
  directionalLight.shadow.camera.far = 50
  directionalLight.shadow.camera.left = -10
  directionalLight.shadow.camera.right = 10
  directionalLight.shadow.camera.top = 10
  directionalLight.shadow.camera.bottom = -10
  directionalLight.shadow.mapSize.width = 2048
  directionalLight.shadow.mapSize.height = 2048
  scene.add(directionalLight)

  // Ground plane
  const groundGeometry: PlaneGeometry = new THREE.PlaneGeometry(45, 45)
  const groundMaterial: MeshStandardMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xD3D3D3,
    roughness: 0.8,
    metalness: 0.2
  })
  const ground: Mesh<PlaneGeometry, MeshStandardMaterial> = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = 0
  ground.receiveShadow = true
  scene.add(ground)

  // Grid helper - GridHelper(size, divisions, colorCenterLine, colorGrid)
  const gridHelper: GridHelper = new THREE.GridHelper(45, 45, 0x000000, 0x666666)
  scene.add(gridHelper)

  // Axes helper - AxesHelper(size)
  const axesHelper: AxesHelper = new THREE.AxesHelper(5)
  scene.add(axesHelper)
}
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////
const keysPressed: { [key: string]: boolean } = {}
window.addEventListener('keydown', (e) => {
  keysPressed[e.key.toLowerCase()]  = true
})

window.addEventListener('keyup', (e) => {
  keysPressed[e.key.toLowerCase()] = false
})


let Peter: Player1Controls
let gltf: GLTFCharacter

// Load character model
const loadCharacters = async (): Promise<void> => {
  const loader: FBXLoader = new FBXLoader()
  
  Peter = await new Player1Controls(loader, new THREE.Vector3(0, 0, 0)).init()
  // scene.add(Peter.model)

  const gltfLoader = new GLTFLoader()
  gltf = new GLTFCharacter(
    gltfLoader, 
    '/character_final_correct.gltf',  // Our new GLTF file
    new THREE.Vector3(0, 0, 0)
  )
  await gltf.init()
  scene.add(gltf.model)

  animate()
}

// Animation loop
const animate = (): void => {
  requestAnimationFrame(animate)
  
  controls.update()

  // Update animations
  const delta: number = clock.getDelta()
  if (Peter) {
    Peter.update(delta, keysPressed)
  }
  if (gltf) {
    
    gltf.update(delta, keysPressed)
  }
  renderer.render(scene, camera)
}

// Handle window resize
const handleResize = (): void => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Lifecycle hooks
onMounted(() => {
  initScene()
  loadCharacters()
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (mountRef.value && renderer) {
    mountRef.value.removeChild(renderer.domElement)
  }
  renderer?.dispose()
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.controls-info {
  position: absolute;
  top: 10px;
  left: 10px;
  color: white;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 10px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
}

.controls-info h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.controls-info ul {
  margin: 0 0 10px 20px;
  padding: 0;
  font-size: 14px;
}

.controls-info p {
  margin: 5px 0;
  font-size: 14px;
}
</style>