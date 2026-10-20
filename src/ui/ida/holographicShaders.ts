// Foil texture from the supplied HTML; the light sweep stays inside the artwork.
export const vertexSource = `
        attribute vec2 position;
        varying vec2 uv;
        void main() {
          uv = vec2((position.x + 1.) * .5, (1. - position.y) * .5);
          gl_Position = vec4(position, 0., 1.);
        }`
export const fragmentSource = `
        precision highp float;
        varying vec2 uv;
        uniform sampler2D artwork;
        uniform vec2 pointer;
        uniform float strength;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        vec3 spectrum(float h) {
          return clamp(abs(fract(h + vec3(0., .66667, .33333)) * 6. - 3.) - 1., 0., 1.);
        }
        void main() {
          vec4 base = texture2D(artwork, uv);
          vec2 pixel = uv * vec2(289., 410.42775665);
          float inner = 1.;

          // Slightly irregular, tightly packed foil flakes, fixed to the card.
          vec2 grid = pixel / 2.8;
          vec2 tile = floor(grid);
          float random = hash(tile);
          vec2 center = vec2(.25 + .5 * hash(tile + 13.7), .25 + .5 * hash(tile + 37.3));
          vec2 delta = (fract(grid) - center) / vec2(.33 + random * .10, .30 + random * .12);
          float flake = (1. - smoothstep(.65, 1.15, length(delta))) * (.42 + random * .58);
          float fine = hash(floor(pixel * 1.8));

          // A curved spectral strip moves over the artwork as the card tilts.
          float sweep = (pointer.x - .5) * .82 - (pointer.y - .5) * .34;
          float bandPosition = clamp(.50 + sweep * .52, .20, .80);
          float diagonal = uv.x + uv.y * .12 + sin(uv.y * 5.8) * .055 - .08;
          float band = exp(-pow((diagonal - bandPosition) / .155, 2.));
          float wideBand = exp(-pow((diagonal - bandPosition) / .40, 2.));
          float hue = diagonal * 1.55 + pointer.x * .75 - pointer.y * .32 + random * .15;
          vec3 rainbow = spectrum(hue);
          vec3 foilColor = mix(vec3(.91, .98, 1.), rainbow, .88 * band);
          float highlight = pow(max(0., 1. - length((uv - pointer) * vec2(.8, .65))), 3.);
          float luminance = dot(base.rgb, vec3(.2126, .7152, .0722));
          float foil = flake * (.12 + .70 * band + .14 * highlight);
          foil *= mix(.62, 1., smoothstep(.12, .66, luminance));
          vec3 color = mix(base.rgb, foilColor, foil * strength * inner);
          color += rainbow * band * flake * .12 * strength * inner;
          color += (fine - .5) * .025 * wideBand * strength * inner;
          gl_FragColor = vec4(clamp(color, 0., 1.), 1.);
        }`
