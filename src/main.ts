const BUFFER_SIZE = 1000;
async function init() {
    if (!navigator.gpu) {
        throw new Error("WebGPU not supported on this browser.");
    }

    const canvas = document.querySelector("canvas");
    if (!canvas) {
        throw new Error("Canvas elment not found in dom")
    }
    const context = canvas.getContext("webgpu");
    if (!context){
        throw new Error("failed to get draw context from canvas)");
    }
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error("Failed  to get adapter to GPU");
    }

    const device = await adapter.requestDevice();
    if (!device){
        throw new Error("Failed to request device from adapter")
    }
    context.configure({
        device, 
        format: navigator.gpu.getPreferredCanvasFormat(),
        alphaMode: "premultiplied",
    });

    console.log("WebGPU successful initialisation")

    const buffer = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    const staging = device.createBuffer({
        size: BUFFER_SIZE,
        usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
}

async function shaderinit(device: GPUDevice){ 
    const shaderModule = device.createShaderModule({});
}

init();