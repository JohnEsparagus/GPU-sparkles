struct VertexOut{
    @builtin(position) position : vec4<f32>,
    @location(0) color : vec4<f32>,
    @location(1) life: f32,
};

struct Vertex {
    @location(0) position: vec2<f32>,
    @location(1) color: vec4<f32>,
    @location(2) offset: vec2<f32>,
    @location(3) scale: vec2<f32>,
    @location(4) life: f32,
};

struct Uniforms{
    aspect: f32,
    time: f32,
};



@group(0) @binding(0) var<uniform> frameUniform: Uniforms;
@vertex 

fn vert_main(vert:Vertex) -> VertexOut{

    var output : VertexOut;
    output.position = vec4f(vert.position * vert.scale + vert.offset, 0.0, 1.0);
    output.color = vert.color;
    output.life = vert.life;
    return output;
}

@fragment
fn frag_main(in: VertexOut) -> @location(0) vec4<f32> {
    return in.color * vec4f(sin(frameUniform.time * 2.0)*0.95,1,1,in.life);

}
