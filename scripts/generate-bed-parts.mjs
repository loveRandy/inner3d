import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class FileReader {
  result = null;
  onload = null;
  onloadend = null;

  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }

  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
      this.result = `data:application/octet-stream;base64,${btoa(binary)}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
};

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = join(rootDir, 'public/models/custom/bed_double_parts.gltf');

const bed = new Group();
bed.name = 'bed_double_parts';

const specs = [
  { name: 'bed_frame', color: 0x8b7355, position: [0, 0.15, 0], scale: [2, 0.3, 1.8] },
  { name: 'mattress', color: 0xf5f5f4, position: [0, 0.35, 0], scale: [1.8, 0.2, 1.6] },
  { name: 'pillow', color: 0xe5e7eb, position: [0, 0.5, -0.65], scale: [0.6, 0.12, 0.4] },
  { name: 'quilt', color: 0x93c5fd, position: [0, 0.48, 0.2], scale: [1.7, 0.08, 1.2] },
];

for (const spec of specs) {
  const mesh = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: spec.color, roughness: 0.85 }),
  );
  mesh.name = spec.name;
  mesh.position.set(spec.position[0], spec.position[1], spec.position[2]);
  mesh.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
  bed.add(mesh);
}

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(bed, { binary: false });

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`Wrote ${outputPath}`);
