struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    color: vec4<f32>,
    life: f32,
    pad1: f32,
    pad2: f32,
    pad3: f32
}

struct Params{
    dt:f32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> params: Params;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];
    let whirlpool = vec2f(p.position.y, p.position.x);
    let wiggle = vec2f(sin(p.position.y * 10.0), cos(p.position.x * 10.0)) * 0.2;
    p.position += (whirlpool + wiggle + (p.position * 0.5)) * params.dt;


    // Basic logic: Age the particle
    if (p.life > 0.0) { //do depending on dt as a unfiorm buffer
        p.life -= params.dt; // Roughly dt
        p.scale += vec2<f32>(0.005) * params.dt;
    } else {
        // Respawn
        p.life = 5.0;
        p.scale = vec2<f32>(0.01);
    }
    particles[i] = p;

} // made this with ai btw