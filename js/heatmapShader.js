// simplified placeholder shader
const HEATMAP_VERTEX = `void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const HEATMAP_FRAGMENT = `void main(){gl_FragColor=vec4(1.0,0.3,0.0,0.8);}`;
