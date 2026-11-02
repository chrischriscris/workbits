import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { TeamAvatar } from "./avatars";
import { localCharacter, teamById } from "../data/team";
import { useRealtimeStore, type RemotePlayer as RemotePlayerState } from "../realtime/store";
import { useVoiceStore } from "../voice/store";

function RemoteAvatar({ player, speaking }: { player: RemotePlayerState; speaking: boolean }) {
  const character = teamById[player.characterId] ?? localCharacter;
  const group = useRef<THREE.Group>(null);
  const target = useRef(new THREE.Vector3(player.x, 0, player.z));
  const targetRotation = useRef(player.rotation);

  useEffect(() => {
    target.current.set(player.x, 0, player.z);
    targetRotation.current = player.rotation;
  }, [player.x, player.z, player.rotation]);

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.lerp(target.current, 1 - Math.exp(-12 * delta));
    let difference = targetRotation.current - group.current.rotation.y;
    while (difference > Math.PI) difference -= Math.PI * 2;
    while (difference < -Math.PI) difference += Math.PI * 2;
    group.current.rotation.y += difference * Math.min(1, delta * 10);
  });

  return (
    <group ref={group} position={[player.x, 0, player.z]}>
      <TeamAvatar
        character={character}
        position={[0, 0, 0]}
        pose={player.characterId === "theo" ? "sleeping" : "standing"}
        motion={player.moving ? "walk" : "idle"}
        speaking={speaking}
      />
    </group>
  );
}

export function RemotePlayers() {
  const players = useRealtimeStore((state) => state.players);
  const sessionId = useRealtimeStore((state) => state.sessionId);
  const speaking = useVoiceStore((state) => state.speaking);

  return (
    <group>
      {Object.values(players)
        .filter((player) => player.id !== sessionId)
        .map((player) => (
          <RemoteAvatar key={player.id} player={player} speaking={speaking.includes(player.id)} />
        ))}
    </group>
  );
}
