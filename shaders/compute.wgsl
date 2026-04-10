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

fn noise(n: u32)->u32{
    var h = n * 747796405u + 2891336453u;
    h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
    return (h >> 22u) ^ h;
    }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];
    
    let dir = normalize(p.position); //compute unit vector
    let r = length(p.position);
    let age = 1.0 - (p.life / 5.0); //5.0 is intial life

    let inward = -dir * params.dt ;

    let frequency = 8.0 * (1.0 + age );
    let wiggle = vec2f(sin(p.position.y * frequency), cos(p.position.x * frequency))*0.3;

    let orbitSpeed = (1.5/(r+0.5));
    let orbit =  vec2f(-dir.y, dir.x) * orbitSpeed;

    let pull = -dir * (1.0/(r+0.12))*0.2;

    let seed = bitcast<u32>(p.position.x) ^ bitcast<u32>(p.position.y);
    let int_n = noise(seed);
    let float_n = f32(int_n) / f32(0xffffffffu);

    let targetVelocity = (pull + orbit + wiggle);
    p.velocity = mix(p.velocity, targetVelocity, 0.1);

    p.position += p.velocity * params.dt;
    p.life -= params.dt;
    // Basic logic: Age the particle
    /*if (p.life <= 0.0) { //do depending on dt as a unfiorm buffer
        p.life = 5.0;
        let angle = f32(i) * 0.1;
        p.position = vec2f(cos(angle), sin(angle))*1.5;
        p.velocity = vec2f(0.0,0.0);
    } */
    particles[i] = p;

} // made this with ai btw