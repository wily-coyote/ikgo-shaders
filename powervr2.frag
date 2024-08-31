// PowerVR2 for IKEMENGO

#if __VERSION__ >= 130
#define COMPAT_VARYING in
#define COMPAT_TEXTURE texture
out vec4 FragColor;
in vec3 vTexCoord;
#else
#define COMPAT_VARYING varying
#define COMPAT_TEXTURE texture2D
#define vTexCoord gl_TexCoord[0]
#define FragColor gl_FragColor
#endif

uniform sampler2D Texture;
uniform vec2 TextureSize;
uniform float CurrentTime;

const float dithertable[16] = float[16](
	16.,4.,13.,1.,
	8.,12.,5.,9.,
	14.,2.,15.,3.,
	6.,10.,7.,11.
);

#define round(c) floor(c + 0.5)
#define INTERLACED 1.0
#define VGASIGNAL 0.0

void main(void) {
	// the original code used a lot of redundant texture sampling, reducing performance drastically
	vec2 uv = vTexCoord.xy;
	vec4 color;
	float fc = floor(mod(CurrentTime*60.0, 2.0));
	// Blend vertically for composite mode
	if(bool(INTERLACED)){// && InputSize.y > 400.0)
		int taps = int(3);
		float tap = 2.0/float(taps);
		vec2 texcoord4  = uv;
		texcoord4.x = texcoord4.x;
		texcoord4.y = texcoord4.y + ((tap*float(taps/2))/480.0);
		int bl;
		vec4 ble = vec4(0.0, 0.0, 0.0, 1.0);
		for (bl=0;bl<taps;bl++)
		{
			texcoord4.y += (tap / 480.0);
			ble.rgb += COMPAT_TEXTURE(Texture, texcoord4).rgb / float(taps);
		}
		color.rgb = ( ble.rgb );
	}
	// Dither. ALWAYS do this for 16bpp
	int ditdex = int(mod(uv.x, 4.0)) * 4 + int(mod(uv.y, 4.0));
	int yeh = 0;
	float ohyes;
	vec4 how;
	for (yeh=ditdex; yeh<(ditdex+16); yeh++){
		ohyes = ((((dithertable[yeh-15]) - 1.0) * 0.1));
	}
	color.rb -= (ohyes / 128.0);
	color.g -= (ohyes / 128.0);
	{
		vec4 reduct = vec4(32.0, 64.0, 32.0, 1.0); // 16 bits per pixel (5-6-5)
		how = color;
		how = pow(how, vec4(1.0, 1.0, 1.0, 1.0));
		how *= reduct;
		how = floor(how);
		how = how / reduct;
		how = pow(how, vec4(1.0, 1.0, 1.0, 1.0));
	}
	color.rb = how.rb;
	color.g = how.g;
	// There's a bit of a precision drop involved in the RGB565ening for VGA
	// I'm not sure why that is. it's exhibited on PVR1 and PVR3 hardware too
	if (bool(INTERLACED)){ // && InputSize.y > 400.)
		if (mod(color.r*32., 2.0)>0.0) color.r -= 0.023;
		if (mod(color.g*64., 2.0)>0.0) color.g -= 0.01;
		if (mod(color.b*32., 2.0)>0.0) color.b -= 0.023;
	}
	// RGB565 clamp
	color.rb = round(color.rb * 32.0)/32.0;
	color.g = round(color.g * 64.0)/64.0;
	// VGA Signal Loss, which probably is very wrong but i tried my best
	if (bool(VGASIGNAL)){
		int taps = 32;
		float tap = 12.0/float(taps);
		vec2 texcoord4  = uv;
		texcoord4.x = texcoord4.x + (2.0/640.0);
		texcoord4.y = texcoord4.y;
		int bl;
		vec4 ble;
		for (bl=0;bl<taps;bl++){
			float e = 1.0;
			if (bl>=3)
			e=0.35;
			texcoord4.x -= (tap / 640.0);
			ble.rgb += (COMPAT_TEXTURE(Texture, texcoord4).rgb * e) / float(taps/(bl+1));
		}
		color.rgb += ble.rgb * 0.015;
		//color.rb += (4.0/255.0);
		color.g += (9.0/255.0);
	}
	FragColor = color;
}
