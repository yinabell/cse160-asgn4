class Sphere{

    constructor(){

        this.type = 'sphere'; 

        //this.position = [0.0, 0.0, 0.0]; 

        // sphere color HERE 
        this.color = [1,1,1,1];

        //this.sCount = g_selectedSegments;
        //this.size = 5; 

        this.matrix = new Matrix4();

        //specify texture
        this.textureNum = -2;
    }

    render() {   

        var rgba = this.color; 

        // texture 
        gl.uniform1i(u_whichTexture, this.textureNum); 

        // pass color to var 
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var d = Math.PI/10;
        var dd = Math.PI/10;
        
        for(var t = 0; t < Math.PI; t += d){

            for(var r = 0; r < (2 * Math.PI); r += d){

                var p1 = [sin(t)*cos(r), sin(t)*sin(r), cos(t)];
                var p2 = [sin(t+dd)*cos(r), sin(t+dd)*sin(r), cos(t+dd)];
                var p3 = [sin(t)*cos(r+dd), sin(t)*sin(r+dd), cos(t)];
                var p4 = [sin(t+dd)*cos(r+dd), sin(t+dd)*sin(r+dd), cos(t+dd)];
    
                var uv1 = [t/Math.PI,      r/(2*Math.PI)];
                var uv2 = [(t+dd)/Math.PI, r/(2*Math.PI)];
                var uv3 = [t/Math.PI,      (r+dd)/(2*Math.PI)];
                var uv4 = [(t+dd)/Math.PI, (r+dd)/(2*Math.PI)];
    
    
                var v = [];
                var uv = [];
                v=v.concat(p1); uv=uv.concat(uv1);
                v=v.concat(p2); uv=uv.concat(uv2);
                v=v.concat(p4); uv=uv.concat(uv4);
    
                gl.uniform4f(u_FragColor, 0.8,1,1,1);
                drawTriangle3DUVNormal(v,uv,v);
    
                v=[]; uv=[];
                v=v.concat(p1); uv=uv.concat(uv1);
                v=v.concat(p4); uv=uv.concat(uv4);
                v=v.concat(p3); uv=uv.concat(uv3);

                gl.uniform4f(u_FragColor, 0.8,1,1,1);
                drawTriangle3DUVNormal(v,uv,v);
             }



        }
       
       
    }

}

function cos(x){
    return Math.cos(x);
 }
 
 function sin(x){
    return Math.sin(x);
 }
