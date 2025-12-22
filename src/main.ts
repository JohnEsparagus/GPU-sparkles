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

    const vertices = new Float32Array([
        0.0, 0.6, 0, 1, 1, 0, 0, 1, -0.5, -0.6, 0, 1, 0, 1, 0, 1, 0.5, -0.6, 0, 1, 0,
        0, 1, 1, // pos and color data
    ]);
    const vertexBuffer = device.createBuffer({
        size: vertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(vertexBuffer, 0, vertices, 0, vertices.length);
    const vertexBufferLayout: GPUVertexBufferLayout[] = [
    {
        attributes: [
        {
            shaderLocation: 0, 
            offset: 0,
            format: "float32x4" ,
        },
        {
            shaderLocation: 1, 
            offset: 16,
            format: "float32x4" ,
        },
        ],
        arrayStride: 32,
        stepMode: "vertex"
    }];
    const shadername = await fetch("./shaders/vert.wgsl").then(r=>r.text());
    const shaderModule  : GPUShaderModule = device.createShaderModule({
        code: shadername
    });
    if (shaderModule){
        console.log("ShaderModule successful initialisation", shaderModule.getCompilationInfo())
    }

    const pipelineDescriptor : GPURenderPipelineDescriptor  = {
        label: 'vertexBufferPipeline',
        layout: "auto",
        vertex:{
            module: shaderModule,
            entryPoint: "vert_main",
            buffers:  vertexBufferLayout,
        },
        fragment:{
            module: shaderModule,
            entryPoint: "frag_main",
            targets: [{
                format: navigator.gpu.getPreferredCanvasFormat(),
            }],
        },
        primitive:{
            topology: "triangle-list",
        },
    };    
    const renderPipeline : GPURenderPipeline= device.createRenderPipeline(pipelineDescriptor);
    
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
    
    //passEncoder.setViewport(800,800, canvas.width, canvas.height, 0, 1);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.draw(3);
    passEncoder.end();
    device.queue.submit([commandEncoder.finish()]);
}

function render(){

}


init();