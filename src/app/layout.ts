/** Page gutter shared by the CSS layout and the projected 3D safe area. */
export const layoutGutter = (width: number) => width <= 350 ? 16 : width < 480 ? 20 : 32
