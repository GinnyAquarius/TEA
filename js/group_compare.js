function split_group(){
	$("body")
		.append(function(){
			return $("<div/>").attr("class", "screen_blur");
		})
		.append(function(){
			return $("<div/>").attr("class", "split_group")
				.append(function(){
					return $("<div/>")
						.attr("class", "group_wrap")
						.attr("style", "width: 240px; left: 20px;")
						.html("Group I")
						.append(function(){
							return $("<select/>")
								.attr("id", "group_I")
								.attr("multiple", "multiple")
								.attr("class", "group_content")
						});
				})
				.append(function(){
					return $("<div/>")
						.attr("class", "group_wrap")
						.attr("style", "width: 80px; left: 260px; margin-top: 70px;")
						.append(function(){
							return $("<a/>")
								.attr("class", "btn btn-default")
								.attr("style", "position: relative; display: inline-block; width: 40%; margin: auto; font-size:10px; align:center;")
								.append(function(){
									return $("<span>")
										.attr("class", "glyphicon glyphicon-chevron-left ll");
								})
								.on("click", function(){
									$("#group_II option:selected").appendTo("#group_I");
								});
						})
						.append(function(){
							return $("<a/>")
								.attr("class", "btn btn-default")
								.attr("style", "position: relative; display: inline-block; width: 40%; margin: auto; font-size:10px; align:center;")
								.append(function(){
									return $("<span>")
										.attr("class", "glyphicon glyphicon-chevron-right ll");
								})
								.on("click", function(){
									$("#group_I option:selected").appendTo("#group_II");
								});
						})
						.append(function(){
							return $("<a/>")
								.attr("class", "btn btn-default")
								.attr("style", "position: relative; display: block; width: 80%; margin: auto; margin-top: 10px;")
								.append(function(){
									return $("<span>")
										.attr("class", "glyphicon glyphicon-thumbs-up")		
										.html("OK");
								})
								.on("click", function(){
									progress_group();				
								})
						});
				})
				.append(function(){
					return $("<div/>")
						.attr("class", "group_wrap")
						.attr("style", "width: 240px; right: 20px;")
						.html("Group II")
						.append(function(){
							return $("<select/>")
								.attr("id", "group_II")
								.attr("multiple", "multiple")
								.attr("class", "group_content")
						});
						
				})
				.append(function(){
					return $("<a/>")
						.attr("class", "btn")
						.attr("style", "position: absolute; top: 10px; right: 10px")
						.append(function(){
							return $("<span>")
								.attr("class", "glyphicon glyphicon-remove")
						})
						.on("click", function(){
							$(".screen_blur").remove();
							$(".split_group").remove();
						})
				});
		});

	for (var i = 0; i < n_file; i++){
		$("#group_I").append(function(){
			return $("<option/>")
				.attr("value", file_list[i])
				.html(file_list[i]);
		});
	}

	$(document).keyup(function(e) {
   		if (e.keyCode == 27) { 
			$(".screen_blur").remove();
			$(".split_group").remove();
    		}
	});	

}

function no_member_alert(name){
	$(".split_group")
		.html('')
		.append(function(){
			return $("<h3/>")
				.attr("style", "margin-top: 40px; text-align: center;")
				.html("There is no member in " + name);
		})
		.append(function(){
			return $("<a/>")
				.attr("class", "btn btn-default")
				.attr("style", "position: relative; display: inline-block; margin: auto; margin-top: 10px;")
				.append(function(){
					return $("<span>")	
						.html(" Back")
						.attr("class", "glyphicon glyphicon-share-alt")	
				})
				.on("click", function(){
					split_group();				
				})
		})
		.append(function(){
			return $("<a/>")
				.attr("class", "btn btn-default")
				.attr("style", "position: relative; display: inline-block; margin: auto; margin-top: 10px; margin-left: 10px")
				.append(function(){
					return $("<span>")
						.html(" Cancel")
						.attr("class", "glyphicon glyphicon-remove")
				})
				.on("click", function(){
					$(".screen_blur").remove();
					$(".split_group").remove();
				})
		});
}

function progress_group(){
	var g = [];
	g.push($("#group_I").children("option"));
	g.push($("#group_II").children("option"));

	if (g[0].length == 0){
		no_member_alert("Group I");
		return;
	} else if(g[1].length == 0){
		no_member_alert("Group II");
		return;
	}

	Group = (JSON.parse(JSON.stringify(expData)));
	g_density = (JSON.parse(JSON.stringify(density_map))); 
	expData = {};
	density_map = {};

	// progress group I
	for (var i = 0; i < 2; i++){
		for (var chr in Group){
			if (chr.localeCompare("map") == 0) continue;

			var name = "Group ";
			if (i == 0) name += "I";
			else name += "II";

			var first;
			for (first = 0; first < g[i].length; first++){
				if (Group[chr][g[i][first].value]) break;
			}

			if (first == g[i].length) continue;
			if (!expData[chr]) expData[chr] = {};
			expData[chr][name] = (JSON.parse(JSON.stringify(Group[chr][g[i][first].value])));

			if (!density_map[chr]) density_map[chr]= {};
			density_map[chr][name] = [];
			for (k = 0; k < density_len[chr]; k++) density_map[chr][name].push([0,0,0,0,0,0]); 


			for (var k = 0; k < expData[chr][name].length; k++){
				expData[chr][name][k][4] = "Present in samples: " + g[i][first].value;
				var cell = Math.ceil(expData[chr][name][k][0]/2000000)-1;
				if (cell >= density_len[chr]) cell = density_len[chr]-1;

				++density_map[chr][name][cell][expData[chr][name][k][2]-1];
			}

			for (var k = first+1; k < g[i].length; k++){
				var n = g[i][k].value;
				if (!Group[chr][n]) continue;

				for (pos = 0; pos < Group[chr][n].length; pos++){
					var has = 0;
					for (p = 0; p < expData[chr][name].length; p++){
						if (Math.abs(Group[chr][n][pos][0] - expData[chr][name][p][0]) < 50 &&
							Group[chr][n][pos][2] == expData[chr][name][p][2]){
							expData[chr][name][p][4] += ", " + n;
							has = 1;
							break;
						}
					}
					if (has == 0){
						var itr = expData[chr][name].length;
						expData[chr][name].splice(itr, 0, Group[chr][n][pos]);
						expData[chr][name][itr][4] = "Present in samples: " + n;

						var cell = Math.ceil(expData[chr][name][itr][0]/2000000)-1;
						if (cell >= density_len[chr]) cell = density_len[chr]-1;
						++density_map[chr][name][cell][expData[chr][name][itr][2]-1];
					}
				}
			}
		}
	}

	n_group = n_file;
	n_file = 2;
	group_list = file_list.slice();
	g_max = d_max;
	file_list = ["Group I", "Group II"];

	get_max();
	get_common();

	Route();
	$(".split_group").remove();
	$(".screen_blur").remove();
	$('.samples-nav-pane .showtree').addClass("disabled");
	$(".comparision .glyphicon").removeClass("glyphicon-adjust").addClass("glyphicon-scissors");
	$(".comparision .txt").html("Delete group");
}

function delete_group(){
	expData = (JSON.parse(JSON.stringify(Group)));
	Group = {};
	density_map =  (JSON.parse(JSON.stringify(g_density)));
	g_density = {};
	n_file = n_group;
	n_group = 0;
	file_list = group_list.slice();
	group_list = [];
	d_max = g_max;
	g_max = 0;

	Route();
	$('.samples-nav-pane .showtree').removeClass("disabled");
	$(".comparision .glyphicon").removeClass("glyphicon-scissors").addClass("glyphicon-adjust");
	$(".comparision .txt").html("Group comparision");
}
