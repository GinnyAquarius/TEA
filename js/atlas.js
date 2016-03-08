/* -------------------------------------------- */
"use strict";

const chrsSum = 3088269832;
const chrs = {
	'chr1': 248956422,  'chr2':  242193529, 'chr3': 198295559, 
	'chr4': 190214555,  'chr5':  181538259, 'chr6': 170805979, 
	'chr7': 159345973,  'chr8':  145138636, 'chr9': 138394717, 
	'chr10': 133797422, 'chr11': 135086622, 'chr12': 133275309, 
	'chr13': 114364328, 'chr14': 107043718, 'chr15': 101991189, 
	'chr16': 90338345,  'chr17': 83257441,  'chr18': 80373285, 
	'chr19': 58617616,  'chr20': 64444167,  'chr21': 46709983, 
	'chr22': 50818468,  'chrX':  156040895, 'chrY': 57227415
};

// Experiment ID 
// (if specified, need to load samples of this experiment)
var expID = '';
// Experiment Samples Data
var expData = {};
// Page elements
var doc = $('#content')[0];
var nav = $('#navbar')[0];
// Cache for imagedata
var cache = {'hm' : {}};
// Samples filter: checkboxes
var visibleType = {'1': true, '2': true, '3': true};
var visibleMode = 0;

/* -------------------------------------------- */
/* ??? */
const density_len = {
	'chr1': 249,	'chr2': 243,	'chr3': 199,
	'chr4': 191,	'chr5': 182, 	'chr6': 171,
	'chr7': 160,	'chr8': 146,	'chr9': 139,
	'chr10': 134,	'chr11': 136,	'chr12': 134,
	'chr13': 115,	'chr14': 108,	'chr15': 102,
	'chr16': 91,	'chr17': 84,	'chr18': 81,
	'chr19': 59,	'chr20': 65,	'chr21': 47,
	'chr22': 51,	'chrX': 157,	'chrY': 58
};
const TE_type = ["Alu", "Line", "Others"];
var file_list = [], id_list = {};
var n_file = 0;
var density_map = {}, d_max = 0;
var tree = [];
var color = ["green", "red", "blue"];


/* -------------------------------------------- */
/* Functions */

// Routing based on location.hash
function Route(loc){
	if (loc) location.hash = loc + (expID ? ('/' + expID) : '');
	// Show one chromosome
	var chr = location.hash.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
	if (chr) {
		if (chr[4]) Download(chr[4]);
		return ShowChromosome(chr[1], parseInt(chr[2]), parseInt(chr[3]));
	}
	// Show chromosome list
	var home = location.hash.match(/^\#?([a-z]+)?\/?([0-9a-z]+)?\/?$/);

	if (home[2]) Download(home[2]);
	if (home[1] == 'list') return ShowAsList();
	return ShowAsLine();
}

// The template. Obtaining a template name and pasting data
function Template(name, data){
	var html = $('#' + name + '-template').html();
	for (var e in data){
		var find = new RegExp("{" + e + "}", "g");
		html = html.replace(find, data[e] == undefined ? '' : data[e]);
	}
	return html;
}

// Sort of retrotransposons in the order on the chromosome
function SamplesLoaded(){
	// Clear cache
	cache = {'hm' : {}};

	// Samples nav
	nav.innerHTML = Template('samples-nav');
	$('.samples-nav-pane .clear').click(function(){ location.href = '' });
	$('.samples-nav-pane .comparision').click(function(){ });
	$('.samples-nav-pane .showtree').click(function(){ draw_tree(); });

	$('.visible.type a').click(function(){
		var k = $(this).data('id');
		$(this)[visibleType[k] ? 'removeClass' : 'addClass']('selected');
		visibleType[k] = !visibleType[k];
		// show/hidden TE element [ONLY WORK IN SHOW AS LINE MODE]
		$("." + TE_type[k-1]).css("visibility", visibleType[k]? "visible" : "hidden");
		cache = {'hm' : {}};
		Route()
	});
	$('.visible.mode a').click(function(){
		$('.visible.mode a').removeClass('selected')
		$(this).addClass('selected');
		visibleMode = $(this).data('map');

		general_map(visibleMode);
	});

	// Disable some function when number of file is lower than needed
	if (n_file < 2)
		$('.samples-nav-pane .comparision').addClass("disabled");
	if (n_file <= 2)
		$('.samples-nav-pane .showtree').addClass("disabled");

	return true;
}

// Getting heatmap pictures for chromosome
function SamplesHM(chr){
	if (!expData[chr]) return ;
	var width = $('.' + chr).width() + 2; // +2 is border
	var height = Object.keys(expData[chr]).length * 10;
	
	if (!(chr in cache.hm)){
		var canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		var ctx = canvas.getContext('2d');
		var cdt = ctx.getImageData(0, 0, width, height);	
		var Pixel = function(x,y,color,a){
			var ind = (y * width + x) * 4;
			cdt.data[ind + 0] = color[0]; // R
			cdt.data[ind + 1] = color[1]; // G
			cdt.data[ind + 2] = color[2]; // B
			cdt.data[ind + 3] = a; // A
		};
		var y = 0;
		var K = width/chrs[chr];
		var colors = [[220,0,0],[0,220,0],[0,0,220]];
		for (var f in expData[chr]) {
			expData[chr][f].map(function(sm){
				if (!visibleType[sm[2]]) return;
				var col = colors[sm[2]-1], 
					xx = Math.floor(K * sm[0]), 
					yy = y + parseInt(sm[2]-1) * 3;
				Pixel(xx, yy+0, col, 255);
				Pixel(xx, yy+1, col, 255);
				Pixel(xx, yy+2, col, 255);
				Pixel(xx+1, yy+0, col, 95);
				Pixel(xx+1, yy+1, col, 95);
				Pixel(xx+1, yy+2, col, 95);
			});
			y += 10;
		}
		ctx.putImageData(cdt, 0, 0);
		cache.hm[chr] = canvas.toDataURL();
	}
	
	$('.' + chr).append(Template('hm', {
		image : cache.hm[chr],
		height : height,
		samples : Object.keys(expData[chr]).map(function(f){
			return '<div class="fn"><span>'+f.split('.').slice(0,-1).join('.')+'</span></div>';
		}).join('')
	}));
}

// Parse samples files. Separators: Col: "\t", Row: "\n"
function Parse(content, filename){
	file_list.push(filename);
	++n_file;

	content.split('\n').map(function(line){
		var c = line.split('\t');
		if (chrs[c[0]]) {
			if (!expData[c[0]]){
				expData[c[0]] = {};
				density_map[c[0]] = {};
			}

			if (!expData[c[0]][filename]){
				 expData[c[0]][filename] = [];
				density_map[c[0]][filename] = [];
				for (var i = 0; i < density_len[c[0]]; i++)
					density_map[c[0]][filename].push([0,0,0,0,0,0]);
			}

			c[1] = parseInt(c[1]);
			c[2] = parseInt(c[2]);
			c[3] = parseInt(c[3]);
			var id = c[0] + '-' + filename + '-' + c[1] + '-' + c[2];
			c.push(id);
			expData[c[0]][filename].push(c.slice(1));

			// Use to draw density map
			var cell = Math.ceil(c[1]/1000000)-1;
			if (cell >= density_len[c[0]]) cell = density_len[c[0]]-1;

			++density_map[c[0]][filename][cell][c[3]-1];

			// Use to trace for turn on/off element and show inf when needed
			id_list[id] = 0;
		}
	});
}

// Get experiment data by ID
function Download(id){
	if (id == expID) return;
	// Demo samples:
	if (id == 'demo') {
//		$('#log').html('Loading experiment data...');
		var demo = ['demo1.csv','demo2.csv','demo3.csv'];
		var loaded = 0;
		demo.map(function(name){
			$.get('/samples/' + name, function(content){
				Parse(content, name);
				loaded++;
//				$('#log').html('Files loaded: ' + loaded + '/' + demo.length);
				if (loaded == demo.length){
					get_max();
					get_common();
					contruct_tree();
					SamplesLoaded();
				}
			});
		});
	}
	expID = id;
}

/* -------------------------------------------- */
/* Pages */

// Muse actions: select a chromosome
function _ShowHelper(){
	var offset = 5000000;
	$('.chr-box').each(function(){
		var e = $(this)[0], name = $(this).data('name');
		var K = chrs[name]/$(this).width();
		$(this).mousemove(function(h){
			e.children[0].style.left = h.offsetX + 'px';
			var pt = parseInt(h.offsetX * K);
			var start = pt - offset < 0 ? 0 : pt - offset;
			var stop  = pt + offset > chrs[name] ? chrs[name] : pt + offset;
			e.children[0].innerHTML = name + ':' + start + '-' + stop;
		}).click(function(){
			var loc = $(this).children('.helper').html();
			Route(loc);
		});
	});
}
	
// Showing chromosomes in two vertical list [Igor]
function ShowAsList(){
	$('.chr-view-mode a').removeClass('disabled');
	$('.chr-view-mode .aslist').addClass('disabled');
	// Html template:
	doc.innerHTML = Template('chr-list');
	Object.keys(chrs).map(function(name, i){
		var chr = { name: name, style : '', width: chrs[name] * 100 / chrs.chr1, i: i };
		$('.side-' + i%2).append(Template('chr', chr))
	});
	_ShowHelper();
	// Heatmap of samples
	Object.keys(expData).map(SamplesHM);
}

// Showing chromosomes as one line [Thao]
function ShowAsLine(){
	$('.chr-view-mode a').removeClass('disabled');
	$('.chr-view-mode .asline').addClass('disabled');
	// Html template:
	doc.innerHTML = Template('chr-line');
	Object.keys(chrs).map(function(name, i){
		var chr = { name: name, style : 'width:' + chrs[name] * 100 / chrsSum + '%', width: 100, i: i };
		$('.chr-line').append(Template('chr', chr))
	});
	_ShowHelper();

	// This requires optimization.
	// By varying the width of the screen and re-write on a clean HPD //
	d3.select("#map").append("svg").attr("id", "g_map").attr("width", 1150);
	general_map(0);
}

// Selected region on chromosome
function ShowChromosome(name, start, end){
	var xhr;
	$('.chr-view-mode a').removeClass('disabled');
	// Impossible states:
	if (!chrs[name] || end < start + 50) return Route('#');
	// Html elements:
	var samples = '';
	if (expData[name]) {
		Object.keys(expData[name]).map(function(f, i){
			var samplefile = expData[name][f].map(function(spl, ind){
				if (!visibleType[spl[2]]) return '';
				return Template('zoom-trs', {
					id: i + '-' + ind, 
					f: f,
					ind: ind,
					type: spl[2], 
					left: spl[0] * 100 / chrs[name],
					name: spl[3]
				});
			}).join('');
			samples += '<div class="spl-file">' + samplefile + '</div>';
		});
	}
	doc.innerHTML = Template('chromosome', {
		name: name,
		samples: samples
	});
	$('.spl a').click(function(){
		var info = expData[name][$(this).data('f')][$(this).data('i')];
		$('#modal').html(Template('modal', {
			name : info[3],
			pos  : info[0],
			seq  : info[4].match(/.{1,60}/g).join('\n'),
			chr  : name
		})).modal();
	});

	// Events
	var size = chrs[name];
	var sl = $('#range')[0], 
		zoom = $('#ch-zoom-hm')[0], 
		place = $('#chr-one')[0], 
		box = $('#sel-box')[0];
	var ww = sl.offsetWidth;
	var current = [0,1], ora = [0,1], detail = 0;
	
	var RangeParse = function(start, end){
		// to pixels
		var x1 = ww * start / size; 
		var x2 = ww * end / size;
		ora = start < end ? [start, end] : [end, start];
		var e = x2 > x1 ? [x1, x2] : [x2, x1];
		current = [e[0] < 0 ? 0 : e[0], e[1] > ww ? ww : e[1]];
		current.push(start > end ? end : start)
		current.push(start > end ? start : end)
		return current;
	}
	
	var ResizePre = function(xx){
		var e = RangeParse(xx[0], xx[1]);
		// Level of details:
		var bp = xx[1] - xx[0];
		detail = 0;
		zoom.classList.remove('det-1');
		zoom.classList.remove('det-2');
		zoom.classList.remove('det-3');
		if (bp < 90000000) detail++, zoom.classList.add('det-' + detail); // L
		if (bp <  8000000) detail++, zoom.classList.add('det-' + detail); // M
		if (bp <  3500000) detail++, zoom.classList.add('det-' + detail); // S
		if (bp <   100000) detail++, zoom.classList.add('det-' + detail); // XS

		// Detail-line
		zoom.style.width = ww * 100 / (e[1] - e[0]) + '%';
		zoom.style.marginLeft = - e[0] * 100 / (e[1] - e[0]) + '%';
		// Select-range-box
		box.style.left = e[0] + 'px';
		box.style.width = e[1] - e[0] + 'px';
	};

	var Resized = function(xx){
		console.log('Resized..');
		console.log(xx);
		if (xx[0] > xx[1]) xx = [xx[1], xx[0]];
		var e = RangeParse(xx[0], xx[1]);
		if (xhr) xhr.abort(), xhr = false;
		ResizePre(xx);
		// black blur "blinds"
		$('#cs-lh-F')[0].style.width = (e[0] * 100 / ww) + '%';
		$('#cs-rh-F')[0].style.left  = (e[1] * 100 / ww) + '%';
		// Hash
		var bp1 = parseInt(e[2]);
		var bp2 = parseInt(e[3]);
		location.hash = '#' + name + ':' + bp1 + '-' + bp2;
		$('#position')[0].innerHTML = ':' + bp1 + '-' + bp2;

		// Samples
		var KPX = ww * ww / (e[1] - e[0]) / size;
		var Place = function(lines, point){
			for (var i in lines) if (point > lines[i]) return i;
			return false;
		};

		if (expData[name]){
			Object.keys(expData[name]).map(function(f, i){
				var lines = [0], tr, ins, val;
				for (var ind = 0; ind < expData[name][f].length; ind++) {
					var te = $('#trs-' + i + '-' + ind);
					if (te.length == 0) continue;
					tr  = expData[name][f][ind];
					val = tr[0] * KPX + 5;
					ins = Place(lines, tr[0] * KPX);
					if (detail > 0) val += tr[3].length * 6.61 + 20;
					val = parseInt(val);
					if (ins !== false) {
						lines[ins] = val;
					} else {
						ins = lines.length;
						lines.push(val);
					}
					te[0].style.top = ins * 12 + 3 + 'px';
					if (tr[0] < size * e[0]/ww || tr[0] > size * e[1]/ww) continue;
					if (tr[0] < xx[0] || tr[0] > xx[1]) continue;
					te[0].parentNode.style.height = lines.length * 12 + 6 + 'px';
				}
			});
		}

		if (detail == 0) return $('#genes')[0].innerHTML = '';
		var mode = ['-','L','M','S','XS'][detail];
		var range = bp2 - bp1;
		var from = bp1 - range;
		var req = [mode, name, from > 0 ? from : 0, bp2 + range].join('/');
		var genes = $('#genes')[0];

		xhr = $.post('http://dev.mazepa.us/tea/app/' + req, {}, function(csv){
			genes.style.height = '23px';
			var data = csv.split('\n').map(function(row){
				var r = row.split('\t');
				r[0] = parseInt(r[0], 32);
				if (r[1]) r[1] = parseInt(r[1], 32);
				return r;
			});
			// L - inits
			if (detail == 1) {
				genes.innerHTML = data.map(function(t){
					return Template('zoom-L', { left : t[0] * 100 / size });
				}).join('');
				return ;
			}
			// M - intrvals
			var lines = [0], ins, val;
			if (detail == 2) {
				genes.innerHTML = data.map(function(t){
					var w = t[1] * KPX;
					ins = Place(lines, t[0] * KPX);
					val = parseInt(t[0] * KPX + t[1] * KPX + 1);
					if (ins !== false) {
						lines[ins] = val;
					} else {
						ins = lines.length;
						lines.push(val);
					}
					if (bp2 > t[0] && t[0] > bp1) genes.style.height = lines.length * 8 + 6 + 'px';
					return Template('zoom-M', {
						left  : t[0] * 100 / size,
						width : w > 1 ? w : 1,
						top   : ins * 8 + 3
					});
				}).join('');
			}
			// S - intrvals + names
			if (detail == 3) {
				$('#genes')[0].innerHTML = data.map(function(t){
					var w = t[1] * KPX;
					var title = t[2];
					if (t[3]) title += ', ' + t[3];
					ins = Place(lines, t[0] * KPX);
					val = parseInt(t[0] * KPX + t[1] * KPX + (t[2] + t[3]).length * 6.5 + 25);
					if (ins !== false) {
						lines[ins] = val;
					} else {
						ins = lines.length;
						lines.push(val);
					}
					if (bp2 > t[0] && t[0] > bp1) genes.style.height = lines.length * 13 + 6 + 'px';
					return Template('zoom-S', {
						left  : t[0] * 100 / size,
						width : w > 1 ? w : 1,
						top   : ins * 13 + 3,
						title : title
					});
				}).join('');
			}
			// XS - intrvals + names + exons
			if (detail == 4) {

			}
		});
	};

	// Document
	var px,ox,dx, tx,vx,ix;
	// Select range (chromosome)
	sl.onmousedown = function(e){
		ox = e.offsetX;
		px = e.pageX;
	};
	zoom.onmousedown = function(e){
		tx = e.pageX;
		ix = current;
	};
	document.onmousemove = function(e){
		// Select range ?
		if (!isNaN(ox)) {
			if (isNaN(dx)) box.style.display = 'block';
			dx = e.pageX - px;
			// px1 * size / ww = start;
			// px2 * size / ww = end;
			ResizePre([(ox) * size / ww, (ox + dx) * size / ww]);
		}
		// Move range ?
		if (!isNaN(tx)) {
			if (isNaN(vx)) box.style.display = 'block';
			vx = - (e.pageX - tx) * (ix[1] - ix[0]) / ww;;
			// px1 * size / ww = start;
			// px2 * size / ww = end;
			ResizePre([(ix[0] + vx) * size / ww, (ix[1] + vx) * size / ww]);
		}
	};
	document.onmouseup = function(e){
		if (!isNaN(dx)) {
			Resized([(ox) * size / ww, (ox + dx) * size / ww]);
		}
		if (!isNaN(vx)) {
			Resized([(ix[0] + vx) * size / ww, (ix[1] + vx) * size / ww]);
		}
		box.style.display = 'none';
		ox = NaN, px = NaN, dx = NaN, tx = NaN, vx = NaN;
	};
	document.onresize = function(){
		ww = sl.offsetWidth;
	};
	
	// Buttons:
	$('.move-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var p = inc * (ora[1] - ora[0]);
		var x1 = ora[0] + p, x2 = ora[1] + p;
		if (x1 <  0) { x1 = 0; x2 = ora[1] - ora[0]; }
		if (x2 > size) { x2 = size; x1 = size - ora[1] + ora[0]; }
		Resized([x1, x2]);
	});
	$('.zoom-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var cen = (ora[1] + ora[0])/2;
		var upg = inc * (ora[1] - ora[0]) / 2;
		if (upg < 100) upg = 100;
		var x1 = cen - upg, x2 = cen + upg;
		if (x1 < 0) x1 = 0;
		if (x2 > size) x2 = size;
		Resized([x1, x2]);
	});
	
	// [px1, px2] = [ww * start / size, ww * end / size]
	// px1 * size / ww = start;
	// px2 * size / ww = end;
	Resized([start, end]);
}

function Modal(content){
	$('#modal').html( Template('modal') ).modal();
}

$(function(){
	Route(); 
	$('#demo-samples').click(function(){ Route('#line/demo'); });
	$('.chr-view-mode .aslist').click(function(){ Route('#list'); });
	$('.chr-view-mode .asline').click(function(){ Route('#line'); });

	$('#load').bootstrapFileInput();
	$('#load').change(function(e){
		var fs = e.target.files;
		var ftotal = fs.length, itr = fs.length;
		for (var i = 0; i < fs.length; i++) { (function(f){
			var reader = new FileReader();
			reader.onload = function() {
				itr--;
				Parse(this.result, f.name);

				if (itr == 0) {
					get_max();
					if (n_file > 1)
						get_common();
					if (n_file > 2)
						contruct_tree();
					SamplesLoaded();
					// Route(); - rerendering of current page
					// Route('#line'); - rendering #line page
					Route(); 
				}
			};
			reader.readAsText(f);
		})(fs[i]); }
	});
});
