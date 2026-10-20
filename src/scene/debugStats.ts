import { create } from 'zustand'
export const useSceneStats = create(() => ({ drawCalls: 0, geometries: 0, textures: 0, physicsBodies: 0,
  fps: 0, frameMedian: 0, frameP95: 0, frameMax: 0, slowFrames: 0, motionError: 0, instanceUploads: 0,
  triangles: 0, bufferWidth: 0, bufferHeight: 0, collapseAngle: 0, collapseY: 0 }))
