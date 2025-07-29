import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { AbstractCharacterControl } from '../AbstractCharacterControl'
import { Animations } from '../AbstractCharacterControl'

export class Player1Controls extends AbstractCharacterControl {
    path: string
  constructor(fbxLoader: FBXLoader, startingPosition: THREE.Vector3) {
    super(fbxLoader, startingPosition)
    this.path = "/peter/mixamo"
  }

 getPath (fileName: string) {
    return `${this.path}/${fileName}`
}
protected async loadModel(startingPosition: THREE.Vector3): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
        this.loader.load(
            this.getPath('Idle.fbx'),
            (fbx: THREE.Group) => {
                fbx.scale.setScalar(0.01)
                fbx.position.set(startingPosition.x, startingPosition.y, startingPosition.z)
                
                fbx.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        child.castShadow = true
                        child.receiveShadow = true
                    }
                })
                
                this.model = fbx
                this.mixer = new THREE.AnimationMixer(fbx)

                if (fbx.animations.length > 0) {
                    const action = this.mixer.clipAction(fbx.animations[0])
                    action.play()
                }
                
                resolve(fbx)
            },
            undefined,
            (error) => reject(error)
        )
    })
}

  protected loadAnimations(): Promise<void> {
    
    let loadedCount = 0
    const animationNames = Object.values(Animations)
    return new Promise((resolve, reject) => {
        for (const name of animationNames) {
            this.loader.load(this.getPath(`${name}.fbx`), (animFbx) => {
                if (animFbx.animations.length > 0) {
                    const clip = animFbx.animations[0]
                    
                    const action = this.mixer.clipAction(clip, this.model)
                    action.setLoop(THREE.LoopRepeat, Infinity)

                    this.animationsMap.set(name, action)
                    
                    console.log(`Loaded animation: ${name}`, action)
                }

                loadedCount++
                if (loadedCount === this.animationsMap.size) {
                    console.log('All animations loaded:', Array.from(this.animationsMap.keys()))
                    resolve()
                }
            }, undefined, (err) => {
                console.error(`Failed to load ${name}:`, err)
                reject(err)
            })
        }
    })
}

}
