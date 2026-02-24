struct Particle {
    position: vec2<f32>,
    scale: vec2<f32>,
    color: vec4<f32>,
    velocity: vec2<f32>,
    life: f32,
    gravity: f32,
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
    
    let dir = normalize(p.position); //compute unit vector

    let inward = -dir * params.dt ;
    let wiggle = vec2f(sin(p.position.y * 5.0), cos(p.position.x * 5.0));

    let orbit =  vec2f(-dir.y, dir.x) * 0.1;
    let r = length(p.position);
    let pull = -dir * (1.0/(r+0.1))*0.1;

    p.position+= (p.velocity + inward + wiggle + pull + orbit) * params.dt;


    // Basic logic: Age the particle
    if (p.life > 0.0) { //do depending on dt as a unfiorm buffer
        p.life -= params.dt; // Roughly dt
    } else {
        // Respawn
        p.life = 5.0;

    }
    
    particles[i] = p;

} // made this with ai btw