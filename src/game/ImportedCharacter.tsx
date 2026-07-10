import { forwardRef, RefObject, useImperativeHandle } from "react";
import * as THREE from "three";
import { useAnimatedModel } from "./useAnimatedModel";

export type ImportedCharacterHandle = {
  getAttachmentWorldPosition: (name: string, target: THREE.Vector3) => boolean;
  getObject: (name: string) => THREE.Object3D | null;
};

type ImportedCharacterProps = {
  url: string;
  desiredClip: RefObject<string>;
};

export const ImportedCharacter = forwardRef<ImportedCharacterHandle, ImportedCharacterProps>(
  function ImportedCharacter({ url, desiredClip }, ref) {
    const scene = useAnimatedModel(url, desiredClip);
    useImperativeHandle(ref, () => ({
      getAttachmentWorldPosition(name, target) {
        const object = scene.getObjectByName(name);
        if (!object) return false;
        object.getWorldPosition(target);
        return true;
      },
      getObject(name) {
        return scene.getObjectByName(name) ?? null;
      },
    }), [scene]);
    return (
      <group rotation={[0, Math.PI, 0]}>
        <primitive object={scene} />
      </group>
    );
  },
);
