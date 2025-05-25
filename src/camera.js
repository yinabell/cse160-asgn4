class Camera{

    // constructor
    constructor(){

        this.eye = new Vector3([0,0,4]);
        this.at  = new Vector3([0,0,-100]);
        this.up  = new Vector3([0,1,0]);
        this.viewMat = new Matrix4();
        this.viewMat.setLookAt(
            this.eye.elements[0], this.eye.elements[1],  this.eye.elements[2],
            this.at.elements[0],  this.at.elements[1],   this.at.elements[2],
            this.up.elements[0],  this.up.elements[1],   this.up.elements[2]
        ); 
        this.projMat = new Matrix4();
        this.projMat.setPerspective(g_fov, canvas.width/canvas.height, 0.1, 1000);
        
        this.flyMode = false;
        this.flySpeed = 0.25; 
    
    } 

    setFOV(){
        this.projMat.setPerspective(g_fov, canvas.width/canvas.height, 0.1, 1000);
    } 


    // togglable fly 
    toggleFlyMode() {
        this.flyMode = !this.flyMode;
        return this.flyMode;
    }

    // togglable mouse movement 
    toggleMouseControl() {
        return !g_mouseControlEnabled;
    }

    // fly up 
    flyUp() {
        if (!this.flyMode) return;
        
        // update eye and movement 
        this.eye.elements[1] += this.flySpeed;
        this.at.elements[1] += this.flySpeed;
        
        this.updateViewMatrix();
    }
    
    // fly down 
    flyDown() {
        if (!this.flyMode) return;
        
        // update eye and movement 
        this.eye.elements[1] -= this.flySpeed;
        this.at.elements[1] -= this.flySpeed;
        
        this.updateViewMatrix();
    }
    
    // update view matrix HERE 
    updateViewMatrix() {
        this.viewMat.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.at.elements[0], this.at.elements[1], this.at.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }

     // w 
     moveForward(){
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        f = f.normalize();
        
        // move in direction looking if in fly 
        if (this.flyMode) { 
            this.at = this.at.add(f.mul(0.5));
            this.eye = this.eye.add(f.mul(0.5));
        } else {
            // else move in direction when on ground 
            var temp = new Vector3([f.elements[0], 0, f.elements[2]]);
            temp = temp.normalize();
            this.at = this.at.add(temp.mul(0.5));
            this.eye = this.eye.add(temp.mul(0.5));
        }
        
        this.updateViewMatrix();
    } 

    // a 
    moveLeft(){
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        var s = new Vector3([0,0,0]);
        s.set(f);
        s = Vector3.cross(this.up, f);
        s = s.normalize();
        this.at = this.at.add(s.mul(0.25));
        this.eye = this.eye.add(s.mul(0.25));
        this.updateViewMatrix();
    }
     
    // s 
    moveBack(){
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);
        f = f.normalize();
        
        // move backwards when in fly 
        if (this.flyMode) {
            this.at = this.at.sub(f.mul(0.5));
            this.eye = this.eye.sub(f.mul(0.5));
        } else {
            // move backwards when on ground 
            var temp = new Vector3([f.elements[0], 0, f.elements[2]]);
            temp = temp.normalize();
            this.at = this.at.sub(temp.mul(0.5));
            this.eye = this.eye.sub(temp.mul(0.5));
        }
        
        this.updateViewMatrix();
    }
     
    // d 
    moveRight(){
        var f = new Vector3([0,0,0]);
        f.set(this.eye);
        f.sub(this.at);
        var s = new Vector3([0,0,0]); 

        s.set(f);
        s = Vector3.cross(this.up, f);
        s = s.normalize();

        this.at = this.at.add(s.mul(0.25));
        this.eye = this.eye.add(s.mul(0.25));

        this.updateViewMatrix();
    }

    panLeft(){
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        var rotationMatrix = new Matrix4();

        rotationMatrix.setRotate(10, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        var f_prime = new Vector3([0,0,0]);
        f_prime = rotationMatrix.multiplyVector3(f);
        var tempEye = new Vector3([0,0,0]);
        tempEye.set(this.eye);

        this.at = tempEye.add(f_prime);

        this.updateViewMatrix();
    }
  
    panRight(){
        var f = new Vector3([0,0,0]);
        f.set(this.at);
        f.sub(this.eye);

        var rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(-10, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        var f_prime = new Vector3([0,0,0]);
        f_prime = rotationMatrix.multiplyVector3(f);

        var tempEye = new Vector3([0,0,0]);
        tempEye.set(this.eye);

        this.at = tempEye.add(f_prime);

        this.updateViewMatrix();
    } 

    // looking around 
    handleMouseMovement(deltaX, deltaY) {

        // scale by sensi 
        const scaledDeltaX = deltaX * g_mouseSensitivity;
        const scaledDeltaY = deltaY * g_mouseSensitivity;
        
        // rotate around world up 
        if (scaledDeltaX !== 0) {

            // create new matrix to rotate around 
            var rotationMatrix = new Matrix4();
            rotationMatrix.setRotate(-scaledDeltaX, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
            
            // eye to at 
            var forward = new Vector3([0,0,0]);
            forward.set(this.at);
            forward.sub(this.eye);
            
            // apply rotation 
            var rotatedForward = rotationMatrix.multiplyVector3(forward);
            
            // update 
            this.at.elements[0] = this.eye.elements[0] + rotatedForward.elements[0];
            this.at.elements[1] = this.eye.elements[1] + rotatedForward.elements[1];
            this.at.elements[2] = this.eye.elements[2] + rotatedForward.elements[2];
        }
        

        if (scaledDeltaY !== 0) {
            
            // eye to at 
            var forward = new Vector3([0,0,0]);
            forward.set(this.at);
            forward.sub(this.eye);
            
            var right = Vector3.cross(forward, this.up);
            right = right.normalize();
            
            // new rotation matrix 
            var rotationMatrix = new Matrix4();
            rotationMatrix.setRotate(-scaledDeltaY, right.elements[0], right.elements[1], right.elements[2]);
            
            // forward vector rotated 
            var rotatedForward = rotationMatrix.multiplyVector3(forward);
            
            // cal pitch angles to enforce 
            var pitchVector = new Vector3([
                rotatedForward.elements[0],
                rotatedForward.elements[1],
                rotatedForward.elements[2]
            ]);
            
            // rotated vector calculation 
            var xzProjection = Math.sqrt(
                pitchVector.elements[0] * pitchVector.elements[0] + 
                pitchVector.elements[2] * pitchVector.elements[2]
            );
            var pitchAngle = Math.atan2(pitchVector.elements[1], xzProjection) * 180 / Math.PI;
            
            // stop camera from pitching 
            if (pitchAngle > -89 && pitchAngle < 89) {

                // update if within points 
                this.at.elements[0] = this.eye.elements[0] + rotatedForward.elements[0];
                this.at.elements[1] = this.eye.elements[1] + rotatedForward.elements[1];
                this.at.elements[2] = this.eye.elements[2] + rotatedForward.elements[2];
            }
        }
        
        // update 
        this.updateViewMatrix();
    }

}