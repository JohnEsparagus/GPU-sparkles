struct VertexOut{
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
    @location(1) life: f32,
    @location(2) uv : vec2<f32>,
};

struct Vertex {
    @location(0) quadPos: vec2<f32>,
    @location(1) particlePos: vec2<f32>,
    @location(2) scale: vec2<f32>,
    @location(3) color: vec4<f32>,
    @location(4) velocity: vec2<f32>,
    @location(5) life: f32,
    @location(6) gravity: f32,

};

struct Uniforms{
    aspect: f32,
    time: f32,
};

struct Camera{
    proj: mat4x4<f32>,
    view: mat4x4<f32>,
}




@group(0) @binding(0) var<uniform> frameUniform: Uniforms;
@group(0) @binding(1) var<uniform> camera: Camera;
@vertex 


fn vert_main(vert:Vertex) -> VertexOut{

    var output : VertexOut;
    let scale = frameUniform.aspect;
//now camera is [0] for 
    var viewspace = camera.view * vec4f(vert.particlePos.x, vert.particlePos.y ,1.0, 1.0);
    viewspace = vec4(viewspace.xy + vert.quadPos* vert.scale, viewspace.z, viewspace.w);
    output.position = camera.proj * viewspace;
    output.color = vert.color;
    output.life = vert.life;

    output.uv = vec2f(vert.quadPos.x , (vert.quadPos.y / 1.2));
    return output;
}

@fragment
fn frag_main(in: VertexOut) -> @location(0) vec4<f32> {
    let edge = 0.3;
    let len = length(in.uv);
    if len > 0.5 {discard;}
    let alpha = 1.0 - smoothstep(0.0, edge, len);
    return  vec4f(in.color.rgb, in.color.a * alpha);
    // x^2 + y^2 <= r^2,   if r = lets say 0.8 
}
