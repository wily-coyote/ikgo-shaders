// RetroArch NTSC for IKEMENGO - below are settings

#define TWO_PHASE
//#define THREE_PHASE
#define COMPOSITE
//#define SVIDEO

#define DISPLAY_SIZE vec2(640.0, 240.0)
#define NTSC_CRT_GAMMA 2.4
#define NTSC_MONITOR_GAMMA 2.0

// Don't edit anything beyond this point.

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

#define PI 3.14159265
#if defined(TWO_PHASE)
	#define CHROMA_MOD_FREQ (4.0 * PI / 15.0)
#elif defined(THREE_PHASE)
	#define CHROMA_MOD_FREQ (PI / 3.0)
#endif
#if defined(COMPOSITE)
	#define SATURATION 1.0
	#define BRIGHTNESS 1.125
	#define ARTIFACTING 1.0
	#define FRINGING 1.0
#elif defined(SVIDEO)
	#define SATURATION 1.0
	#define BRIGHTNESS 1.125
	#define ARTIFACTING 0.0
	#define FRINGING 0.0
#endif

mat3 mix_mat = mat3(
	BRIGHTNESS, FRINGING, FRINGING,
	ARTIFACTING, 2.0 * SATURATION, 0.0,
	ARTIFACTING, 0.0, 2.0 * SATURATION
);

// begin ntsc-rgbyuv
const mat3 yiq2rgb_mat = mat3(
   1.0, 0.956, 0.6210,
   1.0, -0.2720, -0.6474,
   1.0, -1.1060, 1.7046);

vec3 yiq2rgb(vec3 yiq)
{
   return yiq * yiq2rgb_mat;
}

const mat3 yiq_mat = mat3(
      0.2989, 0.5870, 0.1140,
      0.5959, -0.2744, -0.3216,
      0.2115, -0.5229, 0.3114
);

vec3 rgb2yiq(vec3 col)
{
   return col * yiq_mat;
}
// end ntsc-rgbyuv

#if defined(TWO_PHASE)
// begin ntsc-decode-filter-2phase
#define TAPS 32
const float luma_filter[TAPS + 1] = float[TAPS + 1](
   -0.000174844,
   -0.000205844,
   -0.000149453,
   -0.000051693,
   0.000000000,
   -0.000066171,
   -0.000245058,
   -0.000432928,
   -0.000472644,
   -0.000252236,
   0.000198929,
   0.000687058,
   0.000944112,
   0.000803467,
   0.000363199,
   0.000013422,
   0.000253402,
   0.001339461,
   0.002932972,
   0.003983485,
   0.003026683,
   -0.001102056,
   -0.008373026,
   -0.016897700,
   -0.022914480,
   -0.021642347,
   -0.008863273,
   0.017271957,
   0.054921920,
   0.098342579,
   0.139044281,
   0.168055832,
   0.178571429);

const float chroma_filter[TAPS + 1] = float[TAPS + 1](
   0.001384762,
   0.001678312,
   0.002021715,
   0.002420562,
   0.002880460,
   0.003406879,
   0.004004985,
   0.004679445,
   0.005434218,
   0.006272332,
   0.007195654,
   0.008204665,
   0.009298238,
   0.010473450,
   0.011725413,
   0.013047155,
   0.014429548,
   0.015861306,
   0.017329037,
   0.018817382,
   0.020309220,
   0.021785952,
   0.023227857,
   0.024614500,
   0.025925203,
   0.027139546,
   0.028237893,
   0.029201910,
   0.030015081,
   0.030663170,
   0.031134640,
   0.031420995,
   0.031517031);
// end ntsc-decode-filter-2phase
#elif defined(THREE_PHASE)
// begin ntsc-decode-filter-3phase
#define TAPS 24
const float luma_filter[TAPS + 1] = float[TAPS + 1](
   -0.000012020,
   -0.000022146,
   -0.000013155,
   -0.000012020,
   -0.000049979,
   -0.000113940,
   -0.000122150,
   -0.000005612,
   0.000170516,
   0.000237199,
   0.000169640,
   0.000285688,
   0.000984574,
   0.002018683,
   0.002002275,
   -0.000909882,
   -0.007049081,
   -0.013222860,
   -0.012606931,
   0.002460860,
   0.035868225,
   0.084016453,
   0.135563500,
   0.175261268,
   0.190176552);

const float chroma_filter[TAPS + 1] = float[TAPS + 1](
   -0.000118847,
   -0.000271306,
   -0.000502642,
   -0.000930833,
   -0.001451013,
   -0.002064744,
   -0.002700432,
   -0.003241276,
   -0.003524948,
   -0.003350284,
   -0.002491729,
   -0.000721149,
   0.002164659,
   0.006313635,
   0.011789103,
   0.018545660,
   0.026414396,
   0.035100710,
   0.044196567,
   0.053207202,
   0.061590275,
   0.068803602,
   0.074356193,
   0.077856564,
   0.079052396);
// end ntsc-decode-filter-3phase
#endif

// begin powervr2

const float dithertable[16] = float[16](
	16.,4.,13.,1.,   
	8.,12.,5.,9.,
	14.,2.,15.,3.,
	6.,10.,7.,11.		
);

#define	INTERLACED 1.0
#define	VGASIGNAL 0.0
#define round(c) floor(c + 0.5)

vec4 powervr2(vec2 uv){
	// the original code used a lot of redundant texture sampling, reducing performance drastically
	vec4 color;
	float fc = floor(mod(CurrentTime*60.0, 2.0));
	// Blend vertically for composite mode
	if(bool(INTERLACED)){// && InputSize.y > 400.0)
		int taps = int(3);
		float tap = 2.0/float(taps);
		vec2 texcoord4  = uv;
		texcoord4.x = texcoord4.x;
		texcoord4.y = texcoord4.y + ((tap*float(taps/2.0)) / 480.0);
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
   	return color;
}

//end powervr2

vec4 fetch_offset(float offset, float one_x){
	// begin ntsc-pass1
	
	float FrameCount = floor(mod(CurrentTime*60.0, 2.0));
   	
	vec2 offset2 = vTexCoord.xy + vec2((offset) * (one_x), 0.0);
	vec3 col = powervr2(offset2).rgb;//COMPAT_TEXTURE(Texture, offset2).rgb;
	vec3 yiq = rgb2yiq(col);
	
	vec2 pix_no = offset2 * DISPLAY_SIZE * vec2(4.0, 1.0);
	#if defined(TWO_PHASE)
		float chroma_phase = PI * (mod(pix_no.y, 2.0) + float(FrameCount));
	#elif defined(THREE_PHASE)
		float chroma_phase = 0.6667 * PI * (mod(pix_no.y, 3.0) + float(FrameCount));
	#endif
	float mod_phase = chroma_phase + pix_no.x * CHROMA_MOD_FREQ;
	
	float i_mod = cos(mod_phase);
	float q_mod = sin(mod_phase);

	yiq.yz *= vec2(i_mod, q_mod); // Modulate.
	yiq *= mix_mat; // Cross-talk.
	yiq.yz *= vec2(i_mod, q_mod); // Demodulate.

	return vec4(yiq, 1.0);

	// end ntsc-pass1
}

void main(void) {
	// begin ntsc-pass2-gamma

	float one_x = 1.0 / (DISPLAY_SIZE.x * 4.0);
	vec3 signal = vec3(0.0);
	for (int i = 0; i < TAPS; i++)
	{
		float offset = float(i);
		vec3 sums = fetch_offset(offset - float(TAPS), one_x).xyz +
			fetch_offset(float(TAPS) - offset, one_x).xyz;
		signal += sums * vec3(luma_filter[i], chroma_filter[i], chroma_filter[i]);
	}
	signal += fetch_offset(0.0, 0.0).xyz *
		vec3(luma_filter[TAPS], chroma_filter[TAPS], chroma_filter[TAPS]);
	vec3 rgb = yiq2rgb(signal);
	FragColor = vec4(pow(rgb, vec3(NTSC_CRT_GAMMA / NTSC_MONITOR_GAMMA)), 1.0);
	
	// end ntsc-pass2-gamma
}
