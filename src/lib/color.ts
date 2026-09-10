export type HsvColor = [hue: number, saturation: number, value: number]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export function hsvToHex([h, s, v]: HsvColor): string {
  const saturation = clamp(s, 0, 100) / 100
  const value = clamp(v, 0, 100) / 100
  const hue = (((h % 360) + 360) % 360) / 60
  const c = value * saturation
  const x = c * (1 - Math.abs((hue % 2) - 1))
  const m = value - c
  const rgb =
    hue < 1
      ? [c, x, 0]
      : hue < 2
        ? [x, c, 0]
        : hue < 3
          ? [0, c, x]
          : hue < 4
            ? [0, x, c]
            : hue < 5
              ? [x, 0, c]
              : [c, 0, x]
  return `#${rgb
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase()
}

export function normalizeColor(input: string): string | null {
  const color = input.trim()
  if (color === 'transparent') return color
  if (/^#[\da-f]{6}$/i.test(color)) return color.toUpperCase()
  if (/^#[\da-f]{3}$/i.test(color))
    return `#${color
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`.toUpperCase()
  const hsl =
    /^hsl\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)$/i.exec(
      color,
    )
  if (!hsl) return null
  const h = Number(hsl[1])
  const s = Number(hsl[2]) / 100
  const l = Number(hsl[3]) / 100
  if (!Number.isFinite(h) || s > 1 || l > 1) return null
  const v = l + s * Math.min(l, 1 - l)
  return hsvToHex([h, v === 0 ? 0 : 200 * (1 - l / v), v * 100])
}

export function hexToHsv(hex: string): HsvColor {
  const color = normalizeColor(hex)
  if (!color || color === 'transparent') return [0, 0, 0]
  const [r, g, b] = [1, 3, 5].map(
    (index) => parseInt(color.slice(index, index + 2), 16) / 255,
  )
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4
  return [(h * 60 + 360) % 360, max === 0 ? 0 : (d / max) * 100, max * 100]
}
