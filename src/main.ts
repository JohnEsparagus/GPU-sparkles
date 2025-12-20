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

    let colorTexture = context.getCurrentTexture();
    let colorTextureView = colorTexture.createView();

    let colorAttachment: GPURenderPassColorAttachment = {
        clearValue: {r:1,g:0,b:0,a:1},
        loadOp: 'clear',
        storeOp: 'store',
        view: colorTextureView
    };
    const renderPassDesc = {
        colorAttachments:[colorAttachment]
    };

    const commandEncoder = device.createCommandEncoder();
    // render pass 
    const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
    
    passEncoder.setViewport(0, 0, canvas.width, canvas.height, 0, 1);

    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

function render(){

}

async function shaderinit(device: GPUDevice){ 
    //const shaderModule = device.createShaderModule({});
}

init();