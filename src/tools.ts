
export function nextPowerOfTwo(x:number): number {
    const power = Math.log2(x);
    const ans = Math.ceil(power);
    return 2**ans;
}
