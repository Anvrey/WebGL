'use strict';

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// p: an array of xyz vertex coords
// t: an array of uv tex coords
function Vertex(p) {
    this.p = p;
    this.normal = [0, 0, 0];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
}

// Model Constructor function
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.BufferData = function(vertices, normals, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    };
}

// point calculation (variant 4)
function calcPoint(r, theta) {
    let x = -Math.cos(theta) / (2 * r) - Math.pow(r, 3) * Math.cos(3 * theta) / 6;
    let y = -Math.sin(theta) / (2 * r) + Math.pow(r, 3) * Math.sin(3 * theta) / 6;
    let z = r * Math.cos(theta);
    return [x, y, z];
}

function CreateSurfaceData(data, nR, nTheta) {
    let vertices = [];
    let triangles = [];

    let rMin = 0.25;
    let rMax = 1.0;
    let stepR = (rMax - rMin) / nR;
    let stepTheta = (2 * Math.PI) / nTheta;

    // Vertices
    for (let i = 0; i <= nR; i++) {
        let r = rMin + i * stepR;
        for (let j = 0; j <= nTheta; j++) {
            let theta = j * stepTheta;
            vertices.push(new Vertex(calcPoint(r, theta)));
        }
    }

    // Triangles
    for (let i = 0; i < nR; i++) {
        for (let j = 0; j < nTheta; j++) {
            let v0 = i * (nTheta + 1) + j;
            let v1 = v0 + 1;
            let v2 = (i + 1) * (nTheta + 1) + j;
            let v3 = v2 + 1;

            triangles.push(new Triangle(v0, v1, v2));
            triangles.push(new Triangle(v1, v3, v2));
        }
    }

    // Facet area weighted normals
    for (let i = 0; i < triangles.length; i++) {
        let tri = triangles[i];
        let p0 = vertices[tri.v0].p;
        let p1 = vertices[tri.v1].p;
        let p2 = vertices[tri.v2].p;

        let a = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
        let b = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];

        let cross = [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]
        ];

        for (let k = 0; k < 3; k++) {
            vertices[tri.v0].normal[k] += cross[k];
            vertices[tri.v1].normal[k] += cross[k];
            vertices[tri.v2].normal[k] += cross[k];
        }
    }

    data.verticesF32 = new Float32Array(vertices.length * 3);
    data.normalsF32 = new Float32Array(vertices.length * 3);
    for (let i = 0; i < vertices.length; i++) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];

        let n = vertices[i].normal;
        let len = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        if (len > 0.00001) {
            data.normalsF32[i * 3 + 0] = n[0] / len;
            data.normalsF32[i * 3 + 1] = n[1] / len;
            data.normalsF32[i * 3 + 2] = n[2] / len;
        } else {
            data.normalsF32[i * 3 + 2] = 1.0;
        }
    }

    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
