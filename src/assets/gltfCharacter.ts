import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface IGLTFCharacter {
  model: THREE.Group
  mixer: THREE.AnimationMixer
  animationsMap: Map<string, THREE.AnimationAction>
  loader: GLTFLoader
  currentAction: string
  position: THREE.Vector3
  startingPosition: THREE.Vector3
  init: () => Promise<GLTFCharacter>
  update: (delta: number, keysPressed: { [key: string]: boolean }) => void
}

// Animation names enum for consistency with your existing system
export class GLTFAnimations {
  public static readonly idle = 'Idle'
  public static readonly walkForward = 'WalkingForward'
  public static readonly walkBackwards = 'WalkingBackwards'
  public static readonly tPose = 'TPose'
}

export class GLTFCharacter implements IGLTFCharacter {
  model!: THREE.Group
  mixer!: THREE.AnimationMixer
  animationsMap: Map<string, THREE.AnimationAction> = new Map()
  loader: GLTFLoader
  currentAction: string = ''
  fadeDuration: number = 0.2
  position: THREE.Vector3
  readonly startingPosition: THREE.Vector3
  
  private gltfPath: string

  constructor(loader: GLTFLoader, gltfPath: string, startingPosition: THREE.Vector3) {
    this.loader = loader
    this.gltfPath = gltfPath
    this.position = startingPosition
    this.startingPosition = startingPosition.clone()
  }

  async init(): Promise<GLTFCharacter> {
    try {
      console.log('Loading GLTF from:', this.gltfPath)
      const gltf = await this.loadGLTF()
      this.setupModel(gltf)
      this.setupAnimations(gltf)
      
      // Start with the first available animation (should be Idle)
      if (this.animationsMap.size > 0) {
        // Try to find Idle animation first
        let initialAction = this.animationsMap.get('Idle')
        let initialActionName = 'Idle'
        
        if (!initialAction) {
          // If no Idle, use first available
          initialActionName = this.animationsMap.keys().next().value as string
          initialAction = this.animationsMap.get(initialActionName)
        }
        
        if (initialAction) {
          this.currentAction = initialActionName
          initialAction.reset()
          initialAction.play()
          console.log(`✓ Started playing: ${this.currentAction}`)
        }
      }
      
      console.log('✓ GLTFCharacter initialized successfully')
      console.log('✓ Available animations:', Array.from(this.animationsMap.keys()))
      this.debugAnimations()
      
      return this
    } catch (error) {
      console.error('❌ Failed to initialize GLTFCharacter:', error)
      throw error
    }
  }

  private loadGLTF(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        this.gltfPath,
        (gltf) => {
          console.log('✓ GLTF loaded successfully')
          resolve(gltf)
        },
        (progress) => {
          const percent = progress.total > 0 ? (progress.loaded / progress.total * 100).toFixed(1) : '0'
          console.log(`Loading progress: ${percent}%`)
        },
        (error) => {
          console.error('❌ Error loading GLTF:', error)
          reject(error)
        }
      )
    })
  }

  private setupModel(gltf: any): void {
    // Get the main scene/model from GLTF
    this.model = gltf.scene
    
    // Apply scaling and positioning
    this.model.scale.setScalar(1) // Adjusted scale for the fixed export
    this.model.position.copy(this.startingPosition)
    
    // Setup shadows for all meshes
    this.model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    
    // Create animation mixer
    this.mixer = new THREE.AnimationMixer(this.model)
    
    console.log('✓ Model setup complete')
    console.log('  - Scale:', this.model.scale)
    console.log('  - Position:', this.model.position)
    console.log('  - Children:', this.model.children.length)
  }

  private setupAnimations(gltf: any): void {
    if (!gltf.animations || gltf.animations.length === 0) {
      console.warn('⚠️ No animations found in GLTF file')
      return
    }

    console.log('📽️ Setting up animations...')
    console.log('Found GLTF animations:', gltf.animations.map((clip: THREE.AnimationClip) => clip.name))

    // Create actions for each animation using exact GLTF names
    gltf.animations.forEach((clip: THREE.AnimationClip) => {
      const action = this.mixer.clipAction(clip)
      
      // Set animation properties
      action.setLoop(THREE.LoopRepeat, Infinity)
      action.clampWhenFinished = false
      action.enabled = true
      
      // Store with exact GLTF name
      this.animationsMap.set(clip.name, action)
      console.log(`  ✓ Mapped: "${clip.name}" (${clip.duration.toFixed(2)}s)`)
    })

    // Create convenience mappings for standard names
    this.createStandardMappings()
    
    console.log('✓ Animation setup complete')
    console.log('  Total animations:', this.animationsMap.size)
  }

  private createStandardMappings(): void {
    // Map standard names to GLTF animation names
    const mappings = [
      { standard: GLTFAnimations.idle, gltf: 'Idle' },
      { standard: GLTFAnimations.walkBackwards, gltf: 'WalkingBackwards' },
      { standard: GLTFAnimations.walkForward, gltf: 'WalkingForward' },
      { standard: GLTFAnimations.tPose, gltf: 'TPose' }
    ]

    mappings.forEach(({ standard, gltf }) => {
      const action = this.animationsMap.get(gltf)
      if (action && !this.animationsMap.has(standard)) {
        this.animationsMap.set(standard, action)
        console.log(`  ✓ Standard mapping: ${standard} -> ${gltf}`)
      }
    })
  }

  public update(delta: number, keysPressed: { [key: string]: boolean }): void {
    // Always update mixer first - this is crucial!
    if (this.mixer) {
      this.mixer.update(delta)
    }

    // Determine target animation based on input
    let targetAnimation = 'Idle'  // Default to idle

    if (keysPressed['c']) {
      targetAnimation = 'WalkingBackwards'
      const speed = keysPressed.shift ? 2 : 1
      this.walk(delta, -1, speed)
    } else if (keysPressed['v']) {
      const speed = keysPressed.shift ? 2 : 1
      targetAnimation = 'WalkingForward'  // You'll need to add this animation
      this.walk(delta, 1, speed)
    }

    // Switch animation if needed
    if (this.currentAction !== targetAnimation) {
      this.switchAnimation(targetAnimation)
    }
  }

  private switchAnimation(newAnimation: string): void {
    const newAction = this.animationsMap.get(newAnimation)
    const currentAction = this.animationsMap.get(this.currentAction)

    if (!newAction) {
      console.warn(`⚠️ Animation "${newAnimation}" not found`)
      console.log('Available animations:', Array.from(this.animationsMap.keys()))
      return
    }

    if (!currentAction) {
      // No current animation, just start the new one
      console.log(`▶️ Starting animation: ${newAnimation}`)
      newAction.reset().play()
      this.currentAction = newAnimation
      return
    }

    if (currentAction === newAction) {
      // Same animation, no need to switch
      return
    }

    // Smooth transition between animations
    console.log(`🔄 Switching: ${this.currentAction} -> ${newAnimation}`)
    
    currentAction.fadeOut(this.fadeDuration)
    newAction.reset().fadeIn(this.fadeDuration).play()
    
    this.currentAction = newAnimation
  }

  private walk(delta: number, direction: 1 | -1, speed: number=1): void {
    const moveSpeed = speed // meters per second
    const distance = moveSpeed * delta
    const movement = new THREE.Vector3(0, 0, direction * 0.5)
    
    // Apply movement to model
    this.model.position.add(movement.multiplyScalar(distance))
    
    // Update position reference
    this.position.copy(this.model.position)
  }

  // Utility methods
  public playAnimation(animationName: string, loop: boolean = true): boolean {
    const action = this.animationsMap.get(animationName)
    if (!action) {
      console.warn(`⚠️ Animation "${animationName}" not found`)
      return false
    }

    // Stop current animation
    const currentAction = this.animationsMap.get(this.currentAction)
    if (currentAction && currentAction !== action) {
      currentAction.stop()
    }

    // Play new animation
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    action.reset().play()
    this.currentAction = animationName
    
    console.log(`▶️ Playing: ${animationName}`)
    return true
  }

  public stopAllAnimations(): void {
    this.animationsMap.forEach((action, name) => {
      action.stop()
      console.log(`⏹️ Stopped: ${name}`)
    })
    this.currentAction = ''
  }

  public setPosition(position: THREE.Vector3): void {
    this.model.position.copy(position)
    this.position.copy(position)
  }

  public getPosition(): THREE.Vector3 {
    return this.model.position.clone()
  }

  public setScale(scale: number): void {
    this.model.scale.setScalar(scale)
  }

  public getAnimationNames(): string[] {
    return Array.from(this.animationsMap.keys())
  }

  public isAnimationPlaying(animationName: string): boolean {
    const action = this.animationsMap.get(animationName)
    return action ? action.isRunning() : false
  }

  public debugAnimations(): void {
    console.log('🎬 === Animation Debug Info ===')
    console.log(`Current action: "${this.currentAction}"`)
    console.log(`Available animations: [${this.getAnimationNames().join(', ')}]`)
    console.log(`Mixer time scale: ${this.mixer?.timeScale || 'N/A'}`)
    
    this.animationsMap.forEach((action, name) => {
      console.log(`  ${name}:`, {
        isRunning: action.isRunning(),
        enabled: action.enabled,
        weight: action.weight.toFixed(3),
        time: action.time.toFixed(3),
        duration: action.getClip().duration.toFixed(3)
      })
    })
    console.log('🎬 ========================')
  }

  public dispose(): void {
    console.log('🧹 Disposing GLTFCharacter...')
    
    // Clean up animations
    this.stopAllAnimations()
    this.animationsMap.clear()
    
    if (this.mixer) {
      this.mixer.stopAllAction()
    }
    
    // Dispose of geometries and materials
    this.model?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) {
          child.geometry.dispose()
        }
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
    })
    
    console.log('✓ GLTFCharacter disposed')
  }
}