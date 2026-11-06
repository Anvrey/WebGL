'use strict';

function deg2rad(angle) {
    return angle * Math.PI / 180;
}

// p: an array of xyz vertex coords
// t: an array of uv tex coords
function Vertex(p, t) {
    this.p = p;
    this.t = t;
    this.normal = [0, 0, 0];
    this.tangent = [0, 0, 0];
    this.triangles = [];
}

function Triangle(v0, v1, v2) {
    this.v0 = v0;
    this.v1 = v1;
    this.v2 = v2;
    this.normal = [0, 0, 0];
    this.tangent = [0, 0, 0];
}

// Model Constructor function
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iTexCoordsBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();
    this.count = 0;

    this.idTextureDiffuse = -1;
    this.idTextureSpecular = -1;
    this.idTextureNormal = -1;

    this.BufferData = function(vertices, normals, tangents, texCoords, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.Draw = function() {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureSpecular);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTangent);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTexCoordsBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexCoords);

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

    // Vertices and UV coordinates
    for (let i = 0; i <= nR; i++) {
        let r = rMin + i * stepR;
        let v = i / nR;
        for (let j = 0; j <= nTheta; j++) {
            let theta = j * stepTheta;
            let u = j / nTheta;
            vertices.push(new Vertex(calcPoint(r, theta), [u, v]));
        }
    }

    // Triangles
    for (let i = 0; i < nR; i++) {
        for (let j = 0; j < nTheta; j++) {
            let v0 = i * (nTheta + 1) + j;
            let v1 = v0 + 1;
            let v2 = (i + 1) * (nTheta + 1) + j;
            let v3 = v2 + 1;

            let t1 = new Triangle(v0, v1, v2);
            let t1Idx = triangles.length;
            triangles.push(t1);
            vertices[v0].triangles.push(t1Idx);
            vertices[v1].triangles.push(t1Idx);
            vertices[v2].triangles.push(t1Idx);

            let t2 = new Triangle(v1, v3, v2);
            let t2Idx = triangles.length;
            triangles.push(t2);
            vertices[v1].triangles.push(t2Idx);
            vertices[v3].triangles.push(t2Idx);
            vertices[v2].triangles.push(t2Idx);
        }
    }

    // Facet area weighted normals and UV tangents
    for (let i = 0; i < triangles.length; i++) {
        let tri = triangles[i];
        let vert0 = vertices[tri.v0];
        let vert1 = vertices[tri.v1];
        let vert2 = vertices[tri.v2];

        let e1 = [vert1.p[0] - vert0.p[0], vert1.p[1] - vert0.p[1], vert1.p[2] - vert0.p[2]];
        let e2 = [vert2.p[0] - vert0.p[0], vert2.p[1] - vert0.p[1], vert2.p[2] - vert0.p[2]];

        let cross = [
            e1[1] * e2[2] - e1[2] * e2[1],
            e1[2] * e2[0] - e1[0] * e2[2],
            e1[0] * e2[1] - e1[1] * e2[0]
        ];
        tri.normal = cross;

        let du1 = vert1.t[0] - vert0.t[0];
        let dv1 = vert1.t[1] - vert0.t[1];
        let du2 = vert2.t[0] - vert0.t[0];
        let dv2 = vert2.t[1] - vert0.t[1];

        let det = du1 * dv2 - du2 * dv1;
        let f = Math.abs(det) > 1e-8 ? (1.0 / det) : 0.0;

        let tx = f * (dv2 * e1[0] - dv1 * e2[0]);
        let ty = f * (dv2 * e1[1] - dv1 * e2[1]);
        let tz = f * (dv2 * e1[2] - dv1 * e2[2]);

        let areaWeight = Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);
        let tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tLen > 1e-8) {
            let s = areaWeight / tLen;
            tri.tangent = [tx * s, ty * s, tz * s];
        }

        for (let k = 0; k < 3; k++) {
            vert0.normal[k] += tri.normal[k];
            vert1.normal[k] += tri.normal[k];
            vert2.normal[k] += tri.normal[k];

            vert0.tangent[k] += tri.tangent[k];
            vert1.tangent[k] += tri.tangent[k];
            vert2.tangent[k] += tri.tangent[k];
        }
    }

    // Seam smoothing between theta = 0 and theta = 2*PI
    for (let i = 0; i <= nR; i++) {
        let iStart = i * (nTheta + 1);
        let iEnd = iStart + nTheta;
        for (let k = 0; k < 3; k++) {
            let sumN = vertices[iStart].normal[k] + vertices[iEnd].normal[k];
            vertices[iStart].normal[k] = sumN;
            vertices[iEnd].normal[k] = sumN;

            let sumT = vertices[iStart].tangent[k] + vertices[iEnd].tangent[k];
            vertices[iStart].tangent[k] = sumT;
            vertices[iEnd].tangent[k] = sumT;
        }
    }

    data.verticesF32 = new Float32Array(vertices.length * 3);
    data.normalsF32 = new Float32Array(vertices.length * 3);
    data.tangentsF32 = new Float32Array(vertices.length * 3);
    data.texcoordsF32 = new Float32Array(vertices.length * 2);

    for (let i = 0; i < vertices.length; i++) {
        data.verticesF32[i * 3 + 0] = vertices[i].p[0];
        data.verticesF32[i * 3 + 1] = vertices[i].p[1];
        data.verticesF32[i * 3 + 2] = vertices[i].p[2];

        data.texcoordsF32[i * 2 + 0] = vertices[i].t[0];
        data.texcoordsF32[i * 2 + 1] = vertices[i].t[1];

        let n = vertices[i].normal;
        let nLen = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]);
        let nx = 0.0, ny = 0.0, nz = 1.0;
        if (nLen > 1e-5) {
            nx = n[0] / nLen;
            ny = n[1] / nLen;
            nz = n[2] / nLen;
        }
        data.normalsF32[i * 3 + 0] = nx;
        data.normalsF32[i * 3 + 1] = ny;
        data.normalsF32[i * 3 + 2] = nz;

        // Gram-Schmidt orthogonalization (Variant 4: Prioritize normal)
        let t = vertices[i].tangent;
        let dotTN = t[0] * nx + t[1] * ny + t[2] * nz;
        let tx = t[0] - dotTN * nx;
        let ty = t[1] - dotTN * ny;
        let tz = t[2] - dotTN * nz;
        let tLen = Math.sqrt(tx * tx + ty * ty + tz * tz);
        if (tLen > 1e-5) {
            data.tangentsF32[i * 3 + 0] = tx / tLen;
            data.tangentsF32[i * 3 + 1] = ty / tLen;
            data.tangentsF32[i * 3 + 2] = tz / tLen;
        } else {
            data.tangentsF32[i * 3 + 0] = 1.0;
        }
    }

    data.indicesU16 = new Uint16Array(triangles.length * 3);
    for (let i = 0; i < triangles.length; i++) {
        data.indicesU16[i * 3 + 0] = triangles[i].v0;
        data.indicesU16[i * 3 + 1] = triangles[i].v1;
        data.indicesU16[i * 3 + 2] = triangles[i].v2;
    }
}
