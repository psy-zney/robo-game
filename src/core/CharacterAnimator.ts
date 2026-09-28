import * as THREE from 'three';

export type CharacterAnimation = 'idle' | 'walk' | 'run' | 'attack' | 'lie';

const CLIP_NAMES: Record<CharacterAnimation, string[]> = {
  idle: ['idle', 'rat_idle', 'idle_2'],
  walk: ['walk', 'rat_walk'],
  run: ['run', 'rat_run', 'gallop'],
  attack: ['attack', 'rat_attack', 'bite'],
  lie: ['lie', 'sleep', 'sit'],
};

export function findCharacterClip(clips: THREE.AnimationClip[], state: CharacterAnimation) {
  for (const alias of CLIP_NAMES[state]) {
    const clip = clips.find(candidate => candidate.name.split('|').pop()?.toLowerCase() === alias);
    if (clip) return clip;
  }
  return undefined;
}

/** Crossfade only named clips; never substitute an attack/death for an idle. */
export class CharacterAnimator {
  private mixer: THREE.AnimationMixer;
  private actions = new Map<CharacterAnimation, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;

  constructor(model: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(model);
    for (const state of Object.keys(CLIP_NAMES) as CharacterAnimation[]) {
      const clip = findCharacterClip(clips, state);
      if (clip) this.actions.set(state, this.mixer.clipAction(clip));
    }
    this.play('idle');
  }

  public play(state: CharacterAnimation, speed = 1) {
    const action = this.actions.get(state) ?? this.actions.get('idle');
    if (!action) return;
    if (action !== this.current) {
      this.current?.fadeOut(0.18);
      action.reset().setEffectiveWeight(1).fadeIn(0.18).play();
      if (state === 'attack') {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      this.current = action;
    }
    action.setEffectiveTimeScale(speed);
  }

  public update(deltaTime: number) {
    this.mixer.update(deltaTime);
  }
}
