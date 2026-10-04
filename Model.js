'use strict';

function Model() {
    this.iVertexBufferU = null;
    this.iVertexBufferV = null;
    this.pointsU = 0;
    this.linesU = 0;
    this.pointsV = 0;
    this.linesV = 0;

    // point calculation (variant 4)
    this.calcPoint = function(r, theta) {
        let x = -Math.cos(theta) / (2 * r) - Math.pow(r, 3) * Math.cos(3 * theta) / 6;
        let y = -Math.sin(theta) / (2 * r) + Math.pow(r, 3) * Math.sin(3 * theta) / 6;
        let z = r * Math.cos(theta);
        return [x, y, z];
    };

    this.BufferData = function(gl) {
        let rMin = 0.25;
        let rMax = 1.0;
        let nR = 25;
        let nTheta = 50;

        let uData = [];
        let vData = [];

        let stepR = (rMax - rMin) / nR;
        let stepTheta = (2 * Math.PI) / nTheta;

        // U polylines (constant r)
        for (let i = 0; i <= nR; i++) {
            let r = rMin + i * stepR;
            for (let j = 0; j <= nTheta; j++) {
                let theta = j * stepTheta;
                let p = this.calcPoint(r, theta);
                uData.push(p[0], p[1], p[2]);
            }
        }

        // V polylines (constant theta)
        for (let j = 0; j <= nTheta; j++) {
            let theta = j * stepTheta;
            for (let i = 0; i <= nR; i++) {
                let r = rMin + i * stepR;
                let p = this.calcPoint(r, theta);
                vData.push(p[0], p[1], p[2]);
            }
        }

        this.pointsU = nTheta + 1;
        this.linesU = nR + 1;
        this.pointsV = nR + 1;
        this.linesV = nTheta + 1;

        // buffer for U lines
        this.iVertexBufferU = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferU);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uData), gl.STATIC_DRAW);

        // buffer for V lines
        this.iVertexBufferV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferV);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vData), gl.STATIC_DRAW);
    };

    this.Draw = function(gl, shProgram) {
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        // draw U lines
        gl.uniform4fv(shProgram.iColor, [0.1, 0.7, 1.0, 1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferU);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        for (let i = 0; i < this.linesU; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * this.pointsU, this.pointsU);
        }

        // draw V lines
        gl.uniform4fv(shProgram.iColor, [1.0, 0.4, 0.2, 1.0]);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBufferV);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        for (let i = 0; i < this.linesV; i++) {
            gl.drawArrays(gl.LINE_STRIP, i * this.pointsV, this.pointsV);
        }
    };
}
