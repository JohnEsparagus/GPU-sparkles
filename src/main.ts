const BUFFER_SIZE = 10000;
const GRID_SIZE = 4;
const INITIAL_LIFE = 5;
const GROWTH_AMOUNT = 0.05;

let device: GPUDevice ;
let context: GPUCanvasContext | null;
let renderPipeline: GPURenderPipeline | null;
let vertexBuffer: GPUBuffer ;
let staticVertexBuffer: GPUBuffer ;
let variableVertexBuffer: GPUBuffer ;
let adapter :GPUAdapter | null;

let aspectBuffer: GPUBuffer ;
let bindGroup: GPUBindGroup | null;
let computeBindGroup: GPUBindGroup | null;
let canvas:HTMLCanvasElement;
let time = 0;
let start = performance.now();
let  vertices = new Float32Array([
  -0.5, -0.6,
  -0.5,  0.6,
   0.5,  0.6,
  -0.5, -0.6,
   0.5,  0.6,
   0.5, -0.6, //this is like, kind of 6 vertices, so a cube, 
    ]);


let scale = 0.01;
let kNumObjects = 3000;
let staticData : Float32Array<ArrayBuffer>;
let dynamicData : Float32Array<ArrayBuffer>;
let lastFrameTime = performance.now();

class Renderer { 
    constructor(){};

    
    async init() {

        this.initContext();
        await this.initDevice();
        console.log("WebGPU successful initialisation")
        this.initBuffers();
        await this.initPipelines();
        this.initBindGroups();
        requestAnimationFrame(this.frame);
    }


    initContext() {
        if (!navigator.gpu) {
            throw new Error("WebGPU not supported on this browser.");
        }

        canvas = document.querySelector("canvas");
        if (!canvas) {
            throw new Error("Canvas elment not found in dom")
        }
        context = canvas.getContext("webgpu");
        if (!context){
            throw new Error("failed to get draw context from canvas)");
        }
    }

    async initDevice() {

        adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            throw new Error("Failed  to get adapter to GPU");
        }
        device = await adapter.requestDevice();
        if (!device){
            throw new Error("Failed to request device from adapter")
        }
        context.configure({
            device, 
            format: navigator.gpu.getPreferredCanvasFormat(),
            alphaMode: "premultiplied",
        });
    }

    initBuffers() {
        
        staticData = new Float32Array(kNumObjects * 6);
        dynamicData = new Float32Array(kNumObjects * 3);

        for (let i = 0; i < kNumObjects; i++) {
            staticData.set([Math.random(), Math.random(), Math.random(), 1, (Math.random()*2)-1, (Math.random()*2)-1], i*6);
            dynamicData.set([(0.5 + Math.random()*0.5)*scale, (0.5 + Math.random()*0.5)*scale, (0.5+ Math.random()*0.5)*INITIAL_LIFE], i*3);
        }


        vertexBuffer = device.createBuffer({
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(vertexBuffer, 0 , vertices);

        const staticUnitSize = 2*4 + 4*4; //this is padding for scale + 2*4;
        const changingUnitSize = 2*4 + 4;

        staticVertexBuffer = device.createBuffer({
            size: staticUnitSize * kNumObjects,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(staticVertexBuffer, 0, staticData)
        variableVertexBuffer = device.createBuffer({
            size: changingUnitSize * kNumObjects,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(variableVertexBuffer, 0, dynamicData);

        
    }
    async  initPipelines(){
            const vertexBufferLayout: GPUVertexBufferLayout[] = [
        {
            arrayStride: 2*4,  //doesnt update much, we have 6 vertices so 2 floats each, 12 floats so  2 floats is 8 bytes each
            attributes: [
            {
                shaderLocation: 0, 
                offset: 0,
                format: "float32x2" ,
            },],
        },
        {
            arrayStride: 6 * 4,
            stepMode: 'instance',
            attributes:[{
                shaderLocation:1,   //updates sometimes
                offset: 0,
                format: "float32x4"
            },
            {
                shaderLocation:2,
                offset: 16,
                format: "float32x2"
            },
            ],
        },
        {
            arrayStride: 3 * 4,
            stepMode: 'instance',   //always updating lowkey
            attributes:[{
                shaderLocation:3,
                offset:0,
                format:"float32x2"
            },
            {
                shaderLocation: 4,
                offset: 8,
                format:"float32"
            }
        ],
        },];
        const shadername = await fetch("./shaders/vert.wgsl").then(r=>r.text());
        const shaderModule  : GPUShaderModule = device.createShaderModule({
            code: shadername
        });
        if (shaderModule){
            console.log("ShaderModule successful initialisation");
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
        renderPipeline = device.createRenderPipeline(pipelineDescriptor);
        

    }

     initBindGroups(){
        const aspect = canvas.width / canvas.height ;
        aspectBuffer = device.createBuffer({
            size: 16,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });
        device.queue.writeBuffer(aspectBuffer, 0, new Float32Array([aspect,time,0,0]));
        const bindGroupLayout : GPUBindGroupLayout = renderPipeline.getBindGroupLayout(0);
        bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries:[{
                binding:0,
                resource:{
                    buffer:aspectBuffer
                },
            },],
        });
    }
     resizeCanvas(canvas:HTMLCanvasElement){
        const displayWidth = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        const needResize = canvas.width!=displayWidth || canvas.height !=displayHeight;

        if (needResize){
            canvas.width = displayWidth;
            canvas.height = displayHeight;
        }

        return needResize;
    }


     frame = () => {
        const now = performance.now();
        const time = (now - start) / 1000;
        const dt = (now - lastFrameTime)/ 1000
        lastFrameTime = now;

        if (!device) return;
        if (!context) return;
        device.queue.writeBuffer(aspectBuffer, 4, new Float32Array([time]));
        for (let i = 0; i < kNumObjects; i++){ //2 floats per particle

            let scale_x = dynamicData[i*3 + 0];
            let scale_y = dynamicData[i*3 + 1];
            let life = dynamicData[i*3 + 2];
            const age = 1.0 - (life / INITIAL_LIFE);
            const growth = age * GROWTH_AMOUNT;

            if (life > 0){
                life -= dt;
                dynamicData[i*3 + 0] += growth * dt;
                dynamicData[i*3 + 1] += growth*dt;
                dynamicData[i*3 + 2] = life;
            }
            else {

                dynamicData[i*3 + 0] = (0.5 + Math.random()*0.5)*scale;
                dynamicData[i*3 + 1] = (0.5 + Math.random()*0.5)*scale;
                dynamicData[i*3 + 2] = (0.5 + Math.random()*0.5)*INITIAL_LIFE;
            }
        }
        
        device.queue.writeBuffer(variableVertexBuffer, 0, dynamicData);
        //unifrom for some small data
        const commandEncoder = device.createCommandEncoder();
        this.resizeCanvas(canvas);
        
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

        // render pass 
        const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
        passEncoder.setBindGroup(0, bindGroup);
        
        if (!renderPipeline) return;
        passEncoder.setViewport(0, 0, canvas.width,canvas.height,0,0); //idk
        passEncoder.setPipeline(renderPipeline);
        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.setVertexBuffer(1,staticVertexBuffer);
        passEncoder.setVertexBuffer(2,variableVertexBuffer);
        passEncoder.draw(vertices.length / 2, kNumObjects);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(this.frame);
    }
}
const renderer = new Renderer();
renderer.init();
