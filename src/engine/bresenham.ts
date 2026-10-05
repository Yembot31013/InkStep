export interface Pulse {
  dx: number;
  dy: number;
}

export function bresenhamSteps(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Pulse[] {
  const deltaX = x1 - x0;
  const deltaY = y1 - y0;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);
  const signX = Math.sign(deltaX);
  const signY = Math.sign(deltaY);

  if (absX === 0 && absY === 0) {
    return [];
  }

  const pulses: Pulse[] = [];

  if (absX >= absY) {
    let error = Math.floor(absX / 2);
    for (let i = 0; i < absX; i += 1) {
      let stepY = 0;
      error -= absY;
      if (error < 0) {
        stepY = signY;
        error += absX;
      }
      pulses.push({ dx: signX, dy: stepY });
    }
    return pulses;
  }

  let error = Math.floor(absY / 2);
  for (let i = 0; i < absY; i += 1) {
    let stepX = 0;
    error -= absX;
    if (error < 0) {
      stepX = signX;
      error += absY;
    }
    pulses.push({ dx: stepX, dy: signY });
  }
  return pulses;
}
