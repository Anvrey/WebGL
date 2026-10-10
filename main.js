'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let lightAngle = 0.0;
let nR = 25;
let nTheta = 50;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribNormal = -1;
    // Location of the uniform specifying a color for the primitive.
    this.iColor = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;
    this.iModelViewMatrix = -1;
    this.iNormalMatrix = -1;

    this.iLightPosition = -1;
    this.iObjectColor = -1;
    this.iAmbientLight = -1;
    this.iDiffuseLight = -1;
    this.iSpecularLight = -1;
    this.iShininess = -1;

    this.Use = function() {
        gl.useProgram(this.prog);
    }
}

function updateSurface() {
    let data = {};
    CreateSurfaceData(data, nR, nTheta);
    surface.BufferData(data.verticesF32, data.normalsF32, data.indicesU16);
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() { 
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    /* Set the values of the projection transformation */
    let projection = m4.perspective(Math.PI/8, 1, 8, 12); 
    
    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707,0.707,0], 0.7);
    let translateToPointZero = m4.translation(0,0,-10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView );
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0 );
        
    /* Multiply the projection matrix times the modelview matrix to give the
       combined transformation matrix, and send that to the shader program. */
    let modelViewProjection = m4.multiply(projection, matAccum1 );

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

    gl.uniform3fv(shProgram.iLightPosition, lightEyePos);
    gl.uniform3f(shProgram.iObjectColor, 0.2, 0.7, 0.9);
    gl.uniform3f(shProgram.iAmbientLight, 0.2, 0.2, 0.2);
    gl.uniform3f(shProgram.iDiffuseLight, 0.8, 0.8, 0.8);
    gl.uniform3f(shProgram.iSpecularLight, 1.0, 1.0, 1.0);
    gl.uniform1f(shProgram.iShininess, 32.0);

    surface.Draw();
}

function animate() {
    lightAngle += 0.02;
    draw();
    requestAnimationFrame(animate);
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram( gl, vertexShaderSource, fragmentShaderSource );

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex              = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribNormal              = gl.getAttribLocation(prog, "normal");
    shProgram.iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    shProgram.iModelViewMatrix           = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iNormalMatrix              = gl.getUniformLocation(prog, "NormalMatrix");

    shProgram.iLightPosition             = gl.getUniformLocation(prog, "LightPosition");
    shProgram.iObjectColor               = gl.getUniformLocation(prog, "ObjectColor");
    shProgram.iAmbientLight              = gl.getUniformLocation(prog, "AmbientLight");
    shProgram.iDiffuseLight              = gl.getUniformLocation(prog, "DiffuseLight");
    shProgram.iSpecularLight             = gl.getUniformLocation(prog, "SpecularLight");
    shProgram.iShininess                 = gl.getUniformLocation(prog, "Shininess");

    surface = new Model('Surface');
    updateSurface();

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
    let vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vShader);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
     }
    let fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
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
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    let sliderU = document.getElementById("sliderU");
    let sliderV = document.getElementById("sliderV");
    let valU = document.getElementById("valU");
    let valV = document.getElementById("valV");

    sliderU.addEventListener("input", function() {
        nR = parseInt(this.value);
        valU.innerText = nR;
        updateSurface();
    });

    sliderV.addEventListener("input", function() {
        nTheta = parseInt(this.value);
        valV.innerText = nTheta;
        updateSurface();
    });

    animate();
}
