/* -------------------------------------------- */
"use strict";

const chrs = {
	'chr1':  248956422, 'chr2':  242193529, 'chr3':  198295559, 
	'chr4':  198295559, 'chr5':  181538259, 'chr6':  170805979, 
	'chr7':  159345973, 'chr8':  145138636, 'chr9':  138394717, 
	'chr10': 133797422, 'chr11': 133797422, 'chr12': 133275309, 
	'chr13': 114364328, 'chr14': 107043718, 'chr15': 101991189, 
	'chr16': 90338345,  'chr17': 83257441,  'chr18': 80373285, 
	'chr19': 58617616,  'chr20': 64444167,  'chr21': 46709983, 
	'chr22': 50818468,  'chrX':  156040895, 'chrY':  57227415
};

// Experiment ID 
// (if specified, need to load samples of this experiment)
var expID = '';
// Experiment Samples Data
var expData = {}, Group = {};
var expName = [];
var server_list = {};
// Page container
var doc = $('#content')[0];

// Cache for imagedata
var cache = {'hm' : {}};
// Samples filter: checkboxes
var visibleType = 0;
var visibleMode = 0;
var mode = 0;
var chip_seq_range = {};
/* -------------------------------------------- */

const density_len = {
	'chr1': 125,	'chr2': 122,	'chr3': 100,
	'chr4': 96,	'chr5': 91, 	'chr6': 86,
	'chr7': 80,	'chr8': 73,	'chr9': 70,
	'chr10': 67,	'chr11': 68,	'chr12': 67,
	'chr13': 58,	'chr14': 54,	'chr15': 51,
	'chr16': 46,	'chr17': 42,	'chr18': 41,
	'chr19': 30,	'chr20': 33,	'chr21': 24,
	'chr22': 26,	'chrX': 79,	'chrY': 29
};

var file_list = [], id_list = {}, group_list = [], n_group = 0;
var n_file = 0;
var density_map = {}, d_max = 0, g_density = {}, g_max;
var tree = [];
var color = ["grey", "green", "red", "blue"];
var H3K27Ac = [
		{name: 'GM12878', col : 'rgb(255, 128, 128)'},
		{name: 'H1-hESC', col : 'rgb(255, 212, 128)'},
		{name: 'HSMM',    col : 'rgb(120, 235, 204)'},
		{name: 'HUVEC',   col : 'rgb(128, 212, 255)'},
		{name: 'K562',    col : 'rgb(128, 128, 255)'},
		{name: 'NHEK',    col : 'rgb(212, 128, 255)'},
		{name: 'NHLF',    col : 'rgb(255, 128, 212)'}
	];
var H3K27Ac_2 = {'GM12878': 'rgb(255, 128, 128)',
				'H1-hESC': 'rgb(255, 212, 128)',
				'HSMM': 'rgb(120, 235, 204)',
				'HUVEC': 'rgb(128, 212, 255)',
				'K562': 'rgb(128, 128, 255)',
				'NHEK': 'rgb(212, 128, 255)',
				'NHLF': 'rgb(255, 128, 212)'};
var ora = [0,1];
/* -------------------------------------------- */
/* Functions */

// The template. Obtaining a template name and pasting data
var Template = (function(classname){
	var templates = {};
	$(classname).each(function(){
		templates[$(this).data('name')] = $(this).html();
	});
	return function(name, data){
		var html = templates[name];
		for (var e in data){
			var find = new RegExp("{" + e + "}", "g");
			html = html.replace(find, data[e] == undefined ? '' : data[e]);
		}
		return html;
	}
}('.template'));

// Routing based on location.hash
function Route(loc){
	if (loc) location.hash = loc + (expID ? ('/' + expID) : '');
	disable_button();

	// Show one chromosome
	var chr = location.hash.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
	if (chr) {
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(chr[1].substr(3)+ ":" + parseInt(chr[2]) + ".." + parseInt(chr[3]), function(err) {});

		return ShowChromosome(chr[1], parseInt(chr[2]), parseInt(chr[3]));
	}
	// Show chromosome list
	return ShowAsLine();
}

function query_score(layer, type){
	if (n_file > 0 && chip_seq_range["id"].length > 0){
		var minVal = 100000, maxVal = -100000, count = 0, total = 0;
		for (var i = 0; i < chip_seq_range["id"].length; i += 10, total++){
			var list = [];
			for (var k = i; k < i + 10 && k < chip_seq_range["id"].length; k++){
				list.push(chip_seq_range["id"][k]);
				chip_seq_range["score"].push(0);
			}

			$.ajax({
				method: "post",
				dataType: "jsonp",
				url: " http://bioalgorithm.xyz/teatlas_ajax",
				data: {"inf": "filter", "id_list": list, "pos": i, "layer": layer, "type": type},
				success: function(filter) {
					var pos = parseInt(filter["pos"]);
					for (var s = 0; s < filter["score"].length; s++)
						chip_seq_range["score"][s + pos] = filter["score"][s];

					for (var i = 0; i < filter["score"].length; i++){
						if (filter["score"][i] < minVal) minVal = filter["score"][i];
						if (filter["score"][i] > maxVal) maxVal = filter["score"][i];
					}

					++count;
					if (count == total){
						$(".filter")
							.css("display", "inline-block")
							.html('Filter by chip-seq score: <input id="chipFil"></input>');

						//ChiP-seq signal value filter
						$("#chipFil")
							.attr({"data-provide": "slider"})
							.css({width: "90%"})
							.slider({
								"tooltip_position": "bottom",
								"min": maxVal - 9*parseInt(maxVal/10),
								"max": maxVal,
								"step": parseInt(maxVal/10),
								"value": maxVal - 9*parseInt(maxVal/10),
								"ticks": "[ " + (maxVal - 9*parseInt(maxVal/10)) + "," + maxVal + "]"
							})
							.on("change", function(){
								filter_score($(this).slider('getValue'));
							});
					}
				}
			})
		}
	}
}

// Sort of retrotransposons in the order on the chromosome
function SamplesLoaded(){
	// Clear cache
	cache = {'hm' : {}};

	// Reset all
	$('.clear').click(function(){
		location.hash = '#general';
		location.reload();
	});

	// View mode
	$('.chr-view-mode .aslist').click(function(){Route("chr1:5000000-10000000");});
	$('.chr-view-mode .asline').click(function(){Route('#general');});

	$("#find").keyup(function(e) {
   		if (e.keyCode == 13) {
			var loc = $(this).val();
			// Show one chromosome
			var chr = loc.match(/^\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
			if (chr) {
				disable_button();
				var start = parseInt(chr[2]);
				var end = parseInt(chr[3]);
				if (end < start + 50) end = start + 50;
				var obj = getBwtWeb('svgHolderT0');
 				obj.search(chr[1].substr(3)+ ":" + start + ".." + end, function(err) {});
				return ShowChromosome(chr[1], start, end);
			} 
		}
	});

	// Comparision window
	$('.comparision .txt').html(n_group == 0 ? 'Group compare' : 'qwe');
	$('.comparision').click(function(){
		if (n_group == 0){
			split_group();
		} else {
			delete_group();
		}
	});

	$('.showtree').click(function(){
		Modal({ class : 'tree-dialog', data : '<div class="tree"></div>', title : 'Phylogenetic tree'})
		draw_tree();
	});

	$('.type').click(function(){
		$('.type').removeClass('glyphicon glyphicon-ok');
		$(this).addClass('glyphicon glyphicon-ok');
		visibleType = $(this).data('map');

		Route();
	});
	$('.mode').click(function(){
		$('.mode').removeClass('glyphicon glyphicon-ok');
		$(this).addClass('glyphicon glyphicon-ok');
		visibleMode = $(this).data('map');

		Route();
	});

	// Samples uploader
	$('#load').bootstrapFileInput();
	$('#load').change(function(e){
		if (n_group > 0)
			delete_group();
		var fs = e.target.files;
		var ftotal = fs.length, itr = fs.length;
		if (ftotal > 0)  $(".status").css("visibility", "visible").html("Loading files...");
		for (var i = 0; i < fs.length; i++) { (function(f){
			var reader = new FileReader();
			reader.onload = function() {
				itr--;
				Parse(this.result, f.name);
				if (itr == 0) {
					get_max();
					if (n_file > 1)
						get_common();

					if (n_file > 2){
						contruct_tree();
						$(".status").html("Contructing tree...");
					}
					Route()
					$(".status").css("visibility", "hidden");
				}
			};
			reader.readAsText(f);
		})(fs[i]); }
	});

	// Open Samples Library
	$('.library-open').click(function(){
		server_list = {};
		Modal({
			'title' : 'Samples Library',
			'data'  : Template('library'),
			'class' : 'library'
		});
		$(".lib_list").css({width: $(window).width()*0.9});
	    $("#lib_list")
			.html('')
			.attr({
				"data-toggle": "table",
				"data-query-params": {
					type: 'owner',
					sort: 'updated',
					direction: 'desc',
					per_page: 10,
					page: 1
				},
				"data-pagination": true,
				"data-search": true,
				"data-show-refresh": true,
				"class": "table table-striped",
				"role": "button"
			})
			.bootstrapTable({
				data: lib_data,
				columns: column
			})
			.on('click-row.bs.table', function (e, row, $element) {
				var id = row["ID"];
				var val = row["ID"] + "_" + row["population"] + "_" + row["sex"] + "_" + row["source"];
				if (id in server_list) {
					delete server_list[id];
					$($element).removeClass('success');
				} else {
					server_list[id] = val;
					$($element).addClass('success');
				}
				var text = '';
				var n = 0;
				$.each(server_list, function(key){
					++n;
					if (n < 7) text += key + ", ";
				});
				if (n > 6) text += "... and " + (n - 6) + "others";
				$(".server_list").html(text);
			});

		// Loading
		$('.get-samples').click(function(){
			$(".status").css("visibility", "visible").html("Loading files...");
			$(this).addClass('disabled').html('Loading...');
			get_server_file();
			$('#modal').modal('hide');
		});
	});

	$('.chr-btn a').click(function(){
		var chr = location.hash.match(/^;\#?(chr[0-9XY]+)\:([0-9]+)\-([0-9]+)\/?([0-9a-z]+)?$/);
		var name = $(this).data('map');
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + parseInt(chr[2]) + ".." + parseInt(chr[3]), function(err) {});

		return ShowChromosome(name, parseInt(chr[2]), parseInt(chr[3]));
	});

	$('.cell_type a').click(function(){
		var name = $(this).data('map');
		$('.cellTypeLabel').html(name + '<span class="caret"></span>');
		var layer = $('.chipseqLabel').text().replace(/\s/g, '');
		var type = $(this).data('e');
		query_score(layer, type);
	});

	// Buttons:
	$('.move-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var name = $(".list_name").text().toLowerCase();
		var p = inc * (ora[1] - ora[0]);
		var x1 = ora[0] + p, x2 = ora[1] + p;
		if (x1 <  0) { x1 = 0; x2 = ora[1] - ora[0]; }
		if (x2 > chrs[name]) { x2 = chrs[name]; x1 = chrs[name] - ora[1] + ora[0]; }
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + x1 + ".." + x2, function(err) {});

		ShowChromosome(name, x1, x2);
	});

	$('.zoom-c a.cnt').click(function(){
		var inc = parseFloat($(this).data('e'));
		var name = $(".list_name").text().toLowerCase();
		var cen = (ora[1] + ora[0])/2;
		var upg = inc * (ora[1] - ora[0]) / 2;
		if (upg < 25) upg = 25;
		var x1 = cen - upg, x2 = cen + upg;
		if (x1 < 0) x1 = 0;
		if (x2 > chrs[name]) x2 = chrs[name];
		var obj = getBwtWeb('svgHolderT0');
 		obj.search(name.substr(3)+ ":" + x1 + ".." + x2, function(err) {});

		ShowChromosome(name, x1, x2);
	});
}

function filter_score(score){	
	for (var i = 0; i < chip_seq_range["id"].length; i++){
		if (chip_seq_range["score"][i] >= score)
			$("." + chip_seq_range["id"][i]).css("visibility", "visible");
		else
			$("." +  chip_seq_range["id"][i]).css("visibility", "hidden");
	}
}

function disable_button(){
	// Disable some function when number of file is lower than needed
	if (n_file < 2)
		$('.comparision').addClass("disabled");
 	else
		$('.comparision').removeClass("disabled");
	if (n_file <= 2)
		$('.showtree').addClass("disabled");
	else
		$('.showtree').removeClass("disabled");

	if (location.hash == "#general"){
		$(".filter").css("display", "none");
		$('.chr-view-mode a').removeClass('disabled');
		$('.chr-view-mode .asline').addClass('disabled');
		$('.move-c a, .move-c button').addClass("disabled");
		$('.zoom-c a').addClass("disabled");
		$('.cellTypeLabel').addClass("disabled");
		$('.chipseqLabel').addClass("disabled");
		$('.chipseq_layer a, .chipseq_layer button').addClass('disabled');
	} else {
		$('.chr-view-mode a').addClass('disabled');
		$('.chr-view-mode .asline').removeClass('disabled');
		$('.move-c a, .move-c button').removeClass('disabled');
		$('.zoom-c a').removeClass('disabled');
		$('.cellTypeLabel').removeClass("disabled");
		$('.chipseqLabel').removeClass("disabled");
		$('.chipseq_layer a, .chipseq_layer button').removeClass('disabled');
	}
}

// Parse samples files. Separators: Col: "\t", Row: "\n"
function Parse(content, filename){
	var x = filename.indexOf(".csv");
	if (x != -1)
		filename = filename.substr(0, x);
	filename = filename.replace(/\./g, "_");

	for (var i in file_list)
		if (file_list[i] == filename) return;


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

			// Use to trace for turn on/off element and show inf when needed
			var id = c[0] + '-' + filename + '-' + c[1] + '-' + c[2];
			id_list[id] = 0;
			

			if (c[7] == '')
				c[7] = "Unknown";

			c.push(id);
			expData[c[0]][filename].push(c.slice(1));

			// Use to draw density map
			var cell = Math.ceil(c[1]/2000000)-1;
			if (cell >= density_len[c[0]]) cell = density_len[c[0]]-1;

			++density_map[c[0]][filename][cell][c[3]-1];

		}
	});
}

// 
function Modal(data){
	$('#modal').html(Template('modal', data)).modal();
}

/* -------------------------------------------- */
// Mouse actions: select a chromosome
function _ShowHelper(){
	var offset = 5000000;
	$('.chr-box').each(function(){
		var e = $(this)[0], name = $(this).data('name');
		var K = chrs[name]/$(this).width();
		$(this).mousemove(function(h){
			e.children[0].style.left = h.offsetX + 'px';
			e.children[0].style.visibility = 'visible';
			var pt = parseInt(h.offsetX * K);
			var start = pt - offset < 0 ? 0 : pt - offset;
			e.children[0].innerHTML = start;
			$("#ruler_line").css({"left": event.pageX+ "px", "visibility": "visible" });
		}).click(function(){
			var start = parseInt($(this).children('.helper').html());
			Route("#"+name+":"+start+"-"+(start+5000000));
		}).mouseout(function(){
			$("#ruler_line").css({"visibility": "hidden"});
			e.children[0].style.visibility = 'hidden';
		});
	});
}

function _ShowHelper2(){
	$('.chr-box').each(function(){
		var e = $(this)[0], name = $(this).data('name');
		var K = chrs[name]/$(this).width();
		$(this).mousemove(function(h){
			e.children[0].style.left = h.offsetX + 'px';
			e.children[0].style.visibility = 'visible';
			var pt = parseInt(h.offsetX * K);
			var start = pt< 0 ? 0 : pt;
			e.children[0].innerHTML = start;
		}).mouseout(function(){
			e.children[0].style.visibility = 'hidden';
		});
	});
}

// Showing chromosomes as one line [Thao]
function ShowAsLine(){
	$('.chr-line').html('');
	$(".gene_wrap").css({"visibility": "hidden", "height": "0"});
	doc.style.marginTop =  $('.fixed-nav')[0].offsetHeight + 'px';

	Object.keys(chrs).map(function(name, i){
		var style = 'width:' + (density_len[name] * 100 /1558) + '%';
		var title = name.substr(3);
		var chr = { title: title, name: name, style : style, width: 100, i: i };
		$('.chr-line').append(Template('chr', chr))
	});
	_ShowHelper();

	// This requires optimization =]
	$("#content").html('');
	if (n_file > 0)
		general_map();
}

function getMax(array) {
  return Math.max.apply(null, array);
}

function load_detail_content(name, start, end){
	$(".detail_content").css("margin-left", "-1100px");
	$(".pop_up").remove();
	$('.cellTypeLabel').html('All cell type <span class="caret"></span>');
	$(".filter").css("display", "none");

	var layer = $('.chipseqLabel').text().replace(/\s/g, '');	
	var screen = end-start;
	var chip_height = 60;
	start -= screen;
	end += screen;
	chip_seq_range["pos"] = [start, end];
	var sample = d3.select(".samples");
	sample.html('').attr("height", n_file*50 + chip_height);

	var chr = name.substr(3) == 'X'? 23: name.substr(3) == 'Y'? 24 : parseInt(name.substr(3));
	$.ajax({
		method: "get",
		dataType: "jsonp",
		url: " http://bioalgorithm.xyz/teatlas_ajax",
		data: {"inf": "chip_seq", "layer": layer, "start": start, "end": end, "chr": chr},
		success: function(chip_seq) {
			if (chip_seq["pos"][0] != chip_seq_range["pos"][0] || chip_seq["pos"][1] != chip_seq_range["pos"][1]) return
			for (var i = 0; i < chip_seq["point"].length; i++){
				var max_score = getMax(chip_seq["point"][i]);
				var step = 3300/chip_seq["point"][i].length;
				var path = "M0 " + chip_height + " ";
				var x = 0;
				for (var k = 0; k < chip_seq["point"][i].length; k++, x += step){
					var y = chip_height - chip_seq["point"][i][k]*chip_height/max_score;
					if (isNaN(y)) y = 0;
					path += "L" + x + " " + y + " ";
				}
				path += "L" + x + " " + chip_height + " z";
				sample.append("path")
					.attr({
						d: path,
						stroke: "none",
						fill: H3K27Ac[i].col,
						class: H3K27Ac[i].name,
						opacity: 0.5
					});
				sample.append("circle")
					.attr({
						cx: 1100 + 10,
						cy: i*8 + 4,
						r: 3,
						stroke: H3K27Ac[i].col,
						'stroke-width': "2px",
						fill: H3K27Ac[i].col,
						class: H3K27Ac[i].name,
						opacity: 0.5
					});
				sample.append("text")
					.attr({
						x: 1100 + 15,
						y: i*8 + 6,
						"font-size": "6px",
						color: "#000",
						id: H3K27Ac[i].name
					})
					.text(H3K27Ac[i].name)
					.on("click", function(){
						if ($("." + this.id).css("fill") != "none"){
							$(this).css({color: "#c7c7c7"});
								$("." + this.id).css({fill: "none"})
						} else {
							$(this).css({color: "#000"});
							$("." + this.id).css({fill: H3K27Ac_2[this.id]}	)
						}
					})
					.on("mouseover", function(){
						$(this).css("font-weight", "bold")
					})
					.on("mouseout", function(){
							$(this).css("font-weight", "normal")
					})
			}
		}
	});
	
	var extra = 0;
	chip_seq_range["id"] = [];
	chip_seq_range["score"] = [];
	for (var i = 0; i < n_file; i++){
		var f = file_list[i];
		var y = i*50 + 15 + chip_height + extra;
		var last_x = 0;
		sample.append("text")
			.attr("x", 1105)
			.attr("y", y)
			.attr("class", "map_name")
			.attr("id", f)
			.on("click", function(){
				remove_file(this.id);
				$(".pop_up").remove();
			})
			.on("mouseover", function(){
				$("body").append(function(){
					return $("<div/>")
						.attr("class", "pop_up")
						.attr("style", "height: 25px; font-size: 15px; font-weight: bold; text-align: center;padding: 5px; border-radius: 3px;")
						.css("left", event.pageX + 10)
						.css("top", event.pageY + 10)
						.append(function(){
							return $("<span/>").attr("class", "glyphicon glyphicon-trash");
						});
					});
			})
			.on("mouseout", function(){
				$(".pop_up").remove();
			})
			.text(f);
		y += 30;
		var add = 0;
		for (var s in expData[name][f]){
			var content = expData[name][f][s];
			if (content[0] < start) continue;
			if (content[0] > end) break;
			if ((visibleType != 0 && visibleType != content[2]) ||
				(visibleMode == 1 && id_list[content[7]] == 1) ||
				(visibleMode == 2 && id_list[content[7]] == 0)) continue;
			var x = (content[0]-start)*3300/(end-start);
			if (x < last_x + 120){
					y += 15;
					if (y >= i*50 + extra + add + chip_height){
							add += 15;
							sample.attr("height", n_file*50 + extra + add + chip_height);
					}
			} else {
				last_x = x;	
				y = i*50 + extra + 30 + chip_height;
			}
			sample.append("rect")
				.attr("fill", color[content[2]])
				.attr("width", "4")
				.attr("height", "10")
				.attr("opacity", "0.8")
				.attr("x", x)
				.attr("y", y)
				.attr("class", content[7]);
			sample.append("text")
				.attr("id", name + '-' + f + '-' + s)
				.attr("x", x + 8)
				.attr("y", y + 8)
				.attr("class", "content_name " + content[7])
				.attr("style", "font-size: 10px")
				.text(content[5])
				.on("click", function(){
					align_contig(this.id);
				});

				chip_seq_range["id"].push(content[7])
		}
		extra += add;
	}
}

// Selected region on chromosome
function ShowChromosome(name, start, end){
	$(".list_name").html(name.charAt(0).toUpperCase() + name.substr(1) + '<span class="caret"></span>');
	$(".gene_wrap").css({"visibility": "visible", "height": "auto"});
	doc.style.marginTop = 400 + 'px';

	// Impossible states:
	if (!chrs[name])
		name = 'chr1';
	if (end < start + 50){
		end = start + 50;
	}

	// chromosome bar:
	$('.chr-line').html(Template('chromosome', { name: name}));
	_ShowHelper2();

	// Content
	$("#content").html('').append(Template('detail_table', {}));

	var size = chrs[name];
	var box = $('#sel-box')[0];
	var ww = 1100;
	var current = [0,1];
	ora = [0,1];	

	// Resize
	var RangeParse = function(start, end){
		// to pixels
		start = start < 0? 0: start > size? size: start;
		end = end < 0? 0: end > size? size: end;

		var x1 = ww * start / size; 
		var x2 = ww * end / size;
		ora = start < end ? [start, end] : [end, start];
		var e = x2 > x1 ? [x1, x2] : [x2, x1];
		current = [e[0] < 0 ? 0 : e[0], e[1] > ww ? ww : e[1]];
		current.push(start > end ? end : start);
		current.push(start > end ? start : end);
		return current;
	};

	var ResizePre = function(xx){
		var e = RangeParse(xx[0], xx[1]);
		// Select-range-box
		box.style.left = e[0]+ 'px';
		box.style.width = (e[1] - e[0]) + 'px';
	};

	var Resized = function(xx){
		if (xx[0] > xx[1]) xx = [xx[1], xx[0]];
		var e = RangeParse(xx[0], xx[1]);
		ResizePre(xx);
		// black blur "blinds"
		$('#cs-lh-F')[0].style.width = (e[0] * 100 / ww) + '%';
		$('#cs-rh-F')[0].style.left  = (e[1] * 100 / ww) + '%';
		// Hash
		var bp1 = parseInt(e[2]);
		var bp2 = parseInt(e[3]);
		location.hash = '#' + name + ':' + bp1 + '-' + bp2;
		load_detail_content(name, bp1, bp2);
	};

	var px,ox,dx, tx,vx,ix;
	// Select range (chromosome)
	$("#range")[0].onmousedown = function(e){
		ox = e.offsetX;
		px = e.pageX;
	};
	$(".detail_content")[0].onmousedown = function(e){
		tx = e.pageX;
		ix = current;
	};

	document.onmousemove = function(e){
		// Select range ?
		if (!isNaN(ox)) {
			if (isNaN(dx)) box.style.display = 'block';
			dx = e.pageX - px;
			ResizePre([(ox)*size/ww, (ox + dx)*size/ww]);
		}
		// Move range ?
		if (!isNaN(tx)) {
			if (isNaN(vx)) box.style.display = 'block';
			vx = -(e.pageX - tx) * (ix[1] - ix[0]) / ww;
			$(".detail_content").css("margin-left", (e.pageX - tx - ww) + "px");
			ResizePre([(ix[0] + vx)*size/ww, (ix[1] + vx)*size/ww]);
		}
	};

	document.onmouseup = function(){
		if (!isNaN(dx)) {
			Resized([(ox)*size/ww, (ox + dx)*size/ww]);
			var obj = getBwtWeb('svgHolderT0');
 			obj.search(name.substr(3)+ ":" + (ox)*size/ww + ".." + (ox + dx)*size/ww, function(err) {});			
			}
		if (!isNaN(vx)) {
			var s = (ix[0] + vx)*size/ww;
			var e = (ix[1] + vx)*size/ww;
			if (s < 0) s = 0;
			if (e > size) e = size;
			Resized([s, e]);
			var obj = getBwtWeb('svgHolderT0');
 			obj.search(name.substr(3)+ ":" + s + ".." + e, function(err) {});
		}
		box.style.display = 'none';
		ox = NaN, px = NaN, dx = NaN, tx = NaN, vx = NaN;
	};

	Resized([start, end]);
	$(".status").css("visibility", "hidden");
}

function get_server_file(){
	var n = Object.keys(server_list).length;
	$.each(server_list, function(key, val) {
		$.ajax({
			method: "get",
			dataType: "jsonp",
			url: " http://bioalgorithm.xyz/teatlas_ajax",
			data: {"inf": "file", "id": [key + ".csv"]},
			success: function (file) {
				Parse(file[0], val);
				--n;
				if (n == 0) {
					if (file_list.length > 1)
						get_common();
					if (file_list.length > 2)
						contruct_tree();
					visibleType = visibleMode = 0;
					$(".status").css("visibility", "hidden");
				}
				get_max();
				Route("#general");
			}
		})
	})
}

$(document).ready(function() {
    SamplesLoaded();

	createSmallBwtWebByAl('svgHolderT0', 'sml0', '1', 5000000, 10000000, 'human', function() {
		var obj = getBwtWeb('svgHolderT0');
		obj.addSuggestion($("#find"), function(suggestData) {
			if (expData[suggestData['chr_id']]){
				obj.search(suggestData['chr_id'].substr(3) + ":" + suggestData['chr_start'] + ".." + suggestData['chr_end'], function(err) {});
				ShowChromosome(suggestData['chr_id'], suggestData['chr_start'], suggestData['chr_end']);
			}
		});
	}, function(newChr, newStart, newEnd) {
		ShowChromosome('chr' + newChr, newStart, newEnd);
	});	
});
