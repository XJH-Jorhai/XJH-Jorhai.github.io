/** Arm at full extension; strike once when the original curve retracts to zero. */
export class PistonImpact {
  position=0;
  force=100;
  strikes=0;
  private armed=false;
  sample(position:number) {
    this.position=Math.min(1,Math.max(0,position));
    this.force=(1-this.position)*100;
    if(this.position>=1-1e-6)this.armed=true;
    if(!this.armed||this.position>1e-6)return false;
    this.armed=false;
    this.strikes++;
    return true;
  }
}
