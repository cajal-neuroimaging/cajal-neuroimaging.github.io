"""Generates _includes/signal.html: five brain-rhythm traces in the site palette."""
import math, random
random.seed(7)
W, H, X0 = 1200, 230, 120
bands = [("δ","delta",1.6,"#00C2CB",15),("θ","theta",5.5,"#7FE0D4",12),("α","alpha",10,"#FFE38A",13),("β","beta",20,"#FF9A76",8),("γ","gamma",40,"#FF5D8F",5)]
rows = [28 + i*43.5 for i in range(5)]
out = ['<figure class="signal" aria-label="Five brain rhythms, from slow delta to fast gamma oscillations">',
       f'<svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" role="img"><title>Delta, theta, alpha, beta and gamma brain rhythms</title>']
for (g,name,f,col,amp),y in zip(bands,rows):
    n = 600; pts=[]
    ph = [random.random()*6.28 for _ in range(3)]
    for k in range(n+1):
        t = k/n*3.0  # 3 seconds
        env = 0.65+0.35*math.sin(2*math.pi*0.35*t+ph[0]) if name!="alpha" else 0.35+0.65*max(0,math.sin(2*math.pi*0.45*t+ph[0]))**1.5
        v = env*math.sin(2*math.pi*f*t+ph[1]) + 0.18*math.sin(2*math.pi*f*1.7*t+ph[2]) + random.gauss(0,0.06)
        x = X0 + (W-X0-10)*k/n
        pts.append(f"{x:.1f},{y - amp*v:.1f}")
    out.append(f'<path d="M{" L".join(pts)}" stroke="{col}" pathLength="1000" style="--len:1000"/>')
out.append('</svg><ul class="signal__labels" aria-hidden="true">')
for (g,name,*_),y in zip(bands,rows):
    out.append(f'<li style="top:{y/H*100:.1f}%"><b>{g}</b> {name}</li>')
out.append('</ul></figure>')
open('_includes/signal.html','w').write("\n".join(out)+"\n")
