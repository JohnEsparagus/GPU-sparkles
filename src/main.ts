import * as Tools from "./tools";

const INITIAL_LIFE = 2;

let device: GPUDevice ;
let context: GPUCanvasContext | null;
let renderPipeline: GPURenderPipeline | null;
let computePipeline : GPUComputePipeline | null;
let vertexBuffer: GPUBuffer ;
let particleBufferA : GPUBuffer;
let particleBufferB : GPUBuffer;

let particleVertexLayout : GPUVertexBufferLayout;
let adapter :GPUAdapter | null;
const infoElem = document.querySelector('#info');
const simParamData = new Float32Array(4);
const simParamDataU32 = new Uint32Array(simParamData.buffer);
const aspectData = new Float32Array(4);

let simParamBuffer: GPUBuffer;
let aspectBuffer: GPUBuffer ;
let bindGroup: GPUBindGroup | null;
let computeBindGroupA: GPUBindGroup | null;
let computeBindGroupB: GPUBindGroup | null;

let bindGroupLayout: GPUBindGroupLayout | null;
let canvas:HTMLCanvasElement;
let computeBindGroupLayout: GPUBindGroupLayout;
let time = 0;
let frameCount = 0;
let frameTimes: number[] = [];
let lastReportTime = 0; //deubgging delete later
let start = performance.now();
let  vertices = new Float32Array([
  -0.5, -0.6,
  -0.5,  0.6,
   0.5,  0.6,
  -0.5, -0.6,
   0.5,  0.6,
   0.5, -0.6, //this is like, kind of 6 vertices, so a cube, 
    ]);


let scale = 0.001;
let kNumObjects = 20000000;
let particleData : Float32Array<ArrayBuffer>;


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
        if (!canvas || canvas == null) {
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
        device = await adapter.requestDevice({
            requiredLimits:{
                maxBufferSize: 2147483648,
                maxStorageBufferBindingSize: 2147483644,
            }
        });
        
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
        
        const particleStride = 48; //2 * 4, 2*4, 4*4 + 4 + 4 pos scale col life pad
        particleData = new Float32Array(kNumObjects*(particleStride/4));

        for (let i = 0; i < kNumObjects; i++) {
            const offset = i * (particleStride/4);
            particleData.set([
                Math.random()*2 - 1,Math.random()*2 - 1,
                scale,scale,
                Math.random(), Math.random(),Math.random(),1.0,
                INITIAL_LIFE*Math.random(),
                0.0,
            ], offset);
        }
        

        particleBufferA = device.createBuffer({
            size: particleData.byteLength,
            usage:
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
        }); // valid to write to
        particleBufferB = device.createBuffer({
            size: particleData.byteLength,
            usage:
            GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.VERTEX,
        }); //can read from

        device.queue.writeBuffer(particleBufferA,  0, particleData);
        device.queue.writeBuffer(particleBufferB,  0, particleData);

        


       particleVertexLayout = {
       arrayStride: particleStride,
       stepMode: "instance",
       attributes: [
        {
            shaderLocation:1, offset:0, format:'float32x2' //pos
        },
        {
            shaderLocation:2, offset:8, format:'float32x2' //scale

        },
        {
            shaderLocation:3, offset:16, format:'float32x4' //color
        },
        {
            shaderLocation:4, offset:32, format:'float32' //velocity
        },
        {
            shaderLocation:5, offset:40, format:'float32' //life
        },
        {
            shaderLocation:6, offset:44, format:'float32' //grav
        },

       ],
       } 
        
        simParamBuffer = device.createBuffer({
            size:16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
        });

        vertexBuffer = device.createBuffer({
            size:vertices.byteLength,
            usage: GPUBufferUsage.VERTEX,
            mappedAtCreation: true,
        });
        new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
        vertexBuffer.unmap();
    }
    async  initPipelines(){

        computeBindGroupLayout = device.createBindGroupLayout({
            entries:[{
                binding:0,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type:"storage"},
            },
            {
                binding:1,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type:"storage"},
            },
            {
                binding:2,
                visibility: GPUShaderStage.COMPUTE,
                buffer: {type:"uniform"},
            },
        ],
        });

            const computeShadername = await fetch("./shaders/compute.wgsl").then(r=>r.text());
        const computeShaderModule  : GPUShaderModule = device.createShaderModule({
            code: computeShadername
        });
        if (computeShaderModule){
            console.log("ShaderModule successful initialisation");
        }
        computePipeline = device.createComputePipeline({
            layout: device.createPipelineLayout({
                bindGroupLayouts:[computeBindGroupLayout],
            }),
            compute:{
                module: computeShaderModule,
                entryPoint:"main",
            }
        })

            const vertexBufferLayout: GPUVertexBufferLayout[] = [
        {
            arrayStride: 8,
            stepMode: 'vertex',
            attributes:[
                {
                    shaderLocation:0,
                    offset:0,
                    format:"float32x2",
                }
            ],
        },
        {
            arrayStride: 48, //particle stride
            stepMode: 'instance',   
            attributes:[{
                shaderLocation:1, //pos
                offset:0,
                format:"float32x2"
            },
            {
                shaderLocation:2, //scale
                offset:8,
                format:"float32x2"
            },
            {
                shaderLocation:3, //color
                offset:16,
                format:"float32x4"
            },            {
                shaderLocation:4, //velocity
                offset:32,
                format:"float32x2"
            },            {
                shaderLocation:5, //life
                offset:40,
                format:"float32"
            },
            {
                shaderLocation:6, //gravity
                offset:44,
                format:"float32"
            },
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
                    blend:{
                        color:{
                            operation: 'add',
                            srcFactor: 'src-alpha',
                            dstFactor:'one',
                        },
                        alpha:{
                            operation: 'add',
                            srcFactor:'one',
                            dstFactor:'one',
                        }
                    }
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

        aspectData[0] = aspect;
        aspectData[1] = 0; //time updated
        device.queue.writeBuffer(aspectBuffer, 0, aspectData);

        const bindGroupLayout : GPUBindGroupLayout = renderPipeline?.getBindGroupLayout(0);
        bindGroup = device.createBindGroup({
            layout: bindGroupLayout,
            entries:[{
                binding:0,
                resource:{
                    buffer:aspectBuffer
                },
            },],
        });


        computeBindGroupA = device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: particleBufferA } // No 'visibility' property inside createBindGroup
            },
            {
                binding:1,
                resource: {buffer: particleBufferB }
            },
            {
                binding:2,
                resource: {buffer:simParamBuffer}
            }
            ],
        });
        computeBindGroupB = device.createBindGroup({
            layout: computeBindGroupLayout,
            entries: [{
                binding: 0,
                resource: { buffer: particleBufferB } // No 'visibility' property inside createBindGroup
            },
            {
                binding:1,
                resource: {buffer: particleBufferA }
            },
            {
                binding:2,
                resource: {buffer:simParamBuffer}
            }
            ],
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
        frameCount++;
        const now = performance.now();
        const time = (now - start) / 1000;
        
        const dt = Math.min((now - lastFrameTime)/ 1000,0.0333); //cap dt at 0.033333  so approx 1/30 of second
        lastFrameTime = now;

        frameTimes.push(dt);

        if (frameTimes.length >= 100) frameTimes.shift();

        let avgfps = frameTimes.reduce((a,b)=> a+b) / frameTimes.length; 
        
        if (time - lastReportTime > 1){
        console.log(`fps: ${(1 / avgfps).toFixed(0)}`);
        lastReportTime = time
        }

            infoElem.textContent = `\
fps: ${(1 / avgfps).toFixed(0)}
time: ${time.toFixed(1)}s
`;
        if (!device) return;
        if (!context) return;
        const didResize = this.resizeCanvas(canvas);
        if (didResize){
            aspectData[0] = canvas.width / canvas.height;
        }
        aspectData[1] = time;
        device.queue.writeBuffer(aspectBuffer, 0, aspectData);
        const totalWorkGroups = Math.ceil(kNumObjects/64);
        const workGroupX = Tools.nextPowerOfTwo(Math.sqrt(totalWorkGroups));
        const workGroupY = Math.ceil(totalWorkGroups / workGroupX);

        simParamData[0] = dt;
        simParamDataU32[1] = workGroupX * 64;
        device.queue.writeBuffer(simParamBuffer, 0, simParamData);
        //unifrom for some small data
        const commandEncoder = device.createCommandEncoder();
        
        let colorTexture = context.getCurrentTexture();
        let colorTextureView = colorTexture.createView();

        let colorAttachment: GPURenderPassColorAttachment = {
            clearValue: {r:0,g:0,b:0,a:1},
            loadOp: 'clear',
            storeOp: 'store',
            view: colorTextureView
        };
        const renderPassDesc = {
            colorAttachments:[colorAttachment]
        };

        const isEven : boolean = (frameCount % 2) === 0; // 2%2 = 0, 1%2 = 1
        const activeComputeBindGroup = (isEven)
            ? computeBindGroupA : computeBindGroupB;

        const renderBuffer = (isEven) ? particleBufferB : particleBufferA;
        

        // render pass 

        const computePass = commandEncoder.beginComputePass();
        computePass.setPipeline(computePipeline);
        computePass.setBindGroup(0, activeComputeBindGroup)
        computePass.dispatchWorkgroups(workGroupX, workGroupY, 1);
        computePass.end();
        if (!renderPipeline) return;
        const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
        passEncoder.setBindGroup(0, bindGroup);
        passEncoder.setViewport(0, 0, canvas.width,canvas.height,0,0); //idk

        passEncoder.setPipeline(renderPipeline);

        passEncoder.setVertexBuffer(0, vertexBuffer);
        passEncoder.setVertexBuffer(1,renderBuffer);
        passEncoder.draw(vertices.length /2, kNumObjects);
        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        requestAnimationFrame(this.frame);
    }
}
const renderer = new Renderer();
renderer.init();
