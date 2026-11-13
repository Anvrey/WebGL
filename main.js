'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let lightAngle = 0.0;
let rotateLight = true;
let nR = 30;
let nTheta = 60;
let texScale = 3.0;
let useDiffuse = 1;
let useSpecular = 1;
let useNormal = 1;
let rotPoint = [0.5, 0.5];
let rotAngle = 0.0;
let markerProgram;
let markerBuffer;


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variables in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    this.iAttribTangent = -1;
    this.iAttribTexCoords = -1;

    // Location of the uniform matrices.
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;

    // Locations of the Texture Mapping Units (Diffuse, Specular, Normal).
    this.iTMU0 = -1;
    this.iTMU1 = -1;
    this.iTMU2 = -1;

    this.iLightPosition = -1;
    this.iAmbientLight = -1;
    this.iDiffuseLight = -1;
    this.iSpecularLight = -1;
    this.iShininess = -1;
    this.iTexScale = -1;
    this.iRotationPoint = -1;
    this.iRotationAngle = -1;

    this.iUseDiffuse = -1;
    this.iUseSpecular = -1;
    this.iUseNormal = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    };
}

function updateSurface() {
    let data = {};
    CreateSurfaceData(data, nR, nTheta);
    surface.BufferData(
        data.verticesF32,
        data.normalsF32,
        data.tangentsF32,
        data.texcoordsF32,
        data.indicesU16
    );
}


/* Draws the textured Richmond's Minimal Surface with per-pixel Phong + Normal Mapping. */
function draw() {
    gl.clearColor(0.08, 0.08, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI / 8, 1, 8, 12);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1);

    let normalMatrix = m4.inverse(matAccum1);
    m4.transpose(normalMatrix, normalMatrix);

    // Circular motion of point light
    let lightRadius = 4.0;
    let lightWorldPos = [lightRadius * Math.cos(lightAngle), lightRadius * Math.sin(lightAngle), 2.5];
    let lightEyePos = m4.transformPoint(matAccum1, lightWorldPos);

    shProgram.Use();

    gl.uniformMatrix4fv(shProgram.iModelViewProjectionMatrix, false, modelViewProjection);
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccum1);
    gl.uniformMatrix4fv(shProgram.iNormalMatrix, false, normalMatrix);

    gl.uniform1i(shProgram.iTMU0, 0);
    gl.uniform1i(shProgram.iTMU1, 1);
    gl.uniform1i(shProgram.iTMU2, 2);

    gl.uniform3fv(shProgram.iLightPosition, lightEyePos);
    gl.uniform3f(shProgram.iAmbientLight, 0.22, 0.22, 0.22);
    gl.uniform3f(shProgram.iDiffuseLight, 0.9, 0.9, 0.9);
    gl.uniform3f(shProgram.iSpecularLight, 1.35, 1.35, 1.35);
    gl.uniform1f(shProgram.iShininess, 14.0);
    gl.uniform1f(shProgram.iTexScale, texScale);
    gl.uniform2fv(shProgram.iRotationPoint, rotPoint);
    gl.uniform1f(shProgram.iRotationAngle, rotAngle);

    gl.uniform1i(shProgram.iUseDiffuse, useDiffuse);
    gl.uniform1i(shProgram.iUseSpecular, useSpecular);
    gl.uniform1i(shProgram.iUseNormal, useNormal);

    surface.Draw();
    drawMarker(modelViewProjection);
}

function drawMarker(mvp) {
    let theta = 2 * Math.PI * rotPoint[0];
    let r = 0.25 + 0.75 * rotPoint[1];

    gl.useProgram(markerProgram);
    gl.uniformMatrix4fv(gl.getUniformLocation(markerProgram, "ModelViewProjectionMatrix"), false, mvp);

    gl.bindBuffer(gl.ARRAY_BUFFER, markerBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(calcPoint(r, theta)), gl.DYNAMIC_DRAW);
    let loc = gl.getAttribLocation(markerProgram, "vertex");
    gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(loc);

    gl.disable(gl.DEPTH_TEST);
    gl.drawArrays(gl.POINTS, 0, 1);
    gl.enable(gl.DEPTH_TEST);
}

function animate() {
    if (rotateLight) {
        lightAngle += 0.02;
    }
    draw();
    requestAnimationFrame(animate);
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");
    shProgram.iAttribTangent             = gl.getAttribLocation(prog, "tangent");
    shProgram.iAttribTexCoords           = gl.getAttribLocation(prog, "tex");

    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");

    shProgram.iTMU0                      = gl.getUniformLocation(prog, "iTMU0");
    shProgram.iTMU1                      = gl.getUniformLocation(prog, "iTMU1");
    shProgram.iTMU2                      = gl.getUniformLocation(prog, "iTMU2");

    shProgram.iLightPosition             = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iAmbientLight              = gl.getUniformLocation(prog, "AmbientLight");
    shProgram.iDiffuseLight              = gl.getUniformLocation(prog, "DiffuseLight");
    shProgram.iSpecularLight             = gl.getUniformLocation(prog, "SpecularLight");
    shProgram.iShininess                 = gl.getUniformLocation(prog, "Shininess");
    shProgram.iTexScale                  = gl.getUniformLocation(prog, "TexScale");
    shProgram.iRotationPoint             = gl.getUniformLocation(prog, "RotationPoint");
    shProgram.iRotationAngle             = gl.getUniformLocation(prog, "RotationAngle");

    shProgram.iUseDiffuse                = gl.getUniformLocation(prog, "UseDiffuse");
    shProgram.iUseSpecular               = gl.getUniformLocation(prog, "UseSpecular");
    shProgram.iUseNormal                 = gl.getUniformLocation(prog, "UseNormal");

    markerProgram = createProgram(gl, markerVertexSource, markerFragmentSource);
    markerBuffer = gl.createBuffer();

    surface = new Model('Surface');
    updateSurface();

    surface.idTextureDiffuse  = LoadTexture("./textures/diffuse.png");
    surface.idTextureSpecular = LoadTexture("./textures/specular.png");
    surface.idTextureNormal   = LoadTexture("./textures/normal.png");

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    document.getElementById("sliderU").addEventListener("input", function() {
        nR = parseInt(this.value);
        document.getElementById("valU").innerText = nR;
        updateSurface();
    });

    document.getElementById("sliderV").addEventListener("input", function() {
        nTheta = parseInt(this.value);
        document.getElementById("valV").innerText = nTheta;
        updateSurface();
    });

    document.getElementById("sliderScale").addEventListener("input", function() {
        texScale = parseFloat(this.value);
        document.getElementById("valScale").innerText = texScale.toFixed(1);
    });

    document.getElementById("chkDiffuse").addEventListener("change", function() {
        useDiffuse = this.checked ? 1 : 0;
    });

    document.getElementById("chkSpecular").addEventListener("change", function() {
        useSpecular = this.checked ? 1 : 0;
    });

    document.getElementById("chkNormal").addEventListener("change", function() {
        useNormal = this.checked ? 1 : 0;
    });

    document.getElementById("chkRotateLight").addEventListener("change", function() {
        rotateLight = this.checked;
    });

    document.getElementById("sliderAngle").addEventListener("input", function() {
        rotAngle = deg2rad(parseFloat(this.value));
        document.getElementById("valAngle").innerText = this.value;
    });

    window.addEventListener("keydown", function(e) {
        let step = 0.02;
        if (e.code == "KeyA") rotPoint[0] -= step;
        else if (e.code == "KeyD") rotPoint[0] += step;
        else if (e.code == "KeyW") rotPoint[1] += step;
        else if (e.code == "KeyS") rotPoint[1] -= step;
        else return;
        rotPoint[0] = Math.min(Math.max(rotPoint[0], 0), 1);
        rotPoint[1] = Math.min(Math.max(rotPoint[1], 0), 1);
        document.getElementById("valPoint").innerText =
            rotPoint[0].toFixed(2) + ", " + rotPoint[1].toFixed(2);
        e.preventDefault();
    });

    animate();
}
