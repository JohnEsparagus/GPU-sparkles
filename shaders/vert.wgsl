struct VertexOut{
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
    @location(1) life: f32,
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



@group(0) @binding(0) var<uniform> frameUniform: Uniforms;
@vertex 

fn vert_main(vert:Vertex) -> VertexOut{

    var output : VertexOut;
    output.position = vec4f((vert.quadPos* vert.scale + vert.particlePos)/frameUniform.aspect,0.0, 1.0);
    output.color = vert.color;
    output.life = vert.life;
    return output;
}

@fragment
fn frag_main(in: VertexOut) -> @location(0) vec4<f32> {

    return  in.color;
}
