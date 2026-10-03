import { setConsoleFunction } from 'three'

const silenced = [
  'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.',
  'THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.',
]

setConsoleFunction((type, message, ...params) => {
  if (type === 'warn' && silenced.includes(message)) return
  if (type === 'log') console.log(message, ...params)
  else if (type === 'error') console.error(message, ...params)
  else console.warn(message, ...params)
})
