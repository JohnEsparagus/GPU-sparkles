
export function nextPowerOfTwo(x:number): number {
    const power = Math.log2(x);
    const ans = Math.ceil(power);
    return 2**ans;
}


export function mat4Mult(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[j + k*4] * b[k + i*4];
            }
            out[j + i*4] = sum;
        }
    }

    console.log("out inside mult", Array.from(out));
    return out;
}