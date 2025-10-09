import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import GUI from 'lil-gui'
import gsap from 'gsap'
import { Sky } from 'three/addons/objects/Sky.js'
import fireworkVertexShader from './shaders/firework/vertex.glsl'
import fireworkFragmentShader from './shaders/firework/fragment.glsl'

/**
 * Base
 */
// Debug
const gui = new GUI({ width: 340 })

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Loaders
const textureLoader = new THREE.TextureLoader()

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio, 2)
}
sizes.resolution = new THREE.Vector2(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)

/**
 * Resize window
 */

window.addEventListener('resize', () => {
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    // Update pixel ratio
    sizes.pixelRatio = Math.min(window.devicePixelRatio, 2)
    // Update resolution - height
    sizes.resolution.set(sizes.width * sizes.pixelRatio, sizes.height * sizes.pixelRatio)


    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(25, sizes.width / sizes.height, 0.1, 100)
camera.position.set(1.5, 0, 6)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Fireworks
 */
const textures = [
    textureLoader.load('./particles/1.png'),
    textureLoader.load('./particles/2.png'),
    textureLoader.load('./particles/3.png'),
    textureLoader.load('./particles/4.png'),
    textureLoader.load('./particles/5.png'),
    textureLoader.load('./particles/6.png'),
    textureLoader.load('./particles/7.png'),
    textureLoader.load('./particles/8.png'),
]

const createFirework = (count, position, size, texture, radius, color) => {
    // Geometry
    const positionsArray = new Float32Array(count * 3);
    const sizeArray = new Float32Array(count);
    const timeMultipliersArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        const spherical = new THREE.Spherical(
            radius + (0.75 + Math.random() * 0.25),
            Math.random() * Math.PI,
            Math.random() * 2 * Math.PI
        )
        const position = new THREE.Vector3()
        position.setFromSpherical(spherical)


        positionsArray[i3] = position.x;
        positionsArray[i3 + 1] = position.y;
        positionsArray[i3 + 2] = position.z;

        sizeArray[i] = Math.random()
        timeMultipliersArray[i] = 1 + Math.random()
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3))
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizeArray, 1))
    geometry.setAttribute('aTimeMultiplier', new THREE.BufferAttribute(timeMultipliersArray, 1))


    // Material
    texture.flipY = false
    const material = new THREE.ShaderMaterial({
        vertexShader: fireworkVertexShader,
        fragmentShader: fireworkFragmentShader,
        transparent: true,
        uniforms: {
            uSize: new THREE.Uniform(size),
            uResolution: new THREE.Uniform(sizes.resolution),
            uTexture: new THREE.Uniform(texture),
            uTime: new THREE.Uniform(0),
            uColor: new THREE.Uniform(color),
            uProgress: new THREE.Uniform(0),
        },
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    })

    // Points
    const firework = new THREE.Points(geometry, material)
    firework.position.copy(position)
    scene.add(firework)

    // Destroy
    const destroy = () => {
        scene.remove(firework)
        geometry.dispose()
        material.dispose()
    }

    // Animate
    gsap.to(
        material.uniforms.uProgress,
        { value: 1, duration: 3, ease: 'linear', onComplete: destroy }
    )
}

// createFirework(
//     1000,                       // Count
//     new THREE.Vector3(),        // Position
//     0.5,                        // Size 
//     textures[7],                // Texture
//     1,                          // Radius
//     new THREE.Color('#8affff')// Color
// )


const createRandomFirework = () => {
    const count = Math.round(400 + Math.random() * 1000)
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random(),
        (Math.random() - 0.5) * 2,
    )
    const size = 0.1 + Math.random() * 0.1
    const texture = textures[Math.floor(Math.random() * textures.length)]
    const radius = 0.5 + Math.random()
    const color = new THREE.Color()
    color.setHSL(Math.random(), 1, 0.7);

    createFirework(count, position, size, texture, radius, color)
}

createRandomFirework()

window.addEventListener('click', createRandomFirework)

/**
 * Sky
 */
function initSky() {

    // Add Sky
    const sky = new Sky()
    sky.scale.setScalar(450000)
    scene.add(sky)

    const sun = new THREE.Vector3()

    /// GUI

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.95,
        elevation: -2.2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    }

    const updateSky = () => {

        const uniforms = sky.material.uniforms
        uniforms['turbidity'].value = effectController.turbidity
        uniforms['rayleigh'].value = effectController.rayleigh
        uniforms['mieCoefficient'].value = effectController.mieCoefficient
        uniforms['mieDirectionalG'].value = effectController.mieDirectionalG

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation)
        const theta = THREE.MathUtils.degToRad(effectController.azimuth)

        sun.setFromSphericalCoords(1, phi, theta)

        uniforms['sunPosition'].value.copy(sun)

        renderer.toneMappingExposure = effectController.exposure
        renderer.render(scene, camera)

    }


    gui.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange(updateSky)
    gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(updateSky)
    gui.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(updateSky)
    gui.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange(updateSky)
    gui.add(effectController, 'elevation', -3, 10, 0.01).onChange(updateSky)
    gui.add(effectController, 'azimuth', - 180, 180, 0.1).onChange(updateSky)
    gui.add(effectController, 'exposure', 0, 1, 0.0001).onChange(updateSky)

    updateSky()
}

initSky()

/**
 * Animate
 */
const tick = () => {
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()