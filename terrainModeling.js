//-------------------------------------------------------------------------
// the function will push value into the vertexarray, normal array and face array
// return the number of the triangles (2 * number of the faces)
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray,hArray,normal)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(hArray[i*(n+1)+j]);
           
       }

   for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           var normal = vec3.create();
           normal = getNormal(vertexArray,i,j,n+1);
           
           normalArray.push(normal[0]);
           normalArray.push(normal[1]);
           normalArray.push(normal[2]);
           
       }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }
    return numT;
}
//-------------------------------------------------------------------------
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

//-------------------------------------------------------------------------
// the function will use the point P1,P2,P3 to calculate the surface normal 
// of the surface made up of P1,P2,P3
  function calculateNormal(P1,P2,P3) {
  
    var vecV = vec3.create();
    var vecW = vec3.create();
    vec3.subtract(vecV, P2, P1);
    vec3.subtract(vecW, P3, P1);
    vec3.cross(vecV, vecV, vecW);
    //console.log(vecV);
    return vecV;
    
  }
  //-------------------------------------------------------------------------
  // the function will calculate each normal around the point xi,yi and get the vertex
  // normal of xi,yi by adding up all the normal then normalize it.
function getNormal(vertex,yi,xi,i) {
    var average=0;
    var count=0;
    var delta =1;

    ve1 =vec3.create();
    P1 = vec3.fromValues(vertex[3*(yi*i+xi)],vertex[3*(yi*i+xi)+1],vertex[3*(yi*i+xi)+2]);
    //check four point
    if(yi == 0)
    {
      P3 = vec3.fromValues(vertex[3*((yi+1)*i+xi)],vertex[3*((yi+1)*i+xi)+1],vertex[3*((yi+1)*i+xi)+2]); //y+1
      if ((xi == 0))
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi+1)],vertex[3*(yi*i+xi+1)+1],vertex[3*(yi*i+xi+1)+2]); //x+1
        ve1 = calculateNormal(P1,P2,P3); //x+ y+
        
      }
      else if (xi == i-1)
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi-1)],vertex[3*(yi*i+xi-1)+1],vertex[3*(yi*i+xi-1)+2]); //x-1
        ve1 = calculateNormal(P1,P3,P2); //y+ x-
        
      }
      else
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi-1)],vertex[3*(yi*i+xi-1)+1],vertex[3*(yi*i+xi-1)+2]); //x-1
        P4 = vec3.fromValues(vertex[3*(yi*i+xi+1)],vertex[3*(yi*i+xi+1)+1],vertex[3*(yi*i+xi+1)+2]); //x+1
        ve2 = vec3.create();
        ve1 = calculateNormal(P1,P4,P3); // x+ y+
        ve2 = calculateNormal(P1,P3,P2); // y+ x-
        vec3.add(ve1,ve1,ve2);
        
      }

    }
    else if (yi == i-1)
    {
      P3 = vec3.fromValues(vertex[3*((yi-1)*i+xi)],vertex[3*((yi-1)*i+xi)+1],vertex[3*((yi-1)*i+xi)+2]); //y-1
       if ((xi == 0))
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi+1)],vertex[3*(yi*i+xi+1)+1],vertex[3*(yi*i+xi+1)+2]); //x+1
        ve1 = calculateNormal(P1,P3,P2); // y- x+
        
      }
      else if (xi == i-1)
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi-1)],vertex[3*(yi*i+xi-1)+1],vertex[3*(yi*i+xi-1)+2]); //x-1
        ve1 = calculateNormal(P1,P2,P3); // x- y-
        
      }
      else
      {
        P2 = vec3.fromValues(vertex[3*(yi*i+xi-1)],vertex[3*(yi*i+xi-1)+1],vertex[3*(yi*i+xi-1)+2]); //x-1
        P4 = vec3.fromValues(vertex[3*(yi*i+xi+1)],vertex[3*(yi*i+xi+1)+1],vertex[3*(yi*i+xi+1)+2]); //x+1
        ve2 = vec3.create();
        ve1 = calculateNormal(P1,P2,P3); // x- y-
        ve2 = calculateNormal(P1,P3,P4); // y- x+
        vec3.add(ve1,ve1,ve2);
        
      }
    }
    else
    {
      
      P2 = vec3.fromValues(vertex[3*(yi*i+xi-1)],vertex[3*(yi*i+xi-1)+1],vertex[3*(yi*i+xi-1)+2]); //x-1
      P3 = vec3.fromValues(vertex[3*((yi+1)*i+xi)],vertex[3*((yi+1)*i+xi)+1],vertex[3*((yi+1)*i+xi)+2]); //y+1
      P4 = vec3.fromValues(vertex[3*(yi*i+xi+1)],vertex[3*(yi*i+xi+1)+1],vertex[3*(yi*i+xi+1)+2]); //x+1
      P5 = vec3.fromValues(vertex[3*((yi-1)*i+xi)],vertex[3*((yi-1)*i+xi)+1],vertex[3*((yi-1)*i+xi)+2]); //y-1

      ve1 = calculateNormal(P1,P3,P2); // y+1 x-1 
      ve2 = calculateNormal(P1,P4,P3); // x+1 y+1 
      ve3 = calculateNormal(P1,P2,P5); // x-1 y-1
      ve4 = calculateNormal(P1,P5,P4); // y-1 x+1
      vec3.add(ve1,ve1,ve2);
      vec3.add(ve1,ve1,ve3);
      vec3.add(ve1,ve2,ve4);
      
    }
    vec3.normalize(ve1,ve1);

    
    return ve1;

}

