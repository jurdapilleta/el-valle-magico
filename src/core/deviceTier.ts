export type Tier = 'high' | 'medium' | 'low';

export type DeviceInfo = {
  /** Unmasked WebGL renderer string, e.g. "Apple GPU" or "Mali-G52". */
  renderer: string;
  /** navigator.deviceMemory in GB (Chromium only). */
  deviceMemory?: number;
  cores?: number;
  isMobile: boolean;
};

const SOFTWARE_GPU = /swiftshader|llvmpipe|software|basic render/i;
const WEAK_GPU =
  /mali-(4|t[0-9]|g3[0-9]|g5[0-2])|adreno \(tm\) [2-5][0-9]{2}|powervr (sgx|rogue ge)|intel.*hd graphics [2-5][0-9]{3}/i;
const STRONG_GPU =
  /apple (m[0-9]|gpu)|adreno \(tm\) (7|8)[0-9]{2}|mali-g7[1-9]|mali-g[6-9]1[0-9]|immortalis|nvidia|geforce|radeon|rtx|intel.*(iris|arc)/i;

/** Pure device-tier rule (GAME_DESIGN §5.3). Unknown hardware lands on medium. */
export function detectTier(info: DeviceInfo): Tier {
  const { renderer, deviceMemory, cores, isMobile } = info;
  if (SOFTWARE_GPU.test(renderer)) return 'low';
  if (deviceMemory !== undefined && deviceMemory <= 2) return 'low';
  if (WEAK_GPU.test(renderer)) return 'low';
  if (cores !== undefined && cores <= 2) return 'low';

  if (STRONG_GPU.test(renderer)) {
    // Phones with a strong GPU but little RAM still throttle quickly.
    if (isMobile && deviceMemory !== undefined && deviceMemory < 4) return 'medium';
    return 'high';
  }
  return 'medium';
}

export function readDeviceInfo(): DeviceInfo {
  let renderer = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      renderer = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch {
    // No WebGL info available: detectTier falls back to medium.
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    renderer,
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    isMobile: /android|iphone|ipad|ipod/i.test(nav.userAgent) || nav.maxTouchPoints > 1,
  };
}
