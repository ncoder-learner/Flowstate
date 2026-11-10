export type IndustrialCover = { x: number; z: number; width: number; depth: number; height: number; };
export type IndustrialShard = { id: string; x: number; z: number; value: number; };
export type IndustrialHostile = { kind: 'RUNNER' | 'SNIPER' | 'TANK' | 'DRONE' | 'INTERCEPTOR' | 'ANCHOR'; x: number; z: number; };
export type IndustrialRoom = {
  id: string;
  title: string;
  centerZ: number;
  width: number;
  depth: number;
  variant: number;
  cover: IndustrialCover[];
  shards: IndustrialShard[];
  hostiles: IndustrialHostile[];
};
export type IndustrialExpedition = {
  seed: string;
  rooms: IndustrialRoom[];
  extraction: { x: number; z: number };
  bounds: { minZ: number; maxZ: number; halfWidth: number };
};

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomSource(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateIndustrialExpedition(seed: string): IndustrialExpedition {
  const random = randomSource(hashSeed(seed));
  const centers = [4, -22, -48, -74];
  const titles = ['ENTRY AIRLOCK', 'THE FOUNDRY', 'RELAY CHAMBER', 'EXTRACTION VAULT'];
  const rooms = centers.map((centerZ, index): IndustrialRoom => {
    const variant = Math.floor(random() * 3);
    const cover: IndustrialCover[] = [];
    const shards: IndustrialShard[] = [];
    const hostiles: IndustrialHostile[] = [];

    if (variant === 0) {
      for (const side of [-1, 1]) {
        cover.push({ x: side * 5.2, z: centerZ - 1.5, width: 2.2, depth: 2.8, height: 2.4 });
        cover.push({ x: side * 9.1, z: centerZ + 4.2, width: 1.6, depth: 3.2, height: 1.5 });
      }
    } else if (variant === 1) {
      for (const side of [-1, 1]) {
        cover.push({ x: side * 7.5, z: centerZ - 3.5, width: 3.8, depth: 1.5, height: 3.6 });
        cover.push({ x: side * 3.1, z: centerZ + 4.5, width: 1.5, depth: 2.6, height: 2.1 });
      }
    } else {
      cover.push({ x: -6.4, z: centerZ, width: 2.0, depth: 5.4, height: 2.0 });
      cover.push({ x: 6.4, z: centerZ, width: 2.0, depth: 5.4, height: 2.0 });
      cover.push({ x: 0, z: centerZ - 5.8, width: 4.0, depth: 1.4, height: 1.6 });
    }

    const shardCount = index === 0 ? 1 : index === 3 ? 3 : 2;
    for (let shard = 0; shard < shardCount; shard++) {
      const side = random() < .5 ? -1 : 1;
      shards.push({
        id: 'R' + index + '-D' + shard,
        x: side * (2.5 + random() * 8),
        z: centerZ + (random() - .5) * 12,
        value: index === 3 ? 2 : 1,
      });
    }

    if (index > 0) {
      const candidates: IndustrialHostile['kind'][] = ['RUNNER', 'RUNNER', 'SNIPER', 'DRONE', 'INTERCEPTOR', 'TANK', 'ANCHOR'];
      const count = index === 3 ? 4 : 2 + index;
      for (let enemy = 0; enemy < count; enemy++) {
        hostiles.push({
          kind: index===3&&enemy===0?'ANCHOR':candidates[Math.floor(random() * candidates.length)],
          x: (random() < .5 ? -1 : 1) * (4 + random() * 8),
          z: centerZ + (random() - .5) * 9,
        });
      }
    }

    return { id: 'industrial-' + (index + 1), title: titles[index], centerZ, width: 26, depth: 22, variant, cover, shards, hostiles };
  });

  return {
    seed,
    rooms,
    extraction: { x: 0, z: -85 },
    bounds: { minZ: -91, maxZ: 20, halfWidth: 14 },
  };
}
