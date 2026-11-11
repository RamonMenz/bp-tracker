/** Projecao limitada de metadados nativos. Nao serializar objetos/erros do SDK. */
export function describeFrameFailure(value: unknown): readonly string[] {
  if (!value || typeof value !== 'object') return [];
  const data = value as Record<string, unknown>;
  const reasons = ['frame-format', 'frame-size', 'frame-stride', 'frame-plane', 'frame-copy'];
  if (data.revision !== 'frame-1' || typeof data.reason !== 'string' || !reasons.includes(data.reason)) return [];
  const integer = (v: unknown, maximum: number): v is number => typeof v === 'number'
    && Number.isInteger(v) && v >= 0 && v <= maximum;
  if (!integer(data.width, 100000) || !integer(data.height, 100000)
    || !integer(data.format, 1000) || !integer(data.planeCount, 8)
    || ![0, 90, 180, 270].includes(data.rotation as number)) return [];
  const lines = [`quadro:motivo=${data.reason}`,
    `quadro:${data.width}x${data.height}; formato=${data.format}; planos=${data.planeCount}; rot=${data.rotation}`];
  if (Array.isArray(data.planes)) for (const [index, item] of data.planes.slice(0, 3).entries()) {
    if (!item || typeof item !== 'object') continue;
    const plane = item as Record<string, unknown>;
    const fields = ['rowStride', 'pixelStride', 'position', 'limit'] as const;
    if (!fields.every(key => integer(plane[key], 2147483647))) continue;
    lines.push(`plano${index}:linha=${plane.rowStride}; pixel=${plane.pixelStride}; pos=${plane.position}; limite=${plane.limit}`);
  }
  return lines;
}
