# Asset notices · Построй 2027 · 0.15.0

Base and roof massing: glb-buildings-skill (Hector Oviedo), MIT, build-time only. Adapted into modular Ida base/roof. License: licenses/glb-buildings-MIT.txt.

Tower facade, City and Holiday geometry: Kenney (www.kenney.nl), CC0 1.0, City Kit Commercial 2.1 / Holiday Kit 2.0. Sources supplied in user ZIP archives. Skyscraper storey clipped with UV/normals retained; geometry normalized, rematerialed and merged. City uses neutral roles; Holiday retains original atlas samples as linear vertex colors. Snowman, candy cane, wreath, lights and snowbanks added. Pack notices: licenses/Kenney-City-Commercial.txt and licenses/Kenney-Holiday.txt.
Sources: https://kenney.nl/assets/city-kit-commercial and https://kenney.nl/assets/holiday-kit

Concrete maps: Poly Haven, CC0, concrete_wall_006 resized to 512px WebP; normal and roughness used on the facade; diffuse retained in the distribution but not sampled at runtime. No website code or HDR environment included.
Source: https://polyhaven.com/a/concrete_wall_006
License: https://polyhaven.com/license

UI, PNG and 3D digits: Euclid Circular A, Copyright (c) 2018 by Swiss Typefaces. All rights reserved.. User-supplied font archive; original terms remain applicable. Local WOFF2 subsets 300/400/500/600 and Three.js glyph subset 2/0/7. This font is not claimed to be open source. Copyright/provenance notice: fonts/Euclid-NOTICE.txt.

Crane, floor slabs/frames, courtyard composition, window mask and snow shader: original project work. Third-party media retain their original terms. No external runtime assets or CDN presets.

Source archive hashes, provenance and pack licenses retained in project assets/sources/provenance.json and assets/sources/fonts/euclid/provenance.json. GLB validation and SHA-256: models/manifest.json. Distribution inventory: asset-manifest.json.

Ida Light wordmark: original SVG paths extracted from https://idalite.ru/ header .TheLogo, white fill for dark background, supplied for the user-requested Ida Light game. Source/provenance: branding/provenance.json. Favicon uses its first glyph.

0.8.0: фасадные гирлянды и венки используют те же исходные lights-colored/wreath из пользовательского Kenney Holiday Kit (CC0). Телескопические профили крана и SVG зимнего неба — геометрия/графика этого проекта.

Fluid Functionalism UI source: MIT, Copyright (c) 2026 Micka Touillaud. Registry downloaded from https://www.fluidfunctionalism.com/r/ and adapted for local imports, Motion reuse, Euclid, Ida colors, Russian labels, touch sizes, reduced motion and multiline copy. License: licenses/fluid-functionalism-MIT.txt. Upstream: https://github.com/mickadesign/fluid-functionalism. Source inventory/provenance remains in the project.

0.10.0: Neighborhood buildings reuse the existing Kenney building-a/c/f/h source models (CC0). Street grid, crosswalks, fence, construction props, rounded snow trees, warm bulb geometry and lamplight.svg are original project work. Environment/Lightformer/SoftShadows reuse installed pmndrs/drei (MIT; see RUNTIME_NOTICES.txt), without downloaded HDR/CDN presets. Logo paths are unchanged; CSS renders them black on the light scene.

0.11.0: Source atlas classification now distinguishes blue glazing from blue-grey masonry. Local contact shading is ray-baked into vertex colors at build time using installed three-mesh-bvh; floor dimensions remain unchanged. Roof snow/parapets, compact blue vans, window-room.svg and contact-shadow.svg are original project geometry/graphics. N8AO (installed n8ao 2.0.1, ISC), SMAA and TiltShift2 reuse existing postprocessing dependencies. Distribution licenses are in RUNTIME_NOTICES.txt. No additional model/HDR download or Blender was used.

0.12.0: All 32 background houses use the same Kenney architecture, with snowy parapets and holiday trim. Muted neutral scene palette and restrained tone-mapped warm windows. N8AO, SMAA, dual TiltShift2, PCSS and local point lights removed from runtime. The shared quarter-shadows.svg is an approximate projected silhouette layer, not a physically baked lightmap; local vertex AO remains ray-baked. FXAA/Bloom reuse installed dependencies. No new downloaded packages or models.

0.12.1: Runtime-only performance update. Native static tower instance buffers, shared moving-floor meshes, startup geometry/shader/finale warmup, and damped final camera resizing. Existing model geometry, textures, palette and source licenses preserved.

0.13.0: Existing Kenney quarter geometry welded, UV-unwrapped and lit offline in Blender Cycles. Original project lighting setup and albedo-based sky fill are stored in quarter-light.webp; one Meshopt quarter mesh replaces the legacy quarter/shadow overlay at runtime. No downloaded models, HDR or light presets. Floor concrete and snow surfaces separated to prevent z-fighting; collider dimensions preserved. Source models retain their original CC0 terms.

0.14.0: Original project tower balance calculation and Rapier compound-body collapse. The user-supplied Panelka website is a behavioral reference only; no code, models or UI copied. Existing asset licenses and lightmaps remain unchanged.

0.15.0: Original balance tuning and instability counter; existing Fluid Badge and Elevated reused, no new UI library or visual assets.
