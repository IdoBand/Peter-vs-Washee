import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'

export type IAbstractCharacterControl = {
  model: THREE.Group
  mixer: THREE.AnimationMixer
  animationsMap: Map<string, THREE.AnimationAction | null>
  loader: FBXLoader
  currentAction: string
  position: THREE.Vector3
  startingPosition: THREE.Vector3
  init: () => Promise<AbstractCharacterControl>
}

export abstract class AbstractCharacterControl implements IAbstractCharacterControl {
  model!: THREE.Group
  mixer!: THREE.AnimationMixer
  animationsMap: Map<string, THREE.AnimationAction | null> = new Map()
  loader: FBXLoader
  currentAction: string = 'Idle'
  fadeDuration: number = 0.2
  position: THREE.Vector3
  readonly startingPosition: THREE.Vector3

  constructor(loader: FBXLoader, startingPosition: THREE.Vector3) {
    this.loader = loader
    this.setAnimationNames()
    this.position = startingPosition
    this.startingPosition = startingPosition
  }

  protected abstract loadModel(startingPosition: THREE.Vector3): Promise<THREE.Group>
  protected abstract loadAnimations(): Promise<void>

  async init() {
    this.model = await this.loadModel(this.startingPosition)
    await this.loadAnimations()
    const initialAction = this.animationsMap.get(this.currentAction)
    initialAction?.play()
    return this
  }
  public update(delta: number, keysPressed: { [key: string]: boolean }): void {
    let play = '';
    if (keysPressed['c']) {
        play = 'WalkingBackwards'
        const moveSpeed = 1 // meters per second
        const distance = moveSpeed * delta
        const backward = new THREE.Vector3(0, 0, -0.5)
        this.model.position.add(backward.multiplyScalar(distance))
      }
      else if (keysPressed['v']) {
        play = 'crunch'
        const moveSpeed = 1 // meters per second
        const distance = moveSpeed * delta
        const backward = new THREE.Vector3(0, 0, 0.5)
        this.model.position.add(backward.multiplyScalar(distance))
        
    } else {
      play = 'Idle'
    }

    if (this.currentAction != play) {
        console.log(`Switching from ${this.currentAction} to ${play}`)
        
        const toPlay = this.animationsMap.get(play)
        const current = this.animationsMap.get(this.currentAction)
        
        if (!toPlay || !current) return

        current.fadeOut(this.fadeDuration)
        toPlay.reset().fadeIn(this.fadeDuration).play()  // Keep the reset

        this.currentAction = play
    }

    this.mixer.update(delta)
  }
  private setAnimationNames() {
    const fileNames: string[] = ['Idle', 'WalkingBackwards']
    for (const name of fileNames) {
      this.animationsMap.set(name, null)
    }
  }
  
}