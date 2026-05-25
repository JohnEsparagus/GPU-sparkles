
export function perspective(
    fovRadians: number, 
    aspect: number, 
    near: number, 
    far: number
): Float32Array<ArrayBuffer> {
    const f = 1.0 / Math.tan(fovRadians / 2);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
        f / aspect, 0, 0, 0, 
        0,          f, 0, 0,
        0,          0, far * rangeInv, -1, 
        0,          0, near * far * rangeInv, 0 
    ]);
}

export function lookAt(eye : [number,number,number],  target: [number,number,number], worldUp: [number,number,number]){
    let F = [eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]
    const fMag = Math.sqrt(F[0]*F[0] + F[1]*F[1] + F[2]*F[2]);
    //what if mag is 0
    if (fMag === 0){
        F[3] = 1; //z default to 1 when forward dir -= 0
    } else {
        F = [F[0]/fMag,F[1]/fMag, F[2]/fMag];
    }
    //right vector up x forward
    let R = [
        worldUp[1]*F[2] - worldUp[2]*F[1],
        worldUp[2]*F[0] - worldUp[0]*F[2],
        worldUp[0]*F[1] - worldUp[1]*F[0]
    ]

    const rMag = Math.sqrt(R[0]*R[0] + R[1]*R[1] + R[2]*R[2]);
    if (rMag === 0) {
        R = [1, 0, 0];
    } else {
        R = [R[0]/rMag, R[1]/rMag, R[2]/rMag];
    }
    //up vector forward x right
    const U = [
        F[1]*R[2] - F[2]*R[1],
        F[2]*R[0] - F[0]*R[2],
        F[0]*R[1] - F[1]*R[0]
    ];

    const dotR = -(R[0]*eye[0] + R[1]*eye[1] + R[2]*eye[2]);
    const dotU = -(U[0]*eye[0] + U[1]*eye[1] + U[2]*eye[2]);
    const dotF = -(F[0]*eye[0] + F[1]*eye[1] + F[2]*eye[2]);

    return new Float32Array([
        R[0], U[0], F[0], 0,
        R[1], U[1], F[1], 0,
        R[2], U[2], F[2], 0,
        dotR, dotU, dotF, 1
    ]);

}
