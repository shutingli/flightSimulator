
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

// Create a place to store terrain geometry
var tVertexPositionBuffer;

//Create a place to store normals for shading
var tVertexNormalBuffer;

// Create a place to store the terrain triangles
var tIndexTriBuffer;

//Create a place to store the traingle edges
var tIndexEdgeBuffer;

// pressed key 
var pressedKey = {};

// rotate speed
var vrot = 0.01;

// air speed
var vair = 0.0001;
var moveAir =0;
//rotation angle
var xangle =0;
var yangle =0;
var zangle =0;
var lastTime = 0;
var randomVector = 0.01;
// View parameters
var eyePt = vec3.fromValues(0.0,0.4,0.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// Create the normal
var nMatrix = mat3.create();
var quatMatrix = mat3.create();
// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

var myquat = quat.create();

//-------------------------------------------------------------------------
// the function will use the square from x0,y0 to x1,y1 to perform the diamondstep
function DiamondStep(height,x0,y0,x1,y1,i) {
    rx = (x1-x0)/2 + x0;
    ry = (y1-y0)/2 + y0;
    height[rx+i*ry]=(2*Math.random()-Math.random())*(x1-x0)/2*randomVector+0.25*(height[x0+i*y0]+height[x0+i*y1]+height[x1+i*y1]+height[x1+i*y0]);

}
//-------------------------------------------------------------------------
// the function will use the four point around the center point xi,yi to perform the squarestep
function SquareStep(height,yi,xi,delta,i) {
    //check four point
    if(height[yi*i+xi+delta]==0)
    {
      height[yi*i+xi+delta]=getAverage(height,yi,xi+delta,delta,i)+(2*Math.random()-Math.random())*delta*randomVector;
    }

    if(height[yi*i+xi+delta*i]==0)
    {
      height[yi*i+xi+delta*i]=getAverage(height,yi+delta,xi,delta,i)+(2*Math.random()-Math.random())*delta*randomVector;
    }

    if(height[yi*i+xi-delta]==0)
    {
      height[yi*i+xi-delta]=getAverage(height,yi,xi-delta,delta,i)+(2*Math.random()-Math.random())*delta*randomVector;
    }

    if(height[yi*i+xi-delta*i]==0)
    {
      height[yi*i+xi-delta*i]=getAverage(height,yi-delta,xi,delta,i)+(2*Math.random()-Math.random())*delta*randomVector;
    }
 	
}

//-------------------------------------------------------------------------
// the function will calculate the average height for the nearest four points.
function getAverage(height,yi,xi,delta,i) {
    var average=0;
    var count=0;
    //check four point
    if(yi - delta >= 0)
    {
      average += height[yi*i-delta*i+xi];
      count++;
    }

    if(xi - delta >= 0)
    {
      average += height[yi*i-delta+xi];
      count++;
    }
    if(yi + delta <= i-1)
    {
      average += height[yi*i+delta*i+xi];
      count++;
    }

    if(xi + delta <= i-1)
    {
      average += height[yi*i+delta+xi];
      count++;
    }
    return average/count;

}


//-------------------------------------------------------------------------
// the function will calculate the height using other helper function and recursion calling itself 
function calculateHeight(height,n,max) {
  var x, y, half = n / 2;
  //var scale = roughness * n;
  if (half < 1) return;
  for (y = 0; y <= max-n; y += n) {
    for (x = 0; x <= max-n; x += n) {
      DiamondStep(height,x,y,x+n,y+n,max+1);
    }
  }
  for (y = half; y <= max-half; y += n) {
    for (x = half; x <= max-half; x += n) {
      SquareStep(height,x,y,half,max+1);
    }
  }

  calculateHeight(height,n / 2,max);
}
//-------------------------------------------------------------------------
//push the height value into the array and set the original value for the four special points
function initialHeightValue(hTerrain,gridN) {
	var i,j;
		for (i=0;i<gridN;i++){
			for(j=0;j<gridN;j++){
				hTerrain.push(0);
			}
		}

    hTerrain[0] = 0.5;
    hTerrain[gridN-1] =0.5;
    hTerrain[(gridN-1)*gridN]=0.5;
    hTerrain[(gridN-1)*gridN+(gridN-1)]=0.5;
	}

 
//-------------------------------------------------------------------------
// set up the normal, vertex,face, edges buffers with other helper function 
function setupTerrainBuffers() {
    
    var vTerrain=[];
    var fTerrain=[];
    var nTerrain=[];
    var eTerrain=[];
    var hTerrain=[];
    var normalBuffer=[];
    var gridN=64; //2^n+1
    initialHeightValue(hTerrain,gridN+1);
    calculateHeight(hTerrain,(gridN),gridN);

    var numT = terrainFromIteration(gridN, -1,1,-1,1, vTerrain, fTerrain, nTerrain,hTerrain,normalBuffer);
    console.log("Generated ", numT, " triangles"); 
    tVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vTerrain), gl.STATIC_DRAW);
    tVertexPositionBuffer.itemSize = 3;
    tVertexPositionBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify normals to be able to do lighting calculations
    tVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(nTerrain),
                  gl.STATIC_DRAW);
    tVertexNormalBuffer.itemSize = 3;
    tVertexNormalBuffer.numItems = (gridN+1)*(gridN+1);
    
    // Specify faces of the terrain 
    tIndexTriBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fTerrain),
                  gl.STATIC_DRAW);
    tIndexTriBuffer.itemSize = 1;
    tIndexTriBuffer.numItems = numT*3;
    
    //Setup Edges
     generateLinesFromIndexedTriangles(fTerrain,eTerrain);  
     tIndexEdgeBuffer = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(eTerrain),
                  gl.STATIC_DRAW);
     tIndexEdgeBuffer.itemSize = 1;
     tIndexEdgeBuffer.numItems = eTerrain.length; 
     
}

//-------------------------------------------------------------------------
//the function will  bind buffer and draw the triangles
function drawTerrain(){
 gl.polygonOffset(0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexTriBuffer);
 gl.drawElements(gl.TRIANGLES, tIndexTriBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
// the function will bind the normal buffer and draw the terrain edges using line element
function drawTerrainEdges(){
 gl.polygonOffset(1,1);
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, tVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, tVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           tVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);   
    
 //Draw 
 gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tIndexEdgeBuffer);
 gl.drawElements(gl.LINES, tIndexEdgeBuffer.numItems, gl.UNSIGNED_SHORT,0);      
}

//-------------------------------------------------------------------------
// pass the model view Matrix
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
// upload the projectionmatrix to shader
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
// upload the normal matrix to shader
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
// copy the mvMatrix to mvMatrixStack
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
// the function will pop out the matrix on the stack if there is any
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
// the function will set the matrix 
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
// the function will transfer the deg into radians
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
// the function will create the gl context 
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
// the function will load shader from dom
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
// the setupshaders function will set up the vertex shader and the fragment shader.
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
}


//-------------------------------------------------------------------------
// the funtion will upload the light to shader.
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//----------------------------------------------------------------------------------
// the function will call the setup terrain buffers to set up buffers
function setupBuffers() {
    setupTerrainBuffers();
}

//----------------------------------------------------------------------------------
// the function will calculate the mvMatrix, viewPoint, eye point with quaternion.
function draw() { 
   
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // Do quatenion
    quat.normalize(myquat, myquat);


    vec3.transformQuat(viewDir, vec3.fromValues(0.0,0.0,-1.0), myquat);

    var changePt = vec3.create();
    vec3.scale(changePt, viewDir, moveAir)
    vec3.add(eyePt, eyePt, changePt);
   
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);

    vec3.transformQuat(up, vec3.fromValues(0.0,1.0,0.0), myquat);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);  //change this
 
     //Draw Terrain
    mvPushMatrix();
    vec3.set(transformVec,0.0,-0.25,-3.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);
    mat4.rotateX(mvMatrix, mvMatrix, degToRad(-75));
    mat4.rotateZ(mvMatrix, mvMatrix, degToRad(25));     
    setMatrixUniforms();
    
    if ((document.getElementById("polygon").checked) || (document.getElementById("wirepoly").checked))
    {
      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[1.0,0.5,0.0],[0.0,0.0,0.0]);
      drawTerrain();
    }
    
    if(document.getElementById("wirepoly").checked){
      uploadLightsToShader([0,1,1],[0.0,0.0,0.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }

    if(document.getElementById("wireframe").checked){
      uploadLightsToShader([0,1,1],[1.0,1.0,1.0],[0.0,0.0,0.0],[0.0,0.0,0.0]);
      drawTerrainEdges();
    }
    mvPopMatrix();
  
}
//----------------------------------------------------------------------------------
// the animate function will calculate the time elapsed and change the quaternion according to
// the key pressed and time elapsed
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime; 
        var angle = elapsed * vrot; 
        //left arrow  
        if (pressedKey[83])
        {
           quat.rotateX(myquat, myquat, degToRad(-angle));
           //console.log(myquat);
        }

        //right arrow  
        if (pressedKey[87])
        {
           quat.rotateX(myquat, myquat, degToRad(angle));
           //console.log(myquat);
        }

        //up arrow  
        if (pressedKey[68])
        {
           quat.rotateZ(myquat, myquat, degToRad(angle));
           //console.log(myquat);
        }

        //down arrow  
        if (pressedKey[65])
        {
           quat.rotateZ(myquat, myquat, degToRad(-angle));
           //console.log(myquat);
        }
        moveAir = elapsed * vair;

    }
    lastTime = timeNow;
    
}

//----------------------------------------------------------------------------------
// the startup function will get information from the html code (canvas and keyup keydown)
// also it will enable depth_test, cull_face
function startup() {
  canvas = document.getElementById("myGLCanvas");
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  tick();
}

//----------------------------------------------------------------------------------
// The handleKeyDown function will record the keycode into the pressKey so that we can 
// know which key is pressed
function handleKeyDown(event) {
  pressedKey[event.keyCode] = true;
}

//----------------------------------------------------------------------------------
// The handleKeyDown function will record the keycode into the pressKey so that we can 
// know which key is released
function handleKeyUp(event) {
  pressedKey[event.keyCode] = false;
}

//----------------------------------------------------------------------------------
// The generateIndices will generate the indices
function generateIndices(side) {
  var indices = [];
  for(var i = 0; i < side - 1; i++) { // y
    for(var j = 0; j < side - 1; j++) { // x
      // generate top polygon
      indices[((2 * i * (side - 1)) + j) * 3] = xyToi(j + 1, i, side, 1);
      indices[((2 * i * (side - 1)) + j) * 3 + 1] = xyToi(j, i, side, 1);
      indices[((2 * i * (side - 1)) + j) * 3 + 2] = xyToi(j + 1, i + 1, side, 1);

      // generate bottom polygon
      indices[((2 * i * (side - 1)) + side - 1 + j) * 3] = xyToi(j, i, side, 1);
      indices[((2 * i * (side - 1)) + side - 1 + j) * 3 + 1] = xyToi(j, i + 1, side, 1);
      indices[((2 * i * (side - 1)) + side - 1 + j) * 3 + 2] = xyToi(j + 1, i + 1, side, 1);
    }
  }
  return indices;
}
//----------------------------------------------------------------------------------
// The generateIndices will generate the indices
function xyToi(x, y, width, skip) {
  return skip * (width * y + x);
}
//----------------------------------------------------------------------------------
// the function tick will use the tick to call animate and draw function
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}

