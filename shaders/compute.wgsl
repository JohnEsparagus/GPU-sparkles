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
    grid_width:u32
}

@group(0) @binding(0) var<storage, read_write> output_particles: array<Particle>;//another one
@group(0) @binding(1) var<storage, read_write> input_particles: array<Particle>;
@group(0) @binding(2) var<uniform> params: Params;

fn noise(n: u32)->u32{
    var h = n * 747796405u + 2891336453u;
    h = ((h >> ((h >> 28u) + 4u)) ^ h) * 277803737u;
    return (h >> 22u) ^ h;
    }

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
    let i = (global_id.y * params.grid_width) + global_id.x;
    if (i >= arrayLength(&input_particles)) { return; }

    var p = input_particles[i];
    // noise first — needed for respawn below
    let seed    = bitcast<u32>(p.position.x) ^ bitcast<u32>(p.position.y) ^ i;
    let int_n   = noise(seed);
    let float_n = f32(int_n) / f32(0xffffffffu);
    let int_n2   = noise(int_n);
    let float_n2 = f32(int_n2) / f32(0xffffffffu);
    let int_n3 = noise(int_n2 ^ bitcast<u32>(p.life));
    let float_n3 = f32(int_n3) / f32(0xffffffffu);
    let int_n4 = noise(int_n3);
    let float_n4 = f32(int_n4) / f32(0xffffffffu);


    let r         = length(p.position);
    let dir       = normalize(p.position);
    let tangent   = vec2f(-dir.y, dir.x);
    let softening = 0.05;

    // point-mass gravity — dominates at all radii
    let gravity = -dir * (0.8 / (r * r + softening));

    // orbit weakens as particles fall inward — they stop circling and just fall
    let orbit = tangent * (0.6 / (r + softening)) * clamp(r * 2.0, 0.0, 1.0);

    // accretion disk — squeezes particles toward the equator
    let disk_squeeze = vec2f(0.0, -p.position.y * 0.4);

    let turb_angle = float_n3 * 6.2831853;
    let turb = vec2f(cos(turb_angle), sin(turb_angle))*0.05; 

    let targetVelocity = gravity + orbit + disk_squeeze;
    p.velocity = mix(p.velocity, targetVelocity, vec2f(0.06)) + turb;

    p.position += p.velocity * params.dt;
    p.life     -= params.dt;

    // consumed by event horizon OR lifetime expired → respawn at outer ring
    if (p.life <= 0.0 || r < 0.066) { //life is NOT 0 anymoreee
        let spawn_r     = 1.2 + float_n2 * 0.4;
        let spawn_angle = float_n * 6.2831853;
        p.position = vec2f(cos(spawn_angle), sin(spawn_angle)) * spawn_r;
        p.velocity = vec2f(0.0);
        p.life     = 3.0 + float_n * 4.0;
    }

    // heat gradient: dim blue-purple edge → orange mid → hot white core
    let t  = clamp(1.0 - (r / 1.4), 0.0, 1.0);
    let t2 = t * t;
    p.color = mix(
        mix(vec4f(0.1, 0.1, 0.4, 0.2), vec4f(0.9, 0.4, 0.05, 0.6), t),
        vec4f(1.0, 0.95, 0.7, 1.0),
        t2
    );
    output_particles[i] = p;

} // made this with ai btw