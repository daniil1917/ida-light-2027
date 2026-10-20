import { ShaderChunk, type Material } from 'three'

// The baked atlases already contain the Blender look. Dynamic steel and bulbs
// used Three's base AgX, losing the approved render's medium-high contrast.
const chunk = ShaderChunk.tonemapping_pars_fragment
const referenceAgX = chunk.slice(chunk.indexOf('vec3 AgXToneMapping'), chunk.indexOf('vec3 NeutralToneMapping'))
  .replace('vec3 AgXToneMapping', 'vec3 IdaReferenceAgX')
  .replace('color = agxDefaultContrastApprox( color );', `
    // 1.2 contrast, pivot at middle grey minus .2 EV, as in the source look.
    color = clamp((color - vec3(.5939394)) * 1.2 + vec3(.5939394), 0., 1.);
    color = agxDefaultContrastApprox(color);`)

export function applyReferenceToneMapping(material: Material) {
  if (!material.toneMapped) return
  material.onBeforeCompile = shader => {
    shader.fragmentShader = '#ifdef TONE_MAPPING\n' + referenceAgX + '\n#endif\n' + shader.fragmentShader.replace('#include <tonemapping_fragment>', `
      #ifdef TONE_MAPPING
        gl_FragColor.rgb = IdaReferenceAgX(gl_FragColor.rgb);
      #endif`)
  }
  material.customProgramCacheKey = () => 'ida-reference-agx-contrast-1.2'
}
